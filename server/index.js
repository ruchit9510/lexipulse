require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./services/db');
const driveService = require('./services/driveService');
const geminiService = require('./services/geminiService');
const { generateDailyQuiz } = require('./services/quizGenerator');
const weaknessService = require('./services/weaknessService');
const gamificationService = require('./services/gamificationService');
const analyticsService = require('./services/analyticsService');
const confusingWordsService = require('./services/confusingWordsService');
const quickPracticeService = require('./services/quickPracticeService');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize DB and run initial sync if empty or missing meanings
async function autoFillMissingMeanings() {
  try {
    const words = db.getAllWords();
    const missing = words.filter(w => !w.meaning || !w.meaning.trim() || w.meaning === 'Meaning unavailable');
    if (missing.length > 0) {
      console.log(`[AI Meaning Generator] Generating missing meanings for ${missing.length} words...`);
      const prefs = db.getUserPreferences();
      for (const w of missing) {
        const genMeaning = await geminiService.generateWordMeaning({
          word: w.word,
          example: w.example,
          howToUse: w.howToUse,
          contexts: prefs.selectedContexts || []
        });
        if (genMeaning && genMeaning !== 'Meaning unavailable') {
          db.updateWordMeaning(w.id, genMeaning);
          console.log(`[AI Meaning Generator] Generated meaning for "${w.word}": ${genMeaning}`);
        }
      }
    }
  } catch (err) {
    console.warn('[AI Meaning Generator] Notice:', err.message);
  }
}

(async () => {
  try {
    const words = db.getAllWords();
    const hasMissingMeanings = words.some(w => !w.meaning || !w.meaning.trim() || w.meaning === 'Meaning unavailable');
    if (words.length === 0 || hasMissingMeanings) {
      console.log(words.length === 0 ? 'Database empty, performing initial sync...' : 'Missing meanings detected, re-syncing from Drive...');
      await driveService.syncWithDrive(true);
      console.log('Initial sync completed. Loaded records:', db.getAllWords().length);
    }
    await autoFillMissingMeanings();
  } catch (err) {
    console.warn('Initial sync notice:', err.message);
  }
})();

// Periodic background auto-fetch from Google Drive every 2 minutes
setInterval(async () => {
  try {
    const settings = db.getRawSettings();
    if (settings.driveConnected) {
      const res = await driveService.syncWithDrive(false);
      if (res && !res.unchanged) {
        console.log(`[Auto-Fetch] Synced new/updated words from Google Drive: ${res.recordsSynced} records.`);
      }
    }
  } catch (err) {
    // Silent fail for background sync
  }
}, 2 * 60 * 1000);


// Helper to get local date string YYYY-MM-DD
function getLocalDateStr(req) {
  if (req.query.date && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
    return req.query.date;
  }
  // Allow client to pass clientDate header or query
  const clientDate = req.headers['x-client-date'];
  if (clientDate && /^\d{4}-\d{2}-\d{2}$/.test(clientDate)) {
    return clientDate;
  }
  return new Date().toISOString().split('T')[0];
}

// Helper to determine exact OAuth redirect URI respecting proxies and custom domains
function getRequestRedirectUri(req) {
  if (req.query.redirectUri) {
    return req.query.redirectUri;
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${proto}://${host}/api/google/callback`;
}

// ---------------- API ENDPOINTS ---------------- //

/**
 * Authentication Login
 * Validates credentials against MongoDB Atlas users collection
 */
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const auth = await db.verifyUser(username, password);

    if (auth && auth.success) {
      return res.json({
        success: true,
        user: auth.user,
        token: auth.token
      });
    }

    return res.status(401).json({
      success: false,
      message: auth?.message || 'Invalid username or password'
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server login error' });
  }
});

/**
 * Verify Single-Active-Session
 * If logged in from another device, this invalidates the old device
 */
app.get('/api/auth/verify-session', async (req, res) => {
  try {
    const token = req.headers['x-session-token'] || req.query.token;
    const username = req.headers['x-username'] || req.query.username || 'ruchit';
    const result = await db.verifySessionToken(username, token);
    if (result && result.valid) {
      return res.json({ valid: true });
    }
    return res.status(401).json({
      valid: false,
      logout: true,
      message: result?.message || 'You have been logged out because your account was logged in from another device.'
    });
  } catch (err) {
    return res.status(500).json({ valid: false, error: err.message });
  }
});

// Middleware to verify single active session on API routes
async function requireActiveSession(req, res, next) {
  const token = req.headers['x-session-token'] || req.query.token;
  const username = req.headers['x-username'] || req.query.username || 'ruchit';
  
  if (!token) {
    return res.status(401).json({
      success: false,
      logout: true,
      message: 'Session token required. Please sign in again.'
    });
  }

  const result = await db.verifySessionToken(username, token);
  if (!result || !result.valid) {
    return res.status(401).json({
      success: false,
      logout: true,
      message: result?.message || 'You have been logged out because your account was logged in from another device.'
    });
  }

  next();
}

