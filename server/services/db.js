const fs = require('fs');
const path = require('path');
const mongo = require('./mongo');

const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'vocabulary_db.json');

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

const DEFAULT_STATE = {
  vocabulary: {},        // id -> vocabulary item
  learningProgress: {},  // id -> progress item
  dailySessions: {},     // date string (YYYY-MM-DD) -> session data
  streak: {
    currentStreak: 0,
    maxStreak: 0,
    lastCompletedDate: null,
    completedDates: []
  },
  settings: {
    googleClientId: '',
    googleClientSecret: '',
    googleRefreshToken: '',
    googleAccessToken: '',
    googleTokenExpiry: null,
    selectedDriveFileId: '',
    selectedDriveFileName: '',
    accountEmail: '',
    driveConnected: false,
    lastSyncedAt: null,
    lastModifiedTime: null,
    syncStatus: 'idle',
    dailyWordCount: 5,
    autoQuiz: true,
    theme: 'obsidian',
    useLocalFallback: true
  },
  xpEvents: [], // list of XP events { id, username, eventType, amount, referenceId, description, createdAt }
  learningActivities: [], // list of activities for weakness calculation
  weeklyReports: {}, // weekStart -> report
  userPreferences: {
    selectedContexts: ['Daily Life', 'General Topics'],
    contexts: ['Daily Life', 'General Topics'],
    preferredTheme: 'obsidian'
  },
  gamification: {
    totalXp: 0,
    level: 1,
    unlockedAchievements: []
  }
};

let dbCache = null;

function loadDb() {
  if (dbCache) return dbCache;
  ensureDbDir();
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf-8');
      dbCache = JSON.parse(raw);
      // Ensure missing default keys exist
      dbCache.vocabulary = dbCache.vocabulary || {};
      dbCache.learningProgress = dbCache.learningProgress || {};
      dbCache.dailySessions = dbCache.dailySessions || {};
      dbCache.streak = { ...DEFAULT_STATE.streak, ...(dbCache.streak || {}) };
      dbCache.settings = { ...DEFAULT_STATE.settings, ...(dbCache.settings || {}) };
      dbCache.xpEvents = dbCache.xpEvents || [];
      dbCache.learningActivities = dbCache.learningActivities || [];
      dbCache.weeklyReports = dbCache.weeklyReports || {};
      dbCache.userPreferences = { ...DEFAULT_STATE.userPreferences, ...(dbCache.userPreferences || {}) };
      dbCache.gamification = { ...DEFAULT_STATE.gamification, ...(dbCache.gamification || {}) };
      return dbCache;
    } catch (err) {
      console.error('Error loading DB file, resetting to defaults:', err);
    }
  }
  dbCache = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveDb();
  return dbCache;
}

