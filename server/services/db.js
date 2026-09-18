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
    theme: 'dark',
    useLocalFallback: true
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

    if (!db.vocabulary[rec.id]) {
      db.vocabulary[rec.id] = {
        ...rec,
        firstSeenAt: now,
        lastSyncedAt: now
      };
      added++;
    } else {
      db.vocabulary[rec.id] = {
        ...db.vocabulary[rec.id],
        ...rec,
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
    return {
      ...v,
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
  verifyUser: mongo.verifyUser,
  getMongoStatus: mongo.getStatus
};
