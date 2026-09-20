const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const analyticsService = require('../services/analyticsService');

describe('Analytics Service Tests', () => {
  test('getAnalyticsOverview returns complete metrics structure', () => {
    const overview = analyticsService.getAnalyticsOverview();

    assert.ok(overview);
    assert.ok(typeof overview.hasSufficientData === 'boolean');

    // Overall metrics
    assert.ok(overview.overall);
    assert.ok(typeof overview.overall.totalWords === 'number');
    assert.ok(typeof overview.overall.masteredCount === 'number');
    assert.ok(typeof overview.overall.learningCount === 'number');
    assert.ok(typeof overview.overall.needsPracticeCount === 'number');
    assert.ok(typeof overview.overall.masteryPercentage === 'number');

    // Activity timeline
    assert.ok(overview.activity);
    assert.ok(Array.isArray(overview.activity.timeline));
    assert.ok(typeof overview.activity.reviewsCompleted === 'number');
    assert.ok(typeof overview.activity.currentStreak === 'number');

    // Retention metrics
    assert.ok(overview.retention);
    assert.ok(typeof overview.retention.srsSuccessRate === 'number');
    assert.ok(typeof overview.retention.overdueCount === 'number');
    assert.ok(overview.retention.retentionTrend);
  });

  test('getWeeklySummary aggregates weekly metrics and generates report', () => {
    const summary = analyticsService.getWeeklySummary();

    assert.ok(summary);
    assert.ok(summary.weekStart);
    assert.ok(typeof summary.wordsLearned === 'number');
    assert.ok(typeof summary.wordsMastered === 'number');
    assert.ok(typeof summary.wordsReviewed === 'number');
    assert.ok(typeof summary.quizAccuracy === 'number');
    assert.ok(typeof summary.reviewSuccess === 'number');
    assert.ok(typeof summary.studyDays === 'number');
    assert.ok(Array.isArray(summary.difficultWords));
    assert.ok(summary.strongestArea);
    assert.ok(summary.weakestArea);
  });
});
