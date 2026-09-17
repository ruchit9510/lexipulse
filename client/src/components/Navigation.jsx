import React from 'react';
import { 
  Sparkles, 
  Home, 
  RotateCcw, 
  BookOpen, 
  TrendingUp, 
  Settings, 
  Flame, 
  Sun, 
  Moon,
  LogOut 
} from 'lucide-react';
import SyncStatusPill from './SyncStatusPill';

export default function Navigation({ 
  currentTab, 
  setCurrentTab, 
  streak, 
  dueCount, 
  syncStatus, 
  onSync, 
  syncing, 
  theme, 
  setTheme,
  onOpenSettings,
  onLogout 
}) {
  const navItems = [
    { id: 'today', label: 'Today', icon: Home },
    { id: 'review', label: 'Review', icon: RotateCcw, badge: dueCount > 0 ? dueCount : null },
    { id: 'library', label: 'Vocabulary', icon: BookOpen },
    { id: 'progress', label: 'Progress', icon: TrendingUp }
  ];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      {/* Top Navbar for Desktop & Mobile Header */}
      <header className="navbar">
        <div className="nav-content">
          <div className="brand-logo" onClick={() => setCurrentTab('today')}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, #4338ca 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 2px 10px var(--accent-primary-glow)'
            }}>
              <Sparkles size={16} />
            </div>
            <span>LexiPulse</span>
            <span className="brand-badge">Daily</span>
          </div>

          {/* Desktop Nav Items */}
          <nav className="desktop-nav">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setCurrentTab(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      background: 'var(--accent-danger)',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '0.1rem 0.4rem',
                      borderRadius: 'var(--radius-full)'
                    }}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Header Actions (Streak, Sync, Theme, Settings) */}
          <div className="nav-actions">
            {streak > 0 && (
              <div 
                className="badge badge-streak" 
                title={`${streak} day daily learning streak`}
                style={{ cursor: 'pointer' }}
                onClick={() => setCurrentTab('progress')}
              >
                <Flame size={14} style={{ color: 'var(--accent-flame)' }} />
                <span>{streak}d</span>
              </div>
            )}

            <SyncStatusPill status={syncStatus} onSync={onSync} syncing={syncing} />

            <button 
              className="btn-icon" 
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            <button 
              className="btn-icon"
              onClick={onOpenSettings}
              title="Settings & Google Drive"
            >
              <Settings size={17} />
            </button>

            {onLogout && (
              <button 
                className="btn-icon"
                onClick={onLogout}
                title="Log Out"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              className={`mobile-nav-btn ${isActive ? 'active' : ''}`}
              onClick={() => setCurrentTab(item.id)}
            >
              <div style={{ position: 'relative' }}>
                <Icon size={20} />
                {item.badge && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -6,
                    background: 'var(--accent-danger)',
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          className={`mobile-nav-btn ${currentTab === 'settings' ? 'active' : ''}`}
          onClick={onOpenSettings}
        >
          <Settings size={20} />
          <span>Settings</span>
        </button>
      </nav>
    </>
  );
}
