import React, { useState } from 'react';
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
  Lightbulb,
  MessageSquare,
  Tag
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
  const [userSentence, setUserSentence] = useState('');
  const [sentenceSaved, setSentenceSaved] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [wordConfidence, setWordConfidence] = useState({});
  const [aiEval, setAiEval] = useState(null);
  const [evaluating, setEvaluating] = useState(false);
  const [insights, setInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showAiInsights, setShowAiInsights] = useState(false);

  if (!words || words.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h3>No words available for this session.</h3>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '1rem' }}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentWord = words[currentIndex];
  const total = words.length;
  const progressPercent = Math.round(((currentIndex + 1) / total) * 100);

  // Audio pronunciation using Web Speech API
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
      setUserSentence('');
      setSentenceSaved(false);
      setAiEval(null);
      setInsights(null);
      setShowAiInsights(false);
    } else {
      // Session finished
      setSessionCompleted(true);
      onComplete(words.map(w => w.id));
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setRevealed(true);
      setUserSentence('');
      setSentenceSaved(false);
      setAiEval(null);
      setInsights(null);
      setShowAiInsights(false);
    }
  };

  const handleConfidence = async (outcome) => {
    setWordConfidence(prev => ({ ...prev, [currentWord.id]: outcome }));
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
            word: currentWord.word,
            meaning: currentWord.meaning,
            example: currentWord.example
          })
        });
        const data = await res.json();
        if (data.success && data.insights) {
          setInsights(data.insights);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingInsights(false);
      }
    }
  };

  // Completion summary view
  if (sessionCompleted) {
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
          margin: '0 auto 1.5rem auto'
        }}>
          <Sparkles size={32} />
        </div>

        <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          Daily Session Complete! 🎉
        </h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 2rem auto' }}>
          You've explored all {total} vocabulary words for today. Cement your retention with today's quick 5-question challenge.
        </p>

        {/* Word recap */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
          {words.map(w => (
            <div 
              key={w.id} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.05)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: 'var(--radius-md)', 
                padding: '0.4rem 0.85rem',
                fontSize: '0.9rem',
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
            style={{ padding: '0.85rem 1.8rem' }}
          >
            <span>Start Daily Quiz</span>
            <Award size={18} />
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => onBack({ startQuiz: false })}
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Session Bar (Back, Counter, Progress Bar) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn-icon" onClick={() => onBack({ startQuiz: false })} title="Exit session">
          <ArrowLeft size={18} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.85rem', 
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
          title={currentWord.progress?.isFavorite ? 'Remove from favorites' : 'Mark as favorite'}
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
            background: 'linear-gradient(90deg, var(--accent-primary), #818cf8)', 
            transition: 'width var(--transition-normal)' 
          }} 
        />
      </div>

      {/* Hero Word Learning Card */}
      <div className="word-learning-card">
        {/* Word and Audio Button */}
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

        {/* Word Reveal Section */}
        {!revealed ? (
          <div style={{ margin: '2rem 0', width: '100%', maxWidth: '380px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.25rem' }}>
              Do you remember what this word means?
            </p>
            <button 
              className="btn btn-secondary" 
              onClick={() => setRevealed(true)}
              style={{ width: '100%', padding: '0.9rem' }}
            >
              <Eye size={17} />
              <span>Show Meaning & Context</span>
            </button>
          </div>
        ) : (
          <div className="word-meaning-box animate-fade-in">
            {/* Simple Meaning */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
                Simple Meaning
              </span>
              <p style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginTop: '0.25rem', lineHeight: '1.5' }}>
                {currentWord.meaning}
              </p>
            </div>

            {/* Example Sentence */}
            {currentWord.example && (
              <div style={{ marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  Example
                </span>
                <p className="example-quote">
                  "{currentWord.example}"
                </p>
              </div>
            )}

            {/* How to Use It */}
            {currentWord.howToUse && (
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
                  How to Use It
                </span>
                <div className="usage-note">
                  {currentWord.howToUse}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Sentence Practice (Optional, Requirement 12) */}
        {revealed && (
          <div style={{ width: '100%', marginTop: '1.5rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              <PenTool size={14} />
              <span><strong>Your Turn:</strong> Write a quick sentence with <em>{currentWord.word}</em> (optional):</span>
            </div>

            <form onSubmit={handleSaveSentence} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={userSentence || currentWord.progress?.userSentence || ''}
                onChange={e => { setUserSentence(e.target.value); setSentenceSaved(false); setAiEval(null); }}
                placeholder={`e.g. In my work, we avoided a ${currentWord.word.toLowerCase()} by...`}
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

            {/* AI Sentence Feedback */}
            {aiEval && (
              <div style={{
                marginTop: '0.75rem',
                background: aiEval.isGood ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: `1px solid ${aiEval.isGood ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: aiEval.isGood ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
                    {aiEval.isGood ? '✓ Great Usage' : '💡 Tip'} • Score: {'★'.repeat(aiEval.score || 3)}{'☆'.repeat(Math.max(0, 5 - (aiEval.score || 3)))}
                  </span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0.2rem 0' }}>
                  {aiEval.feedback}
                </p>
                {aiEval.polishedSentence && (
                  <div style={{ marginTop: '0.5rem', borderTop: '1px dashed var(--border-subtle)', paddingTop: '0.4rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Polished:</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontStyle: 'italic' }}>
                        "{aiEval.polishedSentence}"
                      </span>
                      <button
                        type="button"
                        onClick={() => setUserSentence(aiEval.polishedSentence)}
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
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Confidence Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button 
          className="btn btn-secondary"
          onClick={handlePrev}
          disabled={currentIndex === 0}
          style={{ padding: '0.75rem 1.2rem' }}
        >
          <ArrowLeft size={16} />
          <span>Previous</span>
        </button>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            className="btn btn-danger"
            onClick={() => handleConfidence('need_practice')}
            title="Mark for upcoming spaced repetition"
          >
            <RotateCcw size={16} />
            <span>Need Practice</span>
          </button>

          <button 
            className="btn btn-success"
            onClick={() => handleConfidence('known')}
            title="Confident in this word"
          >
            <Check size={16} />
            <span>I Know This</span>
          </button>
        </div>

        <button 
          className="btn btn-primary"
          onClick={handleNext}
          style={{ padding: '0.75rem 1.2rem' }}
        >
          <span>{currentIndex === total - 1 ? 'Finish' : 'Next'}</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
