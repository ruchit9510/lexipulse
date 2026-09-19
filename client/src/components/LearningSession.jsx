import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  Volume2, 
  Star, 
  Check, 
  RotateCcw, 
  Eye, 
  PenTool, 
  Save, 
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function LearningSession({ 
  words, 
  dateStr, 
  onComplete, 
  onBack, 
  onToggleFavorite, 
  onSaveSentence, 
  onRecordReview 
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showSentenceDrawer, setShowSentenceDrawer] = useState(false);
  const [userSentence, setUserSentence] = useState('');
  const [sentenceSaved, setSentenceSaved] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [aiEval, setAiEval] = useState(null);
  const [evaluating, setEvaluating] = useState(false);

  if (!words || words.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h3>No words available for this session.</h3>
        <button className="btn btn-secondary" onClick={() => onBack({ startQuiz: false })} style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const total = words.length;
  const progressPercent = Math.round(((currentIndex + 1) / total) * 100);

  // Keyboard Navigation: Space (Reveal), 1 (Need Practice), 2 (I Know This), F (Favorite), Arrows
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setRevealed(true);
      } else if (e.key === '1') {
        e.preventDefault();
        if (revealed) handleConfidence('need_practice');
      } else if (e.key === '2') {
        e.preventDefault();
        if (revealed) handleConfidence('known');
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        onToggleFavorite(currentWord.id);
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack({ startQuiz: false });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [revealed, currentIndex, currentWord]);

  // Audio pronunciation
  const speakWord = (wordText) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(wordText);
      utterance.rate = 0.9;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(prev => prev + 1);
      setRevealed(false);
      setShowSentenceDrawer(false);
      setUserSentence('');
      setSentenceSaved(false);
      setAiEval(null);
    } else {
      setSessionCompleted(true);
      onComplete(words.map(w => w.id));
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setRevealed(true);
      setShowSentenceDrawer(false);
      setUserSentence('');
      setSentenceSaved(false);
      setAiEval(null);
    }
  };

  const handleConfidence = async (outcome) => {
    if (onRecordReview) {
      await onRecordReview(currentWord.id, outcome);
    }
    handleNext();
  };

  const handleSaveSentence = async (e) => {
    e.preventDefault();
    if (!userSentence.trim()) return;
    await onSaveSentence(currentWord.id, userSentence.trim());
    setSentenceSaved(true);
  };

  const handleEvaluateAi = async () => {
    const text = userSentence.trim() || currentWord.progress?.userSentence || '';
    if (!text) return;
    setEvaluating(true);
    try {
      const res = await fetch('/api/ai/evaluate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: currentWord.word,
          sentence: text,
          meaning: currentWord.meaning
        })
      });
      const data = await res.json();
      if (data.success && data.evaluation) {
        setAiEval(data.evaluation);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setEvaluating(false);
    }
  };

  // Completion Screen
  if (sessionCompleted) {
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

        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontWeight: 800 }}>
          Daily Session Complete! 🎉
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 2rem auto', fontSize: '0.95rem' }}>
          You explored all {total} vocabulary words for today. Test your active recall with the daily 5-question challenge.
        </p>

        {/* Word recap pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
          {words.map(w => (
            <div 
              key={w.id} 
              style={{ 
                background: 'var(--bg-surface-elevated)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.45rem 0.9rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)'
              }}
            >
              {w.word}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={() => onBack({ startQuiz: true })}
            style={{ padding: '0.85rem 1.8rem', minHeight: '48px' }}
          >
            <span>Start Daily Quiz</span>
            <Award size={18} />
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => onBack({ startQuiz: false })}
            style={{ minHeight: '48px' }}
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {/* Top Navigation Bar: Back, Counter, Favorite */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button 
          className="btn-icon" 
          onClick={() => onBack({ startQuiz: false })} 
          title="Exit session (Esc)"
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.9rem', 
            fontWeight: 700, 
            color: 'var(--accent-primary)',
            letterSpacing: '0.05em' 
          }}>
            {String(currentIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
          </span>
        </div>

        <button 
          className="btn-icon" 
          onClick={() => onToggleFavorite(currentWord.id)}
          title={currentWord.progress?.isFavorite ? 'Remove from favorites (F)' : 'Mark as favorite (F)'}
        >
          <Star 
            size={18} 
            fill={currentWord.progress?.isFavorite ? 'var(--accent-gold)' : 'none'} 
            style={{ color: currentWord.progress?.isFavorite ? 'var(--accent-gold)' : 'var(--text-muted)' }} 
          />
        </button>
      </div>

      {/* Progress Track */}
      <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div 
          style={{ 
            width: `${progressPercent}%`, 
            height: '100%', 
            background: 'var(--accent-primary)', 
            transition: 'width var(--transition-normal)' 
          }} 
        />
      </div>

      {/* Hero Active Recall Flashcard */}
      <div className="word-learning-card" style={{ minHeight: '340px', justifyContent: 'space-between' }}>
        {/* Word Title & Pronunciation */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center' }}>
            <h2 className="word-hero-title">
              {currentWord.word}
            </h2>
            <button 
              className="btn-icon" 
              onClick={() => speakWord(currentWord.word)}
              title="Listen to pronunciation"
              style={{ borderRadius: '50%', width: '2.5rem', height: '2.5rem' }}
            >
              <Volume2 size={18} />
            </button>
          </div>
        </div>

        {/* STEP 1: UNREVEALED (Recall Prompt) */}
        {!revealed ? (
          <div style={{ margin: '3rem 0', width: '100%', maxWidth: '380px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '1.5rem' }}>
              Can you recall what this word means?
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
          /* STEP 2: REVEALED (Meaning, Example, Workplace Usage) */
          <div className="word-meaning-box animate-fade-in" style={{ width: '100%', margin: '1.5rem 0' }}>
            {/* Simple Meaning */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
                Simple Meaning
              </span>
              <p style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: '1.5', fontWeight: 500 }}>
                {currentWord.meaning}
              </p>
            </div>

            {/* Example Sentence */}
            {currentWord.example && (
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                  Example
                </span>
                <p className="example-quote" style={{ margin: '0.35rem 0 0 0' }}>
                  "{currentWord.example}"
                </p>
              </div>
            )}

            {/* How to Use It */}
            {currentWord.howToUse && (
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
                  Workplace Context
                </span>
                <div className="usage-note">
                  {currentWord.howToUse}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Collapsible User Sentence Practice */}
        {revealed && (
          <div style={{ width: '100%', textAlign: 'left', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowSentenceDrawer(!showSentenceDrawer)}
              style={{ padding: '0.4rem 0', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <PenTool size={14} />
              <span>{showSentenceDrawer ? 'Hide Sentence Practice' : 'Write your own sentence (optional)'}</span>
              {showSentenceDrawer ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showSentenceDrawer && (
              <div style={{ marginTop: '0.75rem' }}>
                <form onSubmit={handleSaveSentence} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={userSentence || currentWord.progress?.userSentence || ''}
                    onChange={e => { setUserSentence(e.target.value); setSentenceSaved(false); setAiEval(null); }}
                    placeholder={`e.g. In our team sprint, we handled the ${currentWord.word.toLowerCase()} by...`}
                    style={{
                      flex: '1 1 200px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.65rem 0.9rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  <button 
                    type="submit" 
                    className="btn btn-secondary"
                    style={{ padding: '0.65rem 1rem' }}
                    disabled={!userSentence.trim()}
                  >
                    {sentenceSaved ? <Check size={16} style={{ color: 'var(--accent-success)' }} /> : <Save size={16} />}
                    <span>{sentenceSaved ? 'Saved' : 'Save'}</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEvaluateAi}
                    disabled={evaluating || !(userSentence.trim() || currentWord.progress?.userSentence)}
                    style={{ padding: '0.65rem 1rem', fontSize: '0.85rem' }}
                  >
                    <Sparkles size={15} />
                    <span>{evaluating ? 'Analyzing...' : 'AI Coach'}</span>
                  </button>
                </form>

                {aiEval && (
                  <div style={{
                    marginTop: '0.75rem',
                    background: aiEval.isGood ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                    border: `1px solid ${aiEval.isGood ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.75rem 1rem'
                  }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: aiEval.isGood ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                      {aiEval.isGood ? '✓ Great Usage' : '💡 Tip'}
                    </span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                      {aiEval.feedback}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Recall Assessment Bar (Active Recall Choice) */}
      <div className="learning-bottom-bar">
        {revealed ? (
          <div className="learning-confidence-btns" style={{ width: '100%' }}>
            <button 
              className="btn btn-danger"
              onClick={() => handleConfidence('need_practice')}
              style={{ minHeight: '52px', fontSize: '1rem', flex: 1 }}
              title="Mark for upcoming spaced repetition (Key: 1)"
            >
              <RotateCcw size={18} />
              <span>Need Practice</span>
              <span className="kbd-hint">1</span>
            </button>

            <button 
              className="btn btn-success"
              onClick={() => handleConfidence('known')}
              style={{ minHeight: '52px', fontSize: '1rem', flex: 1 }}
              title="Confident in this word (Key: 2)"
            >
              <Check size={18} />
              <span>I Know This</span>
              <span className="kbd-hint">2</span>
            </button>
          </div>
        ) : (
          <div className="learning-nav-btns" style={{ width: '100%', display: 'flex', justifyContent: 'space-between' }}>
            <button 
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              style={{ minHeight: '46px', padding: '0.75rem 1.4rem' }}
            >
              <ArrowLeft size={16} />
              <span>Previous</span>
            </button>

            <button 
              className="btn btn-secondary"
              onClick={handleNext}
              style={{ minHeight: '46px', padding: '0.75rem 1.4rem' }}
            >
              <span>Skip</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