function saveDb() {
  if (!dbCache) return;
  ensureDbDir();
  const tempPath = `${DB_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(dbCache, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_PATH);
}

/**
 * Initialize MongoDB connection and perform bidirectional sync
 */
async function initMongoDb() {
  try {
    const connected = await mongo.connectMongo();
    if (connected) {
      const local = loadDb();
      // Ensure baseline data exists in MongoDB (settings, streak, vocabulary)
      await mongo.ensureBaselineData(local);

      // If Mongo is empty, migrate local data up to Atlas
      await mongo.migrateToMongoIfEmpty(local);

      // Load latest data from MongoDB Atlas into memory and local cache
      const cloudData = await mongo.loadAllFromMongo();
      if (cloudData && Object.keys(cloudData.vocabulary || {}).length > 0) {
        dbCache = {
          ...DEFAULT_STATE,
          ...cloudData,
          streak: cloudData.streak || dbCache?.streak || DEFAULT_STATE.streak,
          settings: cloudData.settings || dbCache?.settings || DEFAULT_STATE.settings
        };
        saveDb();
        console.log(`[Database] Synced ${Object.keys(dbCache.vocabulary).length} vocabulary words from MongoDB Atlas.`);
      }
    }
  } catch (err) {
    console.error('[Database] Mongo sync notice:', err.message);
  }
}

// Start connection in background
initMongoDb();

/**
 * Upsert vocabulary records without wiping learning progress
 * @param {Array} records 
 * @returns {{ added: number, updated: number, total: number }}
 */
function upsertVocabulary(records) {
  const db = loadDb();
  let added = 0;
  let updated = 0;
  const now = new Date().toISOString();

  records.forEach(rec => {
    if (!rec.id || !rec.word) return;

    const meaningVal = rec.meaning || rec.simpleMeaning || 'Meaning unavailable';

    if (!db.vocabulary[rec.id]) {
      db.vocabulary[rec.id] = {
        ...rec,
        meaning: meaningVal,
        simpleMeaning: meaningVal,
        firstSeenAt: now,
        lastSyncedAt: now
      };
      added++;
    } else {
      db.vocabulary[rec.id] = {
        ...db.vocabulary[rec.id],
        ...rec,
        meaning: meaningVal,
        simpleMeaning: meaningVal,
        lastSyncedAt: now
      };
      updated++;
    }

    // Initialize learning progress if not exists
    if (!db.learningProgress[rec.id]) {
      db.learningProgress[rec.id] = {
        id: rec.id,
        word: rec.word,
        status: 'learning', // 'learning' | 'mastered' | 'needs_practice'
        interval: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        lastReviewedDate: null,
        nextReviewDate: rec.date, // defaults to word's target date
        userSentence: '',
        notes: '',
        isFavorite: false,
        history: []
      };
    }
  });

  saveDb();

  // Async persist to MongoDB Atlas
  records.forEach(rec => {
    mongo.persistVocabulary(db.vocabulary[rec.id]);
    mongo.persistProgress(db.learningProgress[rec.id]);
  });

  return { added, updated, total: Object.keys(db.vocabulary).length };
}

/**
 * Get all words merged with user learning progress
 */
function getAllWords() {
  const db = loadDb();
  return Object.values(db.vocabulary).map(v => {
    const progress = db.learningProgress[v.id] || {};
    const meaningVal = v.meaning || v.simpleMeaning || '';
    return {
      ...v,
      meaning: meaningVal,
      simpleMeaning: meaningVal,
      progress
    };
  });
}

/**
 * Get words for a specific date (e.g. today's date)
 * @param {string} dateStr YYYY-MM-DD
 */
function getWordsByDate(dateStr) {
  const all = getAllWords();
  return all.filter(w => w.date === dateStr);
}

/**
 * Get words due for spaced repetition review
 * @param {string} todayStr YYYY-MM-DD
 */
function getDueReviewWords(todayStr) {
  const all = getAllWords();
  return all.filter(w => {
    // Only words with nextReviewDate <= today and has been learned or needs review
    const p = w.progress;
    if (!p) return false;
    if (w.date === todayStr) {
      // Today's new words are learned in daily session, not review queue unless reviewed before
      return p.reviewCount > 0 && p.nextReviewDate && p.nextReviewDate <= todayStr;
    }
    return p.nextReviewDate && p.nextReviewDate <= todayStr;
  }).sort((a, b) => {
    // Prioritize 'needs_practice' first, then lowest correct ratio
    if (a.progress.status === 'needs_practice' && b.progress.status !== 'needs_practice') return -1;
    if (b.progress.status === 'needs_practice' && a.progress.status !== 'needs_practice') return 1;
    return (a.progress.nextReviewDate || '').localeCompare(b.progress.nextReviewDate || '');
  });
}

/**
 * Record review outcome for a word (Spaced Repetition Algorithm)
 * @param {string} wordId 
 * @param {'known'|'need_practice'} outcome 
 * @param {string} dateStr YYYY-MM-DD
 */
function recordWordReview(wordId, outcome, dateStr) {
  const db = loadDb();
  const item = db.vocabulary[wordId];
  if (!item) return null;

  if (!db.learningProgress[wordId]) {
    db.learningProgress[wordId] = {
      id: wordId,
      word: item.word,
      status: 'learning',
      interval: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      correctCount: 0,
      incorrectCount: 0,
      lastReviewedDate: null,
      nextReviewDate: null,
      userSentence: '',
      notes: '',
      isFavorite: false,
      history: []
    };
  }

  const p = db.learningProgress[wordId];
  const currentDate = dateStr || new Date().toISOString().split('T')[0];
  const isKnown = outcome === 'known';

  p.reviewCount += 1;
  p.lastReviewedDate = currentDate;

  const curDateObj = new Date(currentDate);

  if (!isKnown) {
    // Needs Practice: reset interval to 1 day, increase review frequency
    p.incorrectCount += 1;
    p.status = 'needs_practice';
    p.interval = 1;
    
    // next review tomorrow
    const nextDate = new Date(curDateObj.getTime() + 24 * 60 * 60 * 1000);
    p.nextReviewDate = nextDate.toISOString().split('T')[0];
  } else {
    // Known / Mastered progression
    p.correctCount += 1;
    
    // Standard SRS interval ladder: 1 -> 3 -> 7 -> 14 -> 30 days
    if (p.interval < 1) p.interval = 1;
    else if (p.interval === 1) p.interval = 3;
    else if (p.interval === 3) p.interval = 7;
    else if (p.interval === 7) p.interval = 14;
    else if (p.interval === 14) p.interval = 30;
    else p.interval = Math.min(60, Math.round(p.interval * 1.8));

    // Status evaluation
    const totalAnswers = p.correctCount + p.incorrectCount;
    const accuracy = totalAnswers > 0 ? p.correctCount / totalAnswers : 1;
    
    if (p.reviewCount >= 3 && accuracy >= 0.75 && p.interval >= 7) {
      p.status = 'mastered';
    } else {
      p.status = 'learning';
    }

    const nextDate = new Date(curDateObj.getTime() + p.interval * 24 * 60 * 60 * 1000);
    p.nextReviewDate = nextDate.toISOString().split('T')[0];
  }

  p.history.push({
    date: currentDate,
    outcome: outcome,
    interval: p.interval,
    timestamp: new Date().toISOString()
  });

  // Track learning activity signal
  recordLearningActivity({
    activityType: 'srs_review',
    wordId,
    word: item.word,
    dimension: isKnown ? 'retention' : 'meaning_recall',
    isSuccess: isKnown
  });

  saveDb();

  // Async persist to MongoDB Atlas
  mongo.persistProgress(p);
  mongo.persistStreak(db.streak);

  return { ...item, progress: p };
}

/**
 * Toggle favorite for a word
 */
function toggleFavorite(wordId) {
  const db = loadDb();
  if (!db.learningProgress[wordId]) return false;
  db.learningProgress[wordId].isFavorite = !db.learningProgress[wordId].isFavorite;
  saveDb();
  mongo.persistProgress(db.learningProgress[wordId]);
  return db.learningProgress[wordId].isFavorite;
}

/**
 * Save user created sentence
 */
function saveUserSentence(wordId, sentence) {
  const db = loadDb();
  if (!db.learningProgress[wordId]) return null;
  db.learningProgress[wordId].userSentence = sentence || '';

  // Track sentence practice activity
  recordLearningActivity({
    activityType: 'sentence_write',
    wordId,
    word: db.vocabulary[wordId]?.word,
    dimension: 'sentence_usage',
    isSuccess: Boolean(sentence && sentence.trim().length > 3)
  });

  saveDb();
  mongo.persistProgress(db.learningProgress[wordId]);
  return db.learningProgress[wordId];
}

/**
 * Record daily quiz completion and update streak
 */
function recordQuizResult(dateStr, results, score, total) {
  const db = loadDb();
  const percentage = Math.round((score / total) * 100);

  db.dailySessions[dateStr] = {
    date: dateStr,
    quizCompleted: true,
    quizScore: { score, total, percentage },
    results,
    completedAt: new Date().toISOString()
  };

  // Update learning progress for each tested word
  results.forEach(res => {
    if (res.wordId && db.learningProgress[res.wordId]) {
      const p = db.learningProgress[res.wordId];
      if (res.isCorrect) {
        p.correctCount += 1;
      } else {
        p.incorrectCount += 1;
        p.status = 'needs_practice';
        p.interval = 1;
        // Schedule next review for tomorrow
        const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        p.nextReviewDate = tomorrow;
      }
    }

    // Track dimension activity signal
    const dim = res.type === 'meaning_to_word' ? 'word_recall'
      : res.type === 'word_to_meaning' ? 'meaning_recall'
      : res.type === 'situation_context' ? 'workplace_usage'
      : res.type === 'sentence_select' ? 'sentence_usage'
      : 'context_understanding';

    recordLearningActivity({
      activityType: 'quiz_question',
      wordId: res.wordId,
      word: res.targetWord,
      dimension: dim,
      isSuccess: Boolean(res.isCorrect)
    });
  });

  // Update streak
  updateStreak(dateStr);

  saveDb();

  // Async persist to MongoDB Atlas
  mongo.persistDailySession(db.dailySessions[dateStr]);
  mongo.persistStreak(db.streak);
  results.forEach(res => {
    if (res.wordId && db.learningProgress[res.wordId]) {
      mongo.persistProgress(db.learningProgress[res.wordId]);
    }
  });

  return db.dailySessions[dateStr];
}

/**
 * Complete today's learning session
 */
function completeLearningSession(dateStr, wordIds) {
  const db = loadDb();
  if (!db.dailySessions[dateStr]) {
    db.dailySessions[dateStr] = {
      date: dateStr,
      completedWords: wordIds || [],
      quizCompleted: false,
      completedAt: new Date().toISOString()
    };
  } else {
    db.dailySessions[dateStr].completedWords = wordIds || [];
    db.dailySessions[dateStr].completedAt = new Date().toISOString();
  }

  // Completing learning session counts toward streak
  updateStreak(dateStr);
  saveDb();

  // Async persist to MongoDB Atlas
  mongo.persistDailySession(db.dailySessions[dateStr]);
  mongo.persistStreak(db.streak);

  return db.dailySessions[dateStr];
}

/**
 * Recalculate daily streak
 */
function updateStreak(dateStr) {
  const db = loadDb();
  const streak = db.streak;
  
  if (!streak.completedDates.includes(dateStr)) {
    streak.completedDates.push(dateStr);
    streak.completedDates.sort();
  }

  const sortedDates = [...new Set(streak.completedDates)].sort();
  if (sortedDates.length === 0) {
    streak.currentStreak = 0;
    return;
  }

  // Calculate current streak ending today or yesterday
  const today = dateStr || new Date().toISOString().split('T')[0];
  const todayObj = new Date(today);
  const yesterdayObj = new Date(todayObj.getTime() - 24 * 60 * 60 * 1000);
  const yesterday = yesterdayObj.toISOString().split('T')[0];

  const lastCompleted = sortedDates[sortedDates.length - 1];
  streak.lastCompletedDate = lastCompleted;

  // Walk backwards from today/yesterday to count consecutive days
  let count = 0;
  let checkDate = sortedDates.includes(today) ? todayObj : yesterdayObj;
  
  if (sortedDates.includes(checkDate.toISOString().split('T')[0])) {
    while (true) {
      const checkStr = checkDate.toISOString().split('T')[0];
      if (sortedDates.includes(checkStr)) {
        count++;
        checkDate = new Date(checkDate.getTime() - 24 * 60 * 60 * 1000);
      } else {
        break;
      }
    }
  } else {
    count = 0; // Missed yesterday and today
  }

  streak.currentStreak = count;
  streak.maxStreak = Math.max(streak.maxStreak, count);
}

/**
 * Get comprehensive learning statistics
 */
function getStats() {
  const db = loadDb();
  const all = getAllWords();
  const totalWords = all.length;
  
  let masteredCount = 0;
  let learningCount = 0;
  let needsPracticeCount = 0;
  let totalReviews = 0;
  let totalCorrect = 0;
  let totalIncorrect = 0;
  let favoriteCount = 0;

  all.forEach(w => {
    const p = w.progress;
    if (p.isFavorite) favoriteCount++;
    if (p.status === 'mastered') masteredCount++;
    else if (p.status === 'needs_practice') needsPracticeCount++;
    else learningCount++;

    totalReviews += p.reviewCount || 0;
    totalCorrect += p.correctCount || 0;
    totalIncorrect += p.incorrectCount || 0;
  });

  const totalAnswers = totalCorrect + totalIncorrect;
  const overallAccuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
  const masteryPercentage = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  // Words due today
  const todayStr = new Date().toISOString().split('T')[0];
  const dueCount = getDueReviewWords(todayStr).length;

  return {
    totalWords,
    masteredCount,
    learningCount,
    needsPracticeCount,
    masteryPercentage,
    dueCount,
    favoriteCount,
    totalReviews,
    overallAccuracy,
    streak: db.streak,
    dailySessions: db.dailySessions
  };
}

/**
 * Settings methods
 */
function getSettings() {
  const db = loadDb();
  // Never expose clientSecret in full or tokens to front-end if sensitive
  const safeSettings = { ...db.settings };
  safeSettings.hasClientSecret = Boolean(safeSettings.googleClientSecret);
  safeSettings.hasRefreshToken = Boolean(safeSettings.googleRefreshToken);
  delete safeSettings.googleClientSecret;
  delete safeSettings.googleRefreshToken;
  return safeSettings;
}

function updateSettings(patch) {
  const db = loadDb();
  db.settings = { ...db.settings, ...patch };
  saveDb();
  mongo.persistSettings(db.settings);
  return getSettings();
}

function getRawSettings() {
  const db = loadDb();
  return db.settings;
}

/**
 * Record a learning activity for weakness calculation
 */
function recordLearningActivity(act) {
  const db = loadDb();
  const activity = {
    id: act.id || 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    username: act.username || 'ruchit',
    activityType: act.activityType,
    wordId: act.wordId || null,
    word: act.word || null,
    dimension: act.dimension || 'retention',
    isSuccess: Boolean(act.isSuccess),
    responseTimeMs: act.responseTimeMs || null,
    metadata: act.metadata || {},
    timestamp: act.timestamp || new Date().toISOString()
  };
  db.learningActivities.push(activity);
  // Keep last 1000 activities in memory/local
  if (db.learningActivities.length > 1000) {
    db.learningActivities = db.learningActivities.slice(-1000);
  }
  saveDb();
  mongo.persistLearningActivity(activity);
  return activity;
}

function getLearningActivities(limit = 500) {
  const db = loadDb();
  return (db.learningActivities || []).slice(-limit);
}

/**
 * Record an XP Event (Idempotent)
 */
function recordXp(event) {
  const db = loadDb();
  if (!event || !event.id) return { success: false, message: 'Missing event ID' };

  // Check idempotency: if event.id already exists, return current total without re-awarding
  const existing = (db.xpEvents || []).find(e => e.id === event.id);
  if (existing) {
    return {
      success: true,
      alreadyAwarded: true,
      event: existing,
      gamification: db.gamification
    };
  }

  const xpItem = {
    id: event.id,
    username: event.username || 'ruchit',
    eventType: event.eventType,
    amount: event.amount,
    referenceId: event.referenceId || null,
    description: event.description || '',
    createdAt: event.createdAt || new Date().toISOString()
  };

  db.xpEvents.push(xpItem);
  db.gamification.totalXp = (db.gamification.totalXp || 0) + event.amount;

  // Level formula: Level = floor(sqrt(totalXp / 50)) + 1
  db.gamification.level = Math.max(1, Math.floor(Math.sqrt(db.gamification.totalXp / 50)) + 1);

  saveDb();
  mongo.persistXpEvent(xpItem);
  mongo.updateUserGamification(event.username || 'ruchit', db.gamification);

  return {
    success: true,
    alreadyAwarded: false,
    event: xpItem,
    gamification: db.gamification
  };
}

function getXpHistory(limit = 50) {
  const db = loadDb();
  return [...(db.xpEvents || [])].reverse().slice(0, limit);
}

function getUserGamification() {
  const db = loadDb();
  return db.gamification || { totalXp: 0, level: 1, unlockedAchievements: [] };
}

function updateUserGamification(patch) {
  const db = loadDb();
  db.gamification = { ...db.gamification, ...patch };
  saveDb();
  mongo.updateUserGamification('ruchit', db.gamification);
  return db.gamification;
}

function getUserPreferences() {
  const db = loadDb();
  const prefs = db.userPreferences || {
    selectedContexts: ['Daily Life', 'General Topics'],
    contexts: ['Daily Life', 'General Topics'],
    preferredTheme: 'obsidian',
    designSettings: {
      theme: 'obsidian',
      density: 'comfortable',
      radius: 'soft',
      typography: 'modern',
      motion: 'full',
      customAccent: null
    },
    customThemes: []
  };

  const rawContexts = prefs.selectedContexts || prefs.contexts || ['Daily Life', 'General Topics'];
  const cleanedContexts = rawContexts.filter(c => c && c.toLowerCase() !== 'software development' && c.toLowerCase() !== 'software');
  const finalContexts = cleanedContexts.length > 0 ? cleanedContexts : ['Daily Life', 'General Topics'];

  return {
    ...prefs,
    selectedContexts: finalContexts,
    contexts: finalContexts
  };
}

function updateUserPreferences(patch) {
  const db = loadDb();
  const incomingContexts = patch.selectedContexts || patch.contexts;

  db.userPreferences = { 
    ...db.userPreferences, 
    ...patch,
    ...(incomingContexts ? { selectedContexts: incomingContexts, contexts: incomingContexts } : {}),
    designSettings: {
      ...(db.userPreferences?.designSettings || {}),
      ...(patch.designSettings || {})
    }
  };
  if (patch.customThemes) {
    db.userPreferences.customThemes = patch.customThemes;
  }
  if (patch.preferredTheme) {
    db.settings.theme = patch.preferredTheme;
  } else if (patch.designSettings?.theme) {
    db.settings.theme = patch.designSettings.theme;
  }
  saveDb();
  mongo.updateUserPreferences('ruchit', db.userPreferences);
  return db.userPreferences;
}

function getWeeklyReports() {
  const db = loadDb();
  return db.weeklyReports || {};
}

function saveWeeklyReport(report) {
  const db = loadDb();
  if (!report || !report.weekStart) return null;
  db.weeklyReports[report.weekStart] = report;
  saveDb();
  mongo.persistWeeklyReport(report);
  return report;
}

/**
 * Reset vocabulary data across local DB and MongoDB Atlas
 */
async function resetVocabularyData() {
  const db = loadDb();
  db.vocabulary = {};
  db.learningProgress = {};
  db.dailySessions = {};
  db.xpEvents = [];
  db.learningActivities = [];
  db.weeklyReports = {};
  db.streak = {
    currentStreak: 0,
    maxStreak: 0,
    lastCompletedDate: null,
    completedDates: []
  };
  saveDb();

  if (mongo.isConnected()) {
    await mongo.resetVocabularyDataInMongo();
  }

  console.log('[Database] All vocabulary data, learning progress, and streak successfully reset.');
  return { success: true, message: 'All vocabulary data and learning progress have been reset.' };
}

/**
 * Update meaning for an existing vocabulary item and persist
 */
function updateWordMeaning(wordId, meaning) {
  if (!wordId || !meaning) return null;
  const db = loadDb();
  if (db.vocabulary[wordId]) {
    db.vocabulary[wordId].meaning = meaning;
    db.vocabulary[wordId].simpleMeaning = meaning;
    db.vocabulary[wordId].lastSyncedAt = new Date().toISOString();
    saveDb();

    // Persist to MongoDB
    mongo.persistVocabulary(db.vocabulary[wordId]);
    return db.vocabulary[wordId];
  }
  return null;
}

module.exports = {
  loadDb,
  saveDb,
  upsertVocabulary,
  getAllWords,
  getWordsByDate,
  getDueReviewWords,
  recordWordReview,
  toggleFavorite,
  saveUserSentence,
  recordQuizResult,
  completeLearningSession,
  getStats,
  getSettings,
  updateSettings,
  getRawSettings,
  recordLearningActivity,
  getLearningActivities,
  recordXp,
  getXpHistory,
  getUserGamification,
  updateUserGamification,
  getUserPreferences,
  updateUserPreferences,
  getMongoUserPreferences: mongo.getUserPreferences,
  getWeeklyReports,
  saveWeeklyReport,
  resetVocabularyData,
  updateWordMeaning,
  verifyUser: mongo.verifyUser,
  verifySessionToken: mongo.verifySessionToken,
  getMongoStatus: mongo.getStatus
};
