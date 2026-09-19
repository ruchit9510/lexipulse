/**
 * Gamification & Achievement Engine
 * Manages idempotent XP awards, level progression, and automated achievement checks.
 */

const db = require('./db');

const XP_RULES = {
  daily_words: { amount: 20, label: 'Daily words completed' },
  srs_review: { amount: 10, label: 'SRS review completed' },
  quiz: { amount: 15, label: 'Daily quiz completed' },
  perfect_quiz: { amount: 10, label: 'Perfect quiz score bonus' },
  sentence_written: { amount: 10, label: 'Sentence practice' },
  quick_session: { amount: 15, label: 'Quick practice session' },
  daily_streak: { amount: 5, label: 'Daily study streak' },
  weekly_goal: { amount: 50, label: 'Weekly goal completed' }
};

const LEVEL_TIERS = [
  { level: 1, title: 'Novice Learner', minXp: 0 },
  { level: 2, title: 'Word Explorer', minXp: 100 },
  { level: 3, title: 'Vocabulary Builder', minXp: 250 },
  { level: 4, title: 'Fluent Speaker', minXp: 500 },
  { level: 5, title: 'Linguist', minXp: 900 },
  { level: 6, title: 'Word Master', minXp: 1400 },
  { level: 7, title: 'Language Architect', minXp: 2000 },
  { level: 8, title: 'Polyglot Virtuoso', minXp: 2800 },
  { level: 9, title: 'Lexical Sage', minXp: 3800 },
  { level: 10, title: 'Master of Rhetoric', minXp: 5000 }
];

