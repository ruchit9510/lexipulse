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

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('lexipulse_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [theme, setTheme] = useState(() => localStorage.getItem('lexipulse_theme') || 'dark');
  const [currentTab, setCurrentTab] = useState('today'); // 'today' | 'review' | 'library' | 'progress'
  const [activeFlow, setActiveFlow] = useState(null); // 'learning' | 'quiz' | null
  const [quizMode, setQuizMode] = useState('daily'); // 'daily' | 'review'
  const [selectedWord, setSelectedWord] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Data states
  const [todayData, setTodayData] = useState(null);
  const [allWords, setAllWords] = useState([]);
  const [stats, setStats] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Apply Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('lexipulse_theme', theme);
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
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleSync(true);
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Auto-poll Google Drive every 60 seconds
    const intervalTimer = setInterval(() => {
      handleSync(true);
    }, 60000);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(intervalTimer);
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAllData = async () => {
    try {
      const [todayRes, allRes, statsRes, statusRes] = await Promise.all([
        fetch('/api/words/today'),
        fetch('/api/words/all'),
        fetch('/api/stats'),
        fetch('/api/status')
      ]);

      const [todayJson, allJson, statsJson, statusJson] = await Promise.all([
        todayRes.json(),
        allRes.json(),
        statsRes.json(),
        statusRes.json()
      ]);

      if (todayJson.success) setTodayData(todayJson);
      if (allJson.success) setAllWords(allJson.words || []);
      if (statsJson.success) setStats(statsJson.stats);
      if (statusJson.success) setSyncStatus(statusJson);
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
      const res = await fetch('/api/google/auth-url');
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

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    localStorage.setItem('lexipulse_user', JSON.stringify(userData));
    loadAllData();
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('lexipulse_user');
    showToast('Logged out successfully');
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
        onLogout={handleLogout}
      />

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
                onSelectWord={w => setSelectedWord(w)}
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
        />
      )}
    </div>
  );
}
