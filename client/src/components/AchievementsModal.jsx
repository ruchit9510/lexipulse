import React, { useState, useEffect } from 'react';
import { 
  X, 
  Award, 
  Sparkles, 
  Lock, 
  CheckCircle2, 
  Flame, 
  BookOpen, 
  Zap, 
  Clock, 
  History
} from 'lucide-react';

export default function AchievementsModal({ onClose }) {
  const [data, setData] = useState(null);
  const [xpHistory, setXpHistory] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('badges'); // 'badges' | 'history'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [achieveRes, xpRes] = await Promise.all([
        fetch('/api/achievements'),
        fetch('/api/xp/history')
      ]);
      const [achieveJson, xpJson] = await Promise.all([
        achieveRes.json(),
        xpRes.json()
      ]);

      if (achieveJson.success) {
        setData(achieveJson);
      }
      if (xpJson.success) {
        setXpHistory(xpJson.events || []);
      }
    } catch (e) {
      console.error('Error fetching achievements:', e);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', label: 'All Badges' },
    { id: 'consistency', label: 'Consistency' },
    { id: 'mastery', label: 'Mastery' },
    { id: 'practice', label: 'Practice' },
    { id: 'speed', label: 'Speed' }
  ];

  const filteredAchievements = (data?.achievements || []).filter(a => {
    if (selectedCategory === 'all') return true;
    return a.category === selectedCategory;
  });

  const gamification = data?.gamification || {
    level: 1,
    currentXp: 0,
    levelName: 'Novice',
    nextLevelXp: 100,
    progressPercentage: 0
  };

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
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 10px rgba(245, 158, 11, 0.3)'
            }}>
              <Award size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                Achievements & XP
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                Earn experience points, advance tiers, and unlock learning milestones.
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Level & XP Hero Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid var(--border-highlight)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--accent-primary)' }}>
                Current Tier
              </span>
              <h3 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: '0.1rem 0 0' }}>
                Level {gamification.level} • {gamification.levelName}
              </h3>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.4rem 0.85rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--border-subtle)' }}>
              <Sparkles size={16} style={{ color: 'var(--accent-warning)' }} />
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {gamification.currentXp} XP
              </span>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              <span>Progress to Level {gamification.level + 1}</span>
              <span>{gamification.currentXp} / {gamification.nextLevelXp} XP ({gamification.progressPercentage}%)</span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{
                width: `${gamification.progressPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--accent-primary), var(--accent-warning))',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        </div>

        {/* Tab switcher: Badges vs History */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`btn ${activeTab === 'badges' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('badges')}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            >
              <Award size={15} />
              <span>Badges ({data?.unlockedCount || 0}/{data?.totalCount || 0})</span>
            </button>
            <button
              className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('history')}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.85rem' }}
            >
              <History size={15} />
              <span>XP History</span>
            </button>
          </div>

          {activeTab === 'badges' && (
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto' }}>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  style={{
                    padding: '0.25rem 0.65rem',
                    borderRadius: 'var(--radius-full)',
                    background: selectedCategory === c.id ? 'var(--accent-primary)' : 'var(--bg-surface)',
                    color: selectedCategory === c.id ? '#ffffff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* VIEW 1: BADGES */}
        {activeTab === 'badges' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
            {filteredAchievements.map(ach => {
              const isUnlocked = Boolean(ach.unlocked);
              return (
                <div
                  key={ach.id}
                  style={{
                    background: isUnlocked ? 'var(--bg-surface)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1.5px solid ${isUnlocked ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    opacity: isUnlocked ? 1 : 0.65,
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{ach.icon || '🏅'}</span>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-primary)', margin: 0, fontWeight: 700 }}>
                          {ach.title}
                        </h4>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-warning)', fontWeight: 600 }}>
                          +{ach.xpReward} XP
                        </span>
                      </div>
                    </div>

                    {isUnlocked ? (
                      <span className="badge badge-mastered" style={{ fontSize: '0.72rem' }}>
                        <CheckCircle2 size={12} /> Unlocked
                      </span>
                    ) : (
                      <span className="badge" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        <Lock size={12} /> Locked
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.4' }}>
                    {ach.description}
                  </p>

                  {/* Progress bar if not unlocked */}
                  {!isUnlocked && (
                    <div style={{ marginTop: '0.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>
                        <span>Progress</span>
                        <span>{ach.progress || 0} / {ach.target}</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, ((ach.progress || 0) / ach.target) * 100)}%`,
                          height: '100%',
                          background: 'var(--accent-primary)'
                        }} />
                      </div>
                    </div>
                  )}

                  {isUnlocked && ach.unlockedAt && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '0.25rem' }}>
                      Unlocked {new Date(ach.unlockedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* VIEW 2: XP HISTORY */}
        {activeTab === 'history' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {xpHistory.length > 0 ? (
              xpHistory.map(evt => (
                <div
                  key={evt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                      {evt.description || evt.action}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {new Date(evt.timestamp).toLocaleString()}
                    </div>
                  </div>

                  <span style={{
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    color: 'var(--accent-warning)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    +{evt.xp} XP
                  </span>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
                No XP history recorded yet. Complete words and quizzes to start earning XP!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
