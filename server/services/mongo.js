const mongoose = require('mongoose');
const crypto = require('crypto');

let isMongoConnected = false;
let mongoError = null;
const localActiveSessions = {}; // username -> sessionToken (offline fallback)

// Password hashing helpers using crypto.scrypt
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
  if (!salt) {
    // Legacy plaintext comparison for fallback
    return password === storedHash;
  }
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
}

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // Scrypt hash or legacy plaintext
  passwordSalt: { type: String, default: null },
  name: { type: String, default: 'Ruchit' },
  currentSessionToken: { type: String, default: null },
  sessionCreatedAt: { type: Date, default: null },
  sessionLastActive: { type: Date, default: null },
  preferences: {
    selectedContexts: {
      type: [String],
      default: ['Daily Conversation', 'Workplace', 'Software Development']
    },
    preferredTheme: { type: String, default: 'obsidian' },
    designSettings: {
      theme: { type: String, default: 'obsidian' },
      density: { type: String, default: 'comfortable' },
      radius: { type: String, default: 'soft' },
      typography: { type: String, default: 'modern' },
      motion: { type: String, default: 'full' },
      customAccent: { type: String, default: null }
    },
    customThemes: {
      type: Array,
      default: []
    }
  },
  gamification: {
    totalXp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    unlockedAchievements: { type: [String], default: [] }
  },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
});

const xpEventSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, lowercase: true },
  eventType: { type: String, required: true }, // 'daily_words' | 'srs_review' | 'quiz' | etc.
  amount: { type: Number, required: true },
  referenceId: { type: String, default: null },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const learningActivitySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, lowercase: true },
  activityType: { type: String, required: true }, // 'srs_review' | 'quiz_question' | 'sentence_write' | 'quick_practice'
  wordId: String,
  word: String,
  dimension: String, // 'meaning_recall' | 'word_recall' | 'context_understanding' | 'sentence_usage' | 'workplace_usage' | 'retention'
  isSuccess: Boolean,
  responseTimeMs: Number,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: { type: Date, default: Date.now }
});

const weeklyReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, lowercase: true },
  weekStart: { type: String, required: true }, // YYYY-MM-DD
  statistics: mongoose.Schema.Types.Mixed,
  strongestArea: String,
  weakestArea: String,
  difficultWords: [String],
  generatedAt: { type: Date, default: Date.now }
});

const vocabularySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  word: { type: String, required: true },
  simpleMeaning: String,
  example: String,
  howToUse: String,
  date: String,
  firstSeenAt: String,
  lastSyncedAt: String
});

const learningProgressSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  word: String,
  status: { type: String, default: 'learning' },
  interval: { type: Number, default: 1 },
  easeFactor: { type: Number, default: 2.5 },
  reviewCount: { type: Number, default: 0 },
  correctCount: { type: Number, default: 0 },
  incorrectCount: { type: Number, default: 0 },
  lastReviewedDate: String,
  nextReviewDate: String,
  userSentence: { type: String, default: '' },
  notes: { type: String, default: '' },
  isFavorite: { type: Boolean, default: false },
  history: [
    {
      date: String,
      outcome: String,
      interval: Number,
      timestamp: String
    }
  ]
});

const dailySessionSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  completedWords: [String],
  quizCompleted: { type: Boolean, default: false },
  quizScore: {
    score: Number,
    total: Number,
    percentage: Number
  },
  results: Array,
  completedAt: String
});

const streakSchema = new mongoose.Schema({
  singletonId: { type: String, default: 'global_streak', unique: true },
  currentStreak: { type: Number, default: 0 },
  maxStreak: { type: Number, default: 0 },
  lastCompletedDate: String,
  completedDates: [String]
});

const settingsSchema = new mongoose.Schema({
  singletonId: { type: String, default: 'app_settings', unique: true },
  googleClientId: String,
  googleClientSecret: String,
  googleRefreshToken: String,
  googleAccessToken: String,
  googleTokenExpiry: Number,
  selectedDriveFileId: String,
  selectedDriveFileName: String,
  accountEmail: String,
  driveConnected: { type: Boolean, default: false },
  lastSyncedAt: String,
  lastModifiedTime: String,
  syncStatus: { type: String, default: 'idle' },
  dailyWordCount: { type: Number, default: 5 },
  autoQuiz: { type: Boolean, default: true },
  theme: { type: String, default: 'obsidian' },
  useLocalFallback: { type: Boolean, default: true }
});

