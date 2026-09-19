// ==========================================================================
// LexiPulse Theme Engine — Centralized Theme, Customization & WCAG Contrast
// ==========================================================================

export const BUILTIN_THEMES = [
  {
    id: 'obsidian',
    name: 'Obsidian OLED',
    category: 'Dark Minimal',
    desc: 'Deep pitch-black (#0c0f17) with indigo/violet glow. Maximum contrast for OLED screens.',
    font: 'Outfit',
    preview: {
      bg: '#0c0f17',
      surface: '#141b2a',
      accent: '#6366f1',
      text: '#f8fafc',
      border: 'rgba(255, 255, 255, 0.08)'
    },
    tokens: {
      '--color-background': '#0c0f17',
      '--color-background-secondary': '#111622',
      '--color-surface': '#141b2a',
      '--color-surface-elevated': '#1a2337',
      '--color-text-primary': '#f8fafc',
      '--color-text-secondary': '#94a3b8',
      '--color-text-muted': '#64748b',
      '--color-border-subtle': 'rgba(255, 255, 255, 0.08)',
      '--color-border': 'rgba(255, 255, 255, 0.14)',
      '--color-border-highlight': 'rgba(99, 102, 241, 0.35)',
      '--color-accent': '#6366f1',
      '--color-accent-hover': '#4f46e5',
      '--color-accent-subtle': 'rgba(99, 102, 241, 0.12)',
      '--color-accent-glow': 'rgba(99, 102, 241, 0.25)',
      '--font-heading': "'Outfit', -apple-system, sans-serif",
      '--font-body': "'Inter', -apple-system, sans-serif",
      '--font-mono': "'JetBrains Mono', monospace"
    }
  },
  {
    id: 'paper',
    name: 'Warm Paper',
    category: 'Editorial Light',
    desc: 'Warm parchment (#fbf8f3) with terracotta accents and literary serif headings. Natural, calm reading.',
    font: 'Lora & Inter',
    preview: {
      bg: '#fbf8f3',
      surface: '#ffffff',
      accent: '#9c412b',
      text: '#1f2421',
      border: 'rgba(0, 0, 0, 0.08)'
    },
    tokens: {
      '--color-background': '#fbf8f3',
      '--color-background-secondary': '#f4efe6',
      '--color-surface': '#ffffff',
      '--color-surface-elevated': '#f8f4ec',
      '--color-text-primary': '#1f2421',
      '--color-text-secondary': '#525a54',
      '--color-text-muted': '#7d8680',
      '--color-border-subtle': 'rgba(0, 0, 0, 0.08)',
      '--color-border': 'rgba(0, 0, 0, 0.14)',
      '--color-border-highlight': 'rgba(156, 65, 43, 0.25)',
      '--color-accent': '#9c412b',
      '--color-accent-hover': '#7e3321',
      '--color-accent-subtle': 'rgba(156, 65, 43, 0.09)',
      '--color-accent-glow': 'rgba(156, 65, 43, 0.15)',
      '--font-heading': "'Lora', 'Georgia', serif",
      '--font-body': "'Inter', -apple-system, sans-serif",
      '--font-mono': "'JetBrains Mono', monospace"
    }
  },
  {
    id: 'focus',
    name: 'Monochrome Focus',
    category: 'Productivity',
    desc: 'High-contrast grayscale (#0f1012) with amber indicators and zero color distractions. Pure cognitive flow.',
    font: 'JetBrains Mono',
    preview: {
      bg: '#0f1012',
      surface: '#1a1b1f',
      accent: '#f59e0b',
      text: '#ffffff',
      border: '#27272a'
    },
    tokens: {
      '--color-background': '#0f1012',
      '--color-background-secondary': '#17181c',
      '--color-surface': '#1a1b1f',
      '--color-surface-elevated': '#24252a',
      '--color-text-primary': '#ffffff',
      '--color-text-secondary': '#a1a1aa',
      '--color-text-muted': '#71717a',
      '--color-border-subtle': '#27272a',
      '--color-border': '#3f3f46',
      '--color-border-highlight': 'rgba(245, 158, 11, 0.4)',
      '--color-accent': '#f59e0b',
      '--color-accent-hover': '#d97706',
      '--color-accent-subtle': 'rgba(245, 158, 11, 0.12)',
      '--color-accent-glow': 'rgba(245, 158, 11, 0.2)',
      '--font-heading': "'JetBrains Mono', monospace",
      '--font-body': "'Inter', -apple-system, sans-serif",
      '--font-mono': "'JetBrains Mono', monospace"
    }
  },
  {
    id: 'aurora',
    name: 'Nordic Aurora',
    category: 'Modern Teal',
    desc: 'Midnight slate-blue (#090e1a) with luminous teal and emerald accents. Refreshing and calm.',
    font: 'Outfit & Inter',
    preview: {
      bg: '#090e1a',
      surface: '#131d33',
      accent: '#14b8a6',
      text: '#f8fafc',
      border: 'rgba(20, 184, 166, 0.15)'
    },
    tokens: {
      '--color-background': '#090e1a',
      '--color-background-secondary': '#0f172a',
      '--color-surface': '#131d33',
      '--color-surface-elevated': '#1a2744',
      '--color-text-primary': '#f8fafc',
      '--color-text-secondary': '#94a3b8',
      '--color-text-muted': '#64748b',
      '--color-border-subtle': 'rgba(20, 184, 166, 0.15)',
      '--color-border': 'rgba(20, 184, 166, 0.25)',
      '--color-border-highlight': 'rgba(20, 184, 166, 0.45)',
      '--color-accent': '#14b8a6',
      '--color-accent-hover': '#0d9488',
      '--color-accent-subtle': 'rgba(20, 184, 166, 0.12)',
      '--color-accent-glow': 'rgba(20, 184, 166, 0.25)',
      '--font-heading': "'Outfit', sans-serif",
      '--font-body': "'Inter', sans-serif",
      '--font-mono': "'JetBrains Mono', monospace"
    }
  },
  {
    id: 'classic',
    name: 'Classic Indigo',
    category: 'Educational',
    desc: 'Warm ivory (#f5f1e8) with scholarly oxford navy text and crimson accents. Academic heritage.',
    font: 'Merriweather & Inter',
    preview: {
      bg: '#f5f1e8',
      surface: '#ffffff',
      accent: '#1e3a8a',
      text: '#141c28',
      border: 'rgba(20, 28, 40, 0.1)'
    },
    tokens: {
      '--color-background': '#f5f1e8',
      '--color-background-secondary': '#ebe4d5',
      '--color-surface': '#ffffff',
      '--color-surface-elevated': '#f2ebe0',
      '--color-text-primary': '#141c28',
      '--color-text-secondary': '#4a5568',
      '--color-text-muted': '#718096',
      '--color-border-subtle': 'rgba(20, 28, 40, 0.1)',
      '--color-border': 'rgba(20, 28, 40, 0.18)',
      '--color-border-highlight': 'rgba(30, 58, 138, 0.3)',
      '--color-accent': '#1e3a8a',
      '--color-accent-hover': '#172554',
      '--color-accent-subtle': 'rgba(30, 58, 138, 0.08)',
      '--color-accent-glow': 'rgba(30, 58, 138, 0.15)',
      '--font-heading': "'Lora', 'Georgia', serif",
      '--font-body': "'Inter', -apple-system, sans-serif",
      '--font-mono': "'JetBrains Mono', monospace"
    }
  }
];

