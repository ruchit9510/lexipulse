const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const gamificationService = require('../services/gamificationService');

describe('Gamification Service Tests', () => {
  describe('XP Rules & Level Tiers', () => {
    test('XP_RULES contains defined reward types with positive amounts', () => {
      assert.ok(gamificationService.XP_RULES.daily_words);
      assert.ok(gamificationService.XP_RULES.srs_review);
      assert.ok(gamificationService.XP_RULES.quiz);
      assert.ok(gamificationService.XP_RULES.perfect_quiz);
      assert.ok(gamificationService.XP_RULES.sentence_written);
      assert.ok(gamificationService.XP_RULES.quick_session);

      Object.values(gamificationService.XP_RULES).forEach(rule => {
        assert.ok(rule.amount > 0);
        assert.ok(typeof rule.label === 'string');
      });
    });

    test('LEVEL_TIERS are sorted with increasing minXp and valid titles', () => {
      const tiers = gamificationService.LEVEL_TIERS;
      assert.ok(tiers.length >= 5);
      for (let i = 1; i < tiers.length; i++) {
        assert.ok(tiers[i].minXp > tiers[i - 1].minXp);
        assert.equal(tiers[i].level, tiers[i - 1].level + 1);
        assert.ok(tiers[i].title);
      }
    });

    test('getLevelInfo returns correct level and progress for various XP amounts', () => {
      const lvl1 = gamificationService.getLevelInfo(0);
      assert.equal(lvl1.level, 1);
      assert.equal(lvl1.title, 'Novice Learner');

      const lvl2 = gamificationService.getLevelInfo(150);
      assert.equal(lvl2.level, 2);
      assert.equal(lvl2.title, 'Word Explorer');

      const maxLevel = gamificationService.getLevelInfo(10000);
      assert.equal(maxLevel.level, 10);
      assert.equal(maxLevel.progressPercent, 100);
    });
  });

  describe('awardXp', () => {
    test('awards XP and increases totalXp', () => {
      const uniqueRef = `test_xp_${Date.now()}`;
      const result = gamificationService.awardXp('daily_words', uniqueRef, 'Test daily words completion');

      assert.ok(result.success);
      assert.equal(result.alreadyAwarded, false);
      assert.equal(result.event.amount, 20);
      assert.ok(result.gamification);
      assert.ok(result.gamification.totalXp >= 20);
    });

    test('idempotently ignores duplicate awards with same referenceId', () => {
      const duplicateRef = `duplicate_ref_${Date.now()}`;
      const first = gamificationService.awardXp('quiz', duplicateRef, 'First quiz completion');
      assert.ok(first.success);
      assert.equal(first.alreadyAwarded, false);
      assert.equal(first.event.amount, 15);

      const second = gamificationService.awardXp('quiz', duplicateRef, 'Second attempt with same ref');
      assert.ok(second.success);
      assert.equal(second.alreadyAwarded, true);
      assert.equal(second.gamification.totalXp, first.gamification.totalXp);
    });
  });

  describe('Achievements', () => {
    test('getAchievementsStatus returns achievements with progress and unlock state', () => {
      const achievements = gamificationService.getAchievementsStatus();
      assert.ok(Array.isArray(achievements));
      assert.ok(achievements.length > 0);

      achievements.forEach(ach => {
        assert.ok(ach.id);
        assert.ok(ach.title);
        assert.ok(ach.category);
        assert.ok(ach.target > 0);
        assert.ok(typeof ach.currentProgress === 'number');
        assert.ok(typeof ach.progressPercent === 'number');
        assert.ok(typeof ach.isUnlocked === 'boolean');
      });
    });

    test('checkAndUnlockAchievements evaluates newly unlocked milestones', () => {
      const newlyUnlocked = gamificationService.checkAndUnlockAchievements();
      assert.ok(Array.isArray(newlyUnlocked));
    });
  });
});
