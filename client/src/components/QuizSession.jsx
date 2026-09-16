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

  useEffect(() => {
    fetchQuizQuestions();
  }, [dateStr, mode]);

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
    } else {
      // Quiz finished
      setQuizFinished(true);
      const correctCount = userAnswers.filter(a => a.isCorrect).length;
      const total = questions.length;
      const percentage = Math.round((correctCount / total) * 100);

      // Trigger celebratory confetti if score >= 80%
      if (percentage >= 80) {
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        } catch (e) {
          // Ignore if canvas confetti not supported
        }
      }

      // Submit results to backend
      if (onCompleteQuiz) {
        await onCompleteQuiz({
          date: dateStr,
          results: userAnswers,
          score: correctCount,
          total
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Preparing daily quiz challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
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
      <div className="animate-fade-in card card-elevated" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
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
          {percentage >= 80 ? <Sparkles size={36} /> : <Award size={36} />}
        </div>

        <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {percentage === 100 ? 'Flawless Mastery! 🌟' : percentage >= 80 ? 'Daily Challenge Complete! 🎉' : 'Good Effort! Keep Going 💪'}
        </h2>
        
        <div style={{ margin: '1.5rem 0' }}>
          <span style={{ 
            fontFamily: 'var(--font-display)', 
            fontSize: '3.5rem', 
            fontWeight: 800, 
            color: percentage >= 80 ? 'var(--accent-success)' : 'var(--accent-warning)' 
          }}>
            {correctCount} / {total}
          </span>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', fontWeight: 600 }}>
            {percentage}% Accuracy
          </p>
        </div>

        {/* Word performance breakdown */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-lg)', 
          padding: '1.25rem', 
          maxWidth: '480px', 
          margin: '0 auto 2rem auto',
          textAlign: 'left'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <CheckCircle2 size={16} /> {correctCount} Strong
            </span>
            {difficultWords.length > 0 && (
              <span style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <XCircle size={16} /> {difficultWords.length} Needs Work
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {userAnswers.map((ans, i) => (
              <span 
                key={i} 
                className={`badge ${ans.isCorrect ? 'badge-mastered' : 'badge-practice'}`}
                style={{ fontSize: '0.85rem' }}
              >
                {ans.targetWord}
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {difficultWords.length > 0 && (
            <button className="btn btn-secondary" onClick={onGoToReview}>
              <RotateCcw size={16} />
              <span>Review Difficult Words</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={onBack} style={{ padding: '0.8rem 1.8rem' }}>
            <span>Finish Daily Session</span>
            <Check size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Active Question View
  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn-icon" onClick={onBack} title="Exit quiz">
          <ArrowLeft size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="badge badge-learning" style={{ fontSize: '0.75rem' }}>
            {currentQ.typeLabel}
          </span>
          <span style={{ 
            fontFamily: 'var(--font-mono)', 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            color: 'var(--text-muted)' 
          }}>
            {currentIndex + 1} / {questions.length}
          </span>
        </div>

        <div style={{ width: '2.5rem' }} /> {/* Spacer */}
      </div>

      {/* Question Card */}
      <div className="card card-elevated" style={{ padding: '2rem 1.75rem' }}>
        <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
          {currentQ.prompt}
        </h3>

        {/* Context box (Definition, Sentence with blank, or usage situation) */}
        <div style={{ 
          background: 'rgba(255, 255, 255, 0.03)', 
          border: '1px solid var(--border-subtle)', 
          borderRadius: 'var(--radius-md)', 
          padding: '1.25rem', 
          marginBottom: '1.5rem',
          fontSize: '1.05rem',
          color: 'var(--text-primary)',
          lineHeight: '1.6'
        }}>
          {currentQ.contextText}
        </div>

        {/* Shuffled Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {currentQ.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            let optionClass = 'quiz-option-btn';
            if (answered) {
              if (idx === currentQ.correctIndex) {
                optionClass += ' correct';
              } else if (idx === selectedOption) {
                optionClass += ' incorrect';
              }
            }

            return (
              <button
                key={idx}
                className={optionClass}
                onClick={() => handleSelectOption(idx)}
                disabled={answered}
              >
                <span className="option-letter">{letter}</span>
                <span style={{ flex: 1 }}>{opt}</span>
                {answered && idx === currentQ.correctIndex && (
                  <CheckCircle2 size={18} style={{ color: 'var(--accent-success)' }} />
                )}
                {answered && idx === selectedOption && idx !== currentQ.correctIndex && (
                  <XCircle size={18} style={{ color: 'var(--accent-danger)' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Immediate Feedback Box */}
        {answered && (
          <div 
            className="animate-fade-in"
            style={{ 
              marginTop: '1.5rem', 
              padding: '1rem 1.25rem', 
              borderRadius: 'var(--radius-md)',
              background: selectedOption === currentQ.correctIndex 
                ? 'var(--accent-success-subtle)' 
                : 'var(--accent-danger-subtle)',
              border: `1px solid ${selectedOption === currentQ.correctIndex ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', fontWeight: 700 }}>
              {selectedOption === currentQ.correctIndex ? (
                <>
                  <CheckCircle2 size={18} style={{ color: 'var(--accent-success)' }} />
                  <span style={{ color: 'var(--accent-success)' }}>Correct!</span>
                </>
              ) : (
                <>
                  <XCircle size={18} style={{ color: 'var(--accent-danger)' }} />
                  <span style={{ color: 'var(--accent-danger)' }}>Not quite.</span>
                </>
              )}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.5' }}>
              {currentQ.explanation}
            </p>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      {answered && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className="btn btn-primary animate-fade-in"
            onClick={handleNextQuestion}
            style={{ padding: '0.8rem 1.8rem' }}
          >
            <span>{isLast ? 'View Results' : 'Next Question'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
