process.env.NODE_ENV = 'test';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const db = require('../services/db');

describe('Database Service (db.js) Tests', () => {
  test('loadDb initializes with required root structure', () => {
    const state = db.loadDb();
    assert.ok(state);
    assert.ok(typeof state.vocabulary === 'object');
    assert.ok(typeof state.learningProgress === 'object');
    assert.ok(typeof state.streak === 'object');
    assert.ok(typeof state.settings === 'object');
    assert.ok(Array.isArray(state.learningActivities));
    assert.ok(Array.isArray(state.xpEvents));
  });

  test('upsertVocabulary and getAllWords work correctly', () => {
    const testWord = {
      id: 'test_word_1',
      word: 'Resilience',
      meaning: 'The capacity to recover quickly from difficulties',
      example: 'Her resilience carried her through tough times.',
      howToUse: 'Use to describe inner strength.',
      date: '2026-09-20'
    };

    db.upsertVocabulary([testWord]);
    const allWords = db.getAllWords();
    const found = allWords.find(w => w.id === 'test_word_1');

    assert.ok(found);
    assert.equal(found.word, 'Resilience');
    assert.equal(found.meaning, 'The capacity to recover quickly from difficulties');
  });

  test('updateWordMeaning updates meaning and simpleMeaning', () => {
    const updated = db.updateWordMeaning('test_word_1', 'Ability to bounce back from hardship');
    assert.ok(updated);
    assert.equal(updated.meaning, 'Ability to bounce back from hardship');
    assert.equal(updated.simpleMeaning, 'Ability to bounce back from hardship');

    const word = db.getAllWords().find(w => w.id === 'test_word_1');
    assert.equal(word.meaning, 'Ability to bounce back from hardship');
  });

  test('updateWordExample updates example sentence', () => {
    const updated = db.updateWordExample('test_word_1', 'Showing resilience is key to long-term success.');
    assert.ok(updated);
    assert.equal(updated.example, 'Showing resilience is key to long-term success.');

    const word = db.getAllWords().find(w => w.id === 'test_word_1');
    assert.equal(word.example, 'Showing resilience is key to long-term success.');
  });

  test('toggleFavorite toggles word favorite status', () => {
    const wordBefore = db.getAllWords().find(w => w.id === 'test_word_1');
    const wasFav = Boolean(wordBefore?.progress?.isFavorite);

    const isFavNow = db.toggleFavorite('test_word_1');
    assert.equal(isFavNow, !wasFav);

    // Toggle back
    const reverted = db.toggleFavorite('test_word_1');
    assert.equal(reverted, wasFav);
  });

  test('saveUserSentence stores user custom sentence', () => {
    const sentence = 'My personal sentence about resilience.';
    const progress = db.saveUserSentence('test_word_1', sentence);
    assert.ok(progress);
    assert.equal(progress.userSentence, sentence);
  });

  test('recordWordReview updates review stats and SRS interval', () => {
    // Record known review
    const resKnown = db.recordWordReview('test_word_1', 'known');
    assert.ok(resKnown);
    assert.ok(resKnown.progress.reviewCount >= 1);
    assert.ok(resKnown.progress.correctCount >= 1);
    assert.ok(resKnown.progress.interval >= 1);
    assert.ok(resKnown.progress.nextReviewDate);

    // Record need practice review
    const resPractice = db.recordWordReview('test_word_1', 'need_practice');
    assert.ok(resPractice);
    assert.equal(resPractice.progress.status, 'needs_practice');
    assert.equal(resPractice.progress.interval, 1); // Reset to 1 day on need_practice
  });

  test('recordLearningActivity and getLearningActivities', () => {
    const initialCount = db.getLearningActivities(100).length;
    db.recordLearningActivity({
      activityType: 'quiz_question',
      wordId: 'test_word_1',
      isSuccess: true,
      dimension: 'meaning_recall',
      details: 'Correct answer selected'
    });

    const activities = db.getLearningActivities(100);
    assert.equal(activities.length, initialCount + 1);
    const latest = activities[activities.length - 1];
    assert.equal(latest.dimension, 'meaning_recall');
    assert.equal(latest.isSuccess, true);
  });

  test('updateUserPreferences and getUserPreferences', () => {
    const newPrefs = {
      selectedContexts: ['Daily Life', 'Philosophy'],
      preferredTheme: 'obsidian'
    };
    db.updateUserPreferences(newPrefs);
    const prefs = db.getUserPreferences();

    assert.deepEqual(prefs.selectedContexts, ['Daily Life', 'Philosophy']);
    assert.equal(prefs.preferredTheme, 'obsidian');
  });

  test('getSettings and updateSettings', () => {
    const updated = db.updateSettings({ dailyWordCount: 7 });
    assert.equal(updated.dailyWordCount, 7);
    const settings = db.getSettings();
    assert.equal(settings.dailyWordCount, 7);
  });
});
