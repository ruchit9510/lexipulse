const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const db = require('./db');
const { parseExcelFile } = require('./excelParser');

// Scopes required: strictly read-only drive access
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

function getOAuthClient(redirectUri) {
  const settings = db.getRawSettings();
  const clientId = settings.googleClientId || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = settings.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET;
  const customUri = process.env.GOOGLE_REDIRECT_URI || settings.googleRedirectUri;

  if (!clientId || !clientSecret) {
    return null;
  }

  const effectiveUri = redirectUri || customUri || 'http://localhost:3000/api/google/callback';

  const client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    effectiveUri
  );

  if (settings.googleRefreshToken) {
    client.setCredentials({
      refresh_token: settings.googleRefreshToken,
      access_token: settings.googleAccessToken,
      expiry_date: settings.googleTokenExpiry
    });
  }

  return client;
}

function getAuthUrl(redirectUri) {
  const settings = db.getRawSettings();
  const customUri = process.env.GOOGLE_REDIRECT_URI || settings.googleRedirectUri;
  const effectiveUri = redirectUri || customUri || 'http://localhost:3000/api/google/callback';

  const client = getOAuthClient(effectiveUri);
  if (!client) {
    throw new Error('Google OAuth Client ID and Secret must be configured in Settings first');
  }

  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    redirect_uri: effectiveUri,
    state: effectiveUri
  });
}

async function handleCallback(code, redirectUri) {
  const client = getOAuthClient(redirectUri);
  if (!client) {
    throw new Error('OAuth Client not initialized');
  }

  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  // Fetch user email
  let email = '';
  try {
    const oauth2 = google.oauth2({ version: 'v2', auth: client });
    const userinfo = await oauth2.userinfo.get();
    email = userinfo.data.email || '';
  } catch (e) {
    console.warn('Could not fetch user email:', e.message);
  }

  db.updateSettings({
    googleAccessToken: tokens.access_token,
    googleRefreshToken: tokens.refresh_token || db.getRawSettings().googleRefreshToken,
    googleTokenExpiry: tokens.expiry_date,
    driveConnected: true,
    accountEmail: email
  });

  // Automatically discover and auto-select Words.xlsx in Google Drive
  try {
    const drive = google.drive({ version: 'v3', auth: client });
    const searchRes = await drive.files.list({
      q: "trashed = false and (name = 'Words.xlsx' or name contains 'Words' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')",
      fields: 'files(id, name, modifiedTime, size)',
      pageSize: 10,
      orderBy: 'modifiedTime desc'
    });

    const files = searchRes.data.files || [];
    if (files.length > 0) {
      const targetFile = files.find(f => f.name.toLowerCase() === 'words.xlsx') || files[0];
      db.updateSettings({
        selectedDriveFileId: targetFile.id,
        selectedDriveFileName: targetFile.name
      });
      console.log(`[Google Drive] Auto-selected vocabulary file: ${targetFile.name} (${targetFile.id})`);
      await syncWithDrive(true);
    }
  } catch (err) {
    console.warn('[Google Drive] Auto-discovery warning during OAuth callback:', err.message);
  }

  return { success: true, email };
}

async function listDriveFiles() {
  const client = getOAuthClient();
  if (!client || !db.getRawSettings().driveConnected) {
    throw new Error('Google Drive is not connected');
  }

  const drive = google.drive({ version: 'v3', auth: client });
  const response = await drive.files.list({
    q: "trashed = false and (name contains '.xlsx' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or name contains 'Words')",
    fields: 'files(id, name, modifiedTime, size, mimeType)',
    pageSize: 30,
    orderBy: 'modifiedTime desc'
  });

  return response.data.files || [];
}

async function selectFile(fileId, fileName) {
  db.updateSettings({
    selectedDriveFileId: fileId,
    selectedDriveFileName: fileName
  });
  return syncWithDrive(true);
}

function disconnectDrive() {
  db.updateSettings({
    googleAccessToken: '',
    googleRefreshToken: '',
    googleTokenExpiry: null,
    driveConnected: false,
    selectedDriveFileId: '',
    selectedDriveFileName: '',
    accountEmail: ''
  });
  return { success: true };
}

/**
 * Perform automatic synchronization with Google Drive
 * @param {boolean} force - If true, bypass modifiedTime cache check
 */
