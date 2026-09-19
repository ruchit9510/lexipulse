import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Palette, 
  Sparkles, 
  Eye, 
  Sliders, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  AlertTriangle, 
  CheckCircle2,
  RefreshCw,
  Copy
} from 'lucide-react';
import {
  BUILTIN_THEMES,
  ACCENT_PRESETS,
  DENSITY_OPTIONS,
  RADIUS_OPTIONS,
  TYPOGRAPHY_OPTIONS,
  MOTION_OPTIONS,
  getCustomThemes,
  saveCustomTheme,
  deleteCustomTheme,
  getThemeSettings,
  saveThemeSettings,
  getContrastRatio,
  isContrastAccessible,
  suggestAccessibleContrast
} from '../services/themeEngine';

export default function ThemeStudioModal({ currentTheme, onSelectTheme, onClose }) {
  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'dials' | 'creator'
  const [settings, setSettings] = useState(getThemeSettings);
  const [customThemes, setCustomThemes] = useState(getCustomThemes);
  
  // Custom Creator Form State
  const [newThemeName, setNewThemeName] = useState('');
  const [newThemeBg, setNewThemeBg] = useState('#0d1117');
  const [newThemeSurface, setNewThemeSurface] = useState('#161b22');
  const [newThemeAccent, setNewThemeAccent] = useState('#58a6ff');
  const [newThemeText, setNewThemeText] = useState('#f0f6fc');
  const [importJson, setImportJson] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Ensure current theme from props matches settings
    if (currentTheme && currentTheme !== settings.theme) {
      const updated = { ...settings, theme: currentTheme };
      setSettings(updated);
      saveThemeSettings(updated);
    }
  }, [currentTheme]);

  const showFeedback = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleApplyTheme = (themeId) => {
    const updated = { ...settings, theme: themeId };
    setSettings(updated);
    saveThemeSettings(updated);
    onSelectTheme(themeId);
    showFeedback('Theme applied ✓');
  };

  const handleUpdateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveThemeSettings(updated);
  };

  const handleAccentSelect = (hex) => {
    handleUpdateSetting('customAccent', hex);
    showFeedback('Accent color updated ✓');
  };

  const handleResetAccent = () => {
    handleUpdateSetting('customAccent', null);
    showFeedback('Reset to theme default accent ✓');
  };

  // Contrast check for current accent against surface
  const activeThemeObj = [...BUILTIN_THEMES, ...customThemes].find(t => t.id === settings.theme) || BUILTIN_THEMES[0];
  const surfaceColor = activeThemeObj?.tokens?.['--color-surface'] || activeThemeObj?.preview?.surface || '#141b2a';
  const effectiveAccent = settings.customAccent || activeThemeObj?.tokens?.['--color-accent'] || '#6366f1';
  const contrastRatio = getContrastRatio(effectiveAccent, surfaceColor);
  const isAccessible = contrastRatio >= 4.5;

  const handleImproveContrast = () => {
    const improved = suggestAccessibleContrast(effectiveAccent, surfaceColor);
    handleUpdateSetting('customAccent', improved);
    showFeedback(`Accent adjusted for ${improved} (4.5:1 ratio) ✓`);
  };

  // Save new custom theme
  const handleCreateCustomTheme = (e) => {
    e.preventDefault();
    if (!newThemeName.trim()) return;

    const id = `custom_${Date.now()}`;
    const customObj = {
      id,
      name: newThemeName.trim(),
      category: 'Custom Theme',
      desc: `User created theme with ${newThemeAccent} accent`,
      font: 'Outfit',
      preview: {
        bg: newThemeBg,
        surface: newThemeSurface,
        accent: newThemeAccent,
        text: newThemeText,
        border: 'rgba(255, 255, 255, 0.1)'
      },
      tokens: {
        '--color-background': newThemeBg,
        '--color-background-secondary': newThemeBg,
        '--color-surface': newThemeSurface,
        '--color-surface-elevated': newThemeSurface,
        '--color-text-primary': newThemeText,
        '--color-text-secondary': '#94a3b8',
        '--color-text-muted': '#64748b',
        '--color-border-subtle': 'rgba(255, 255, 255, 0.08)',
        '--color-border': 'rgba(255, 255, 255, 0.14)',
        '--color-border-highlight': `${newThemeAccent}4d`,
        '--color-accent': newThemeAccent,
        '--color-accent-hover': newThemeAccent,
        '--color-accent-subtle': `${newThemeAccent}1f`,
        '--color-accent-glow': `${newThemeAccent}33`
      }
    };

    const updated = saveCustomTheme(customObj);
    setCustomThemes(updated);
    setNewThemeName('');
    handleApplyTheme(id);
    setActiveTab('presets');
    showFeedback(`Custom theme "${customObj.name}" created & applied! 🎉`);
  };

  const handleDeleteCustom = (e, themeId) => {
    e.stopPropagation();
    if (!confirm('Delete this custom theme?')) return;
    const updated = deleteCustomTheme(themeId);
    setCustomThemes(updated);
    if (settings.theme === themeId) {
      handleApplyTheme('obsidian');
    }
    showFeedback('Theme deleted');
  };

  // Export & Import
  const handleExportJson = () => {
    const dataStr = JSON.stringify({ settings, customThemes }, null, 2);
    navigator.clipboard.writeText(dataStr);
    showFeedback('Theme configuration copied to clipboard! ✓');
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJson);
      if (parsed.customThemes && Array.isArray(parsed.customThemes)) {
        parsed.customThemes.forEach(t => saveCustomTheme(t));
        setCustomThemes(getCustomThemes());
      }
      if (parsed.settings) {
        setSettings(parsed.settings);
        saveThemeSettings(parsed.settings);
      }
      setShowImport(false);
      setImportJson('');
      showFeedback('Themes successfully imported! 🎉');
    } catch (e) {
      alert('Invalid theme JSON format.');
    }
  };

  const allThemes = [...BUILTIN_THEMES, ...customThemes];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '720px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <span className="sheet-handle" />

        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '2.4rem',
              height: '2.4rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-primary-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Palette size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.45rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)', margin: 0 }}>
                Theme Studio
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                Curated design systems & granular ergonomic customization.
              </p>
            </div>
          </div>

          <button className="btn-icon" onClick={onClose} title="Close">
            <X size={18} />
          </button>
        </div>

        {/* Toast Feedback */}
        {toast && (
          <div style={{
            background: 'var(--accent-success-subtle)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--accent-success)',
            padding: '0.5rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={16} />
            <span>{toast}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '0.4rem',
          background: 'var(--bg-surface-elevated)',
          padding: '0.25rem',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1.5rem',
          flexWrap: 'wrap'
        }}>
          <button
            className={`btn ${activeTab === 'presets' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('presets')}
            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
          >
            <Eye size={15} />
            <span>Themes ({allThemes.length})</span>
          </button>
          <button
            className={`btn ${activeTab === 'dials' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('dials')}
            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
          >
            <Sliders size={15} />
            <span>Customization & Dials</span>
          </button>
          <button
            className={`btn ${activeTab === 'creator' ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setActiveTab('creator')}
            style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
          >
            <Plus size={15} />
            <span>Custom Theme Creator</span>
          </button>
        </div>

        {/* TAB 1: PRESET & CUSTOM THEMES */}
        {activeTab === 'presets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {allThemes.map(theme => {
                const isSelected = settings.theme === theme.id;
                const isCustom = theme.id.startsWith('custom_');

                return (
                  <div
                    key={theme.id}
                    onClick={() => handleApplyTheme(theme.id)}
                    style={{
                      background: theme.preview.surface,
                      border: `2px solid ${isSelected ? theme.preview.accent : theme.preview.border}`,
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'all var(--transition-fast)',
                      boxShadow: isSelected ? `0 0 20px ${theme.preview.accent}33` : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <span style={{
                          fontSize: '0.7rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          fontWeight: 700,
                          color: theme.preview.accent
                        }}>
                          {theme.category}
                        </span>
                        <h3 style={{
                          fontSize: '1.15rem',
                          fontWeight: 700,
                          color: theme.preview.text,
                          margin: '0.15rem 0 0'
                        }}>
                          {theme.name}
                        </h3>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {isCustom && (
                          <button
                            className="btn-icon"
                            onClick={(e) => handleDeleteCustom(e, theme.id)}
                            title="Delete custom theme"
                            style={{ width: '1.8rem', height: '1.8rem', color: 'var(--accent-danger)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        {isSelected && (
                          <span style={{
                            width: '1.5rem',
                            height: '1.5rem',
                            borderRadius: '50%',
                            background: theme.preview.accent,
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </div>
                    </div>

                    <p style={{
                      fontSize: '0.82rem',
                      color: theme.preview.text,
                      opacity: 0.8,
                      margin: 0,
                      lineHeight: '1.4'
                    }}>
                      {theme.desc}
                    </p>

                    {/* Mini Card Preview */}
                    <div style={{
                      background: theme.preview.bg,
                      borderRadius: 'var(--radius-md)',
                      padding: '0.75rem',
                      border: `1px solid ${theme.preview.border}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.45rem',
                      marginTop: 'auto'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.preview.text }}>
                          Meticulous
                        </span>
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '0.15rem 0.4rem',
                          borderRadius: '4px',
                          background: theme.preview.accent,
                          color: '#ffffff',
                          fontWeight: 600
                        }}>
                          Mastered
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.preview.text, opacity: 0.7 }}>
                        Showing great attention to detail; very careful and precise.
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.68rem',
                        color: theme.preview.text,
                        opacity: 0.5,
                        borderTop: `1px solid ${theme.preview.border}`,
                        paddingTop: '0.35rem'
                      }}>
                        <span>Font: {theme.font}</span>
                        <span style={{ color: theme.preview.accent, fontWeight: 600 }}>
                          {isSelected ? 'Active System' : 'Click to apply'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: GRANULAR DIALS & CUSTOMIZATION */}
        {activeTab === 'dials' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Accent Color Picker & WCAG Contrast */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                    Accent Color & Contrast
                  </h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                    Choose an accent color. Changes reflect immediately across all primary controls.
                  </p>
                </div>
                {settings.customAccent && (
                  <button
                    className="btn btn-ghost"
                    onClick={handleResetAccent}
                    style={{ fontSize: '0.78rem', padding: '0.3rem 0.6rem' }}
                  >
                    Reset
                  </button>
                )}
              </div>

              {/* Swatches */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                {ACCENT_PRESETS.map(preset => {
                  const isSel = effectiveAccent.toLowerCase() === preset.color.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleAccentSelect(preset.color)}
                      title={preset.name}
                      style={{
                        width: '2.4rem',
                        height: '2.4rem',
                        borderRadius: '50%',
                        background: preset.color,
                        border: isSel ? '3px solid #ffffff' : '2px solid transparent',
                        boxShadow: isSel ? `0 0 12px ${preset.color}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}
                    >
                      {isSel && <Check size={14} strokeWidth={3} />}
                    </button>
                  );
                })}

                {/* Custom Color Picker Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: '0.5rem' }}>
                  <input
                    type="color"
                    value={effectiveAccent}
                    onChange={e => handleAccentSelect(e.target.value)}
                    style={{
                      width: '2.4rem',
                      height: '2.4rem',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      background: 'transparent'
                    }}
                    title="Custom color picker"
                  />
                  <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                    {effectiveAccent}
                  </span>
                </div>
              </div>

              {/* Contrast Checker Alert */}
              <div style={{
                background: isAccessible ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.1)',
                border: `1px solid ${isAccessible ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.3)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isAccessible ? (
                    <CheckCircle2 size={16} style={{ color: 'var(--accent-success)' }} />
                  ) : (
                    <AlertTriangle size={16} style={{ color: 'var(--accent-warning)' }} />
                  )}
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                    Contrast Ratio: <strong>{contrastRatio.toFixed(1)}:1</strong> on {activeThemeObj.name} surface. {isAccessible ? 'Meets WCAG AA standards.' : 'May reduce readability.'}
                  </span>
                </div>

                {!isAccessible && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleImproveContrast}
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                  >
                    <span>Improve Contrast</span>
                  </button>
                )}
              </div>
            </div>

            {/* Density Selector */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Interface Density
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Control padding, card spacing, and button height.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                {DENSITY_OPTIONS.map(d => {
                  const isSel = settings.density === d.id;
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleUpdateSetting('density', d.id)}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        background: isSel ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                        color: isSel ? 'var(--accent-primary)' : 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div>{d.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {d.desc.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Corner Radius Selector */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Corner Style (Radius)
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Adjust geometry across buttons, cards, and modal dialogs.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                {RADIUS_OPTIONS.map(r => {
                  const isSel = settings.radius === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => handleUpdateSetting('radius', r.id)}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: r.id === 'sharp' ? '2px' : r.id === 'soft' ? '8px' : '16px',
                        border: `1.5px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        background: isSel ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                        color: isSel ? 'var(--accent-primary)' : 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div>{r.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {r.desc.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Typography Pairing Selector */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Typography Pairing
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Choose font style for headings and learning cards.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.6rem' }}>
                {TYPOGRAPHY_OPTIONS.map(t => {
                  const isSel = settings.typography === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleUpdateSetting('typography', t.id)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        background: isSel ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                        color: isSel ? 'var(--accent-primary)' : 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>{t.label}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {t.heading} + {t.body}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Motion Speed */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                  Motion & Animation
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.15rem 0 0' }}>
                  Control transition speed and accessibility animation defaults.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
                {MOTION_OPTIONS.map(m => {
                  const isSel = settings.motion === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => handleUpdateSetting('motion', m.id)}
                      style={{
                        padding: '0.75rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${isSel ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                        background: isSel ? 'var(--accent-primary-subtle)' : 'var(--bg-surface)',
                        color: isSel ? 'var(--accent-primary)' : 'var(--text-primary)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      <div>{m.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                        {m.desc.split(' ')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Export / Import Bar */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleExportJson}
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                <Download size={14} />
                <span>Export Theme JSON</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowImport(true)}
                style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
              >
                <Upload size={14} />
                <span>Import JSON</span>
              </button>
            </div>

            {showImport && (
              <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-highlight)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Paste Theme JSON:
                </span>
                <textarea
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  placeholder='{"settings": {...}, "customThemes": [...]}'
                  rows={4}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem',
                    color: 'var(--text-primary)',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)'
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button className="btn btn-ghost" onClick={() => setShowImport(false)} style={{ fontSize: '0.8rem' }}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleImportJson} style={{ fontSize: '0.8rem' }}>
                    Apply Imported Theme
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CUSTOM THEME CREATOR */}
        {activeTab === 'creator' && (
          <form onSubmit={handleCreateCustomTheme} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
              Design a personal theme tailored to your exact taste. Saved custom themes appear alongside built-in themes and persist across devices.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                Theme Name
              </label>
              <input
                type="text"
                value={newThemeName}
                onChange={e => setNewThemeName(e.target.value)}
                placeholder="e.g. Midnight Pine, Desert Sand, Deep Ocean"
                required
                style={{
                  width: '100%',
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '0.7rem 0.9rem',
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Background Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={newThemeBg}
                    onChange={e => setNewThemeBg(e.target.value)}
                    style={{ width: '2.5rem', height: '2.5rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {newThemeBg}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Surface / Card Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={newThemeSurface}
                    onChange={e => setNewThemeSurface(e.target.value)}
                    style={{ width: '2.5rem', height: '2.5rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {newThemeSurface}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Primary Accent Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={newThemeAccent}
                    onChange={e => setNewThemeAccent(e.target.value)}
                    style={{ width: '2.5rem', height: '2.5rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {newThemeAccent}
                  </span>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                  Primary Text Color
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="color"
                    value={newThemeText}
                    onChange={e => setNewThemeText(e.target.value)}
                    style={{ width: '2.5rem', height: '2.5rem', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', background: 'transparent' }}
                  />
                  <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                    {newThemeText}
                  </span>
                </div>
              </div>
            </div>

            {/* Live Custom Card Preview */}
            <div style={{
              background: newThemeBg,
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{
                background: newThemeSurface,
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h4 style={{ color: newThemeText, margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-display)' }}>
                    {newThemeName || 'Your Custom Theme'}
                  </h4>
                  <span style={{ background: newThemeAccent, color: '#ffffff', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                    Live Preview
                  </span>
                </div>
                <p style={{ color: newThemeText, opacity: 0.8, fontSize: '0.85rem', margin: 0 }}>
                  This is how vocabulary cards, buttons, and surfaces will appear with your chosen palette.
                </p>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem' }}
            >
              <Sparkles size={16} />
              <span>Save & Apply Custom Theme</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
