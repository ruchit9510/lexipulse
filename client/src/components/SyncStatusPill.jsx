import React from 'react';
import { RefreshCw, CheckCircle2, Cloud, HardDrive } from 'lucide-react';

export default function SyncStatusPill({ status, onSync, syncing }) {
  const isDrive = Boolean(status?.driveConnected);
  const lastSynced = status?.lastSyncedAt 
    ? new Date(status.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <button 
      className="sync-pill"
      onClick={onSync}
      disabled={syncing}
      title={isDrive ? `Auto-fetching from Google Drive (${status?.selectedDriveFileName || 'Words.xlsx'})\nLast synced: ${lastSynced}\nClick to sync now` : 'Click to sync with Google Drive'}
    >
      <span className={`sync-dot ${syncing ? 'syncing' : isDrive ? '' : 'syncing'}`} />
      
      {syncing ? (
        <>
          <RefreshCw size={12} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
          <span className="sync-text-desktop">Syncing Drive...</span>
          <span className="sync-text-mobile">Syncing...</span>
        </>
      ) : isDrive ? (
        <>
          <CheckCircle2 size={12} style={{ color: 'var(--accent-success)' }} />
          <span className="sync-text-desktop">Drive Synced {lastSynced}</span>
          <span className="sync-text-mobile">Synced</span>
        </>
      ) : (
        <>
          <Cloud size={12} style={{ color: 'var(--accent-primary)' }} />
          <span className="sync-text-desktop">Connect Drive</span>
          <span className="sync-text-mobile">Drive</span>
        </>
      )}
    </button>
  );
}
