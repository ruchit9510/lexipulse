import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Star, 
  Filter, 
  Calendar, 
  BookOpen, 
  Volume2, 
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function VocabularyLibrary({ 
  words, 
  onSelectWord, 
  onToggleFavorite 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, mastered, learning, needs_practice, favorites
  const [selectedDate, setSelectedDate] = useState('all');

  // Unique dates from words
  const dates = useMemo(() => {
    const dSet = new Set();
    (words || []).forEach(w => {
      if (w.date) dSet.add(w.date);
    });
    return Array.from(dSet).sort().reverse();
  }, [words]);

  // Filtered and searched words
  const filteredWords = useMemo(() => {
    return (words || []).filter(w => {
      // Search text match (word or meaning)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        w.word.toLowerCase().includes(q) || 
        w.meaning.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      // Status / Favorite Filter
      const p = w.progress || {};
      if (activeFilter === 'favorites' && !p.isFavorite) return false;
      if (activeFilter === 'mastered' && p.status !== 'mastered') return false;
      if (activeFilter === 'learning' && p.status !== 'learning') return false;
      if (activeFilter === 'needs_practice' && p.status !== 'needs_practice') return false;

      // Date Filter
      if (selectedDate !== 'all' && w.date !== selectedDate) return false;

      return true;
    });
  }, [words, searchQuery, activeFilter, selectedDate]);

  const speak = (e, text) => {
    e.stopPropagation();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  const handleFavoriteClick = (e, wordId) => {
    e.stopPropagation();
    onToggleFavorite(wordId);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Title & Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--text-primary)' }}>
            Vocabulary Vault
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Browse and search your collection of {words?.length || 0} synchronized words.
          </p>
        </div>
      </div>

      {/* Search & Date Filter Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{
          flex: 1,
          minWidth: '220px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by word or definition..."
            style={{
              width: '100%',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem 1rem 0.75rem 2.75rem',
              color: 'var(--text-primary)',
              fontSize: '0.95rem',
              outline: 'none',
              boxShadow: 'var(--shadow-sm)'
            }}
          />
        </div>

        {/* Date Filter Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <select
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '0.75rem 1rem',
              color: 'var(--text-primary)',
              fontSize: '0.9rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="all">All Dates</option>
            {dates.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Chips */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'All Words', count: words?.length || 0 },
          { id: 'mastered', label: 'Mastered 🟢', count: words?.filter(w => w.progress?.status === 'mastered').length || 0 },
          { id: 'learning', label: 'Learning 🟡', count: words?.filter(w => w.progress?.status === 'learning').length || 0 },
          { id: 'needs_practice', label: 'Needs Practice 🔴', count: words?.filter(w => w.progress?.status === 'needs_practice').length || 0 },
          { id: 'favorites', label: 'Favorites ⭐', count: words?.filter(w => w.progress?.isFavorite).length || 0 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            style={{
              background: activeFilter === tab.id ? 'var(--accent-primary-subtle)' : 'rgba(255, 255, 255, 0.03)',
              border: `1px solid ${activeFilter === tab.id ? 'var(--border-highlight)' : 'var(--border-subtle)'}`,
              color: activeFilter === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
              borderRadius: 'var(--radius-full)',
              padding: '0.4rem 0.9rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all var(--transition-fast)'
            }}
          >
            <span>{tab.label}</span>
            <span style={{ 
              fontSize: '0.75rem', 
              opacity: 0.75, 
              background: 'rgba(255, 255, 255, 0.08)', 
              padding: '0.05rem 0.4rem', 
              borderRadius: 'var(--radius-full)' 
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Word Cards Grid */}
      {filteredWords.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem' }}>
          <BookOpen size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 0.75rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>No words match your filter</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Try adjusting your search terms or filter selection.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))', gap: '1rem' }}>
          {filteredWords.map(w => {
            const p = w.progress || {};
            const isFav = Boolean(p.isFavorite);
            const status = p.status || 'learning';

            return (
              <div
                key={w.id}
                className="card"
                onClick={() => onSelectWord(w)}
                style={{
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '1.25rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                        {w.word}
                      </h3>
                      <button 
                        className="btn-icon" 
                        onClick={(e) => speak(e, w.word)}
                        style={{ width: '1.75rem', height: '1.75rem', borderRadius: '50%' }}
                        title="Pronounce"
                      >
                        <Volume2 size={13} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <button 
                        className="btn-icon" 
                        onClick={(e) => handleFavoriteClick(e, w.id)}
                        style={{ width: '1.75rem', height: '1.75rem' }}
                        title={isFav ? 'Favorited' : 'Add to favorites'}
                      >
                        <Star 
                          size={15} 
                          fill={isFav ? 'var(--accent-gold)' : 'none'} 
                          style={{ color: isFav ? 'var(--accent-gold)' : 'var(--text-muted)' }} 
                        />
                      </button>
                      <span className={`badge ${status === 'mastered' ? 'badge-mastered' : status === 'needs_practice' ? 'badge-practice' : 'badge-learning'}`}>
                        {status === 'needs_practice' ? 'Needs work' : status}
                      </span>
                    </div>
                  </div>

                  <p style={{ 
                    fontSize: '0.9rem', 
                    color: 'var(--text-secondary)', 
                    lineHeight: '1.45',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden'
                  }}>
                    {w.meaning}
                  </p>
                </div>

                <div style={{ 
                  marginTop: '1rem', 
                  paddingTop: '0.75rem', 
                  borderTop: '1px solid var(--border-subtle)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)'
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Calendar size={12} /> {w.date}
                  </span>
                  <span>{p.reviewCount || 0} reviews</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
