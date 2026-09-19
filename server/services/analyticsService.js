/**
 * Advanced Analytics & Vocabulary Growth Engine
 * Calculates growth metrics, retention curves, usage analytics, and weekly summaries.
 */

const db = require('./db');
const weaknessService = require('./weaknessService');

/**
 * Get comprehensive analytics overview
 */
function getAnalyticsOverview() {
  const allWords = db.getAllWords();
  const dbState = db.loadDb();
  const dailySessions = Object.values(dbState.dailySessions || {});
  const activities = db.getLearningActivities(1000);
  const streak = dbState.streak || {};

  // 1. Overall Vocabulary Breakdown
  const totalWords = allWords.length;
  const masteredCount = allWords.filter(w => w.progress?.status === 'mastered').length;
  const learningCount = allWords.filter(w => w.progress?.status === 'learning').length;
  const needsPracticeCount = allWords.filter(w => w.progress?.status === 'needs_practice').length;
  const favoriteCount = allWords.filter(w => w.progress?.isFavorite).length;
  const masteryPercentage = totalWords > 0 ? Math.round((masteredCount / totalWords) * 100) : 0;

  // 2. Learning Activity & Timeline
  const wordsByDate = {};
  allWords.forEach(w => {
    if (w.date) {
      wordsByDate[w.date] = (wordsByDate[w.date] || 0) + 1;
    }
  });

  const timeline = Object.keys(wordsByDate).sort().slice(-14).map(date => {
    const session = dbState.dailySessions[date];
    return {
      date,
      wordsAdded: wordsByDate[date] || 0,
      completed: Boolean(session?.completedWords?.length > 0),
      quizScore: session?.quizScore?.percentage || null
    };
  });

  // 3. Retention & SRS Success Rate
  let totalRecalls = 0;
  let successfulRecalls = 0;
  allWords.forEach(w => {
    const p = w.progress;
    if (p) {
      totalRecalls += (p.correctCount || 0) + (p.incorrectCount || 0);
      successfulRecalls += (p.correctCount || 0);
    }
  });
  const srsSuccessRate = totalRecalls > 0 ? Math.round((successfulRecalls / totalRecalls) * 100) : 0;

  const todayStr = new Date().toISOString().split('T')[0];
  const overdueWords = db.getDueReviewWords(todayStr);

  // 4. Usage Metrics
  const sentencesWritten = allWords.filter(w => w.progress?.userSentence && w.progress.userSentence.trim().length > 3).length;
  const quizQuestionsCompleted = activities.filter(a => a.activityType === 'quiz_question').length;
  const reviewsCompleted = activities.filter(a => a.activityType === 'srs_review').length;
  const activeLearningDays = streak.completedDates?.length || 0;

  // Calculate average quiz accuracy
  const quizzesWithScores = dailySessions.filter(s => s.quizCompleted && s.quizScore);
  const avgQuizAccuracy = quizzesWithScores.length > 0
    ? Math.round(quizzesWithScores.reduce((acc, s) => acc + (s.quizScore.percentage || 0), 0) / quizzesWithScores.length)
    : 0;

  const hasSufficientData = activities.length >= 5 || totalRecalls >= 5;

  return {
    hasSufficientData,
    overall: {
      totalWords,
      masteredCount,
      learningCount,
      needsPracticeCount,
      favoriteCount,
      masteryPercentage
    },
    activity: {
      timeline,
      reviewsCompleted: Math.max(reviewsCompleted, totalRecalls),
      quizAccuracy: avgQuizAccuracy,
      activeLearningDays,
      currentStreak: streak.currentStreak || 0,
      maxStreak: streak.maxStreak || 0
    },
    retention: {
      srsSuccessRate,
      overdueCount: overdueWords.length,
      totalRecalls,
      successfulRecalls,
      retentionTrend: srsSuccessRate >= 80 ? 'improving' : srsSuccessRate >= 60 ? 'stable' : 'needs_focus'
    },
    usage: {
      sentencesWritten,
      quizQuestionsCompleted,
      totalReviews: Math.max(reviewsCompleted, totalRecalls)
    }
  };
}

/**
 * Generate or retrieve Weekly Learning Summary
 */
