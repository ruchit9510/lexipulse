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
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
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
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="btn-icon" onClick={() => setActiveReviewIndex(null)} title="Exit review">
            <ArrowLeft size={18} />
          </button>
          
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-warning)' }}>
            Review {activeReviewIndex + 1} of {total}
          </span>

          <button className="btn-icon" onClick={() => onToggleFavorite(word.id)}>
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
        <div className="word-learning-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
            <h2 className="word-hero-title">{word.word}</h2>
            <button className="btn-icon" onClick={() => speakWord(word.word)} style={{ borderRadius: '50%' }}>
              <Volume2 size={18} />
            </button>
          </div>

          <span className="badge badge-learning" style={{ marginTop: '0.5rem' }}>
            Interval: {word.progress?.interval || 1}d • {word.progress?.reviewCount || 0} reviews
          </span>

          {!revealed ? (
            <div style={{ margin: '2.5rem 0', width: '100%', maxWidth: '340px' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>
                Can you recall this word's meaning and usage?
              </p>
              <button 
                className="btn btn-secondary" 
                onClick={() => setRevealed(true)}
                style={{ width: '100%', padding: '0.85rem' }}
              >
                <Eye size={16} />
                <span>Show Meaning</span>
              </button>
            </div>
          ) : (
            <div className="word-meaning-box animate-fade-in">
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
                  Simple Meaning
                </span>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {word.meaning}
                </p>
              </div>

              {word.example && (
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Example Sentence
                  </span>
                  <p className="example-quote">"{word.example}"</p>
                </div>
              )}

              {word.howToUse && (
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)' }}>
                    How to Use It
                  </span>
                  <div className="usage-note">{word.howToUse}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {revealed && (
          <div className="animate-fade-in review-action-btns">
            <button 
              className="btn btn-danger"
              onClick={() => handleReviewOutcome('need_practice')}
            >
              <RotateCcw size={16} />
              <span>Need Practice</span>
            </button>

            <button 
              className="btn btn-success"
              onClick={() => handleReviewOutcome('known')}
            >
              <Check size={16} />
              <span>I Know This</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Review Completed Summary
  if (activeReviewIndex === 'complete') {
    return (
      <div className="animate-fade-in card card-elevated" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{
          width: '4rem',
          height: '4rem',
          borderRadius: '50%',
          background: 'var(--accent-success-subtle)',
          color: 'var(--accent-success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto'
        }}>
          <Sparkles size={32} />
        </div>

        <h2 style={{ fontSize: '1.85rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
          Spaced Review Complete! 🎉
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
          You've refreshed your memory. Intervals have been adjusted automatically based on your recall.
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
          <span className="badge badge-mastered" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
            <CheckCircle2 size={16} /> {reviewedStats.known} Remembered
          </span>
          {reviewedStats.practice > 0 && (
            <span className="badge badge-practice" style={{ padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}>
              <RotateCcw size={16} /> {reviewedStats.practice} Scheduled Tomorrow
            </span>
          )}
        </div>

        <button className="btn btn-primary" onClick={() => setActiveReviewIndex(null)}>
          Back to Review Queue
        </button>
      </div>
    );
  }

  // Review Queue List Mode
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--text-primary)' }}>
            Spaced Review
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Strengthen long-term memory with scientifically spaced intervals (1d → 3d → 7d → 14d → 30d).
          </p>
        </div>

        {dueWords.length > 0 && (
          <button className="btn btn-primary" onClick={handleStartReview} style={{ padding: '0.75rem 1.5rem' }}>
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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
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