/**
 * App & Sync Status
 */
app.get('/api/status', (req, res) => {
  const settings = db.getRawSettings();
  const stats = db.getStats();
  const mongoStatus = db.getMongoStatus ? db.getMongoStatus() : { connected: false };
  res.json({
    success: true,
    driveConnected: Boolean(settings.driveConnected),
    accountEmail: settings.accountEmail || '',
    selectedDriveFileName: settings.selectedDriveFileName || '',
    selectedDriveFileId: settings.selectedDriveFileId || '',
    lastSyncedAt: settings.lastSyncedAt,
    lastModifiedTime: settings.lastModifiedTime,
    syncStatus: settings.syncStatus || 'idle',
    mongo: mongoStatus,
    stats
  });
});

/**
 * Today's Words
 */
app.get('/api/words/today', (req, res) => {
  const dateStr = getLocalDateStr(req);
  let words = db.getWordsByDate(dateStr);

  // If no words exist for current date, check latest available date in database
  let targetDate = dateStr;
  let isFallbackDate = false;
  if (words.length === 0) {
    const all = db.getAllWords();
    if (all.length > 0) {
      const dates = [...new Set(all.map(w => w.date).filter(Boolean))].sort();
      if (dates.length > 0) {
        targetDate = dates[dates.length - 1];
        words = db.getWordsByDate(targetDate);
        isFallbackDate = true;
      }
    }
  }

  const dbState = db.loadDb();
  const dailySession = dbState.dailySessions[targetDate] || null;

  res.json({
    success: true,
    date: targetDate,
    requestedDate: dateStr,
    isFallbackDate,
    words,
    count: words.length,
    isCompleteSet: words.length === 5,
    dailySession
  });
});

/**
 * All Vocabulary
 */
app.get('/api/words/all', (req, res) => {
  const words = db.getAllWords();
  res.json({
    success: true,
    count: words.length,
    words
  });
});

/**
 * Reset All Vocabulary Data from Database
 */
app.post('/api/vocabulary/reset', async (req, res) => {
  try {
    const result = await db.resetVocabularyData();
    res.json(result);
  } catch (err) {
    console.error('[API] Error resetting vocabulary data:', err);
    res.status(500).json({ success: false, message: 'Failed to reset vocabulary data: ' + err.message });
  }
});

/**
 * Due Review Words (Spaced Repetition)
 */
app.get('/api/words/review', (req, res) => {
  const todayStr = getLocalDateStr(req);
  const dueWords = db.getDueReviewWords(todayStr);
  res.json({
    success: true,
    today: todayStr,
    count: dueWords.length,
    words: dueWords
  });
});

/**
 * Record Review Outcome (SRS update)
 */
/**
 * Record Review Outcome (SRS update)
 */
app.post('/api/words/:id/review', (req, res) => {
  const { id } = req.params;
  const { outcome, date } = req.body; // 'known' or 'need_practice'
  const dateStr = date || getLocalDateStr(req);

  const updated = db.recordWordReview(id, outcome, dateStr);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Word not found' });
  }

  // Award XP for completing an SRS review (+10 XP)
  const xp = gamificationService.awardXp('srs_review', `${id}_${Date.now()}`);

  res.json({
    success: true,
    word: updated,
    xp
  });
});

/**
 * Toggle Favorite
 */
app.post('/api/words/:id/favorite', (req, res) => {
  const { id } = req.params;
  const isFavorite = db.toggleFavorite(id);
  res.json({ success: true, wordId: id, isFavorite });
});

/**
 * Save User Practice Sentence
 */
app.post('/api/words/:id/sentence', (req, res) => {
  const { id } = req.params;
  const { sentence } = req.body;
  const progress = db.saveUserSentence(id, sentence);
  if (!progress) {
    return res.status(404).json({ success: false, message: 'Word not found' });
  }

  // Award XP for writing a practice sentence (+10 XP)
  const xp = gamificationService.awardXp('sentence_written', `${id}_${Date.now()}`);

  res.json({ success: true, progress, xp });
});

/**
 * Complete Daily Learning Session
 */
app.post('/api/session/complete', (req, res) => {
  const { date, wordIds } = req.body;
  const dateStr = date || getLocalDateStr(req);
  const session = db.completeLearningSession(dateStr, wordIds);

  // Award XP for completing daily words (+20 XP, idempotent by dateStr)
  const xp = gamificationService.awardXp('daily_words', dateStr);

  res.json({
    success: true,
    session,
    streak: db.loadDb().streak,
    xp
  });
});

/**
 * Generate Quiz
 */
