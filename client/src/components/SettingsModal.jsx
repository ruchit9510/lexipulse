import React, { useState, useEffect } from 'react';
import { 
  X, 
  HardDrive, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  HelpCircle, 
  ExternalLink,
  Trash2,
  FileSpreadsheet,
  Moon,
  Sun,
  Laptop
} from 'lucide-react';

export default function SettingsModal({ 
  onClose, 
  syncStatus, 
  onSync, 
  syncing, 
  theme, 
  setTheme 
}) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);
  const [driveFiles, setDriveFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setClientId(data.settings.googleClientId || '');
      }
    } catch (e) {
      console.error('Error fetching settings:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredentials = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const body = { googleClientId: clientId.trim() };
      if (clientSecret.trim()) {
        body.googleClientSecret = clientSecret.trim();
      }
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.success) {
        setSettings(data.settings);
        setClientSecret('');
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 3000);
      }
    } catch (err) {
      setErrorMsg('Failed to save settings: ' + err.message);
    }
  };

  const handleConnectGoogle = async () => {
    setErrorMsg('');
    try {
      const redirectUri = `${window.location.origin}/api/google/callback`;
      const res = await fetch(`/api/google/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();
      if (data.success && data.url) {
        // Redirect to Google Consent Screen
        window.location.href = data.url;
      } else {
        setErrorMsg(data.message || 'Please enter Google Client ID and Secret first');
      }
    } catch (err) {
      setErrorMsg('Connection error: ' + err.message);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Your local learning data and streak will be preserved.')) return;
    try {
      await fetch('/api/google/disconnect', { method: 'POST' });
      fetchSettings();
      if (onSync) onSync();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLoadDriveFiles = async () => {
    setLoadingFiles(true);
    setShowFilePicker(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/google/files');
      const data = await res.json();
      if (data.success) {
        setDriveFiles(data.files || []);
      } else {
        setErrorMsg(data.message || 'Could not load files from Google Drive');
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleSelectFile = async (file) => {
    try {
      const res = await fetch('/api/google/select-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: file.id, fileName: file.name })
      });
      const data = await res.json();
      if (data.success) {
        setShowFilePicker(false);
        fetchSettings();
        if (onSync) onSync();
      }
    } catch (err) {
      setErrorMsg('Failed to select file: ' + err.message);
    }
  };

  const isConnected = Boolean(syncStatus?.driveConnected);
  const lastSynced = syncStatus?.lastSyncedAt 
    ? new Date(syncStatus.lastSyncedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not synced yet';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Settings & Data Sync
            </h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMsg && (
          <div style={{ padding: '0.75rem 1rem', background: 'var(--accent-danger-subtle)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--accent-danger)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Section 1: Google Drive Synchronization */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <HardDrive size={18} style={{ color: 'var(--accent-primary)' }} />
            Google Drive Connection
          </h3>

          <div style={{ 
            background: 'rgba(255, 255, 255, 0.03)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-lg)', 
            padding: '1.25rem' 
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Status:</span>
                  {isConnected ? (
                    <span className="badge badge-mastered" style={{ fontSize: '0.8rem' }}>
                      <CheckCircle2 size={13} /> Connected to Google Drive
                    </span>
                  ) : (
                    <span className="badge badge-practice" style={{ fontSize: '0.8rem' }}>
                      <Cloud size={13} /> Google Drive Not Connected
                    </span>
                  )}
                </div>

                {syncStatus?.accountEmail && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Account: {syncStatus.accountEmail}
                  </p>
                )}

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Drive Spreadsheet: <strong>{syncStatus?.selectedDriveFileName || 'Words.xlsx'}</strong>
                </p>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Last Auto-Fetched: {lastSynced}
                </p>
              </div>

              <button 
                className="btn btn-secondary"
                onClick={onSync}
                disabled={syncing}
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                <RefreshCw size={14} className={syncing ? 'spin' : ''} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
                <span>{syncing ? 'Fetching...' : 'Fetch Now'}</span>
              </button>
            </div>

            {/* Actions if Connected */}
            {isConnected ? (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem' }}>
                <button className="btn btn-secondary" onClick={handleLoadDriveFiles} style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}>
                  <FileSpreadsheet size={15} />
                  <span>Choose Another Spreadsheet</span>
                </button>
                <button className="btn btn-danger" onClick={handleDisconnect} style={{ fontSize: '0.85rem', padding: '0.5rem 0.9rem' }}>
                  <Trash2 size={15} />
                  <span>Disconnect Drive</span>
                </button>
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Click below to authorize read-only access to your vocabulary spreadsheet in Google Drive. LexiPulse will automatically discover and sync <strong>Words.xlsx</strong>.
                </p>

                <button 
                  className="btn btn-primary"
                  onClick={handleConnectGoogle}
                  style={{ width: '100%', padding: '0.75rem' }}
                >
                  <span>Connect Google Drive</span>
                  <ExternalLink size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Drive File Picker Modal */}
        {showFilePicker && (
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>Select Vocabulary Spreadsheet from Google Drive:</h4>
              <button className="btn-icon" onClick={() => setShowFilePicker(false)} style={{ width: '1.75rem', height: '1.75rem' }}>
                <X size={14} />
              </button>
            </div>

            {loadingFiles ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fetching spreadsheets...</p>
            ) : driveFiles.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No .xlsx spreadsheet files found in Google Drive.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
                {driveFiles.map(f => (
                  <div 
                    key={f.id}
                    onClick={() => handleSelectFile(f)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.6rem 0.85rem',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500 }}>{f.name}</span>
                    <span className="badge badge-learning" style={{ fontSize: '0.75rem' }}>Select</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: OAuth Client Credentials Config */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Key size={18} style={{ color: 'var(--accent-warning)' }} />
            Google OAuth Credentials (Local & Secure)
          </h3>

          <form onSubmit={handleSaveCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Google OAuth Client ID
              </label>
              <input
                type="text"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                placeholder="e.g. 1234567890-xxx.apps.googleusercontent.com"
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Google OAuth Client Secret {settings?.hasClientSecret && '(Configured ✓)'}
              </label>
              <input
                type="password"
                value={clientSecret}
                onChange={e => setClientSecret(e.target.value)}
                placeholder={settings?.hasClientSecret ? '•••••••••••••••• (Leave blank to keep existing)' : 'Enter Client Secret'}
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.65rem 0.85rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            </div>

            <div style={{
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginTop: '0.5rem'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>
                Required in Google Cloud Console:
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                In your Google Cloud Console OAuth 2.0 Client, add this under <strong>Authorized redirect URIs</strong> (exact match with <code>https://</code> and <code>/api/google/callback</code>):
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <code style={{ 
                  flex: 1, 
                  background: 'rgba(0, 0, 0, 0.25)', 
                  padding: '0.35rem 0.6rem', 
                  borderRadius: 'var(--radius-sm)', 
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                  userSelect: 'all',
                  wordBreak: 'break-all'
                }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/api/google/callback` : 'https://yourdomain.com/api/google/callback'}
                </code>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    const uri = `${window.location.origin}/api/google/callback`;
                    navigator.clipboard.writeText(uri);
                    alert(`Copied to clipboard:\n${uri}\n\nPaste this in Google Cloud Console under "Authorized redirect URIs".`);
                  }}
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                >
                  Copy URI
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-secondary" style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}>
                <span>{savedNotice ? 'Saved ✓' : 'Save Credentials'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Section 3: Appearance & Preferences */}
        <div>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
            Appearance & Preferences
          </h3>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTheme('dark')}
              style={{ flex: 1, padding: '0.65rem' }}
            >
              <Moon size={16} />
              <span>Dark</span>
            </button>

            <button
              className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setTheme('light')}
              style={{ flex: 1, padding: '0.65rem' }}
            >
              <Sun size={16} />
              <span>Light</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
