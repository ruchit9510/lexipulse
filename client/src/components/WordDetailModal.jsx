import React, { useState } from 'react';
import { 
  X, 
  Volume2, 
  Star, 
  Calendar, 
  Check, 
  RotateCcw, 
  Save, 
  PenTool, 
  Award,
  Clock,
  Sparkles,
  Lightbulb,
  MessageSquare,
  Tag
} from 'lucide-react';

export default function WordDetailModal({ 
  word, 
  onClose, 
  onToggleFavorite, 
  onSaveSentence, 
  onRecordReview 
}) {
  if (!word) return null;

  const [sentence, setSentence] = useState(word.progress?.userSentence || '');
  const [saved, setSaved] = useState(false);
  const [aiEval, setAiEval] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);

  const [currentMeaning, setCurrentMeaning] = useState(
    (word.meaning && word.meaning !== 'Meaning unavailable') 
      ? word.meaning 
      : (word.simpleMeaning && word.simpleMeaning !== 'Meaning unavailable') 
        ? word.simpleMeaning 
        : ''
  );
  const [generatingMeaning, setGeneratingMeaning] = useState(false);

  // Auto-generate meaning with AI if unavailable
  React.useEffect(() => {
    const rawMeaning = word.meaning || word.simpleMeaning || '';
    if (!rawMeaning || rawMeaning === 'Meaning unavailable') {
      let isMounted = true;
      setGeneratingMeaning(true);
      fetch('/api/ai/generate-meaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wordId: word.id,
          word: word.word,
          example: word.example,
          howToUse: word.howToUse
        })
      })
        .then(res => res.json())
        .then(data => {
          if (isMounted && data.success && data.meaning) {
            setCurrentMeaning(data.meaning);
            word.meaning = data.meaning;
            word.simpleMeaning = data.meaning;
          }
        })
        .catch(err => console.error('Failed to generate meaning with AI:', err))
        .finally(() => {
          if (isMounted) setGeneratingMeaning(false);
        });

      return () => { isMounted = false; };
    }
  }, [word]);

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (onSaveSentence) {
      await onSaveSentence(word.id, sentence.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleEvaluateWithAi = async () => {
    if (!sentence.trim()) return;
    setEvaluating(true);
    try {
      const res = await fetch('/api/ai/evaluate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: word.word,
          sentence: sentence.trim(),
          meaning: currentMeaning || word.meaning || word.simpleMeaning || ''
        })
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setAiEval(data.evaluation);
      }
    } catch (e) {
      console.error('Error evaluating with AI:', e);
    } finally {
      setEvaluating(false);
    }
  };

  const handleToggleInsights = async () => {
    if (showAiInsights) {
      setShowAiInsights(false);
      return;
    }
    setShowAiInsights(true);
    if (!insights) {
      setLoadingInsights(true);
      try {
        const res = await fetch('/api/ai/word-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: word.word,
            meaning: currentMeaning || word.meaning || word.simpleMeaning || '',
            example: word.example
          })
        });
        const data = await res.json();
        if (data.success && data.insights) {
          setInsights(data.insights);
        }
      } catch (e) {
        console.error('Error fetching AI insights:', e);
      } finally {
        setLoadingInsights(false);
      }
    }
  };

  const p = word.progress || {};
  const isFav = Boolean(p.isFavorite);
  const status = p.status || 'learning';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Mobile Bottom Sheet Handle */}
        <div className="sheet-handle" />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
                {word.word}
              </h2>
              <button 
                className="btn-icon" 
                onClick={() => speak(word.word)}
                style={{ borderRadius: '50%', width: '2.2rem', height: '2.2rem' }}
                title="Listen to pronunciation"
              >
                <Volume2 size={16} />
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.35rem' }}>
              <span className={`badge ${status === 'mastered' ? 'badge-mastered' : status === 'needs_practice' ? 'badge-practice' : 'badge-learning'}`}>
                {status}
              </span>
              {word.date && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Calendar size={12} /> {word.date}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              className="btn-icon" 
              onClick={() => onToggleFavorite(word.id)}
              title={isFav ? 'Remove favorite' : 'Add favorite'}
            >
              <Star 
                size={18} 
                fill={isFav ? 'var(--accent-gold)' : 'none'} 
                style={{ color: isFav ? 'var(--accent-gold)' : 'var(--text-muted)' }} 
              />
            </button>
            <button className="btn-icon" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Word Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Simple Meaning */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
                Simple Meaning
              </span>
              {generatingMeaning && (
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Sparkles size={12} className="animate-spin" /> AI Generating...
                </span>
              )}
            </div>
            {generatingMeaning && !currentMeaning ? (
              <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '0.2rem', fontStyle: 'italic' }}>
                Generating definition with Gemini AI...
              </p>
            ) : (
              <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: '0.2rem', lineHeight: '1.5' }}>
                {currentMeaning || word.meaning || word.simpleMeaning || 'Meaning unavailable'}
              </p>
            )}
          </div>

          {/* Example Sentence */}
          {word.example && (
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                Example Sentence
              </span>
              <p className="example-quote">
                "{word.example}"
              </p>
            </div>
          )}

          {/* How to Use It */}
          {word.howToUse && (
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
                How to Use It
              </span>
              <div className="usage-note">
                {word.howToUse}
              </div>
            </div>
          )}

          {/* AI Insights Button & Card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.05) 100%)',
            border: '1px solid var(--border-highlight)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Gemini AI Memory Hook & Context
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleToggleInsights}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                {loadingInsights ? 'Generating...' : showAiInsights ? 'Hide' : '✨ Generate AI Insights'}
              </button>
            </div>

            {showAiInsights && insights && (
              <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
                {/* Mnemonic */}
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                    <Lightbulb size={14} /> Mnemonic Trick:
                  </span>
                  <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {insights.mnemonic}
                  </p>
                </div>

                {/* Real-World Dialogue */}
                {insights.workplaceDialogue && (
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.2rem' }}>
                      <MessageSquare size={14} /> Real-World Dialogue:
                    </span>
                    <pre style={{
                      fontFamily: 'inherit',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      whiteSpace: 'pre-wrap',
                      background: 'rgba(0, 0, 0, 0.2)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--radius-md)',
                      margin: 0
                    }}>
                      {insights.workplaceDialogue}
                    </pre>
                  </div>
                )}

                {/* Collocations */}
                {insights.collocations && insights.collocations.length > 0 && (
                  <div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.35rem' }}>
                      <Tag size={13} /> Common Collocations:
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {insights.collocations.map((c, idx) => (
                        <span key={idx} className="badge badge-learning" style={{ fontSize: '0.75rem' }}>
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Sentence Practice */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <PenTool size={14} /> My Custom Sentence:
            </span>
            <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={sentence}
                onChange={e => {
                  setSentence(e.target.value);
                  setAiEval(null);
                }}
                placeholder={`e.g. Write your own sentence with ${word.word}...`}
                style={{
                  flex: '1 1 200px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.6rem 0.85rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
              <button type="submit" className="btn btn-secondary" style={{ padding: '0.6rem 0.9rem' }}>
                {saved ? <Check size={16} style={{ color: 'var(--accent-success)' }} /> : <Save size={16} />}
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleEvaluateWithAi}
                disabled={evaluating || !sentence.trim()}
                style={{ padding: '0.6rem 0.9rem', fontSize: '0.85rem' }}
              >
                <Sparkles size={15} />
                <span>{evaluating ? 'Evaluating...' : 'AI Coach'}</span>
              </button>
            </form>

            {/* AI Sentence Feedback Card */}
            {aiEval && (
              <div style={{
                marginTop: '0.75rem',
                background: aiEval.isGood ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: `1px solid ${aiEval.isGood ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: aiEval.isGood ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                    {aiEval.isGood ? '✓ Great Usage!' : '💡 Needs Fine-Tuning'} • Rating: {'★'.repeat(aiEval.score || 3)}{'☆'.repeat(Math.max(0, 5 - (aiEval.score || 3)))}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  {aiEval.feedback}
                </p>
                {aiEval.polishedSentence && aiEval.polishedSentence !== sentence && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Polished Native Phrasing:</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                        "{aiEval.polishedSentence}"
                      </span>
                      <button
                        type="button"
                        onClick={() => setSentence(aiEval.polishedSentence)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: 'none',
                          color: 'var(--text-primary)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Use this
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Memory Strength & Ebbinghaus Forgetting Curve Visualization */}
          {(() => {
            const interval = p.interval || 1;
            const reviewCount = p.reviewCount || 0;
            const lastReviewed = p.lastReviewedAt ? new Date(p.lastReviewedAt) : null;
            const daysElapsed = lastReviewed 
              ? Math.max(0, Math.floor((new Date() - lastReviewed) / (1000 * 60 * 60 * 24)))
              : 0;
            const stability = Math.max(1, interval * 1.5);
            const retentionRate = Math.min(100, Math.max(10, Math.round(Math.exp(-daysElapsed / stability) * 100)));
            const srsStage = Math.min(6, reviewCount);
            const nextReviewStr = p.nextReviewDate 
              ? new Date(p.nextReviewDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              : 'Today';

            let retentionColor = 'var(--accent-success)';
            let statusLabel = 'Optimal Memory Retention';
            if (retentionRate < 60) {
              retentionColor = 'var(--accent-danger)';
              statusLabel = 'Memory Decay Warning — Review Due';
            } else if (retentionRate < 80) {
              retentionColor = 'var(--accent-warning)';
              statusLabel = 'Approaching Forgetting Threshold';
            }

            return (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={16} style={{ color: retentionColor }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Memory Strength & Forgetting Curve
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: retentionColor }}>
                    {retentionRate}% Retention
                  </span>
                </div>

                {/* Ebbinghaus Retention Bar */}
                <div>
                  <div style={{ height: '7px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${retentionRate}%`,
                      height: '100%',
                      background: retentionColor,
                      borderRadius: 'var(--radius-full)',
                      transition: 'width 0.4s ease'
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    <span>{statusLabel}</span>
                    <span>Next Review: {nextReviewStr}</span>
                  </div>
                </div>

                {/* SRS Stages Dots */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SRS Ladder:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {[1, 2, 3, 4, 5, 6].map(stg => (
                      <div
                        key={stg}
                        title={`SRS Stage ${stg}`}
                        style={{
                          width: '18px',
                          height: '6px',
                          borderRadius: 'var(--radius-full)',
                          background: stg <= srsStage ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)',
                          transition: 'background 0.3s ease'
                        }}
                      />
                    ))}
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-primary)', marginLeft: '0.3rem' }}>
                      Stage {srsStage}/6
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Learning Statistics Card */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.75rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reviews</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.15rem' }}>
                {p.reviewCount || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Interval</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.15rem' }}>
                {p.interval || 1}d
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Correct Ratio</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-success)', marginTop: '0.15rem' }}>
                {(p.correctCount || 0) + (p.incorrectCount || 0) > 0 
                  ? Math.round(((p.correctCount || 0) / ((p.correctCount || 0) + (p.incorrectCount || 0))) * 100) + '%'
                  : '—'}
              </div>
            </div>
          </div>

          {/* Quick Recall Action */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button 
              className="btn btn-danger" 
              style={{ flex: 1 }}
              onClick={async () => {
                if (onRecordReview) await onRecordReview(word.id, 'need_practice');
                onClose();
              }}
            >
              <RotateCcw size={16} />
              <span>Mark Need Practice</span>
            </button>

            <button 
              className="btn btn-success" 
              style={{ flex: 1 }}
              onClick={async () => {
                if (onRecordReview) await onRecordReview(word.id, 'known');
                onClose();
              }}
            >
              <Check size={16} />
              <span>Mark Mastered</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
