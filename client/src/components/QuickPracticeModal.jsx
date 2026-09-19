import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Clock, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Award, 
  ArrowRight, 
  RotateCcw,
  Sparkles,
  Volume2
} from 'lucide-react';

export default function QuickPracticeModal({ onClose, onRecordReview, onRefreshStats }) {
  const [selectedDuration, setSelectedDuration] = useState(5);
  const [stage, setStage] = useState('select'); // 'select' | 'loading' | 'practicing' | 'finished'
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [sessionResults, setSessionResults] = useState(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const timerRef = useRef(null);

  const DURATION_OPTIONS = [
    { mins: 2, label: '2 Minutes', words: 4, desc: 'Ultra-quick micro session' },
    { mins: 5, label: '5 Minutes', words: 8, desc: 'Recommended daily tune-up', popular: true },
    { mins: 10, label: '10 Minutes', words: 14, desc: 'Deep memory consolidation' },
    { mins: 15, label: '15 Minutes', words: 20, desc: 'Intensive vocabulary sprint' }
  ];

  // Start Quick Practice
  const handleStart = async (durationMins) => {
    const mins = durationMins || selectedDuration;
    setStage('loading');
    try {
      const res = await fetch(`/api/quick-practice?duration=${mins}`);
      const data = await res.json();

      if (data.success && data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setSelectedAnswer(null);
        setIsAnswerChecked(false);
        setScore(0);
        setTimeLeft(mins * 60);
        setStage('practicing');
      } else {
        alert(data.message || 'Not enough words in your vault yet to start practice.');
        setStage('select');
      }
    } catch (e) {
      console.error('Error starting quick practice:', e);
      setStage('select');
    }
  };

  // Timer countdown
  useEffect(() => {
    if (stage === 'practicing' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleFinishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [stage]);

  const speak = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  const handleSelectOption = (idx) => {
    if (isAnswerChecked) return;
    setSelectedAnswer(idx);
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null || isAnswerChecked) return;
    setIsAnswerChecked(true);

    const currentQ = questions[currentIndex];
    const isCorrect = selectedAnswer === currentQ.correctIndex;
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    // Call spaced repetition review in background
    if (onRecordReview && currentQ.wordId) {
      onRecordReview(currentQ.wordId, isCorrect ? 'known' : 'need_practice');
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsAnswerChecked(false);
    } else {
      handleFinishSession();
    }
  };

  const handleFinishSession = async () => {
    clearInterval(timerRef.current);
    const finalScore = score + (selectedAnswer === questions[currentIndex]?.correctIndex && !isAnswerChecked ? 1 : 0);
    const totalQ = questions.length;
    
    setStage('finished');
    try {
      const res = await fetch('/api/quick-practice/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: selectedDuration,
          questionsCount: totalQ,
          score: finalScore
        })
      });
      const data = await res.json();
      if (data.success) {
        setEarnedXp(data.xpAwarded || 20);
        setSessionResults({
          score: finalScore,
          total: totalQ,
          percentage: Math.round((finalScore / totalQ) * 100),
          gamification: data.gamification
        });
        if (onRefreshStats) onRefreshStats();
      }
    } catch (e) {
      setSessionResults({
        score: finalScore,
        total: totalQ,
        percentage: Math.round((finalScore / totalQ) * 100)
      });
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentQ = questions[currentIndex];

  return (
    <div className="modal-overlay" onClick={stage === 'practicing' ? undefined : onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '640px' }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-warning-subtle)',
              color: 'var(--accent-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={16} />
            </div>
            <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
              Quick Practice
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {stage === 'practicing' && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-full)',
                background: timeLeft < 30 ? 'var(--accent-danger-subtle)' : 'var(--bg-surface-elevated)',
                color: timeLeft < 30 ? 'var(--accent-danger)' : 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.85rem'
              }}>
                <Clock size={14} />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
            <button className="btn-icon" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* STAGE 1: SELECT DURATION */}
        {stage === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
              Short on time? Pick your session length. The adaptive engine pulls words prioritized by your weakest memory dimensions.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {DURATION_OPTIONS.map(opt => {
                const isSel = selectedDuration === opt.mins;
                return (
                  <div
                    key={opt.mins}
                    onClick={() => setSelectedDuration(opt.mins)}
                    style={{
                      background: isSel ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                      border: `1.5px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '1rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      position: 'relative'
                    }}
                  >
                    {opt.popular && (
                      <span style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '12px',
                        background: 'var(--accent-warning)',
                        color: '#000',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.5rem',
                        borderRadius: 'var(--radius-full)'
                      }}>
                        Most Popular
                      </span>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {opt.label}
                      </span>
                      <span className="badge badge-learning" style={{ fontSize: '0.75rem' }}>
                        ~{opt.words} words
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {opt.desc}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-primary"
              onClick={() => handleStart(selectedDuration)}
              style={{ padding: '0.85rem', width: '100%', fontSize: '1rem', marginTop: '0.5rem' }}
            >
              <span>Start {selectedDuration}-Minute Session</span>
              <ArrowRight size={18} />
            </button>
          </div>
        )}

        {/* STAGE: LOADING */}
        {stage === 'loading' && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
            <Zap size={32} className="spin" style={{ color: 'var(--accent-primary)', marginBottom: '1rem' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Preparing tailored practice questions...
            </p>
            <p style={{ fontSize: '0.82rem' }}>
              Selecting words from your weakest recall areas.
            </p>
          </div>
        )}

        {/* STAGE 2: PRACTICING */}
        {stage === 'practicing' && currentQ && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Progress bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <span>Question {currentIndex + 1} of {questions.length}</span>
                <span>Score: {score} correct</span>
              </div>
              <div style={{ height: '5px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div style={{
                  width: `${((currentIndex + 1) / questions.length) * 100}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Prompt Card */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-highlight)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {currentQ.type === 'meaning' ? 'Select the Correct Meaning' : 'Complete the Sentence'}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', margin: '0.5rem 0' }}>
                <h3 style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                  {currentQ.word}
                </h3>
                <button 
                  className="btn-icon" 
                  onClick={() => speak(currentQ.word)}
                  style={{ width: '2rem', height: '2rem', borderRadius: '50%' }}
                  title="Listen"
                >
                  <Volume2 size={16} />
                </button>
              </div>

              {currentQ.exampleSentence && (
                <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', fontStyle: 'italic', margin: '0.5rem 0 0' }}>
                  "{currentQ.exampleSentence}"
                </p>
              )}
            </div>

            {/* Options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === currentQ.correctIndex;
                let borderColor = 'var(--border-subtle)';
                let bg = 'var(--bg-surface)';

                if (isAnswerChecked) {
                  if (isCorrect) {
                    borderColor = 'var(--accent-success)';
                    bg = 'rgba(34, 197, 94, 0.1)';
                  } else if (isSelected) {
                    borderColor = 'var(--accent-danger)';
                    bg = 'rgba(239, 68, 68, 0.1)';
                  }
                } else if (isSelected) {
                  borderColor = 'var(--accent-primary)';
                  bg = 'var(--accent-primary-subtle)';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.9rem 1.1rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${borderColor}`,
                      background: bg,
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      fontSize: '0.92rem',
                      cursor: isAnswerChecked ? 'default' : 'pointer',
                      transition: 'all var(--transition-fast)',
                      minHeight: '44px'
                    }}
                  >
                    <span>{opt}</span>
                    {isAnswerChecked && isCorrect && (
                      <CheckCircle2 size={18} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />
                    )}
                    {isAnswerChecked && isSelected && !isCorrect && (
                      <XCircle size={18} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation & Action Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              {isAnswerChecked ? (
                <div style={{ flex: 1, marginRight: '1rem' }}>
                  <span style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: selectedAnswer === currentQ.correctIndex ? 'var(--accent-success)' : 'var(--accent-danger)'
                  }}>
                    {selectedAnswer === currentQ.correctIndex ? '✓ Correct!' : '✗ Incorrect'}
                  </span>
                  {currentQ.explanation && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                      {currentQ.explanation}
                    </p>
                  )}
                </div>
              ) : <div />}

              {!isAnswerChecked ? (
                <button
                  className="btn btn-primary"
                  onClick={handleCheckAnswer}
                  disabled={selectedAnswer === null}
                  style={{ minWidth: '120px', padding: '0.75rem 1.25rem' }}
                >
                  Check
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleNext}
                  style={{ minWidth: '120px', padding: '0.75rem 1.25rem' }}
                >
                  <span>{currentIndex + 1 < questions.length ? 'Next' : 'Finish'}</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* STAGE 3: FINISHED */}
        {stage === 'finished' && sessionResults && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-success) 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto',
              boxShadow: '0 4px 20px var(--accent-primary-glow)'
            }}>
              <Award size={32} />
            </div>

            <div>
              <h3 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                Practice Completed!
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                You completed a {selectedDuration}-minute adaptive vocabulary session.
              </p>
            </div>

            {/* Score Summary Card */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.75rem',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {sessionResults.score}/{sessionResults.total}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Accuracy</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-success)', marginTop: '0.2rem' }}>
                  {sessionResults.percentage}%
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>XP Earned</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-warning)', marginTop: '0.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
                  <Sparkles size={16} /> +{earnedXp}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setStage('select')}
                style={{ flex: 1, padding: '0.75rem' }}
              >
                <RotateCcw size={16} />
                <span>Practice Again</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={onClose}
                style={{ flex: 1, padding: '0.75rem' }}
              >
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
