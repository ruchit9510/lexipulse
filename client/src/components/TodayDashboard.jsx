import React from 'react';
import { 
  Flame, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  RotateCcw, 
  Zap, 
  Sparkles, 
  Cloud, 
  Split,
  ChevronRight,
  BookOpen
} from 'lucide-react';

export default function TodayDashboard({ 
  todayData, 
  stats, 
  syncStatus,
  onConnectGoogle,
  onOpenSettings,
  onStartLearning, 
  onStartQuiz, 
  onGoToReview,
  onGoToProgress,
  onSelectWord,
  onStartQuickPractice,
  onOpenConfusingWords
}) {
  const words = todayData?.words || [];
  const count = words.length;
  const completedWords = todayData?.dailySession?.completedWords || [];
  const completedCount = completedWords.length;
  const isCompleted = completedCount >= count && count > 0;
  const quizCompleted = Boolean(todayData?.dailySession?.quizCompleted);
  const quizScore = todayData?.dailySession?.quizScore;

  // Localized greeting & date
  const now = new Date();
  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const streakCount = stats?.streak?.currentStreak || 0;
  const dueReviews = stats?.dueCount || 0;
  const isDriveConnected = Boolean(syncStatus?.driveConnected);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* LEVEL 4 (Quiet Header): Greeting, Date & Streak */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 1.85rem)', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
            {greeting}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={13} style={{ color: 'var(--text-muted)' }} />
            {formattedDate}
          </p>
        </div>

        {streakCount > 0 && (
          <div 
            className="badge badge-streak"
            onClick={onGoToProgress}
            style={{ 
              padding: '0.35rem 0.75rem', 
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: onGoToProgress ? 'pointer' : 'default'
            }}
            title="View learning progress, consistency & streak history"
          >
            <Flame size={15} style={{ color: 'var(--accent-flame)' }} />
            <span>{streakCount} Day Streak</span>
          </div>
        )}
      </div>

      {/* Quiet Google Drive status (only if disconnected, show quiet connect prompt) */}
      {!isDriveConnected && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1.1rem',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-secondary)' }}>
            <Cloud size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>Connect Google Drive to auto-fetch your daily 5 words.</span>
          </div>
          <button 
            className="btn btn-secondary"
            onClick={onConnectGoogle}
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
          >
            Connect Drive
          </button>
        </div>
      )}

      {/* LEVEL 1: Primary Learning Cockpit (Dominant Action) */}
      <div 
        className="card card-elevated"
        style={{
          padding: '2rem 1.75rem',
          border: '1px solid var(--border-highlight)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          background: 'var(--bg-surface)'
        }}
      >
        <div>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 700, 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            color: 'var(--accent-primary)' 
          }}>
            Daily Routine • 5-10 Min
          </span>

          <h2 style={{ fontSize: '1.85rem', margin: '0.35rem 0 0.2rem 0', color: 'var(--text-primary)', fontWeight: 800 }}>
            {isCompleted ? "Today's Words Explored 🎉" : "Ready for Today's 5 Words?"}
          </h2>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: 0 }}>
            {isCompleted 
              ? "You've walked through today's vocabulary. Cement your recall with a quiz or review."
              : "Discover 5 curated words, examine workplace contexts, and practice retention."}
          </p>
        </div>

        {/* LEVEL 2: Visual 5-Segment Progress Indicator */}
        <div style={{
          background: 'var(--bg-surface-elevated)',
          padding: '0.85rem 1.1rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Today's Progress:
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {completedCount} of {count} words completed
            </span>
          </div>

          {/* 5 Dots / Segments */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {Array.from({ length: Math.max(5, count) }).map((_, idx) => {
              const isFilled = idx < completedCount;
              return (
                <span 
                  key={idx}
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: isFilled ? 'var(--accent-success)' : 'rgba(255, 255, 255, 0.12)',
                    transition: 'all var(--transition-fast)'
                  }}
                  title={isFilled ? `Word ${idx + 1} completed` : `Word ${idx + 1} pending`}
                />
              );
            })}
          </div>
        </div>

        {/* Word Preview Chips (Click to view details) */}
        {words.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {words.map(w => {
              const status = w.progress?.status || 'learning';
              return (
                <button
                  key={w.id}
                  onClick={() => onSelectWord(w)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.45rem 0.85rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  <span>{w.word}</span>
                  <span style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: status === 'mastered' ? 'var(--accent-success)' : status === 'needs_practice' ? 'var(--accent-danger)' : 'var(--accent-warning)'
                  }} />
                </button>
              );
            })}
          </div>
        )}

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          <button 
            className="btn btn-primary"
            onClick={onStartLearning}
            style={{ padding: '0.85rem 1.75rem', fontSize: '1rem', flex: '1 1 220px', minHeight: '48px' }}
          >
            <span>{isCompleted ? 'Review Today’s Session' : 'Start Today’s Session'}</span>
            <ArrowRight size={18} />
          </button>

          <button 
            className="btn btn-secondary"
            onClick={onStartQuiz}
            style={{ flex: '1 1 200px', minHeight: '48px' }}
          >
            <Zap size={16} style={{ color: 'var(--accent-warning)' }} />
            <span>{quizCompleted ? `Daily Quiz (${quizScore?.percentage || 0}%)` : 'Daily Quiz Challenge'}</span>
          </button>
        </div>
      </div>

      {/* LEVEL 3: Focused Cockpit Cards (Secondary Actions) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1rem' }}>
        {/* Card 1: Review Due */}
        <div 
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem',
            cursor: dueReviews > 0 ? 'pointer' : 'default',
            borderColor: dueReviews > 0 ? 'var(--border-highlight)' : 'var(--border-subtle)'
          }}
          onClick={dueReviews > 0 ? onGoToReview : undefined}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Spaced Repetition
              </span>
              <RotateCcw size={16} style={{ color: dueReviews > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: dueReviews > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
                {dueReviews}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {dueReviews === 1 ? 'word due for review' : 'words due for review'}
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', margin: 0 }}>
              {dueReviews > 0 
                ? 'Review now to prevent memory decay before the forgetting threshold.' 
                : 'All spaced repetition reviews are caught up for today! 🎉'}
            </p>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={(e) => { e.stopPropagation(); onGoToReview(); }}
            disabled={dueReviews === 0}
            style={{ width: '100%', minHeight: '44px', justifyContent: 'space-between' }}
          >
            <span>{dueReviews > 0 ? 'Start Review Queue' : 'Queue Empty'}</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Card 2: 5-Minute Quick Practice */}
        <div 
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Adaptive Practice
              </span>
              <Clock size={16} style={{ color: 'var(--accent-primary)' }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                5m
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                rapid tune-up session
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', margin: 0 }}>
              Pulls words prioritized by your weakest memory dimensions.
            </p>
          </div>

          <button 
            className="btn btn-secondary"
            onClick={onStartQuickPractice}
            style={{ width: '100%', minHeight: '44px', justifyContent: 'space-between' }}
          >
            <span>Start Quick Practice</span>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Card 3: Confusing Words Mode */}
        {onOpenConfusingWords && (
          <div 
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '1rem'
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Word Pairs
                </span>
                <Split size={16} style={{ color: 'var(--accent-primary)' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  6
                </span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  curated confusing pairs
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.4rem', margin: 0 }}>
                Master tricky distinctions like affect/effect and accept/except with mnemonic rules.
              </p>
            </div>

            <button 
              className="btn btn-secondary"
              onClick={onOpenConfusingWords}
              style={{ width: '100%', minHeight: '44px', justifyContent: 'space-between' }}
            >
              <span>Practice Confusing Words</span>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
