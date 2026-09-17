require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./services/db');
const driveService = require('./services/driveService');
const { generateDailyQuiz } = require('./services/quizGenerator');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize DB and run initial sync if empty
(async () => {
  try {
    const words = db.getAllWords();
    if (words.length === 0) {
      console.log('Database empty, performing initial sync...');
      await driveService.syncWithDrive(true);
      console.log('Initial sync completed. Loaded records:', db.getAllWords().length);
    }
  } catch (err) {
    console.warn('Initial sync notice:', err.message);
  }
})();

// Periodic background auto-fetch from Google Drive every 2 minutes
setInterval(async () => {
  try {
    const settings = db.getRawSettings();
    if (settings.driveConnected) {
      const res = await driveService.syncWithDrive(false);
      if (res && !res.unchanged) {
        console.log(`[Auto-Fetch] Synced new/updated words from Google Drive: ${res.recordsSynced} records.`);
      }
    }
  } catch (err) {
    // Silent fail for background sync
  }
}, 2 * 60 * 1000);


// Helper to get local date string YYYY-MM-DD
function getLocalDateStr(req) {
  if (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
    return req.query.date;
  }
  // Allow client to pass clientDate header or query
  const clientDate = req.headers['x-client-date'];
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) {
    return clientDate;
  }
  return new Date().toISOString().split('T')[0];
}