const User = mongoose.model('User', userSchema);
const XPEvent = mongoose.model('XPEvent', xpEventSchema);
const LearningActivity = mongoose.model('LearningActivity', learningActivitySchema);
const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema);
const Vocabulary = mongoose.model('Vocabulary', vocabularySchema);
const LearningProgress = mongoose.model('LearningProgress', learningProgressSchema);
const DailySession = mongoose.model('DailySession', dailySessionSchema);
const Streak = mongoose.model('Streak', streakSchema);
const Settings = mongoose.model('Settings', settingsSchema);

/**
 * Connect to MongoDB Atlas
 */
async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('[MongoDB] MONGODB_URI not found in environment. Running in local file mode.');
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 10000,
    });
    isMongoConnected = true;
    mongoError = null;
    console.log('[MongoDB] Successfully connected to MongoDB Atlas (cluster0.koho4sc.mongodb.net/lexipulse).');

    // Ensure default user exists
    await ensureSeedUser();
    return true;
  } catch (err) {
    isMongoConnected = false;
    mongoError = err.message;
    console.warn('[MongoDB] Warning: Could not connect to MongoDB Atlas:', err.message);
    console.warn('[MongoDB] Falling back gracefully to local file storage.');
    return false;
  }
}

/**
 * Ensure initial user ruchit / 114432 is in the User collection with secure scrypt hash
 */
async function ensureSeedUser() {
  try {
    const existing = await User.findOne({ username: 'ruchit' });
    if (!existing) {
      const { hash, salt } = hashPassword('114432');
      await User.create({
        username: 'ruchit',
        password: hash,
        passwordSalt: salt,
        name: 'Ruchit',
        preferences: {
          selectedContexts: ['Daily Conversation', 'Workplace', 'Software Development'],
          preferredTheme: 'obsidian'
        },
        gamification: {
          totalXp: 0,
          level: 1,
          unlockedAchievements: []
        }
      });
      console.log('[MongoDB] Initial user (ruchit) seeded with secure password hash.');
    } else if (!existing.passwordSalt && existing.password === '114432') {
      // Upgrade plaintext seed user to scrypt hash
      const { hash, salt } = hashPassword('114432');
      existing.password = hash;
      existing.passwordSalt = salt;
      if (!existing.preferences) {
        existing.preferences = {
          selectedContexts: ['Daily Conversation', 'Workplace', 'Software Development'],
          preferredTheme: 'obsidian'
        };
      }
      if (!existing.gamification) {
        existing.gamification = { totalXp: 0, level: 1, unlockedAchievements: [] };
      }
      await existing.save();
      console.log('[MongoDB] Upgraded existing user (ruchit) to secure scrypt password hash.');
    }
  } catch (err) {
    console.error('[MongoDB] Error ensuring seed user:', err.message);
  }
}

/**
 * Verify user credentials from MongoDB (or fallback if offline)
 * Issues a single-active-session token so only one device can be logged in at a time.
 */
async function verifyUser(username, password) {
  const cleanUsername = String(username || '').trim().toLowerCase();
  const cleanPassword = String(password || '').trim();
  const sessionToken = 'lp_' + crypto.randomBytes(24).toString('hex');

  // Always keep in-memory cache updated with newest session
  localActiveSessions[cleanUsername] = sessionToken;

  if (isMongoConnected) {
    try {
      const user = await User.findOne({ username: cleanUsername });
      if (user && verifyPassword(cleanPassword, user.password, user.passwordSalt)) {
        user.currentSessionToken = sessionToken;
        user.sessionCreatedAt = new Date();
        user.sessionLastActive = new Date();
        user.lastLoginAt = new Date();
        await user.save();
        return {
          success: true,
          user: {
            username: user.username,
            name: user.name || 'Ruchit',
            preferences: user.preferences || {
              selectedContexts: ['Daily Conversation', 'Workplace', 'Software Development'],
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
            },
            gamification: user.gamification || {
              totalXp: 0,
              level: 1,
              unlockedAchievements: []
            }
          },
          token: sessionToken
        };
      }
      return { success: false, message: 'Invalid username or password' };
    } catch (err) {
      console.error('[MongoDB] verifyUser error:', err.message);
    }
  }

  // Fallback check
  if (cleanUsername === 'ruchit' && cleanPassword === '114432') {
    localActiveSessions[cleanUsername] = sessionToken;
    return {
      success: true,
      user: {
        username: 'ruchit',
        name: 'Ruchit',
        preferences: {
          selectedContexts: ['Daily Conversation', 'Workplace', 'Software Development'],
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
        },
        gamification: {
          totalXp: 0,
          level: 1,
          unlockedAchievements: []
        }
      },
      token: sessionToken
    };
  }

  return { success: false, message: 'Invalid username or password' };
}

/**
 * Verify if the given session token is still the active one for this user
 * If someone logged in from another device, this will return valid: false
 */
