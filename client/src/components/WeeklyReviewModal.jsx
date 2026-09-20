import React, { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  RotateCcw, 
  ArrowUpRight, 
  ArrowDownRight,
  BookOpen,
  Sparkles
} from 'lucide-react';

export default function WeeklyReviewModal({ onClose, onSelectWord, onStartQuickPractice }) {
  const [weeklyData, setWeeklyData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyData();
  }, []);

  const fetchWeeklyData = async () => {
    try {
      const res = await fetch('/api/analytics/weekly');
      const data = await res.json();
      if (data.success && data.weekly) {
        setWeeklyData(data.weekly);
      }
    } catch (e) {
      console.error('Error fetching weekly report:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '2.2rem',
              height: '2.2rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                Weekly Review
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                {weeklyData ? `${weeklyData.startDate} — ${weeklyData.endDate}` : 'Your 7-day learning snapshot'}
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <TrendingUp size={32} className="spin" style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem' }} />
            <p>Compiling your weekly report...</p>
          </div>
        ) : weeklyData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Metric Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
              {/* Words Learned */}
              <div className="card" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Words Learned</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  {weeklyData.wordsLearned}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: weeklyData.diffWords >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {weeklyData.diffWords >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{Math.abs(weeklyData.diffWords)} vs last week</span>
                </div>
              </div>

              {/* Reviews Done */}
              <div className="card" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Reviews Conducted</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  {weeklyData.reviewsCompleted}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: weeklyData.diffReviews >= 0 ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
                  {weeklyData.diffReviews >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{Math.abs(weeklyData.diffReviews)} vs last week</span>
                </div>
              </div>

              {/* Retention Accuracy */}
              <div className="card" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Retention Accuracy</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-success)', margin: '0.2rem 0' }}>
                  {weeklyData.accuracyPercentage}%
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {weeklyData.accuracyPercentage >= 80 ? '🌟 Optimal target' : '💡 Practice recommended'}
                </span>
              </div>

              {/* Active Days */}
              <div className="card" style={{ padding: '1rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Days</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-warning)', margin: '0.2rem 0' }}>
                  {weeklyData.activeDays}/7
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {weeklyData.activeDays >= 5 ? '🔥 High consistency' : 'Keep building momentum'}
                </span>
              </div>
            </div>

            {/* Insights Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              {/* Strongest */}
              <div style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-success)', marginBottom: '0.35rem' }}>
                  <Award size={16} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Strongest Area</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                  {weeklyData.strongestDimension || 'Consistent daily review recall and fast completion.'}
                </p>
              </div>

              {/* Area to watch */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.05)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-warning)', marginBottom: '0.35rem' }}>
                  <AlertTriangle size={16} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Area to Watch</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: 0 }}>
                  {weeklyData.focusDimension || 'Sentence usage and workplace application practice.'}
                </p>
              </div>
            </div>

            {/* Difficult Words Spotlight */}
            {weeklyData.difficultWords && weeklyData.difficultWords.length > 0 && (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <RotateCcw size={15} style={{ color: 'var(--accent-danger)' }} />
                    Difficult Words Spotlight ({weeklyData.difficultWords.length})
                  </h4>
                  {onStartQuickPractice && (
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        onClose();
                        onStartQuickPractice();
                      }}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      <Sparkles size={13} />
                      <span>Quick Practice These</span>
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {weeklyData.difficultWords.map(w => (
                    <div
                      key={w.id}
                      onClick={() => {
                        onClose();
                        if (onSelectWord) onSelectWord(w);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.85rem',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        border: '1px solid var(--border-subtle)',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{w.word}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>— {(w.meaning || w.simpleMeaning)?.slice(0, 40)}...</span>
                      </div>
                      <span className="badge badge-practice" style={{ fontSize: '0.72rem' }}>
                        Need Practice
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
            No weekly report available yet. Complete your first reviews this week!
          </p>
        )}
      </div>
    </div>
  );
}
