import React, { useState, useEffect } from 'react';
import { 
  RotateCcw, 
  Check, 
  Eye, 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Volume2, 
  Star,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

export default function ReviewSession({ 
  onRecordReview, 
  onToggleFavorite, 
  onSelectWord 
}) {
  const [dueWords, setDueWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReviewIndex, setActiveReviewIndex] = useState(null); // null means list view, number means active review
  const [revealed, setRevealed] = useState(false);
  const [reviewedStats, setReviewedStats] = useState({ known: 0, practice: 0 });

  useEffect(() => {
    fetchDueWords();
  }, []);

  const fetchDueWords = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/words/review');
      const data = await res.json();
      if (data.success) {
        setDueWords(data.words || []);
      }
    } catch (e) {
      console.error('Error fetching due words:', e);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard Navigation: Space (Reveal), 1 (Need Practice), 2 (I Know This), F (Favorite), Esc (Exit)
  useEffect(() => {
    if (typeof activeReviewIndex !== 'number') return;
    const word = dueWords[activeReviewIndex];
    if (!word) return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setRevealed(true);
      } else if (e.key === '1') {
        e.preventDefault();
        if (revealed) handleReviewOutcome('need_practice');
      } else if (e.key === '2') {
        e.preventDefault();
        if (revealed) handleReviewOutcome('known');
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        onToggleFavorite(word.id);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setActiveReviewIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeReviewIndex, revealed, dueWords]);

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  const handleStartReview = () => {
    if (dueWords.length > 0) {
      setActiveReviewIndex(0);
      setRevealed(false);
      setReviewedStats({ known: 0, practice: 0 });
    }
  };

  const handleReviewOutcome = async (outcome) => {
    const word = dueWords[activeReviewIndex];
    if (onRecordReview) {
      await onRecordReview(word.id, outcome);
    }

    if (outcome === 'known') {
      setReviewedStats(p => ({ ...p, known: p.known + 1 }));
    } else {
      setReviewedStats(p => ({ ...p, practice: p.practice + 1 }));
    }

    if (activeReviewIndex < dueWords.length - 1) {
      setActiveReviewIndex(prev => prev + 1);
      setRevealed(false);
    } else {
      // Completed all due words
      setActiveReviewIndex('complete');
      fetchDueWords();
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading spaced repetition queue...</p>
      </div>
    );
  }

  // Active Review Flashcard Mode
  if (typeof activeReviewIndex === 'number' && dueWords[activeReviewIndex]) {
    const word = dueWords[activeReviewIndex];
    const total = dueWords.length;
    const progressPct = Math.round(((activeReviewIndex + 1) / total) * 100);

    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn-icon" onClick={() => setActiveReviewIndex(null)} title="Exit review (Esc)">
            <ArrowLeft size={18} />
          </button>
          
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-warning)', letterSpacing: '0.05em' }}>
            Review {activeReviewIndex + 1} of {total}
          </span>

          <button className="btn-icon" onClick={() => onToggleFavorite(word.id)} title="Favorite (F)">
            <Star 
              size={18} 
              fill={word.progress?.isFavorite ? 'var(--accent-gold)' : 'none'} 
              style={{ color: word.progress?.isFavorite ? 'var(--accent-gold)' : 'var(--text-muted)' }} 
            />
          </button>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--accent-warning)', transition: 'width 0.2s' }} />
        </div>

        {/* Review Card */}
        <div className="word-learning-card" style={{ minHeight: '340px', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
              <h2 className="word-hero-title">{word.word}</h2>
              <button className="btn-icon" onClick={() => speakWord(word.word)} style={{ borderRadius: '50%', width: '2.5rem', height: '2.5rem' }}>
                <Volume2 size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
              <span className="badge badge-learning">
                Interval: {word.progress?.interval || 1}d • {word.progress?.reviewCount || 0} reviews
              </span>
            </div>
          </div>

          {!revealed ? (
            <div style={{ margin: '3rem 0', width: '100%', maxWidth: '380px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
                Can you recall this word's meaning and usage?
              </p>
              <button 
                className="btn btn-primary" 
                onClick={() => setRevealed(true)}
                style={{ width: '100%', padding: '0.95rem', minHeight: '52px', fontSize: '1.05rem' }}
              >
                <Eye size={18} />
                <span>Reveal Meaning</span>
                <span className="kbd-hint">Space</span>
              </button>
            </div>
          ) : (
            <div className="word-meaning-box animate-fade-in" style={{ width: '100%', margin: '1.5rem 0' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
                  Simple Meaning
                </span>
                <p style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: '1.5', fontWeight: 500 }}>
                  {word.meaning}
                </p>
              </div>

              {word.example && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                    Example Sentence
                  </span>
                  <p className="example-quote" style={{ margin: '0.35rem 0 0 0' }}>"{word.example}"</p>
                </div>
              )}

              {word.howToUse && (
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
                    Workplace Context
                  </span>
                  <div className="usage-note">{word.howToUse}</div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          {revealed && (
            <div className="review-action-btns" style={{ width: '100%', display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-danger"
                onClick={() => handleReviewOutcome('need_practice')}
                style={{ flex: 1, minHeight: '52px', fontSize: '1rem' }}
                title="Mark for repetition tomorrow (Key: 1)"
              >
                <RotateCcw size={18} />
                <span>Need Practice</span>
                <span className="kbd-hint">1</span>
              </button>

              <button 
                className="btn btn-success"
                onClick={() => handleReviewOutcome('known')}
                style={{ flex: 1, minHeight: '52px', fontSize: '1rem' }}
                title="Mastered, expand interval (Key: 2)"
              >
                <Check size={18} />
                <span>I Know This</span>
                <span className="kbd-hint">2</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Review Completed Summary
  if (activeReviewIndex === 'complete') {
    return (
      <div className="animate-fade-in card card-elevated" style={{ textAlign: 'center', padding: '3.5rem 2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          width: '4.5rem',
          height: '4.5rem',
          borderRadius: '50%',
          background: 'var(--accent-success-subtle)',
          color: 'var(--accent-success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <Sparkles size={32} />
        </div>

        <h2 style={{ fontSize: '1.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 800 }}>
          Spaced Review Complete! 🎉
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
          You've refreshed your memory. Intervals have been adjusted automatically based on your recall.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <span className="badge badge-mastered" style={{ padding: '0.45rem 0.9rem', fontSize: '0.9rem' }}>
            <CheckCircle2 size={16} /> {reviewedStats.known} Remembered
          </span>
          {reviewedStats.practice > 0 && (
            <span className="badge badge-practice" style={{ padding: '0.45rem 0.9rem', fontSize: '0.9rem' }}>
              <RotateCcw size={16} /> {reviewedStats.practice} Scheduled Tomorrow
            </span>
          )}
        </div>

        <button className="btn btn-primary" onClick={() => setActiveReviewIndex(null)} style={{ padding: '0.85rem 1.75rem' }}>
          Back to Review Queue
        </button>
      </div>
    );
  }

  // Review Queue List Mode
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
            Spaced Review
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.2rem' }}>
            Strengthen long-term memory with scientifically spaced intervals (1d → 3d → 7d → 14d → 30d).
          </p>
        </div>

        {dueWords.length > 0 && (
          <button className="btn btn-primary" onClick={handleStartReview} style={{ padding: '0.75rem 1.5rem', minHeight: '44px' }}>
            <RotateCcw size={17} />
            <span>Start Review ({dueWords.length})</span>
          </button>
        )}
      </div>

      {/* Due Words Overview */}
      {dueWords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <div style={{
            width: '3.5rem',
            height: '3.5rem',
            borderRadius: '50%',
            background: 'var(--accent-success-subtle)',
            color: 'var(--accent-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <CheckCircle2 size={28} />
          </div>
          <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
            All caught up on reviews!
          </h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '380px', margin: '0 auto' }}>
            No words are currently due for spaced repetition. Tomorrow's words will be queued automatically.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              {dueWords.length} {dueWords.length === 1 ? 'Word' : 'Words'} Due for Recall
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Prioritizing words needing practice
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {dueWords.map(w => {
              const p = w.progress || {};
              const isPractice = p.status === 'needs_practice';
              return (
                <div
                  key={w.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    cursor: 'pointer',
                    borderColor: isPractice ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-subtle)'
                  }}
                  onClick={() => onSelectWord(w)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <h4 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                      {w.word}
                    </h4>
                    <span className={`badge ${isPractice ? 'badge-practice' : p.status === 'mastered' ? 'badge-mastered' : 'badge-learning'}`}>
                      {isPractice ? 'Needs work' : p.status}
                    </span>
                  </div>

                  <p style={{ 
                    fontSize: '0.85rem', 
                    color: 'var(--text-secondary)', 
                    display: '-webkit-box', 
                    WebkitLineClamp: 2, 
                    WebkitBoxOrient: 'vertical', 
                    overflow: 'hidden',
                    lineHeight: '1.4'
                  }}>
                    {w.meaning}
                  </p>

                  <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>{p.reviewCount || 0} reviews</span>
                    <span>Interval: {p.interval || 1}d</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
