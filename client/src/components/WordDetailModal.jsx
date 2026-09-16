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
  Clock
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

  const p = word.progress || {};
  const isFav = Boolean(p.isFavorite);
  const status = p.status || 'learning';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
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
            <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-primary)', letterSpacing: '0.05em' }}>
              Simple Meaning
            </span>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-primary)', marginTop: '0.2rem', lineHeight: '1.5' }}>
              {word.meaning}
            </p>
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

          {/* User Sentence Practice */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <PenTool size={14} /> My Custom Sentence:
            </span>
            <form onSubmit={handleSave} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={sentence}
                onChange={e => setSentence(e.target.value)}
                placeholder={`e.g. Write your own sentence with ${word.word}...`}
                style={{
                  flex: 1,
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
            </form>
          </div>

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