app.get('/api/quiz', (req, res) => {
  const dateStr = getLocalDateStr(req);
  const isReviewMode = req.query.mode === 'review';
  const allPool = db.getAllWords();

  let targetWords = [];
  if (isReviewMode) {
    targetWords = db.getDueReviewWords(dateStr);
    if (targetWords.length === 0) {
      targetWords = allPool.filter(w => w.progress && w.progress.status === 'needs_practice');
    }
  } else {
    targetWords = db.getWordsByDate(dateStr);
    if (targetWords.length === 0 && allPool.length > 0) {
      // Latest available date
      const dates = [...new Set(allPool.map(w => w.date).filter(Boolean))].sort();
      targetWords = db.getWordsByDate(dates[dates.length - 1]);
    }
  }

  if (targetWords.length === 0) {
    targetWords = allPool.slice(0, 5);
  }

  const questions = generateDailyQuiz(targetWords, allPool);
  res.json({
    success: true,
    date: dateStr,
    count: questions.length,
    questions
  });
});

/**
 * Submit Quiz Results
 */
app.post('/api/quiz/submit', (req, res) => {
  const { date, results, score, total } = req.body;
  const dateStr = date || getLocalDateStr(req);

  const session = db.recordQuizResult(dateStr, results, score, total);

  // Award XP for quiz completion (+15 XP)
  const xp = gamificationService.awardXp('quiz', dateStr);

  // Bonus for perfect quiz (+10 XP)
  if (total > 0 && score === total) {
    gamificationService.awardXp('perfect_quiz', `perfect_${dateStr}`);
  }

  res.json({
    success: true,
    session,
    streak: db.loadDb().streak,
    stats: db.getStats(),
    xp
  });
});

/**
 * ---------------- AI ENDPOINTS (Google Gemini Flash-Lite) ----------------
 */

/**
 * AI Sentence Evaluation
 */
