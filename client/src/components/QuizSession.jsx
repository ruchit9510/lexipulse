import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ArrowLeft, 
  Award, 
  RotateCcw, 
  Check, 
  HelpCircle, 
  Sparkles 
} from 'lucide-react';

export default function QuizSession({ 
  dateStr, 
  mode = 'daily', 
  onCompleteQuiz, 
  onBack, 
  onGoToReview 
}) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [quizFinished, setQuizFinished] = useState(false);
  const [aiHint, setAiHint] = useState(null);
  const [loadingHint, setLoadingHint] = useState(false);

  useEffect(() => {
    fetchQuizQuestions();
  }, [dateStr, mode]);

  // Keyboard navigation: 1, 2, 3, 4 for options; Enter/Space for next question
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

      if (!answered && currentQ) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (idx < currentQ.options.length) {
            e.preventDefault();
            handleSelectOption(idx);
          }
        }
      } else if (answered && (e.key === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        handleNextQuestion();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [answered, currentIndex, questions]);

  const fetchQuizQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz?date=${dateStr || ''}&mode=${mode}`);
      const data = await res.json();
      if (data.success && data.questions?.length > 0) {
        setQuestions(data.questions);
      } else {
        setError('No quiz questions available. Please sync or select another day.');
      }
    } catch (err) {
      setError('Failed to generate quiz: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (idx) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);

    const q = questions[currentIndex];
    const isCorrect = idx === q.correctIndex;

    setUserAnswers(prev => [
      ...prev,
      {
        questionId: q.id,
        wordId: q.wordId,
        targetWord: q.targetWord,
        isCorrect,
        chosenIndex: idx,
        correctIndex: q.correctIndex
      }
    ]);
  };

  const handleNextQuestion = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setAnswered(false);
      setAiHint(null);
    } else {
      // Quiz finished
      setQuizFinished(true);
      const correctCount = userAnswers.filter(a => a.isCorrect).length;
      const total = questions.length;
      const percentage = Math.round((correctCount / total) * 100);

      // Trigger subtle celebratory confetti if score >= 80%
      if (percentage >= 80) {
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch (e) {}
      }

      // Record to backend
      try {
        await onCompleteQuiz({
          date: dateStr,
          results: userAnswers,
          score: correctCount,
          total
        });
      } catch (e) {
        console.error('Failed to submit quiz:', e);
      }
    }
  };

  const handleFetchAiHint = async () => {
    if (aiHint) {
      setAiHint(null);
      return;
    }
    const q = questions[currentIndex];
    if (!q) return;

    setLoadingHint(true);
    try {
      const res = await fetch('/api/ai/quiz-hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: q.targetWord,
          question: q.prompt + ' ' + (q.contextText || ''),
          options: q.options
        })
      });
      const data = await res.json();
      if (data.success && data.hint) {
        setAiHint(data.hint);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHint(false);
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Preparing daily quiz challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ color: 'var(--accent-danger)', marginBottom: '1rem' }}>{error}</p>
        <button className="btn btn-secondary" onClick={onBack}>Back to Dashboard</button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const isLast = currentIndex === questions.length - 1;

  // Results Screen
  if (quizFinished) {
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    const total = questions.length;
    const percentage = Math.round((correctCount / total) * 100);
    const difficultWords = userAnswers.filter(a => !a.isCorrect);

    return (
      <div className="animate-fade-in card card-elevated" style={{ textAlign: 'center', padding: '3.5rem 2rem', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{
          width: '4.5rem',
          height: '4.5rem',
          borderRadius: '50%',
          background: percentage >= 80 ? 'var(--accent-success-subtle)' : 'var(--accent-warning-subtle)',
          color: percentage >= 80 ? 'var(--accent-success)' : 'var(--accent-warning)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem auto'
        }}>
          <Award size={36} />
        </div>

        <h2 style={{ fontSize: '2rem', marginBottom: '0.4rem', color: 'var(--text-primary)', fontWeight: 800 }}>
          {percentage >= 80 ? 'Excellent Recall! 🎯' : 'Quiz Completed'}
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
          You scored <strong>{correctCount}</strong> out of <strong>{total}</strong> ({percentage}%).
        </p>

        {/* Difficult words spotlight if any incorrect */}
        {difficultWords.length > 0 && (
          <div style={{
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            textAlign: 'left',
            marginBottom: '2rem'
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Words to practice
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.5rem' }}>
              {difficultWords.map(a => (
                <span key={a.questionId} className="badge badge-practice">
                  {a.targetWord}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={onBack}
            style={{ padding: '0.85rem 1.8rem', minHeight: '48px' }}
          >
            <span>Back to Dashboard</span>
          </button>
          
          {difficultWords.length > 0 && (
            <button 
              className="btn btn-secondary"
              onClick={onGoToReview}
              style={{ minHeight: '48px' }}
            >
              <RotateCcw size={16} />
              <span>Review Queue</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn-icon" onClick={onBack} title="Exit Quiz (Esc)">
          <ArrowLeft size={18} />
        </button>

        <span style={{ 
          fontFamily: 'var(--font-mono)', 
          fontSize: '0.85rem', 
          fontWeight: 700, 
          color: 'var(--accent-primary)',
          letterSpacing: '0.05em' 
        }}>
          Question {currentIndex + 1} of {questions.length}
        </span>

        {/* AI Hint button */}
        <button 
          className="btn-icon"
          onClick={handleFetchAiHint}
          disabled={loadingHint || answered}
          title="Get AI Context Hint"
          style={{ color: aiHint ? 'var(--accent-warning)' : 'var(--text-muted)' }}
        >
          <HelpCircle size={18} />
        </button>
      </div>

      {/* Progress Track */}
      <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
        <div 
          style={{ 
            width: `${((currentIndex + (answered ? 1 : 0)) / questions.length) * 100}%`, 
            height: '100%', 
            background: 'var(--accent-primary)', 
            transition: 'width var(--transition-normal)' 
          }} 
        />
      </div>

      {/* Question Card */}
      <div className="card card-elevated" style={{ padding: '2rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.08em' }}>
            {currentQ.type === 'fill_blank' ? 'Fill in the Blank' : 'Choose the Correct Definition'}
          </span>
          <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', marginTop: '0.4rem', lineHeight: '1.4', fontWeight: 600 }}>
            {currentQ.prompt}
          </h3>

          {currentQ.contextText && (
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.5rem', borderLeft: '3px solid var(--accent-primary)', paddingLeft: '0.85rem' }}>
              "{currentQ.contextText}"
            </p>
          )}
        </div>

        {/* AI Hint Dropdown */}
        {aiHint && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '0.85rem 1rem',
            fontSize: '0.85rem',
            color: 'var(--text-primary)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-warning)', fontWeight: 700, marginBottom: '0.2rem' }}>
              <Sparkles size={14} /> AI Hint:
            </div>
            {aiHint}
          </div>
        )}

        {/* Answer Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {currentQ.options.map((opt, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrect = idx === currentQ.correctIndex;
            let optClass = 'quiz-option-btn';

            if (answered) {
              if (isCorrect) optClass += ' correct';
              else if (isSelected) optClass += ' incorrect';
            } else if (isSelected) {
              optClass += ' selected';
            }

            return (
              <button
                key={idx}
                className={optClass}
                onClick={() => handleSelectOption(idx)}
                disabled={answered}
                style={{ minHeight: '52px' }}
              >
                <span className="option-letter">{['A', 'B', 'C', 'D'][idx]}</span>
                <span style={{ flex: 1, textAlign: 'left', lineHeight: '1.35' }}>{opt}</span>
                <span className="kbd-hint">{idx + 1}</span>
                {answered && isCorrect && <CheckCircle2 size={18} style={{ color: 'var(--accent-success)', flexShrink: 0 }} />}
                {answered && isSelected && !isCorrect && <XCircle size={18} style={{ color: 'var(--accent-danger)', flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>

        {/* Immediate Explanation Card after answer */}
        {answered && (
          <div className="animate-fade-in" style={{
            background: selectedOption === currentQ.correctIndex ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
            border: `1px solid ${selectedOption === currentQ.correctIndex ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}`,
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem', color: selectedOption === currentQ.correctIndex ? 'var(--accent-success)' : 'var(--accent-danger)' }}>
              {selectedOption === currentQ.correctIndex ? (
                <>
                  <CheckCircle2 size={16} /> Correct!
                </>
              ) : (
                <>
                  <XCircle size={16} /> Incorrect
                </>
              )}
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0, lineHeight: '1.4' }}>
              <strong>{currentQ.targetWord}:</strong> {currentQ.explanation || currentQ.meaning}
            </p>
          </div>
        )}

        {/* Action Button */}
        {answered && (
          <button 
            className="btn btn-primary"
            onClick={handleNextQuestion}
            style={{ width: '100%', padding: '0.85rem', minHeight: '48px', marginTop: '0.5rem', fontSize: '1rem' }}
          >
            <span>{isLast ? 'View Results' : 'Continue'}</span>
            <ArrowRight size={18} />
            <span className="kbd-hint">Enter</span>
          </button>
        )}
      </div>
    </div>
  );
}
