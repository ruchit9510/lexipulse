import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import TodayDashboard from './components/TodayDashboard';
import LearningSession from './components/LearningSession';
import QuizSession from './components/QuizSession';
import ReviewSession from './components/ReviewSession';
import VocabularyLibrary from './components/VocabularyLibrary';
import ProgressDashboard from './components/ProgressDashboard';
import WordDetailModal from './components/WordDetailModal';
import SettingsModal from './components/SettingsModal';
import LoginPage from './components/LoginPage';
import ThemeStudioModal from './components/ThemeStudioModal';
import QuickPracticeModal from './components/QuickPracticeModal';
import ConfusingWordsSession from './components/ConfusingWordsSession';
import WeeklyReviewModal from './components/WeeklyReviewModal';
import AchievementsModal from './components/AchievementsModal';
import { flushOfflineQueue, queueAction } from './services/offlineSync';
import { getThemeSettings, applyThemeSettings, saveThemeSettings, syncThemePreferencesFromDb } from './services/themeEngine';

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lexipulse_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [theme, setTheme] = useState(() => {
    const settings = getThemeSettings();
    return settings.theme || 'obsidian';
  });
  const [currentTab, setCurrentTab] = useState('today'); // 'today' | 'review' | 'library' | 'progress'
  const [activeFlow, setActiveFlow] = useState(null); // 'learning' | 'quiz' | null
  const [quizMode, setQuizMode] = useState('daily'); // 'daily' | 'review'
  const [selectedWord, setSelectedWord] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isThemeStudioOpen, setIsThemeStudioOpen] = useState(false);
  const [isQuickPracticeOpen, setIsQuickPracticeOpen] = useState(false);
  const [isConfusingWordsOpen, setIsConfusingWordsOpen] = useState(false);
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Data states
  const [todayData, setTodayData] = useState(null);
  const [allWords, setAllWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Apply Theme & Tokens
  useEffect(() => {
    const settings = getThemeSettings();
    if (settings.theme !== theme) {
      const updated = { ...settings, theme };
      saveThemeSettings(updated);
    } else {
      applyThemeSettings(settings);
    }
  }, [theme]);

  // Initial Data Load and URL check
  useEffect(() => {
    // Check if redirected from Google OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('drive_connected') === 'true') {
      showToast('🎉 Google Drive connected! Auto-fetching vocabulary...');
      window.history.replaceState({}, document.title, window.location.pathname);
      handleSync(false);
    } else if (params.get('auth_error')) {
      showToast('Google authentication error: ' + params.get('auth_error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      loadAllData().then(() => {
        // Auto-fetch latest updates silently on mount
        handleSync(true);
      });
    }

    // Auto-fetch Google Drive updates whenever user returns to the tab or app
    const onFocus = () => {
      handleSync(true);
      checkActiveSession();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSync(true);
        checkActiveSession();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Initial session check
    checkActiveSession();

    // Auto-poll session every 5 seconds to immediately detect logins from other devices
    const sessionPoll = setInterval(() => {
      checkActiveSession();
    }, 5000);

    // Auto-poll Google Drive every 60 seconds
    const intervalTimer = setInterval(() => {
      handleSync(true);
    }, 60000);

    // Network online/offline detection & auto-sync
    const handleOnline = () => {
      setIsOnline(true);
      showToast('🌐 Back online! Syncing offline actions...');
      flushOfflineQueue().then((res) => {
        if (res.synced > 0) {
          showToast(`✨ Synced ${res.synced} offline actions`);
          loadAllData();
        }
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('📡 You are offline. Changes will save locally.');
    };
    const handleSyncedEvent = (e) => {
      if (e.detail?.synced > 0) {
        showToast(`✨ Synced ${e.detail.synced} offline actions`);
        loadAllData();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('lexipulse:synced', handleSyncedEvent);

    // Global fetch interceptor to attach session tokens & catch 401 superseded logouts
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = typeof args[0] === 'string' ? args[0] : (args[0]?.url || '');
      if (typeof url === 'string' && url.startsWith('/api') && !url.includes('/api/login')) {
        const token = localStorage.getItem('lexipulse_token');
        const savedUser = localStorage.getItem('lexipulse_user');
        const username = savedUser ? (JSON.parse(savedUser).username || 'ruchit') : 'ruchit';

        args[1] = args[1] || {};
        const existingHeaders = args[1].headers || {};
        args[1].headers = {
          ...existingHeaders,
          ...(token ? { 'x-session-token': token } : {}),
          'x-username': username
        };
      }

      const response = await originalFetch(...args);
      if (response.status === 401) {
        try {
          const clone = response.clone();
          const body = await clone.json();
          if (body && body.logout) {
            handleLogout(body.message || 'Logged out because your account was logged in from another device.');
          }
        } catch (e) {}
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('lexipulse:synced', handleSyncedEvent);
      clearInterval(sessionPoll);
      clearInterval(intervalTimer);
    };
  }, []);

  const checkActiveSession = async () => {
    const token = localStorage.getItem('lexipulse_token');
    const savedUser = localStorage.getItem('lexipulse_user');
    
    // If user is saved in localStorage without an active token, force re-login so a token is issued
    if (savedUser && !token) {
      handleLogout('Session expired. Please sign in again to secure your account.');
      return;
    }
    if (!token || !savedUser) return;

    try {
      const u = JSON.parse(savedUser);
      const res = await fetch('/api/auth/verify-session', {
        headers: {
          'x-session-token': token,
          'x-username': u.username || 'ruchit'
        }
      });
      const data = await res.json();
      if (!data.valid && data.logout) {
        handleLogout(data.message || 'Logged out because your account was logged in from another device.');
      }
    } catch (e) {
      // Ignore network errors
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllData = async () => {
    try {
      const [todayRes, allRes, statsRes, statusRes, prefsRes] = await Promise.all([
        fetch('/api/words/today'),
        fetch('/api/words/all'),
        fetch('/api/stats'),
        fetch('/api/status'),
        fetch('/api/user/preferences')
      ]);

      const [todayJson, allJson, statsJson, statusJson, prefsJson] = await Promise.all([
        todayRes.json(),
        allRes.json(),
        statsRes.json(),
        statusRes.json(),
        prefsRes.json()
      ]);

      if (todayJson.success) setTodayData(todayJson);
      if (allJson.success) setAllWords(allJson.words || []);
      if (statsJson.success) setStats(statsJson.stats);
      if (statusJson.success) setSyncStatus(statusJson);

      // Sync design preferences and custom themes from DB
      if (prefsJson.success && prefsJson.preferences) {
        const applied = syncThemePreferencesFromDb(prefsJson.preferences);
        if (applied && applied.theme && applied.theme !== theme) {
          setTheme(applied.theme);
        }
      }
    } catch (e) {
      console.error('Failed to load initial application data:', e);
    }
  };

  // Google Drive Sync Trigger (with silent auto-fetch mode)
  const handleSync = async (silent = false) => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: false })
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        if (!silent) {
          showToast(data.unchanged ? '✓ Google Drive up to date' : `✨ Synced ${data.recordsSynced || 35} words from Google Drive`);
        } else if (!data.unchanged && data.recordsSynced > 0) {
          showToast(`✨ Synced ${data.recordsSynced} words from Google Drive`);
        }
      } else if (!silent) {
        showToast('Google Drive: ' + (data.message || 'Sync pending'));
      }
    } catch (err) {
      if (!silent) {
        showToast('Sync notice: Reconnecting to Google Drive...');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const redirectUri = `${window.location.origin}/api/google/callback`;
      const res = await fetch(`/api/google/auth-url?redirectUri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        showToast(data.message || 'Google Drive configuration error');
      }
    } catch (err) {
      showToast('Connection error: ' + err.message);
    }
  };


  // Complete Daily Learning Session
  const handleCompleteLearning = async (wordIds) => {
    try {
      const res = await fetch('/api/session/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: todayData?.date,
          wordIds
        })
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
      }
    } catch (e) {
      console.error('Error completing learning session:', e);
    }
  };

  // Submit Quiz Results
  const handleSubmitQuiz = async ({ date, results, score, total }) => {
    try {
      const res = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date || todayData?.date,
          results,
          score,
          total
        })
      });
      const data = await res.json();
      if (data.success) {
        await loadAllData();
        showToast(`🎉 Quiz recorded! Streak: ${data.streak?.currentStreak || 1} days`);
      }
    } catch (e) {
      console.error('Error submitting quiz:', e);
    }
  };

  // Spaced Repetition Review Outcome
  const handleRecordReview = async (wordId, outcome) => {
    if (!navigator.onLine) {
      queueAction({ type: 'review', wordId, outcome, date: todayData?.date });
      showToast('Saved offline. Will sync when reconnected.');
      // Optimistically update local word
      setAllWords(prev => prev.map(w => w.id === wordId ? {
        ...w,
        progress: {
          ...w.progress,
          status: outcome === 'known' ? 'mastered' : 'needs_practice',
          reviewCount: (w.progress?.reviewCount || 0) + 1
        }
      } : w));
      return;
    }

    try {
      const res = await fetch(`/api/words/${wordId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outcome,
          date: todayData?.date
        })
      });
      const data = await res.json();
      if (data.success) {
        // Update word in allWords
        setAllWords(prev => prev.map(w => w.id === wordId ? data.word : w));
        // Refresh stats
        const statsRes = await fetch('/api/stats');
        const statsJson = await statsRes.json();
        if (statsJson.success) setStats(statsJson.stats);
      }
    } catch (e) {
      console.error('Error recording review:', e);
    }
  };

  // Toggle Favorite
  const handleToggleFavorite = async (wordId) => {
    try {
      const res = await fetch(`/api/words/${wordId}/favorite`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setAllWords(prev => prev.map(w => {
          if (w.id === wordId) {
            return {
              ...w,
              progress: { ...w.progress, isFavorite: data.isFavorite }
            };
          }
          return w;
        }));

        if (selectedWord && selectedWord.id === wordId) {
          setSelectedWord(prev => ({
            ...prev,
            progress: { ...prev.progress, isFavorite: data.isFavorite }
          }));
        }
      }
    } catch (e) {
      console.error('Error toggling favorite:', e);
    }
  };

  // Save Custom Sentence
  const handleSaveSentence = async (wordId, sentence) => {
    if (!navigator.onLine) {
      queueAction({ type: 'sentence', wordId, sentence });
      showToast('Sentence saved offline. Will sync when reconnected.');
      setAllWords(prev => prev.map(w => w.id === wordId ? {
        ...w,
        progress: { ...w.progress, userSentence: sentence }
      } : w));
      if (selectedWord && selectedWord.id === wordId) {
        setSelectedWord(prev => ({
          ...prev,
          progress: { ...prev.progress, userSentence: sentence }
        }));
      }
      return;
    }

    try {
      const res = await fetch(`/api/words/${wordId}/sentence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence })
      });
      const data = await res.json();
      if (data.success) {
        setAllWords(prev => prev.map(w => {
          if (w.id === wordId) {
            return { ...w, progress: data.progress };
          }
          return w;
        }));

        if (selectedWord && selectedWord.id === wordId) {
          setSelectedWord(prev => ({ ...prev, progress: data.progress }));
        }
        showToast('Sentence saved to your vault ✓');
      }
    } catch (e) {
      console.error('Error saving sentence:', e);
    }
  };

  const handleLoginSuccess = (userData, token) => {
    setUser(userData);
    localStorage.setItem('lexipulse_user', JSON.stringify(userData));
    if (token) {
      localStorage.setItem('lexipulse_token', token);
    }
    if (userData?.preferences) {
      const applied = syncThemePreferencesFromDb(userData.preferences);
      if (applied && applied.theme) {
        setTheme(applied.theme);
      }
    }
    loadAllData();
  };

  const handleLogout = (reasonMsg) => {
    setUser(null);
    localStorage.removeItem('lexipulse_user');
    localStorage.removeItem('lexipulse_token');
    showToast(reasonMsg || 'Logged out successfully');
  };

  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <div>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '1.25rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 200,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-full)',
          padding: '0.6rem 1.4rem',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.85rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          {toastMessage}
        </div>
      )}

      {/* Main Navigation Bar */}
      <Navigation
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setActiveFlow(null);
          setCurrentTab(tab);
        }}
        streak={stats?.streak?.currentStreak || 0}
        dueCount={stats?.dueCount || 0}
        syncStatus={syncStatus}
        onSync={handleSync}
        syncing={syncing}
        theme={theme}
        setTheme={setTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenThemeStudio={() => setIsThemeStudioOpen(true)}
        onStartQuickPractice={() => setIsQuickPracticeOpen(true)}
        onLogout={handleLogout}
      />

      {/* Offline Status Banner */}
      {!isOnline && (
        <div style={{
          background: 'var(--accent-warning)',
          color: '#000',
          textAlign: 'center',
          padding: '0.4rem 1rem',
          fontSize: '0.8rem',
          fontWeight: 700
        }}>
          📡 Offline Mode Active — Your reviews and sentences are safely saved and will sync automatically upon reconnecting.
        </div>
      )}

      {/* Main App Container */}
      <main className="app-container">
        {/* FLOW: 1-by-1 Learning Session */}
        {activeFlow === 'learning' ? (
          <LearningSession
            words={todayData?.words || []}
            dateStr={todayData?.date}
            onComplete={handleCompleteLearning}
            onBack={({ startQuiz }) => {
              if (startQuiz) {
                setQuizMode('daily');
                setActiveFlow('quiz');
              } else {
                setActiveFlow(null);
              }
            }}
            onToggleFavorite={handleToggleFavorite}
            onSaveSentence={handleSaveSentence}
            onRecordReview={handleRecordReview}
          />
        ) : activeFlow === 'quiz' ? (
          /* FLOW: 5-Question Quiz Session */
          <QuizSession
            dateStr={todayData?.date}
            mode={quizMode}
            onCompleteQuiz={handleSubmitQuiz}
            onBack={() => setActiveFlow(null)}
            onGoToReview={() => {
              setActiveFlow(null);
              setCurrentTab('review');
            }}
          />
        ) : (
          /* REGULAR TABS */
          <>
            {currentTab === 'today' && (
              <TodayDashboard
                todayData={todayData}
                stats={stats}
                syncStatus={syncStatus}
                onConnectGoogle={handleConnectGoogle}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onStartLearning={() => setActiveFlow('learning')}
                onStartQuiz={() => {
                  setQuizMode('daily');
                  setActiveFlow('quiz');
                }}
                onGoToReview={() => setCurrentTab('review')}
                onGoToProgress={() => setCurrentTab('progress')}
                onSelectWord={w => setSelectedWord(w)}
                onStartQuickPractice={() => setIsQuickPracticeOpen(true)}
                onOpenConfusingWords={() => setIsConfusingWordsOpen(true)}
              />
            )}

            {currentTab === 'review' && (
              <ReviewSession
                onRecordReview={handleRecordReview}
                onToggleFavorite={handleToggleFavorite}
                onSelectWord={w => setSelectedWord(w)}
              />
            )}

            {currentTab === 'library' && (
              <VocabularyLibrary
                words={allWords}
                onSelectWord={w => setSelectedWord(w)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}

            {currentTab === 'progress' && (
              <ProgressDashboard
                stats={stats}
                words={allWords}
                onSelectWord={w => setSelectedWord(w)}
                onOpenWeeklyReview={() => setIsWeeklyReviewOpen(true)}
                onOpenAchievements={() => setIsAchievementsOpen(true)}
                onStartQuickPractice={() => setIsQuickPracticeOpen(true)}
                onOpenConfusingWords={() => setIsConfusingWordsOpen(true)}
              />
            )}
          </>
        )}
      </main>

      {/* Word Details Modal */}
      {selectedWord && (
        <WordDetailModal
          word={selectedWord}
          onClose={() => setSelectedWord(null)}
          onToggleFavorite={handleToggleFavorite}
          onSaveSentence={handleSaveSentence}
          onRecordReview={handleRecordReview}
        />
      )}

      {/* Settings & Google Drive Modal */}
      {isSettingsOpen && (
        <SettingsModal
          onClose={() => {
            setIsSettingsOpen(false);
            loadAllData();
          }}
          syncStatus={syncStatus}
          onSync={handleSync}
          syncing={syncing}
          theme={theme}
          setTheme={setTheme}
          onOpenThemeStudio={() => setIsThemeStudioOpen(true)}
          onLogout={handleLogout}
          user={user}
          onResetData={loadAllData}
        />
      )}

      {/* Theme Studio Modal */}
      {isThemeStudioOpen && (
        <ThemeStudioModal
          currentTheme={theme}
          onSelectTheme={(t) => setTheme(t)}
          onClose={() => setIsThemeStudioOpen(false)}
        />
      )}

      {/* Quick Practice Modal */}
      {isQuickPracticeOpen && (
        <QuickPracticeModal
          onClose={() => setIsQuickPracticeOpen(false)}
          onRecordReview={handleRecordReview}
          onRefreshStats={loadAllData}
        />
      )}

      {/* Confusing Words Mode Modal */}
      {isConfusingWordsOpen && (
        <ConfusingWordsSession
          onClose={() => setIsConfusingWordsOpen(false)}
          onRefreshStats={loadAllData}
        />
      )}

      {/* Weekly Review Modal */}
      {isWeeklyReviewOpen && (
        <WeeklyReviewModal
          onClose={() => setIsWeeklyReviewOpen(false)}
          onSelectWord={(w) => setSelectedWord(w)}
          onStartQuickPractice={() => setIsQuickPracticeOpen(true)}
        />
      )}

      {/* Achievements & Gamification Modal */}
      {isAchievementsOpen && (
        <AchievementsModal
          onClose={() => setIsAchievementsOpen(false)}
        />
      )}
    </div>
  );
}
