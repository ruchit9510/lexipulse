import React, { useState } from 'react';
import { 
  Flame, 
  Award, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  BookOpen, 
  RotateCcw,
  Check,
  ChevronRight
} from 'lucide-react';

export default function ProgressDashboard({ 
  stats, 
  words, 
  onSelectWord 
}) {
  const streak = stats?.streak || {};
  const currentStreak = streak.currentStreak || 0;
  const maxStreak = streak.maxStreak || 0;
  const completedDates = streak.completedDates || [];
  const dailySessions = stats?.dailySessions || {};

  const [selectedCalendarDate, setSelectedCalendarDate] = useState('2026-09-15');

  // Days in September 2026 (starts on Tuesday Sept 1, 30 days)
  const daysInSep2026 = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `2026-09-${String(dayNum).padStart(2, '0')}`;
    const isCompleted = completedDates.includes(dateStr);
    const session = dailySessions[dateStr];
    return {
      day: dayNum,
      dateStr,
      isCompleted,
      session
    };
  });

  // Selected date words
  const selectedDateWords = (words || []).filter(w => w.date === selectedCalendarDate);
  const selectedSession = dailySessions[selectedCalendarDate];

  // Strongest and needs practice lists
  const strongestWords = (words || []).filter(w => w.progress?.status === 'mastered').slice(0, 5);
  const practiceWords = (words || []).filter(w => w.progress?.status === 'needs_practice').slice(0, 5);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title */}
      <div>
        <h1 style={{ fontSize: '1.85rem', color: 'var(--text-primary)' }}>
          Learning Progress
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Track retention, study consistency, and mastery milestones.
        </p>
      </div>

      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Total Words */}
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Vault</span>
          <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
            {stats?.totalWords || 0}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Synchronized words</span>
        </div>

        {/* Mastered */}
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-success)', fontWeight: 600 }}>Mastered 🟢</span>
          <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-success)', marginTop: '0.2rem' }}>
            {stats?.masteredCount || 0}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{stats?.masteryPercentage || 0}% vault mastery</span>
        </div>

        {/* Learning */}
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-warning)', fontWeight: 600 }}>Practicing 🟡</span>
          <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-warning)', marginTop: '0.2rem' }}>
            {stats?.learningCount || 0}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active repetition ladder</span>
        </div>

        {/* Current Streak */}
        <div className="card">
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-flame)', fontWeight: 600 }}>Daily Streak 🔥</span>
          <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-flame)', marginTop: '0.2rem' }}>
            {currentStreak} <span style={{ fontSize: '1rem', fontWeight: 500 }}>days</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Best: {maxStreak} days</span>
        </div>
      </div>

      {/* Calendar History (Requirement 21) */}
      <div className="card card-elevated">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CalendarIcon size={18} style={{ color: 'var(--accent-primary)' }} />
              September 2026 History
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Click any completed date to inspect words and quiz scores.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-success)' }} /> Completed
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255, 255, 255, 0.1)' }} /> Available
            </span>
          </div>
        </div>

        {/* Calendar Day Labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem', textAlign: 'center', marginBottom: '0.5rem' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <span key={d} style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {d}
            </span>
          ))}
        </div>

        {/* Calendar Grid: Sept 1, 2026 was Tuesday (2 empty leading cells for Sun & Mon) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.35rem' }}>
          <div /> {/* Sun Aug 30 placeholder */}
          <div /> {/* Mon Aug 31 placeholder */}

          {daysInSep2026.map(d => {
            const isSelected = selectedCalendarDate === d.dateStr;
            const hasWords = (words || []).some(w => w.date === d.dateStr);

            return (
              <button
                key={d.day}
                onClick={() => setSelectedCalendarDate(d.dateStr)}
                style={{
                  aspectRatio: '1',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${isSelected ? 'var(--accent-primary)' : d.isCompleted ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)'}`,
                  background: isSelected 
                    ? 'var(--accent-primary-subtle)' 
                    : d.isCompleted 
                      ? 'var(--accent-success-subtle)' 
                      : hasWords 
                        ? 'rgba(255, 255, 255, 0.03)' 
                        : 'transparent',
                  color: isSelected ? 'var(--accent-primary)' : d.isCompleted ? 'var(--accent-success)' : 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: hasWords ? 'pointer' : 'default',
                  transition: 'all var(--transition-fast)',
                  padding: '0.2rem'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{d.day}</span>
                {d.isCompleted ? (
                  <Check size={12} style={{ color: 'var(--accent-success)', marginTop: 2 }} />
                ) : hasWords ? (
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent-primary)', marginTop: 4 }} />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Selected Date Details Panel */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
              Details for {selectedCalendarDate}
            </h4>

            {selectedSession?.quizScore && (
              <span className="badge badge-mastered">
                Quiz: {selectedSession.quizScore.score}/{selectedSession.quizScore.total} ({selectedSession.quizScore.percentage}%)
              </span>
            )}
          </div>

          {selectedDateWords.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {selectedDateWords.map(w => (
                <button
                  key={w.id}
                  className="card"
                  onClick={() => onSelectWord(w)}
                  style={{
                    padding: '0.65rem 1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.word}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— {w.meaning.slice(0, 30)}...</span>
                </button>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No vocabulary words were entered on this date.
            </p>
          )}
        </div>
      </div>

      {/* Performance Highlights (Strongest vs Needs Practice) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Strongest */}
        <div className="card">
          <h4 style={{ fontSize: '1rem', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Award size={16} /> Strongest Retention
          </h4>
          {strongestWords.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {strongestWords.map(w => (
                <div 
                  key={w.id} 
                  onClick={() => onSelectWord(w)} 
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.word}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-success)' }}>{w.progress?.reviewCount || 0} reviews</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Complete reviews to master words and see them highlighted here.
            </p>
          )}
        </div>

        {/* Needs Practice */}
        <div className="card">
          <h4 style={{ fontSize: '1rem', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <RotateCcw size={16} /> Needs Practice
          </h4>
          {practiceWords.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {practiceWords.map(w => (
                <div 
                  key={w.id} 
                  onClick={() => onSelectWord(w)} 
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{w.word}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-danger)' }}>Interval: {w.progress?.interval || 1}d</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No words are currently marked as needing practice! 🎉
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