async function verifySessionToken(username, token) {
  if (!token || !username) {
    return { valid: false, logout: true, message: 'Missing session parameters. Please log in again.' };
  }
  const cleanUsername = String(username).trim().toLowerCase();

  if (isMongoConnected) {
    try {
      const user = await User.findOne({ username: cleanUsername });
      if (!user) {
        return { valid: false, logout: true, message: 'User not found' };
      }
      if (user.currentSessionToken && user.currentSessionToken !== token) {
        return {
          valid: false,
          logout: true,
          reason: 'superseded',
          message: 'You have been logged out because your account was logged in from another device.'
        };
      }
      if (!user.currentSessionToken) {
        user.currentSessionToken = token;
        await user.save();
      }
      localActiveSessions[cleanUsername] = user.currentSessionToken;
      return { valid: true };
    } catch (err) {
      console.error('[MongoDB] verifySessionToken error:', err.message);
    }
  }

  // Fallback check
  if (localActiveSessions[cleanUsername] && localActiveSessions[cleanUsername] !== token) {
    return {
      valid: false,
      logout: true,
      reason: 'superseded',
      message: 'You have been logged out because your account was logged in from another device.'
    };
  }

  if (!localActiveSessions[cleanUsername]) {
    localActiveSessions[cleanUsername] = token;
  }

  return { valid: true };
}

/**
 * Check if MongoDB Atlas is currently connected
 */
function isConnected() {
  return isMongoConnected && mongoose.connection.readyState === 1;
}

function getStatus() {
  return {
    connected: isConnected(),
    readyState: mongoose.connection.readyState,
    error: mongoError,
    cluster: 'cluster0.koho4sc.mongodb.net'
  };
}

/**
 * Load complete dataset from MongoDB Atlas if available
 */
async function loadAllFromMongo() {
  if (!isConnected()) return null;
  try {
    const vocabList = await Vocabulary.find({}).lean();
    if (!vocabList || vocabList.length === 0) return null;

    const progressList = await LearningProgress.find({}).lean();
    const sessionList = await DailySession.find({}).lean();
    const streakDoc = await Streak.findOne({ singletonId: 'global_streak' }).lean();
    const settingsDoc = await Settings.findOne({ singletonId: 'app_settings' }).lean();

    const vocabulary = {};
    vocabList.forEach(v => { vocabulary[v.id] = v; });

    const learningProgress = {};
    progressList.forEach(p => { learningProgress[p.id] = p; });

    const dailySessions = {};
    sessionList.forEach(s => { dailySessions[s.date] = s; });

    return {
      vocabulary,
      learningProgress,
      dailySessions,
      streak: streakDoc ? {
        currentStreak: streakDoc.currentStreak || 0,
        maxStreak: streakDoc.maxStreak || 0,
        lastCompletedDate: streakDoc.lastCompletedDate || null,
        completedDates: streakDoc.completedDates || []
      } : null,
      settings: settingsDoc ? settingsDoc : null
    };
  } catch (err) {
    console.error('[MongoDB] Error loading all data from Mongo:', err.message);
    return null;
  }
}

/**
 * Migrate local JSON database to MongoDB Atlas if Mongo is currently empty
 */