const ACHIEVEMENTS_DEFINITIONS = [
  // Learning Milestones
  {
    id: 'first_word',
    category: 'Learning',
    title: 'First Word',
    description: 'Learn your first vocabulary word in LexiPulse.',
    icon: 'BookOpen',
    target: 1,
    check: (stats) => (stats.masteredCount || 0) + (stats.learningCount || 0) >= 1
  },
  {
    id: 'words_10',
    category: 'Learning',
    title: '10 Words Learned',
    description: 'Explore and study at least 10 vocabulary words.',
    icon: 'BookOpen',
    target: 10,
    check: (stats) => (stats.masteredCount || 0) + (stats.learningCount || 0) >= 10
  },
  {
    id: 'words_50',
    category: 'Learning',
    title: '50 Words Learned',
    description: 'Build your vocabulary vault to 50 active words.',
    icon: 'Library',
    target: 50,
    check: (stats) => (stats.masteredCount || 0) + (stats.learningCount || 0) >= 50
  },
  {
    id: 'words_100',
    category: 'Learning',
    title: '100 Words Learned',
    description: 'Reach a milestone of 100 synchronized words.',
    icon: 'Award',
    target: 100,
    check: (stats) => (stats.masteredCount || 0) + (stats.learningCount || 0) >= 100
  },

  // Consistency & Streaks
  {
    id: 'streak_3',
    category: 'Consistency',
    title: '3-Day Streak',
    description: 'Study for 3 consecutive days.',
    icon: 'Flame',
    target: 3,
    check: (stats) => (stats.streak?.currentStreak || 0) >= 3 || (stats.streak?.maxStreak || 0) >= 3
  },
  {
    id: 'streak_7',
    category: 'Consistency',
    title: '7-Day Streak',
    description: 'Maintain study consistency for a full week.',
    icon: 'Flame',
    target: 7,
    check: (stats) => (stats.streak?.currentStreak || 0) >= 7 || (stats.streak?.maxStreak || 0) >= 7
  },
  {
    id: 'streak_30',
    category: 'Consistency',
    title: '30-Day Streak',
    description: 'Cement a month-long daily vocabulary habit.',
    icon: 'Zap',
    target: 30,
    check: (stats) => (stats.streak?.currentStreak || 0) >= 30 || (stats.streak?.maxStreak || 0) >= 30
  },

  // Recall & Reviews
  {
    id: 'reviews_10',
    category: 'Recall',
    title: '10 Successful Reviews',
    description: 'Complete 10 spaced repetition reviews successfully.',
    icon: 'RotateCcw',
    target: 10,
    check: (stats, allWords) => {
      const correct = allWords.reduce((acc, w) => acc + (w.progress?.correctCount || 0), 0);
      return correct >= 10;
    }
  },
  {
    id: 'reviews_50',
    category: 'Recall',
    title: '50 Successful Reviews',
    description: 'Solidify your memory with 50 successful reviews.',
    icon: 'CheckCircle2',
    target: 50,
    check: (stats, allWords) => {
      const correct = allWords.reduce((acc, w) => acc + (w.progress?.correctCount || 0), 0);
      return correct >= 50;
    }
  },

  // Quiz Performance
  {
    id: 'first_perfect_quiz',
    category: 'Quiz',
    title: 'First Perfect Quiz',
    description: 'Score 100% accuracy on a daily vocabulary challenge.',
    icon: 'Sparkles',
    target: 1,
    check: (stats, allWords, dailySessions) => {
      return dailySessions.some(s => s.quizCompleted && s.quizScore?.percentage === 100);
    }
  },
  {
    id: 'perfect_quizzes_5',
    category: 'Quiz',
    title: '5 Perfect Quizzes',
    description: 'Achieve 100% on 5 daily quizzes.',
    icon: 'Award',
    target: 5,
    check: (stats, allWords, dailySessions) => {
      const count = dailySessions.filter(s => s.quizCompleted && s.quizScore?.percentage === 100).length;
      return count >= 5;
    }
  },

  // Writing & Application
  {
    id: 'sentences_5',
    category: 'Writing',
    title: 'Sentence Creator',
    description: 'Write original practice sentences for 5 vocabulary words.',
    icon: 'PenTool',
    target: 5,
    check: (stats, allWords) => {
      const count = allWords.filter(w => w.progress?.userSentence && w.progress.userSentence.trim().length > 3).length;
      return count >= 5;
    }
  },
  {
    id: 'sentences_20',
    category: 'Writing',
    title: 'Eloquent Writer',
    description: 'Write original practice sentences for 20 words.',
    icon: 'FileText',
    target: 20,
    check: (stats, allWords) => {
      const count = allWords.filter(w => w.progress?.userSentence && w.progress.userSentence.trim().length > 3).length;
      return count >= 20;
    }
  },

  // Mastery
  {
    id: 'mastered_5',
    category: 'Mastery',
    title: '5 Words Mastered',
    description: 'Advance 5 words to the Mastered retention status.',
    icon: 'CheckCheck',
    target: 5,
    check: (stats) => (stats.masteredCount || 0) >= 5
  },
  {
    id: 'mastered_25',
    category: 'Mastery',
    title: '25 Words Mastered',
    description: 'Advance 25 words to long-term memory mastery.',
    icon: 'Trophy',
    target: 25,
    check: (stats) => (stats.masteredCount || 0) >= 25
  }
];

/**
 * Award XP to user idempotently
 * @param {string} eventType - Key from XP_RULES
 * @param {string} referenceId - Unique reference (e.g. date, quizId, wordId)
 * @param {string} customDesc - Optional description
 * @returns {Object} { success, alreadyAwarded, amount, totalXp, level, newAchievements }
 */
