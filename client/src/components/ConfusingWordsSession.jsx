import React, { useState, useEffect } from 'react';
import { 
  X, 
  Split, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  Sparkles, 
  Lightbulb, 
  BookOpen, 
  RotateCcw,
  Check
} from 'lucide-react';

export default function ConfusingWordsSession({ onClose, onRefreshStats }) {
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [activeTab, setActiveTab] = useState('compare'); // 'compare' | 'quiz'
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedWord, setSelectedWord] = useState(null);
  const [isAnswerChecked, setIsAnswerChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPairs();
  }, []);

  const fetchPairs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/confusing-words');
      const data = await res.json();
      if (data.success && data.pairs) {
        setPairs(data.pairs);
        setSelectedPair(data.pairs[0]);
      }
    } catch (e) {
      console.error('Error fetching confusing words:', e);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = async (pairId) => {
    try {
      const url = pairId ? `/api/confusing-words/practice?pairId=${pairId}` : '/api/confusing-words/practice';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && data.questions) {
        setQuizQuestions(data.questions);
        setCurrentQIndex(0);
        setSelectedWord(null);
        setIsAnswerChecked(false);
        setScore(0);
        setQuizFinished(false);
        setActiveTab('quiz');
      }
    } catch (e) {
      console.error('Error fetching practice questions:', e);
    }
  };

  const handleSelectAnswer = (word) => {
    if (isAnswerChecked) return;
    setSelectedWord(word);
  };

  const handleCheckAnswer = () => {
    if (!selectedWord || isAnswerChecked) return;
    setIsAnswerChecked(true);
    const q = quizQuestions[currentQIndex];
    if (selectedWord.toLowerCase() === q.correctWord.toLowerCase()) {
      setScore(prev => prev + 1);
    }
  };

  const handleNextQ = () => {
    if (currentQIndex + 1 < quizQuestions.length) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedWord(null);
      setIsAnswerChecked(false);
    } else {
      setQuizFinished(true);
      // Award XP for completing confusing words quiz
      fetch('/api/quick-practice/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationMinutes: 3,
          questionsCount: quizQuestions.length,
          score: score + (selectedWord?.toLowerCase() === quizQuestions[currentQIndex]?.correctWord?.toLowerCase() ? 1 : 0)
        })
      }).then(() => {
        if (onRefreshStats) onRefreshStats();
      }).catch(() => {});
    }
  };

  const currentQ = quizQuestions[currentQIndex];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }} 
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
              <Split size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                Confusing Words Mode
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                Master commonly confused pairs with recognition tricks and precision quizzes.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Tab switch */}
            <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '0.2rem' }}>
              <button
                className={`btn ${activeTab === 'compare' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setActiveTab('compare')}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Compare
              </button>
              <button
                className={`btn ${activeTab === 'quiz' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => startQuiz(selectedPair?.id)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
              >
                Practice Quiz
              </button>
            </div>

            <button className="btn-icon" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* VIEW 1: COMPARISON */}
        {activeTab === 'compare' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Pair Pills */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {pairs.map(p => {
                const isSel = selectedPair?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPair(p)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      background: isSel ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                      color: isSel ? 'var(--accent-primary)' : 'var(--text-primary)',
                      fontWeight: 600,
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    {p.pair}
                  </button>
                );
              })}
            </div>

            {selectedPair && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Side-by-side comparison cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {/* Word A */}
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                        {selectedPair.wordA.word}
                      </h3>
                      <span className="badge badge-learning" style={{ fontSize: '0.75rem' }}>
                        {selectedPair.wordA.partOfSpeech}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {selectedPair.wordA.definition}
                    </p>

                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--accent-primary)',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      fontStyle: 'italic',
                      marginTop: '0.25rem'
                    }}>
                      "{selectedPair.wordA.example}"
                    </div>
                  </div>

                  {/* Word B */}
                  <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                        {selectedPair.wordB.word}
                      </h3>
                      <span className="badge badge-mastered" style={{ fontSize: '0.75rem' }}>
                        {selectedPair.wordB.partOfSpeech}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>
                      {selectedPair.wordB.definition}
                    </p>

                    <div style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      padding: '0.6rem 0.8rem',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--accent-success)',
                      fontSize: '0.85rem',
                      color: 'var(--text-primary)',
                      fontStyle: 'italic',
                      marginTop: '0.25rem'
                    }}>
                      "{selectedPair.wordB.example}"
                    </div>
                  </div>
                </div>

                {/* Memory Hook & Distinction */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(99, 102, 241, 0.06) 100%)',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lightbulb size={18} style={{ color: 'var(--accent-warning)' }} />
                    <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Quick Recognition Rule
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', margin: 0, fontWeight: 500 }}>
                    {selectedPair.distinction}
                  </p>

                  <div style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '0.6rem 0.9rem',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.85rem',
                    color: 'var(--accent-warning)',
                    fontWeight: 600
                  }}>
                    💡 Memory Trick: {selectedPair.trick}
                  </div>
                </div>

                {/* Action button */}
                <button
                  className="btn btn-primary"
                  onClick={() => startQuiz(selectedPair.id)}
                  style={{ padding: '0.8rem', width: '100%', fontSize: '0.95rem' }}
                >
                  <Sparkles size={16} />
                  <span>Test Yourself on {selectedPair.pair}</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: QUIZ */}
        {activeTab === 'quiz' && (
          <div>
            {!quizFinished && currentQ ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    <span>Question {currentQIndex + 1} of {quizQuestions.length}</span>
                    <span>Score: {score}</span>
                  </div>
                  <div style={{ height: '5px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div style={{
                      width: `${((currentQIndex + 1) / quizQuestions.length) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-success))'
                    }} />
                  </div>
                </div>

                {/* Question sentence */}
                <div style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-highlight)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--accent-primary)' }}>
                    Fill in the Blank
                  </span>

                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: '0.75rem 0', lineHeight: '1.5' }}>
                    "{currentQ.sentence}"
                  </h3>
                </div>

                {/* Word choices */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = selectedWord === opt;
                    const isCorrect = opt.toLowerCase() === currentQ.correctWord.toLowerCase();
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
                        onClick={() => handleSelectAnswer(opt)}
                        style={{
                          padding: '1.1rem',
                          borderRadius: 'var(--radius-md)',
                          border: `2px solid ${borderColor}`,
                          background: bg,
                          color: 'var(--text-primary)',
                          fontSize: '1.2rem',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          cursor: isAnswerChecked ? 'default' : 'pointer',
                          transition: 'all var(--transition-fast)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          minHeight: '52px'
                        }}
                      >
                        <span>{opt}</span>
                        {isAnswerChecked && isCorrect && <CheckCircle2 size={20} style={{ color: 'var(--accent-success)' }} />}
                        {isAnswerChecked && isSelected && !isCorrect && <XCircle size={20} style={{ color: 'var(--accent-danger)' }} />}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation */}
                {isAnswerChecked && (
                  <div style={{
                    background: selectedWord?.toLowerCase() === currentQ.correctWord.toLowerCase() ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                    border: `1px solid ${selectedWord?.toLowerCase() === currentQ.correctWord.toLowerCase() ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '0.9rem 1.1rem'
                  }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: selectedWord?.toLowerCase() === currentQ.correctWord.toLowerCase() ? 'var(--accent-success)' : 'var(--accent-danger)'
                    }}>
                      {selectedWord?.toLowerCase() === currentQ.correctWord.toLowerCase() ? '✓ Spot on!' : '✗ Not quite'}
                    </span>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', margin: '0.2rem 0 0' }}>
                      {currentQ.explanation}
                    </p>
                  </div>
                )}

                {/* Action footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  {!isAnswerChecked ? (
                    <button
                      className="btn btn-primary"
                      onClick={handleCheckAnswer}
                      disabled={!selectedWord}
                      style={{ padding: '0.75rem 1.5rem' }}
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      onClick={handleNextQ}
                      style={{ padding: '0.75rem 1.5rem' }}
                    >
                      <span>{currentQIndex + 1 < quizQuestions.length ? 'Next Question' : 'View Results'}</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Quiz Finished */
              <div style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                  width: '3.5rem',
                  height: '3.5rem',
                  borderRadius: '50%',
                  background: 'var(--accent-primary-subtle)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                }}>
                  <CheckCircle2 size={32} />
                </div>

                <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                  Practice Complete!
                </h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', margin: 0 }}>
                  You scored <strong>{score}</strong> out of <strong>{quizQuestions.length}</strong> ({Math.round((score / (quizQuestions.length || 1)) * 100)}%).
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setActiveTab('compare')}
                    style={{ flex: 1, padding: '0.75rem' }}
                  >
                    Back to Comparison
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={() => startQuiz(selectedPair?.id)}
                    style={{ flex: 1, padding: '0.75rem' }}
                  >
                    <RotateCcw size={16} />
                    <span>Try Again</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