async function migrateToMongoIfEmpty(localDb) {
  if (!isConnected() || !localDb) return;
  try {
    const count = await Vocabulary.countDocuments();
    if (count > 0) {
      console.log(`[MongoDB] Atlas already contains ${count} vocabulary records. No migration needed.`);
      return;
    }

    const vocabEntries = Object.values(localDb.vocabulary || {});
    if (vocabEntries.length === 0) return;

    console.log(`[MongoDB] Migrating ${vocabEntries.length} vocabulary records to MongoDB Atlas...`);

    // Bulk insert vocabulary
    for (const v of vocabEntries) {
      await Vocabulary.findOneAndUpdate(
        { id: v.id },
        { $set: v },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Bulk insert progress
    const progressEntries = Object.values(localDb.learningProgress || {});
    for (const p of progressEntries) {
      await LearningProgress.findOneAndUpdate(
        { id: p.id },
        { $set: p },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Sessions
    const sessionEntries = Object.values(localDb.dailySessions || {});
    for (const s of sessionEntries) {
      await DailySession.findOneAndUpdate(
        { date: s.date },
        { $set: s },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Streak
    if (localDb.streak) {
      await Streak.findOneAndUpdate(
        { singletonId: 'global_streak' },
        { $set: { ...localDb.streak, singletonId: 'global_streak' } },
        { upsert: true, returnDocument: 'after' }
      );
    }

    // Settings
    if (localDb.settings) {
      await Settings.findOneAndUpdate(
        { singletonId: 'app_settings' },
        { $set: { ...localDb.settings, singletonId: 'app_settings' } },
        { upsert: true, returnDocument: 'after' }
      );
    }

    console.log(`[MongoDB] Successfully migrated ${vocabEntries.length} vocabulary records and learning data to MongoDB Atlas!`);
  } catch (err) {
    console.error('[MongoDB] Migration error:', err.message);
  }
}

/**
 * Asynchronous persistence handlers
 */
async function persistVocabulary(rec) {
  if (!isConnected() || !rec?.id) return;
  try {
    await Vocabulary.findOneAndUpdate({ id: rec.id }, { $set: rec }, { upsert: true });
  } catch (e) {
    console.warn('[MongoDB] Error persisting vocabulary:', e.message);
  }
}

async function persistProgress(prog) {
  if (!isConnected() || !prog?.id) return;
  try {
    await LearningProgress.findOneAndUpdate({ id: prog.id }, { $set: prog }, { upsert: true });
  } catch (e) {
    console.warn('[MongoDB] Error persisting progress:', e.message);
  }
}

async function persistDailySession(session) {
  if (!isConnected() || !session?.date) return;
  try {
    await DailySession.findOneAndUpdate({ date: session.date }, { $set: session }, { upsert: true });
  } catch (e) {
    console.warn('[MongoDB] Error persisting daily session:', e.message);
  }
}

async function persistStreak(streak) {
  if (!isConnected() || !streak) return;
  try {
    await Streak.findOneAndUpdate({ singletonId: 'global_streak' }, { $set: { ...streak, singletonId: 'global_streak' } }, { upsert: true });
  } catch (e) {
    console.warn('[MongoDB] Error persisting streak:', e.message);
  }
}

async function persistSettings(settings) {
  if (!isConnected() || !settings) return;
  try {
    await Settings.findOneAndUpdate({ singletonId: 'app_settings' }, { $set: { ...settings, singletonId: 'app_settings' } }, { upsert: true });
  } catch (e) {
    console.warn('[MongoDB] Error persisting settings:', e.message);
  }
}

async function persistXpEvent(event) {
  if (!isConnected() || !event?.id) return;
  try {
    await XPEvent.findOneAndUpdate({ id: event.id }, { $set: event }, { upsert: true });
  } catch (e) {
    console.warn('[MongoDB] Error persisting XP event:', e.message);
  }
}

async function persistLearningActivity(activity) {
  if (!isConnected() || !activity?.id) return;
  try {
    await LearningActivity.findOneAndUpdate({ id: activity.id }, { $set: activity }, { upsert: true });
  } catch (e) {
    console.warn('[MongoDB] Error persisting learning activity:', e.message);
  }
}

async function persistWeeklyReport(report) {
  if (!isConnected() || !report?.id) return;
  try {
    await WeeklyReport.findOneAndUpdate({ id: report.id }, { $set: report }, { upsert: true });
  } catch (e) {
    console.warn('[MongoDB] Error persisting weekly report:', e.message);
  }
}

async function updateUserGamification(username, gamification) {
  if (!isConnected() || !username) return;
  try {
    await User.findOneAndUpdate({ username }, { $set: { gamification } });
  } catch (e) {
    console.warn('[MongoDB] Error updating gamification:', e.message);
  }
}

async function updateUserPreferences(username, preferences) {
  if (!isConnected() || !username) return;
  try {
    const cleanUsername = String(username).trim().toLowerCase();
    await User.findOneAndUpdate({ username: cleanUsername }, { $set: { preferences } });
  } catch (e) {
    console.warn('[MongoDB] Error updating preferences:', e.message);
  }
}

async function getUserPreferences(username) {
  if (!isConnected() || !username) return null;
  try {
    const cleanUsername = String(username).trim().toLowerCase();
    const user = await User.findOne({ username: cleanUsername });
    return user ? user.preferences : null;
  } catch (e) {
    console.warn('[MongoDB] Error getting preferences:', e.message);
    return null;
  }
}

module.exports = {
  connectMongo,
  isConnected,
  getStatus,
  verifyUser,
  verifySessionToken,
  loadAllFromMongo,
  migrateToMongoIfEmpty,
  persistVocabulary,
  persistProgress,
  persistDailySession,
  persistStreak,
  persistSettings,
  persistXpEvent,
  persistLearningActivity,
  persistWeeklyReport,
  updateUserGamification,
  updateUserPreferences,
  getUserPreferences,
  hashPassword,
  verifyPassword,
  User,
  XPEvent,
  LearningActivity,
  WeeklyReport,
  Vocabulary,
  LearningProgress,
  DailySession,
  Streak,
  Settings
};
