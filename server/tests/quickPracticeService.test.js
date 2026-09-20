const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const quickPracticeService = require('../services/quickPracticeService');

describe('Quick Practice Service Tests', () => {
  describe('generateQuickSession', () => {
    test('adapts item count according to duration', () => {
      const session2 = quickPracticeService.generateQuickSession(2);
      assert.equal(session2.durationMinutes, 2);
      assert.ok(session2.totalItems <= 3);

      const session5 = quickPracticeService.generateQuickSession(5);
      assert.equal(session5.durationMinutes, 5);
      assert.ok(session5.totalItems <= 5);

      const session10 = quickPracticeService.generateQuickSession(10);
      assert.equal(session10.durationMinutes, 10);
      assert.ok(session10.totalItems <= 8);
    });

    test('generates valid practice item structure', () => {
      const session = quickPracticeService.generateQuickSession(5);

      assert.ok(Array.isArray(session.items));
      session.items.forEach(item => {
        assert.ok(item.id);
        assert.ok(item.type);
        assert.ok(item.title);
        assert.ok(item.word || item.questionData);
      });
    });
  });

  describe('completeQuickSession', () => {
    test('records completion and awards XP', () => {
      const result = quickPracticeService.completeQuickSession({
        durationMinutes: 5,
        correctCount: 4,
        totalCount: 5,
        timeSpentSec: 280
      });

      assert.ok(result.success);
      assert.equal(result.correctCount, 4);
      assert.equal(result.totalCount, 5);
      assert.equal(result.xpAwarded, 15);
      assert.ok(typeof result.totalXp === 'number');
      assert.ok(typeof result.level === 'number');
    });
  });
});
