/**
 * Personal Weakness Detection Engine
 * Analyzes multiple learning signals (SRS, quizzes, sentences, history, intervals)
 * across 6 distinct learning dimensions to identify struggling areas and generate
 * adaptive practice recommendations.
 */

const db = require('./db');

const DIMENSIONS = [
  'meaning_recall',
  'word_recall',
  'context_understanding',
  'sentence_usage',
  'workplace_usage',
  'retention'
];

const DIMENSION_LABELS = {
  meaning_recall: 'Meaning Recall',
  word_recall: 'Word Recall',
  context_understanding: 'Context Understanding',
  sentence_usage: 'Sentence Usage',
  workplace_usage: 'Workplace Usage',
  retention: 'Long-Term Retention'
};

const DIMENSION_DESCRIPTIONS = {
  meaning_recall: 'Recognizing definitions and meanings when given a vocabulary word.',
  word_recall: 'Retrieving the exact word from memory based on a definition or prompt.',
  context_understanding: 'Understanding nuances, tone, and appropriate conversational situations.',
  sentence_usage: 'Forming accurate, grammatical, and natural sentences using target words.',
  workplace_usage: 'Applying vocabulary naturally in professional meetings, emails, and scenarios.',
  retention: 'Maintaining vocabulary in memory over expanding spaced repetition intervals.'
};

/**
 * Calculate user's Vocabulary Profile across 6 dimensions
 * @returns {Object} Profile containing scores, weak areas, and recommendations
 */