export const ACCENT_PRESETS = [
  { id: 'indigo', name: 'Indigo', color: '#6366f1' },
  { id: 'teal', name: 'Teal', color: '#14b8a6' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
  { id: 'terracotta', name: 'Terracotta', color: '#9c412b' },
  { id: 'emerald', name: 'Emerald', color: '#10b981' },
  { id: 'rose', name: 'Rose', color: '#f43f5e' },
  { id: 'sky', name: 'Sky Blue', color: '#0284c7' }
];

export const DENSITY_OPTIONS = [
  { id: 'compact', label: 'Compact', desc: 'Dense spacing (8-32px) for information density' },
  { id: 'comfortable', label: 'Comfortable', desc: 'Standard balanced rhythm (16-64px)' },
  { id: 'spacious', label: 'Spacious', desc: 'Generous breathing room (24-96px)' }
];

export const RADIUS_OPTIONS = [
  { id: 'sharp', label: 'Sharp', desc: '0-2px corners, Swiss aesthetic' },
  { id: 'soft', label: 'Soft', desc: '6-12px rounded corners, standard UI' },
  { id: 'rounded', label: 'Rounded', desc: '16-24px playful modern curves' }
];

export const TYPOGRAPHY_OPTIONS = [
  { id: 'modern', label: 'Modern Sans', heading: 'Outfit', body: 'Inter' },
  { id: 'classic', label: 'Classic Serif', heading: 'Lora', body: 'Inter' },
  { id: 'friendly', label: 'Friendly Geometric', heading: 'Plus Jakarta Sans', body: 'Inter' },
  { id: 'minimal', label: 'Minimal Mono', heading: 'JetBrains Mono', body: 'Inter' }
];

export const MOTION_OPTIONS = [
  { id: 'full', label: 'Full', desc: 'Smooth transitions & micro-interactions' },
  { id: 'reduced', label: 'Reduced', desc: 'Shorter durations, no parallax/scale' },
  { id: 'minimal', label: 'Minimal', desc: 'Instant state transitions, zero motion' }
];

// --------------------------------------------------------------------------
// WCAG 2.1 Contrast Calculation
// --------------------------------------------------------------------------
function hexToRgb(hex) {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getLuminance({ r, g, b }) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hexToRgb(hex1));
  const lum2 = getLuminance(hexToRgb(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function isContrastAccessible(fgHex, bgHex, minRatio = 4.5) {
  return getContrastRatio(fgHex, bgHex) >= minRatio;
}

export function suggestAccessibleContrast(fgHex, bgHex) {
  const bgRgb = hexToRgb(bgHex);
  const isDarkBg = getLuminance(bgRgb) < 0.5;
  let { r, g, b } = hexToRgb(fgHex);

  // Iteratively lighten or darken until >= 4.5 ratio
  for (let i = 0; i < 40; i++) {
    const currentHex = `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    if (getContrastRatio(currentHex, bgHex) >= 4.5) return currentHex;
    if (isDarkBg) {
      r = Math.min(255, Math.floor(r + (255 - r) * 0.15));
      g = Math.min(255, Math.floor(g + (255 - g) * 0.15));
      b = Math.min(255, Math.floor(b + (255 - b) * 0.15));
    } else {
      r = Math.max(0, Math.floor(r * 0.85));
      g = Math.max(0, Math.floor(g * 0.85));
      b = Math.max(0, Math.floor(b * 0.85));
    }
  }
  return isDarkBg ? '#ffffff' : '#000000';
}

// --------------------------------------------------------------------------
// Storage & Custom Themes
// --------------------------------------------------------------------------
const CUSTOM_THEMES_KEY = 'lexipulse_custom_themes';
const THEME_SETTINGS_KEY = 'lexipulse_theme_settings';

export function getCustomThemes() {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveCustomTheme(themeObj) {
  const list = getCustomThemes();
  const existingIdx = list.findIndex(t => t.id === themeObj.id);
  if (existingIdx >= 0) {
    list[existingIdx] = themeObj;
  } else {
    list.push(themeObj);
  }
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(list));
  syncDesignPreferencesToDb({ customThemes: list });
  return list;
}

export function deleteCustomTheme(themeId) {
  const list = getCustomThemes().filter(t => t.id !== themeId);
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(list));
  syncDesignPreferencesToDb({ customThemes: list });
  return list;
}

export function getThemeSettings() {
  try {
    const raw = localStorage.getItem(THEME_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {
      theme: 'obsidian',
      density: 'comfortable',
      radius: 'soft',
      typography: 'modern',
      motion: 'full',
      customAccent: null
    };
  } catch (e) {
    return {
      theme: 'obsidian',
      density: 'comfortable',
      radius: 'soft',
      typography: 'modern',
      motion: 'full',
      customAccent: null
    };
  }
}

export function saveThemeSettings(settings) {
  localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(settings));
  applyThemeSettings(settings);
  syncDesignPreferencesToDb({ designSettings: settings });
}

export async function syncDesignPreferencesToDb(patch) {
  try {
    const token = localStorage.getItem('lexipulse_token');
    const userStr = localStorage.getItem('lexipulse_user');
    const username = userStr ? JSON.parse(userStr).username : 'ruchit';

    await fetch('/api/user/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
        'x-username': username
      },
      body: JSON.stringify(patch)
    });
  } catch (e) {
    // Offline or silent failure
  }
}

export function syncThemePreferencesFromDb(dbPreferences) {
  if (!dbPreferences) return null;

  // 1. Sync custom themes from DB if present
  if (Array.isArray(dbPreferences.customThemes) && dbPreferences.customThemes.length > 0) {
    const localThemes = getCustomThemes();
    const merged = [...localThemes];
    dbPreferences.customThemes.forEach(dbTheme => {
      const idx = merged.findIndex(t => t.id === dbTheme.id);
      if (idx >= 0) {
        merged[idx] = dbTheme;
      } else {
        merged.push(dbTheme);
      }
    });
    localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(merged));
  }

  // 2. Sync design settings from DB
  if (dbPreferences.designSettings) {
    const current = getThemeSettings();
    const mergedSettings = { ...current, ...dbPreferences.designSettings };
    localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(mergedSettings));
    applyThemeSettings(mergedSettings);
    return mergedSettings;
  } else if (dbPreferences.preferredTheme) {
    const current = getThemeSettings();
    const mergedSettings = { ...current, theme: dbPreferences.preferredTheme };
    localStorage.setItem(THEME_SETTINGS_KEY, JSON.stringify(mergedSettings));
    applyThemeSettings(mergedSettings);
    return mergedSettings;
  }
  return null;
}

// --------------------------------------------------------------------------
// Runtime Token Application
// --------------------------------------------------------------------------
export function applyThemeSettings(settings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  // 1. Apply theme attribute
  root.setAttribute('data-theme', settings.theme || 'obsidian');

  // 2. Apply density attribute
  root.setAttribute('data-density', settings.density || 'comfortable');

  // 3. Apply corner radius attribute
  root.setAttribute('data-radius', settings.radius || 'soft');

  // 4. Apply typography attribute
  root.setAttribute('data-font', settings.typography || 'modern');

  // 5. Apply motion preference
  root.setAttribute('data-motion', settings.motion || 'full');

  // 6. Apply custom accent if set
  if (settings.customAccent) {
    root.style.setProperty('--color-accent', settings.customAccent);
    root.style.setProperty('--accent-primary', settings.customAccent);
    root.style.setProperty('--color-accent-subtle', `${settings.customAccent}1f`);
    root.style.setProperty('--color-border-highlight', `${settings.customAccent}4d`);
  } else {
    root.style.removeProperty('--color-accent');
    root.style.removeProperty('--accent-primary');
    root.style.removeProperty('--color-accent-subtle');
    root.style.removeProperty('--color-border-highlight');
  }

  // 7. Check if custom user theme
  const customThemes = getCustomThemes();
  const customTheme = customThemes.find(t => t.id === settings.theme);
  if (customTheme && customTheme.tokens) {
    Object.entries(customTheme.tokens).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
  }
}