// Helper to determine exact OAuth redirect URI respecting proxies and custom domains
function getRequestRedirectUri(req) {
  if (req.query.redirectUri) {
    return req.query.redirectUri;
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}/api/google/callback`;
}

// ---------------- API ENDPOINTS ---------------- //

/**
 * Simple Authentication Login
 * Fixed Credentials: username = 'ruchit', password = '114432'
 */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();

  if (cleanUsername === 'ruchit' && cleanPassword === '114432') {
    return res.json({
      success: true,
      user: {
        username: 'ruchit',
        name: 'Ruchit'
      },
      token: 'lexipulse_session_ruchit_auth'
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Invalid username or password'
  });
});

/**
 * App & Sync Status
 */
app.get('/api/status', (req, res) => {
  const settings = db.getRawSettings();
  const stats = db.getStats();
  res.json({
    success: true,
    driveConnected: Boolean(settings.driveConnected),
    accountEmail: settings.accountEmail || '',
    selectedDriveFileName: settings.selectedDriveFileName || '',
    selectedDriveFileId: settings.selectedDriveFileId || '',
    lastSyncedAt: settings.lastSyncedAt,
    lastModifiedTime: settings.lastModifiedTime,
    syncStatus: settings.syncStatus || 'idle',
    stats
  });
});

/**
 * Today's Words
 */
app.get('/api/words/today', (req, res) => {
  const dateStr = getLocalDateStr(req);
  let words = db.getWordsByDate(dateStr);

  // If no words exist for current date, check latest available date in database
  let targetDate = dateStr;
  let isFallbackDate = false;
  if (words.length === 0) {
    const all = db.getAllWords();
    if (all.length > 0) {
      const dates = [...new Set(all.map(w => w.date).filter(Boolean))].sort();
      if (dates.length > 0) {
        targetDate = dates[dates.length - 1];
        words = db.getWordsByDate(targetDate);
        isFallbackDate = true;
      }
    }
  }

  const dbState = db.loadDb();
  const dailySession = dbState.dailySessions[targetDate] || null;

  res.json({
    success: true,
    date: targetDate,
    requestedDate: dateStr,
    isFallbackDate,
    words,
    count: words.length,
    isCompleteSet: words.length === 5,
    dailySession
  });
});

/**
 * All Vocabulary
 */
app.get('/api/words/all', (req, res) => {
  const words = db.getAllWords();
  res.json({
    success: true,
    count: words.length,
    words
  });
});

/**
 * Due Review Words (Spaced Repetition)
 */
app.get('/api/words/review', (req, res) => {
  const todayStr = getLocalDateStr(req);
  const dueWords = db.getDueReviewWords(todayStr);
  res.json({
    success: true,
    today: todayStr,
    count: dueWords.length,
    words: dueWords
  });
});

/**
 * Record Review Outcome (SRS update)
 */
app.post('/api/words/:id/review', (req, res) => {
  const { id } = req.params;
  const { outcome, date } = req.body; // 'known' or 'need_practice'
  const dateStr = date || getLocalDateStr(req);

  const updated = db.recordWordReview(id, outcome, dateStr);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Word not found' });
  }

  res.json({
    success: true,
    word: updated
  });
});

/**
 * Toggle Favorite
 */
app.post('/api/words/:id/favorite', (req, res) => {
  const { id } = req.params;
  const isFavorite = db.toggleFavorite(id);
  res.json({ success: true, wordId: id, isFavorite });
});

/**
 * Save User Practice Sentence
 */
app.post('/api/words/:id/sentence', (req, res) => {
  const { id } = req.params;
  const { sentence } = req.body;
  const progress = db.saveUserSentence(id, sentence);
  if (!progress) {
    return res.status(404).json({ success: false, message: 'Word not found' });
  }
  res.json({ success: true, progress });
});

/**
 * Complete Daily Learning Session
 */
app.post('/api/session/complete', (req, res) => {
  const { date, wordIds } = req.body;
  const dateStr = date || getLocalDateStr(req);
  const session = db.completeLearningSession(dateStr, wordIds);
  res.json({ success: true, session, streak: db.loadDb().streak });
});

/**
 * Generate Quiz
 */
app.get('/api/quiz', (req, res) => {
  const dateStr = getLocalDateStr(req);
  const isReviewMode = req.query.mode === 'review';
  const allPool = db.getAllWords();

  let targetWords = [];
  if (isReviewMode) {
    targetWords = db.getDueReviewWords(dateStr);
    if (targetWords.length === 0) {
      targetWords = allPool.filter(w => w.progress && w.progress.status === 'needs_practice');
    }
  } else {
    targetWords = db.getWordsByDate(dateStr);
    if (targetWords.length === 0 && allPool.length > 0) {
      // Latest available date
      const dates = [...new Set(allPool.map(w => w.date).filter(Boolean))].sort();
      targetWords = db.getWordsByDate(dates[dates.length - 1]);
    }
  }

  if (targetWords.length === 0) {
    targetWords = allPool.slice(0, 5);
  }

  const questions = generateDailyQuiz(targetWords, allPool);
  res.json({
    success: true,
    date: dateStr,
    count: questions.length,
    questions
  });
});

/**
 * Submit Quiz Results
 */
app.post('/api/quiz/submit', (req, res) => {
  const { date, results, score, total } = req.body;
  const dateStr = date || getLocalDateStr(req);

  const session = db.recordQuizResult(dateStr, results, score, total);
  res.json({
    success: true,
    session,
    streak: db.loadDb().streak,
    stats: db.getStats()
  });
});

/**
 * Learning Statistics & Progress
 */
app.get('/api/stats', (req, res) => {
  const stats = db.getStats();
  res.json({ success: true, stats });
});

/**
 * Synchronization Endpoint
 */
app.post('/api/sync', async (req, res) => {
  const force = Boolean(req.body.force);
  try {
    const result = await driveService.syncWithDrive(force);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Synchronization failed',
      lastSyncedAt: db.getRawSettings().lastSyncedAt
    });
  }
});

/**
 * Google Drive OAuth Endpoints
 */
app.get('/api/google/auth-url', (req, res) => {
  try {
    const redirectUri = getRequestRedirectUri(req);
    const url = driveService.getAuthUrl(redirectUri);
    res.json({ success: true, url, redirectUri });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.get('/api/google/callback', async (req, res) => {
  const { code, error, state } = req.query;
  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
  }

  try {
    const redirectUri = state || getRequestRedirectUri(req);
    await driveService.handleCallback(code, redirectUri);
    // Redirect back to frontend
    res.redirect(`/?drive_connected=true`);
  } catch (err) {
    console.error('OAuth Callback error:', err);
    res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

app.get('/api/google/files', async (req, res) => {
  try {
    const files = await driveService.listDriveFiles();
    res.json({ success: true, files });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/google/select-file', async (req, res) => {
  const { fileId, fileName } = req.body;
  if (!fileId) {
    return res.status(400).json({ success: false, message: 'fileId is required' });
  }
  try {
    const syncResult = await driveService.selectFile(fileId, fileName);
    res.json({ success: true, ...syncResult });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/google/disconnect', (req, res) => {
  const result = driveService.disconnectDrive();
  res.json(result);
});

/**
 * Settings
 */
app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: db.getSettings() });
});

app.post('/api/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// Serve frontend in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexHtml = path.join(clientDist, 'index.html');
  res.sendFile(indexHtml, err => {
    if (err) {
      res.send('API Server Running. Frontend is running on Vite dev server at http://localhost:5173');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