function getWeeklySummary() {
  const allWords = db.getAllWords();
  const dbState = db.loadDb();
  const dailySessions = Object.values(dbState.dailySessions || {});
  const activities = db.getLearningActivities(600);
  const profile = weaknessService.calculateWeaknessProfile();
  const streak = dbState.streak || {};
  const gamification = db.getUserGamification();

  // Determine current week's Monday (weekStart)
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  const monday = new Date(now.setDate(diff));
  const weekStartStr = monday.toISOString().split('T')[0];

  // Calculate current week's metrics
  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    weekDates.push(d.toISOString().split('T')[0]);
  }

  const thisWeekDatesSet = new Set(weekDates);
  const wordsLearnedThisWeek = allWords.filter(w => w.date && thisWeekDatesSet.has(w.date)).length;
  const wordsMasteredThisWeek = allWords.filter(w => w.progress?.status === 'mastered' && thisWeekDatesSet.has(w.progress.lastReviewedDate)).length;

  let reviewsThisWeek = 0;
  let correctReviewsThisWeek = 0;
  allWords.forEach(w => {
    (w.progress?.history || []).forEach(h => {
      if (thisWeekDatesSet.has(h.date)) {
        reviewsThisWeek++;
        if (h.outcome === 'known') correctReviewsThisWeek++;
      }
    });
  });

  const thisWeekSessions = dailySessions.filter(s => thisWeekDatesSet.has(s.date));
  const studyDays = thisWeekSessions.filter(s => s.completedWords?.length > 0 || s.quizCompleted).length;

  const quizScoresThisWeek = thisWeekSessions.filter(s => s.quizCompleted && s.quizScore);
  const quizAccuracyThisWeek = quizScoresThisWeek.length > 0
    ? Math.round(quizScoresThisWeek.reduce((acc, s) => acc + (s.quizScore.percentage || 0), 0) / quizScoresThisWeek.length)
    : 0;

  const reviewSuccessThisWeek = reviewsThisWeek > 0
    ? Math.round((correctReviewsThisWeek / reviewsThisWeek) * 100)
    : 0;

  // Words with repeated mistakes
  const difficultWords = allWords
    .filter(w => (w.progress?.incorrectCount || 0) >= 2 || w.progress?.status === 'needs_practice')
    .slice(0, 5)
    .map(w => ({
      id: w.id,
      word: w.word,
      meaning: w.meaning || w.simpleMeaning,
      incorrectCount: w.progress?.incorrectCount || 0
    }));

  const currentReport = {
    weekStart: weekStartStr,
    wordsLearned: wordsLearnedThisWeek,
    wordsMastered: wordsMasteredThisWeek,
    wordsReviewed: reviewsThisWeek,
    quizAccuracy: quizAccuracyThisWeek,
    reviewSuccess: reviewSuccessThisWeek,
    studyDays,
    totalStudyDays: 7,
    currentStreak: streak.currentStreak || 0,
    xpEarned: Math.min(gamification.totalXp, 420),
    strongestArea: profile.strongestArea?.label || 'Meaning Recall',
    weakestArea: profile.weakestArea?.label || 'Sentence Usage',
    difficultWords,
    hasPriorWeek: false,
    comparison: null
  };

  // Check for previous week's report
  const prevMonday = new Date(monday);
  prevMonday.setDate(monday.getDate() - 7);
  const prevWeekStartStr = prevMonday.toISOString().split('T')[0];
  const existingReports = db.getWeeklyReports();
  const prevReport = existingReports[prevWeekStartStr];

  if (prevReport) {
    currentReport.hasPriorWeek = true;
    currentReport.comparison = {
      quizAccuracyDiff: currentReport.quizAccuracy - (prevReport.statistics?.quizAccuracy || 0),
      wordsLearnedDiff: currentReport.wordsLearned - (prevReport.statistics?.wordsLearned || 0),
      reviewsDiff: currentReport.wordsReviewed - (prevReport.statistics?.wordsReviewed || 0)
    };
  }

  // Save current report
  db.saveWeeklyReport({
    id: `weekly_${weekStartStr}`,
    username: 'ruchit',
    weekStart: weekStartStr,
    statistics: {
      wordsLearned: currentReport.wordsLearned,
      wordsMastered: currentReport.wordsMastered,
      wordsReviewed: currentReport.wordsReviewed,
      quizAccuracy: currentReport.quizAccuracy,
      reviewSuccess: currentReport.reviewSuccess,
      studyDays: currentReport.studyDays,
      xpEarned: currentReport.xpEarned
    },
    strongestArea: currentReport.strongestArea,
    weakestArea: currentReport.weakestArea,
    difficultWords: difficultWords.map(w => w.word),
    generatedAt: new Date().toISOString()
  });

  return currentReport;
}

module.exports = {
  getAnalyticsOverview,
  getWeeklySummary
};
