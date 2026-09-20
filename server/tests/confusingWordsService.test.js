const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { getConfusingPairs, getConfusingPracticeSession } = require('../services/confusingWordsService');

describe('Confusing Words Service Tests', () => {
  test('getConfusingPairs returns curated pairs with complete schemas', () => {
    const pairs = getConfusingPairs();
    assert.ok(Array.isArray(pairs));
    assert.ok(pairs.length >= 4);

    pairs.forEach(pair => {
      assert.ok(pair.id);
      assert.ok(pair.wordA);
      assert.ok(pair.wordB);
      assert.ok(pair.wordA.word);
      assert.ok(pair.wordA.meaning);
      assert.ok(pair.wordA.example);
      assert.ok(pair.wordA.howToRecognize);
      assert.ok(pair.wordB.word);
      assert.ok(pair.wordB.meaning);
      assert.ok(pair.wordB.example);
      assert.ok(pair.wordB.howToRecognize);

      assert.ok(Array.isArray(pair.exercises));
      assert.ok(pair.exercises.length >= 2);

      pair.exercises.forEach(ex => {
        assert.ok(ex.question);
        assert.ok(Array.isArray(ex.options));
        assert.equal(ex.options.length, 2);
        assert.ok(typeof ex.correctIndex === 'number');
        assert.ok(ex.correctIndex === 0 || ex.correctIndex === 1);
        assert.ok(ex.explanation);
      });
    });
  });

  test('getConfusingPracticeSession returns requested number of exercises', () => {
    const session = getConfusingPracticeSession(3);
    assert.equal(session.length, 3);

    session.forEach(item => {
      assert.ok(item.pairId);
      assert.ok(item.wordA);
      assert.ok(item.wordB);
      assert.ok(item.question);
      assert.ok(Array.isArray(item.options));
      assert.ok(typeof item.correctIndex === 'number');
    });
  });
});
