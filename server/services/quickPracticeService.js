/**
 * 5-Minute Adaptive Quick Practice Service
 * Dynamically constructs a personalized fast-paced practice session
 * tailored to user's weakest learning dimensions and overdue reviews.
 */

const db = require('./db');
const weaknessService = require('./weaknessService');
const { generateDailyQuiz } = require('./quizGenerator');
const gamificationService = require('./gamificationService');

/**
 * Generate an adaptive quick session based on duration and weakness profile
 * @param {number} durationMinutes - 2, 5, 10, or 15
 */
function generateQuickSession(durationMinutes = 5) {
  const profile = weaknessService.calculateWeaknessProfile();
  const weakestDim = profile.weakestArea?.id || 'meaning_recall';
  const allWords = db.getAllWords();
  const todayStr = new Date().toISOString().split('T')[0];
  const dueWords = db.getDueReviewWords(todayStr);

  // Total exercise count based on duration (~1 minute per exercise item)
  const totalItems = durationMinutes === 2 ? 3
    : durationMinutes === 10 ? 8
    : durationMinutes === 15 ? 12
    : 5; // Default 5 minutes = 5 exercises

  const items = [];

  // Strategy 1: If there are many overdue words, allocate 50% to SRS reviews
  if (dueWords.length >= 3) {
    const srsCount = Math.min(Math.ceil(totalItems * 0.5), dueWords.length);
    for (let i = 0; i < srsCount; i++) {
      items.push({
        id: `srs_${dueWords[i].id}_${i}`,
        type: 'srs_card',
        title: 'Spaced Recall Review',
        word: dueWords[i]
      });
    }
  }

  // Strategy 2: If sentence usage is weakest area, allocate sentence exercises
  if (weakestDim === 'sentence_usage') {
    const sentenceCandidates = allWords.filter(w => !w.progress?.userSentence).slice(0, 2);
    sentenceCandidates.forEach((w, idx) => {
      if (items.length < totalItems) {
        items.push({
          id: `sentence_${w.id}_${idx}`,
          type: 'sentence_prompt',
          title: 'Sentence Application Challenge',
          word: w
        });
      }
    });
  }

  // Strategy 3: Fill remainder with dynamic quiz/recall questions
  const remainingSlots = totalItems - items.length;
  if (remainingSlots > 0) {
    const quizCandidates = dueWords.length > 0 ? dueWords.slice(0, remainingSlots) : allWords.slice(0, remainingSlots);
    const questions = generateDailyQuiz(quizCandidates, allWords);
    questions.slice(0, remainingSlots).forEach((q, idx) => {
      items.push({
        id: `quiz_${q.id || idx}`,
        type: 'quiz_question',
        title: q.typeLabel || 'Quick Knowledge Check',
        questionData: q
      });
    });
  }

  return {
    durationMinutes,
    totalItems: items.length,
    weakestDimension: profile.weakestArea,
    items
  };
}

/**
 * Record completion of a quick practice session and award XP
 */
function completeQuickSession({ durationMinutes = 5, correctCount = 0, totalCount = 0, timeSpentSec = 0 }) {
  // Award XP for quick session (+15 XP)
  const refId = `quick_${Date.now()}`;
  const xpResult = gamificationService.awardXp('quick_session', refId, `Completed ${durationMinutes}-min quick practice`);

  return {
    success: true,
    wordsReviewed: totalCount,
    correctCount,
    totalCount,
    timeSpentSec,
    xpAwarded: 15,
    totalXp: xpResult.gamification?.totalXp || 0,
    level: xpResult.gamification?.level || 1,
    newAchievements: xpResult.newAchievements || []
  };
}

module.exports = {
  generateQuickSession,
  completeQuickSession
};