app.post('/api/ai/evaluate-sentence', async (req, res) => {
  try {
    const { word, sentence, meaning } = req.body || {};
    const prefs = db.getUserPreferences();
    const evaluation = await geminiService.evaluateSentence({
      word,
      sentence,
      meaning,
      contexts: prefs.selectedContexts || []
    });
    res.json({ success: true, evaluation });
  } catch (err) {
    console.error('AI evaluate-sentence error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * AI Word Insights & Mnemonics
 */
app.post('/api/ai/word-insights', async (req, res) => {
  try {
    const { word, meaning, example } = req.body || {};
    const prefs = db.getUserPreferences();
    const insights = await geminiService.getWordInsights({
      word,
      meaning,
      example,
      contexts: prefs.selectedContexts || []
    });
    res.json({ success: true, insights });
  } catch (err) {
    console.error('AI word-insights error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * AI Quiz Hint
 */
app.post('/api/ai/quiz-hint', async (req, res) => {
  try {
    const { word, question, options } = req.body || {};
    const hint = await geminiService.getQuizHint({ word, question, options });
    res.json({ success: true, hint });
  } catch (err) {
    console.error('AI quiz-hint error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * AI Generate Word Meaning
 * Automatically generates a simple, clear definition if meaning is unavailable and persists it
 */
app.post('/api/ai/generate-meaning', async (req, res) => {
  try {
    const { wordId, word, example, howToUse } = req.body || {};
    if (!word) {
      return res.status(400).json({ success: false, message: 'Word is required' });
    }

    const prefs = db.getUserPreferences();
    const meaning = await geminiService.generateWordMeaning({
      word,
      example,
      howToUse,
      contexts: prefs.selectedContexts || []
    });

    if (wordId && meaning && meaning !== 'Meaning unavailable') {
      db.updateWordMeaning(wordId, meaning);
    }

    res.json({ success: true, meaning });
  } catch (err) {
    console.error('AI generate-meaning error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ---------------- ADVANCED ANALYTICS & WEAKNESSES ----------------
 */

app.get('/api/analytics/weaknesses', (req, res) => {
  try {
    const profile = weaknessService.calculateWeaknessProfile();
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/analytics/overview', (req, res) => {
  try {
    const overview = analyticsService.getAnalyticsOverview();
    res.json({ success: true, overview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/analytics/weekly', (req, res) => {
  try {
    const summary = analyticsService.getWeeklySummary();
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ---------------- 5-MINUTE QUICK PRACTICE ----------------
 */

app.get('/api/quick-practice', (req, res) => {
  try {
    const duration = parseInt(req.query.duration, 10) || 5;
    const session = quickPracticeService.generateQuickSession(duration);
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/quick-practice/complete', (req, res) => {
  try {
    const result = quickPracticeService.completeQuickSession(req.body || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ---------------- GAMIFICATION & ACHIEVEMENTS ----------------
 */

app.get('/api/xp/history', (req, res) => {
  try {
    const history = db.getXpHistory(30);
    const gamification = db.getUserGamification();
    const levelInfo = gamificationService.getLevelInfo(gamification.totalXp);
    res.json({
      success: true,
      gamification,
      levelInfo,
      history
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/achievements', (req, res) => {
  try {
    const achievements = gamificationService.getAchievementsStatus();
    res.json({ success: true, achievements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ---------------- CONFUSING WORDS MODE ----------------
 */

app.get('/api/confusing-words', (req, res) => {
  try {
    const pairs = confusingWordsService.getConfusingPairs();
    res.json({ success: true, pairs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/confusing-words/practice', (req, res) => {
  try {
    const count = parseInt(req.query.count, 10) || 5;
    const exercises = confusingWordsService.getConfusingPracticeSession(count);
    res.json({ success: true, exercises });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ---------------- CONTEXT & USER PREFERENCES ----------------
 */

app.get('/api/user/preferences', async (req, res) => {
  try {
    const username = req.headers['x-username'] || req.query.username || 'ruchit';
    let preferences = null;
    if (db.getMongoUserPreferences) {
      preferences = await db.getMongoUserPreferences(username);
    }
    if (!preferences) {
      preferences = db.getUserPreferences();
    }
    res.json({ success: true, preferences });
  } catch (err) {
    res.json({ success: true, preferences: db.getUserPreferences() });
  }
});

app.put('/api/user/preferences', (req, res) => {
  try {
    const updated = db.updateUserPreferences(req.body || {});
    res.json({ success: true, preferences: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * ---------------- PWA OFFLINE ACTIONS SYNC ----------------
 */

app.post('/api/pwa/sync', (req, res) => {
  try {
    const { actions = [] } = req.body || {};
    let syncedCount = 0;

    actions.forEach(act => {
      if (act.type === 'review' && act.wordId) {
        db.recordWordReview(act.wordId, act.outcome, act.date);
        syncedCount++;
      } else if (act.type === 'sentence' && act.wordId) {
        db.saveUserSentence(act.wordId, act.sentence);
        syncedCount++;
      } else if (act.type === 'quiz' && act.date) {
        db.recordQuizResult(act.date, act.results, act.score, act.total);
        syncedCount++;
      }
    });

    res.json({ success: true, syncedCount, stats: db.getStats() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Learning Statistics & Progress
 */
app.get('/api/stats', (req, res) => {
  const stats = db.getStats();
  const gamification = db.getUserGamification();
  const levelInfo = gamificationService.getLevelInfo(gamification.totalXp);
  res.json({
    success: true,
    stats: {
      ...stats,
      gamification,
      levelInfo
    }
  });
});

/**
 * Synchronization Endpoint
 */
app.post('/api/sync', async (req, res) => {
  const force = Boolean(req.body.force);
  try {
    const result = await driveService.syncWithDrive(force);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Synchronization failed',
      lastSyncedAt: db.getRawSettings().lastSyncedAt
    });
  }
});

/**
 * Google Drive OAuth Endpoints
 */
app.get('/api/google/auth-url', (req, res) => {
  try {
    const redirectUri = getRequestRedirectUri(req);
    const url = driveService.getAuthUrl(redirectUri);
    res.json({ success: true, url, redirectUri });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.get('/api/google/callback', async (req, res) => {
  const { code, error, state } = req.query;
  if (error) {
    return res.redirect(`/?auth_error=${encodeURIComponent(error)}`);
  }

  try {
    const redirectUri = state || getRequestRedirectUri(req);
    await driveService.handleCallback(code, redirectUri);
    // Redirect back to frontend
    res.redirect(`/?drive_connected=true`);
  } catch (err) {
    console.error('OAuth Callback error:', err);
    res.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

app.get('/api/google/files', async (req, res) => {
  try {
    const files = await driveService.listDriveFiles();
    res.json({ success: true, files });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

app.post('/api/google/select-file', async (req, res) => {
  const { fileId, fileName } = req.body;
  if (!fileId) {
    return res.status(400).json({ success: false, message: 'fileId is required' });
  }
  try {
    const syncResult = await driveService.selectFile(fileId, fileName);
    res.json({ success: true, ...syncResult });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/google/disconnect', (req, res) => {
  const result = driveService.disconnectDrive();
  res.json(result);
});

/**
 * Settings
 */
app.get('/api/settings', (req, res) => {
  res.json({ success: true, settings: db.getSettings() });
});

app.post('/api/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// Serve frontend in production
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexHtml = path.join(clientDist, 'index.html');
  res.sendFile(indexHtml, err => {
    if (err) {
      res.send('API Server Running. Frontend is running on Vite dev server at http://localhost:5173');
    }
  });
});

app.listen(PORT, () => {
  console.log(`Backend Server running on port ${PORT}`);
});