function awardXp(eventType, referenceId = null, customDesc = null) {
  const rule = XP_RULES[eventType];
  if (!rule) {
    return { success: false, message: `Unknown XP event type: ${eventType}` };
  }

  // Idempotency key: prevents duplicate awards on page refresh
  const eventId = referenceId 
    ? `xp_${eventType}_${referenceId}` 
    : `xp_${eventType}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const result = db.recordXp({
    id: eventId,
    eventType,
    amount: rule.amount,
    referenceId,
    description: customDesc || rule.label
  });

  // Evaluate and unlock any newly earned achievements
  const newAchievements = checkAndUnlockAchievements();

  return {
    ...result,
    newAchievements
  };
}

/**
 * Get Level info for given total XP
 */
function getLevelInfo(totalXp = 0) {
  let currentTier = LEVEL_TIERS[0];
  let nextTier = LEVEL_TIERS[1] || null;

  for (let i = 0; i < LEVEL_TIERS.length; i++) {
    if (totalXp >= LEVEL_TIERS[i].minXp) {
      currentTier = LEVEL_TIERS[i];
      nextTier = LEVEL_TIERS[i + 1] || null;
    } else {
      break;
    }
  }

  const currentLevelXp = currentTier.minXp;
  const nextLevelXp = nextTier ? nextTier.minXp : currentTier.minXp + 1000;
  const xpInCurrentLevel = Math.max(0, totalXp - currentLevelXp);
  const xpNeededForNext = Math.max(1, nextLevelXp - currentLevelXp);
  const progressPercent = nextTier 
    ? Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNext) * 100))
    : 100;

  return {
    level: currentTier.level,
    title: currentTier.title,
    totalXp,
    currentLevelXp,
    nextLevelXp,
    xpToNextLevel: Math.max(0, nextLevelXp - totalXp),
    progressPercent
  };
}

/**
 * Evaluate all achievements and unlock those that meet the criteria
 */
function checkAndUnlockAchievements() {
  const stats = db.getStats();
  const allWords = db.getAllWords();
  const dbState = db.loadDb();
  const dailySessions = Object.values(dbState.dailySessions || {});
  const gamification = db.getUserGamification();
  const unlocked = new Set(gamification.unlockedAchievements || []);
  const newlyUnlocked = [];

  ACHIEVEMENTS_DEFINITIONS.forEach(ach => {
    if (!unlocked.has(ach.id)) {
      try {
        if (ach.check(stats, allWords, dailySessions)) {
          unlocked.add(ach.id);
          newlyUnlocked.push({
            id: ach.id,
            title: ach.title,
            description: ach.description,
            category: ach.category,
            icon: ach.icon,
            unlockedAt: new Date().toISOString()
          });
        }
      } catch (e) {
        console.warn(`[Gamification] Error checking achievement ${ach.id}:`, e.message);
      }
    }
  });

  if (newlyUnlocked.length > 0) {
    gamification.unlockedAchievements = Array.from(unlocked);
    db.updateUserGamification(gamification);
  }

  return newlyUnlocked;
}

/**
 * Get all achievements with current unlock status and progress
 */
function getAchievementsStatus() {
  const stats = db.getStats();
  const allWords = db.getAllWords();
  const dbState = db.loadDb();
  const dailySessions = Object.values(dbState.dailySessions || {});
  const gamification = db.getUserGamification();
  const unlockedSet = new Set(gamification.unlockedAchievements || []);

  const totalWordsCount = (stats.masteredCount || 0) + (stats.learningCount || 0);
  const currentStreak = stats.streak?.currentStreak || 0;
  const totalCorrect = allWords.reduce((acc, w) => acc + (w.progress?.correctCount || 0), 0);
  const perfectQuizzes = dailySessions.filter(s => s.quizCompleted && s.quizScore?.percentage === 100).length;
  const sentencesWritten = allWords.filter(w => w.progress?.userSentence && w.progress.userSentence.trim().length > 3).length;
  const masteredCount = stats.masteredCount || 0;

  return ACHIEVEMENTS_DEFINITIONS.map(ach => {
    const isUnlocked = unlockedSet.has(ach.id);
    let currentProgress = 0;

    switch (ach.category) {
      case 'Learning':
        currentProgress = totalWordsCount;
        break;
      case 'Consistency':
        currentProgress = currentStreak;
        break;
      case 'Recall':
        currentProgress = totalCorrect;
        break;
      case 'Quiz':
        currentProgress = perfectQuizzes;
        break;
      case 'Writing':
        currentProgress = sentencesWritten;
        break;
      case 'Mastery':
        currentProgress = masteredCount;
        break;
      default:
        currentProgress = isUnlocked ? ach.target : 0;
    }

    return {
      id: ach.id,
      category: ach.category,
      title: ach.title,
      description: ach.description,
      icon: ach.icon,
      target: ach.target,
      currentProgress: Math.min(ach.target, currentProgress),
      progressPercent: Math.min(100, Math.round((currentProgress / ach.target) * 100)),
      isUnlocked
    };
  });
}

module.exports = {
  awardXp,
  getLevelInfo,
  checkAndUnlockAchievements,
  getAchievementsStatus,
  XP_RULES,
  LEVEL_TIERS
};