function calculateWeaknessProfile() {
  const allWords = db.getAllWords();
  const activities = db.getLearningActivities(600);
  const dbState = db.loadDb();
  const dailySessions = Object.values(dbState.dailySessions || {});

  // Initialize dimension tallies with Bayesian priors (representing baseline competency)
  const stats = {
    meaning_recall: { successes: 4, trials: 5 },
    word_recall: { successes: 3, trials: 5 },
    context_understanding: { successes: 4, trials: 5 },
    sentence_usage: { successes: 3, trials: 5 },
    workplace_usage: { successes: 4, trials: 5 },
    retention: { successes: 4, trials: 5 }
  };

  // 1. Signal: Direct recorded activities
  activities.forEach(act => {
    if (act.dimension && stats[act.dimension]) {
      stats[act.dimension].trials += 1;
      if (act.isSuccess) {
        stats[act.dimension].successes += 1;
      }
    }
  });

  // 2. Signal: Word progress (SRS retention & mastery)
  let totalWordsWithProgress = 0;
  let masteredCount = 0;
  let needsPracticeCount = 0;
  let wordsWithSentences = 0;
  let totalRecalls = 0;
  let successfulRecalls = 0;

  allWords.forEach(w => {
    const p = w.progress;
    if (!p) return;
    totalWordsWithProgress++;

    if (p.status === 'mastered') masteredCount++;
    if (p.status === 'needs_practice') needsPracticeCount++;
    if (p.userSentence && p.userSentence.trim().length > 3) wordsWithSentences++;

    totalRecalls += (p.correctCount || 0) + (p.incorrectCount || 0);
    successfulRecalls += (p.correctCount || 0);

    // Retention factor: higher intervals indicate strong retention
    if (p.interval >= 7) {
      stats.retention.successes += 2;
      stats.retention.trials += 2;
    } else if (p.status === 'needs_practice') {
      stats.retention.trials += 2;
    }
  });

  // 3. Signal: Sentence writing ratio
  if (totalWordsWithProgress > 0) {
    const sentenceRatio = wordsWithSentences / Math.min(totalWordsWithProgress, 20);
    stats.sentence_usage.trials += 10;
    stats.sentence_usage.successes += Math.round(sentenceRatio * 10);
  }

  // 4. Signal: Daily quiz scores
  dailySessions.forEach(session => {
    if (session.quizCompleted && session.quizScore) {
      const { score, total } = session.quizScore;
      if (total > 0) {
        stats.context_understanding.trials += total;
        stats.context_understanding.successes += score;
      }
    }
  });

  // Compute percentage scores for each dimension (clamped 20% to 98%)
  const profile = {};
  DIMENSIONS.forEach(dim => {
    const { successes, trials } = stats[dim];
    const rawPct = Math.round((successes / trials) * 100);
    profile[dim] = {
      id: dim,
      label: DIMENSION_LABELS[dim],
      description: DIMENSION_DESCRIPTIONS[dim],
      score: Math.min(98, Math.max(25, rawPct)),
      trials,
      successes
    };
  });

  // Identify weak area (lowest score) and strong area (highest score)
  const sortedDimensions = [...DIMENSIONS].sort((a, b) => profile[a].score - profile[b].score);
  const weakestDim = sortedDimensions[0];
  const strongestDim = sortedDimensions[sortedDimensions.length - 1];

  // Dynamic practice recommendation based on user's specific weak area
  const recommendations = generateRecommendations(weakestDim, profile[weakestDim].score, allWords);

  return {
    dimensions: profile,
    weakestArea: {
      id: weakestDim,
      label: DIMENSION_LABELS[weakestDim],
      score: profile[weakestDim].score,
      description: DIMENSION_DESCRIPTIONS[weakestDim],
      diagnosis: getDiagnosisMessage(weakestDim, profile[weakestDim].score)
    },
    strongestArea: {
      id: strongestDim,
      label: DIMENSION_LABELS[strongestDim],
      score: profile[strongestDim].score,
      description: DIMENSION_DESCRIPTIONS[strongestDim]
    },
    recommendations,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate diagnostic explanation for user's weakest area
 */
function getDiagnosisMessage(dimension, score) {
  switch (dimension) {
    case 'sentence_usage':
      return 'You know the definitions of most words, but have fewer opportunities to construct original sentences with them.';
    case 'word_recall':
      return 'You readily recognize words when reading, but experience tip-of-the-tongue hesitation when retrieving the word from scratch.';
    case 'meaning_recall':
      return 'You encounter some words whose nuanced definitions need reinforcement through active flashcard recall.';
    case 'context_understanding':
      return 'You understand isolated definitions, but subtleties of workplace context and tone can be sharpened.';
    case 'workplace_usage':
      return 'You would benefit from practicing how these words operate in business meetings, presentations, and emails.';
    case 'retention':
      return 'Several words are due for spaced repetition reviews to solidify long-term memory traces.';
    default:
      return 'Focused practice in this dimension will unlock your next vocabulary milestone.';
  }
}

/**
 * Generate dynamic recommended exercises based on weak dimension
 */
function generateRecommendations(dimension, score, allWords) {
  const needsPracticeWords = allWords
    .filter(w => w.progress?.status === 'needs_practice')
    .slice(0, 4)
    .map(w => w.word);

  const targetWords = needsPracticeWords.length > 0 
    ? needsPracticeWords 
    : allWords.slice(0, 4).map(w => w.word);

  const plan = [];

  switch (dimension) {
    case 'sentence_usage':
      plan.push({ type: 'sentence', label: 'Write 3 original practice sentences', count: 3, icon: 'PenTool' });
      plan.push({ type: 'context', label: 'Complete 2 context understanding questions', count: 2, icon: 'HelpCircle' });
      plan.push({ type: 'workplace', label: 'Review 1 workplace dialogue scenario', count: 1, icon: 'Briefcase' });
      break;
    case 'word_recall':
      plan.push({ type: 'recall', label: '3 reverse recall drills (Definition → Word)', count: 3, icon: 'RotateCcw' });
      plan.push({ type: 'fill_blank', label: '2 fill-in-the-blank workplace questions', count: 2, icon: 'CheckSquare' });
      plan.push({ type: 'sentence', label: '1 sentence construction challenge', count: 1, icon: 'PenTool' });
      break;
    case 'retention':
      plan.push({ type: 'srs', label: 'Complete pending spaced repetition reviews', count: Math.max(3, targetWords.length), icon: 'Clock' });
      plan.push({ type: 'recall', label: '2 rapid active recall drills', count: 2, icon: 'RotateCcw' });
      plan.push({ type: 'context', label: '1 contextual usage check', count: 1, icon: 'HelpCircle' });
      break;
    case 'workplace_usage':
      plan.push({ type: 'workplace', label: '3 professional scenario application drills', count: 3, icon: 'Briefcase' });
      plan.push({ type: 'sentence', label: '2 business email sentence challenges', count: 2, icon: 'PenTool' });
      plan.push({ type: 'context', label: '1 meeting dialogue review', count: 1, icon: 'MessageSquare' });
      break;
    case 'context_understanding':
    case 'meaning_recall':
    default:
      plan.push({ type: 'meaning', label: '4 active recall definition flashcards', count: 4, icon: 'BookOpen' });
      plan.push({ type: 'context', label: '2 situation comparison questions', count: 2, icon: 'HelpCircle' });
      plan.push({ type: 'sentence', label: '1 usage sentence with AI coaching', count: 1, icon: 'Sparkles' });
      break;
  }

  return {
    focusDimension: dimension,
    targetWords,
    items: plan,
    estimatedMinutes: 5
  };
}

module.exports = {
  calculateWeaknessProfile,
  DIMENSIONS,
  DIMENSION_LABELS,
  DIMENSION_DESCRIPTIONS
};
