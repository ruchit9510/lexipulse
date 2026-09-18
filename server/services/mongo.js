const mongoose = require('mongoose');
const crypto = require('crypto');

let isMongoConnected = false;
let mongoError = null;
const localActiveSessions = {}; // username -> sessionToken (offline fallback)

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // Simple direct/hashed credential
  name: { type: String, default: 'Ruchit' },
  currentSessionToken: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  lastLoginAt: { type: Date, default: Date.now }
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
  theme: { type: String, default: 'dark' },
  useLocalFallback: { type: Boolean, default: true }
});

const User = mongoose.model('User', userSchema);
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
 * Ensure initial user ruchit / 114432 is in the User collection
 */
async function ensureSeedUser() {
  try {
    const existing = await User.findOne({ username: 'ruchit' });
    if (!existing) {
      await User.create({
        username: 'ruchit',
        password: '114432',
        name: 'Ruchit'
      });
      console.log('[MongoDB] Initial user (ruchit) seeded in User collection.');
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

  if (isMongoConnected) {
    try {
      const user = await User.findOne({ username: cleanUsername });
      if (user && user.password === cleanPassword) {
        user.currentSessionToken = sessionToken;
        user.lastLoginAt = new Date();
        await user.save();
        return {
          success: true,
          user: {
            username: user.username,
            name: user.name || 'Ruchit'
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
        name: 'Ruchit'
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
    return { valid: false, message: 'Missing session parameters' };
  }
  const cleanUsername = String(username).trim().toLowerCase();

  if (isMongoConnected) {
    try {
      const user = await User.findOne({ username: cleanUsername });
      if (!user) {
        return { valid: false, message: 'User not found' };
      }
      if (user.currentSessionToken !== token) {
        return {
          valid: false,
          reason: 'superseded',
          message: 'You have been logged out because your account was logged in from another device.'
        };
      }
      return { valid: true };
    } catch (err) {
      console.error('[MongoDB] verifySessionToken error:', err.message);
    }
  }

  // Fallback check
  if (localActiveSessions[cleanUsername] && localActiveSessions[cleanUsername] !== token) {
    return {
      valid: false,
      reason: 'superseded',
      message: 'You have been logged out because your account was logged in from another device.'
    };
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
  User,
  Vocabulary,
  LearningProgress,
  DailySession,
  Streak,
  Settings
};