async function syncWithDrive(force = false) {
  const settings = db.getRawSettings();
  const now = new Date().toISOString();

  // 1. Google Drive Auto-Sync Flow
  if (settings.driveConnected) {
    const client = getOAuthClient();
    if (!client) {
      throw new Error('Google Drive client could not be initialized');
    }

    const drive = google.drive({ version: 'v3', auth: client });
    let fileId = settings.selectedDriveFileId;

    // Auto-discover Words.xlsx if not yet selected
    if (!fileId) {
      const searchRes = await drive.files.list({
        q: "trashed = false and (name = 'Words.xlsx' or name contains 'Words' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')",
        fields: 'files(id, name, modifiedTime, size)',
        pageSize: 10,
        orderBy: 'modifiedTime desc'
      });

      const files = searchRes.data.files || [];
      if (files.length > 0) {
        const target = files.find(f => f.name.toLowerCase() === 'words.xlsx') || files[0];
        fileId = target.id;
        db.updateSettings({
          selectedDriveFileId: target.id,
          selectedDriveFileName: target.name
        });
      }
    }

    if (fileId) {
      // Fetch metadata to check if file has changed in Google Drive
      const metaRes = await drive.files.get({
        fileId,
        fields: 'id, name, mimeType, modifiedTime, md5Checksum, size'
      });

      const fileMeta = metaRes.data;
      const hasMissingMeanings = db.getAllWords().some(w => !w.meaning || !w.meaning.trim());
      const isUnchanged = !force && 
        !hasMissingMeanings &&
        settings.lastModifiedTime && 
        settings.lastModifiedTime === fileMeta.modifiedTime;

      if (isUnchanged) {
        db.updateSettings({
          lastSyncedAt: now,
          syncStatus: 'synced'
        });
        return {
          success: true,
          source: 'drive',
          unchanged: true,
          fileName: fileMeta.name,
          lastSyncedAt: now,
          stats: db.getStats()
        };
      }

      // Download file: if Google Sheet, export as .xlsx; otherwise download media
      let buffer;
      if (fileMeta.mimeType === 'application/vnd.google-apps.spreadsheet') {
        const fileRes = await drive.files.export(
          { fileId, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          { responseType: 'arraybuffer' }
        );
        buffer = Buffer.from(fileRes.data);
      } else {
        const fileRes = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        buffer = Buffer.from(fileRes.data);
      }

      const parsed = parseExcelFile(buffer);
      const upsertResult = db.upsertVocabulary(parsed.records);

      db.updateSettings({
        lastSyncedAt: now,
        lastModifiedTime: fileMeta.modifiedTime,
        selectedDriveFileName: fileMeta.name,
        syncStatus: 'synced'
      });

      return {
        success: true,
        source: 'drive',
        unchanged: false,
        fileName: fileMeta.name,
        lastSyncedAt: now,
        recordsSynced: parsed.records.length,
        added: upsertResult.added,
        updated: upsertResult.updated,
        stats: db.getStats()
      };
    }
  }

  // 2. Initial fallback when Drive is not connected yet (uses workspace Words.xlsx silently)
  const localExcelPath = path.join(__dirname, '../../Words.xlsx');
  if (fs.existsSync(localExcelPath)) {
    const stats = fs.statSync(localExcelPath);
    const mtime = stats.mtime.toISOString();

    const isUnchanged = !force && 
      settings.lastModifiedTime && 
      settings.lastModifiedTime === mtime && 
      db.getAllWords().length > 0;

    if (isUnchanged) {
      db.updateSettings({
        lastSyncedAt: now,
        syncStatus: 'synced'
      });
      return {
        success: true,
        source: 'local',
        unchanged: true,
        fileName: 'Words.xlsx',
        lastSyncedAt: now,
        stats: db.getStats()
      };
    }

    const buffer = fs.readFileSync(localExcelPath);
    const parsed = parseExcelFile(buffer);
    const upsertResult = db.upsertVocabulary(parsed.records);

    db.updateSettings({
      lastSyncedAt: now,
      lastModifiedTime: mtime,
      selectedDriveFileName: 'Words.xlsx',
      syncStatus: 'synced'
    });

    return {
      success: true,
      source: 'local',
      unchanged: false,
      fileName: 'Words.xlsx',
      lastSyncedAt: now,
      recordsSynced: parsed.records.length,
      added: upsertResult.added,
      updated: upsertResult.updated,
      stats: db.getStats()
    };
  }

  throw new Error('Google Drive is not connected. Please connect Google Drive in Settings.');
}

module.exports = {
  getOAuthClient,
  getAuthUrl,
  handleCallback,
  listDriveFiles,
  selectFile,
  disconnectDrive,
  syncWithDrive
};
