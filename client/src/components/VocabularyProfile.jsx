import React, { useState, useEffect } from 'react';
import { 
  Target, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle,
  BrainCircuit,
  Zap
} from 'lucide-react';

export default function VocabularyProfile({ onStartQuickPractice, onOpenConfusingWords }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/analytics/weaknesses');
      const data = await res.json();
      if (data.success && data.profile) {
        setProfileData(data.profile);
      } else if (data.success) {
        setProfileData(data);
      }
    } catch (e) {
      console.error('Error fetching weakness profile:', e);
    } finally {
      setLoading(false);
    }
  };

  // Safely extract dimensions as an array whether object or array
  const rawDimensions = profileData?.dimensions;
  const dimensions = rawDimensions
    ? (Array.isArray(rawDimensions) ? rawDimensions : Object.values(rawDimensions))
    : [
        { key: 'meaning_recall', id: 'meaning_recall', label: 'Meaning Recall', score: 70 },
        { key: 'word_recall', id: 'word_recall', label: 'Word Recall', score: 65 },
        { key: 'context_understanding', id: 'context_understanding', label: 'Context Understanding', score: 60 },
        { key: 'sentence_usage', id: 'sentence_usage', label: 'Sentence Usage', score: 50 },
        { key: 'workplace_usage', id: 'workplace_usage', label: 'Workplace Usage', score: 55 },
        { key: 'retention', id: 'retention', label: 'Retention Stability', score: 68 }
      ];

  // Safely extract recommendations as an array
  let recommendations = [];
  if (profileData?.recommendations) {
    if (Array.isArray(profileData.recommendations)) {
      recommendations = profileData.recommendations;
    } else if (Array.isArray(profileData.recommendations.items)) {
      recommendations = profileData.recommendations.items.map(it => ({
        message: it.label || it.message || 'Complete targeted practice',
        actionType: (it.type === 'recall' || it.type === 'srs') ? 'quick_practice' : 'confusing_words'
      }));
    }
  }

  const focusLabel = profileData?.weakestArea?.label || (profileData?.primaryWeakness ? profileData.primaryWeakness.replace('_', ' ') : null);

  return (
    <div className="card card-elevated" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BrainCircuit size={18} style={{ color: 'var(--accent-primary)' }} />
            Personal Weakness Detection Profile
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
            Multi-signal Bayesian analysis across 6 cognitive retention dimensions.
          </p>
        </div>

        {focusLabel && (
          <span className="badge badge-practice" style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}>
            Focus: {focusLabel}
          </span>
        )}
      </div>

      {/* 6 Dimensions Progress Bars */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
        {dimensions.map((dim, idx) => {
          const key = dim.id || dim.key || idx;
          const label = dim.label || key;
          const score = Math.round(dim.score || 0);
          let color = 'var(--accent-success)';
          if (score < 50) color = 'var(--accent-danger)';
          else if (score < 70) color = 'var(--accent-warning)';

          return (
            <div 
              key={key} 
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 0.85rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {label}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>
                  {score}%
                </span>
              </div>

              <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{
                  width: `${score}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.4s ease'
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Dynamic Actionable Recommendations */}
      {recommendations.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-primary)', fontSize: '0.85rem', fontWeight: 700 }}>
            <Sparkles size={16} />
            <span>AI Retention Recommendations</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recommendations.map((rec, idx) => {
              const text = typeof rec === 'string' ? rec : (rec.message || rec.label || 'Practice recommended');
              return (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-primary)',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span>{text}</span>
                  </div>

                  {rec.actionType === 'quick_practice' && onStartQuickPractice && (
                    <button
                      className="btn btn-secondary"
                      onClick={onStartQuickPractice}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <span>Start Quick Practice</span>
                      <ArrowRight size={13} />
                    </button>
                  )}

                  {rec.actionType === 'confusing_words' && onOpenConfusingWords && (
                    <button
                      className="btn btn-secondary"
                      onClick={onOpenConfusingWords}
                      style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                    >
                      <span>Practice Confusing Words</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
