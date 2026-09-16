import React from 'react';
import { 
  Flame, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Award, 
  RotateCcw, 
  Zap,
  Sparkles,
  ChevronRight,
  Cloud,
  HardDrive
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
  onSelectWord 
}) {
  const words = todayData?.words || [];
  const count = words.length;
  const isCompleted = Boolean(todayData?.dailySession?.completedWords?.length > 0);
  const quizCompleted = Boolean(todayData?.dailySession?.quizCompleted);
  const quizScore = todayData?.dailySession?.quizScore;

  // Localized greeting & date
  const now = new Date();
  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  // Format date: e.g. "Tuesday, September 15, 2026"
  const formattedDate = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  const streakCount = stats?.streak?.currentStreak || 0;
  const totalLearned = (stats?.masteredCount || 0) + (stats?.learningCount || 0);
  const masteryRate = stats?.masteryPercentage || 0;
  const dueReviews = stats?.dueCount || 0;
  const isDriveConnected = Boolean(syncStatus?.driveConnected);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header Greeting & Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
            {greeting} 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Clock size={15} style={{ color: 'var(--text-muted)' }} />
            {formattedDate}
          </p>
        </div>

        {streakCount > 0 && (
          <div 
            className="badge badge-streak"
            style={{ 
              padding: '0.45rem 0.9rem', 
              fontSize: '0.9rem', 
              boxShadow: '0 2px 10px rgba(249, 115, 22, 0.2)' 
            }}
          >
            <Flame size={18} style={{ color: 'var(--accent-flame)' }} />
            <span>{streakCount} Day Streak</span>
          </div>
        )}
      </div>

      {/* Google Drive Auto-Sync Banner */}
      {!isDriveConnected ? (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(79, 70, 229, 0.08) 100%)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: '2.75rem',
              height: '2.75rem',
              borderRadius: '50%',
              background: 'var(--accent-primary-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <Cloud size={22} />
            </div>
            <div>
              <h4 style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                Auto-Fetch Google Drive
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>
                Connect your Google Drive once. The app will automatically fetch the 5 new words added daily by your Gemini flow.
              </p>
            </div>
          </div>

          <button 
            className="btn btn-primary"
            onClick={onConnectGoogle}
            style={{ padding: '0.65rem 1.3rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
          >
            <span>Connect Google Drive</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.6rem 1rem',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.85rem',
          color: 'var(--accent-success)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle2 size={16} />
            <span><strong>Google Drive Auto-Fetch Active:</strong> Syncing with <code>{syncStatus?.selectedDriveFileName || 'Words.xlsx'}</code></span>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-updating</span>
        </div>
      )}


      {/* Primary Hero Card: Today's Vocabulary */}
      <div 
        className="card card-elevated"
        style={{
          background: 'linear-gradient(145deg, rgba(20, 28, 48, 0.9) 0%, rgba(30, 41, 69, 0.8) 100%)',
          border: '1px solid var(--border-highlight)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '240px',
          height: '240px',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 700, 
              textTransform: 'uppercase', 
              letterSpacing: '0.08em', 
              color: 'var(--accent-primary)' 
            }}>
              Today's Routine • 5-10 Min
            </span>
            <h2 style={{ fontSize: '1.75rem', marginTop: '0.2rem', color: 'var(--text-primary)' }}>
              Today's Vocabulary
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isCompleted ? (
              <span className="badge badge-mastered" style={{ padding: '0.35rem 0.75rem' }}>
                <CheckCircle2 size={14} />
                Learned Today
              </span>
            ) : (
              <span className="badge badge-learning" style={{ padding: '0.35rem 0.75rem' }}>
                <Sparkles size={14} />
                {count} New Words
              </span>
            )}
          </div>
        </div>

        {/* Word Preview Chips */}
        {words.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.75rem' }}>
            {words.map(w => {
              const status = w.progress?.status || 'learning';
              return (
                <button
                  key={w.id}
                  onClick={() => onSelectWord(w)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.5rem 0.85rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 600,
                    fontSize: '1rem',
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
        ) : (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No vocabulary entries found for today. Check Settings or sync with Google Drive.
          </div>
        )}

        {/* Action CTAs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          <button 
            className="btn btn-primary"
            onClick={onStartLearning}
            style={{ padding: '0.8rem 1.6rem', fontSize: '1rem' }}
          >
            <span>{isCompleted ? 'Review Today’s Session' : 'Start Today’s Learning'}</span>
            <ArrowRight size={18} />
          </button>

          <button 
            className="btn btn-secondary"
            onClick={onStartQuiz}
          >
            <Zap size={16} style={{ color: 'var(--accent-warning)' }} />
            <span>{quizCompleted ? `Daily Quiz (${quizScore?.percentage || 0}%)` : 'Daily Quiz Challenge'}</span>
          </button>
        </div>
      </div>

      {/* Progress & Review Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {/* Your Progress */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Your Progress
            </span>
            <Award size={18} style={{ color: 'var(--accent-primary)' }} />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {totalLearned}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Words in Vault
            </span>
          </div>

          <div style={{ marginTop: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
              <span>Mastery Rate</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{masteryRate}%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{ width: `${masteryRate}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))', borderRadius: 'var(--radius-full)' }} />
            </div>
          </div>
        </div>

        {/* Spaced Review Due */}
        <div 
          className="card"
          style={{ 
            cursor: dueReviews > 0 ? 'pointer' : 'default',
            borderColor: dueReviews > 0 ? 'var(--border-highlight)' : 'var(--border-subtle)' 
          }}
          onClick={dueReviews > 0 ? onGoToReview : undefined}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Review Due
            </span>
            <RotateCcw size={18} style={{ color: dueReviews > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: dueReviews > 0 ? 'var(--accent-warning)' : 'var(--accent-success)' }}>
              {dueReviews}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {dueReviews === 1 ? 'word needs review' : 'words need review'}
            </span>
          </div>

          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {dueReviews > 0 ? 'Spaced retention queue ready' : 'All caught up for today! 🎉'}
            </span>
            {dueReviews > 0 && (
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                Review <ChevronRight size={14} />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
