const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { generateDailyQuiz, createBlankSentence, shuffle } = require('../services/quizGenerator');

describe('Quiz Generator Service Tests', () => {
  describe('createBlankSentence', () => {
    test('masks exact word in sentence', () => {
      const sentence = 'Traffic congestion creates a bottleneck on the highway.';
      const result = createBlankSentence(sentence, 'bottleneck');

      assert.equal(result.masked, true);
      assert.ok(result.text.includes('________'));
      assert.ok(!result.text.toLowerCase().includes('bottleneck'));
    });

    test('masks variations like plurals and -ed suffixes', () => {
      const sentence = 'They streamlined the entire onboarding process.';
      const result = createBlankSentence(sentence, 'streamline');

      assert.equal(result.masked, true);
      assert.ok(result.text.includes('________'));
    });

    test('returns original sentence when target word is not present', () => {
      const sentence = 'The weather was pleasant yesterday.';
      const result = createBlankSentence(sentence, 'pragmatic');

      assert.equal(result.masked, false);
      assert.equal(result.text, sentence);
    });

    test('handles empty or missing parameters', () => {
      assert.equal(createBlankSentence('', 'word').masked, false);
      assert.equal(createBlankSentence('Some sentence', '').masked, false);
    });
  });

  describe('shuffle', () => {
    test('returns an array of same length with same elements', () => {
      const original = [1, 2, 3, 4, 5];
      const shuffled = shuffle(original);

      assert.equal(shuffled.length, original.length);
      assert.deepEqual([...shuffled].sort(), [...original].sort());
    });

    test('does not mutate the original array', () => {
      const original = ['A', 'B', 'C'];
      shuffle(original);
      assert.deepEqual(original, ['A', 'B', 'C']);
    });
  });

  describe('generateDailyQuiz', () => {
    const mockPool = [
      { id: 'w1', word: 'Bottleneck', meaning: 'A point of congestion', example: 'The bottleneck caused delays.', howToUse: 'Use when discussing delays.' },
      { id: 'w2', word: 'Tentative', meaning: 'Not certain or fixed', example: 'We have a tentative agreement.', howToUse: 'Use for unconfirmed plans.' },
      { id: 'w3', word: 'Hassle', meaning: 'Irritating inconvenience', example: 'Parking was a real hassle.', howToUse: 'Use for frustrating tasks.' },
      { id: 'w4', word: 'Streamline', meaning: 'Make more efficient', example: 'We streamlined operations.', howToUse: 'Use when improving workflow.' },
      { id: 'w5', word: 'Pragmatic', meaning: 'Sensible and realistic', example: 'Take a pragmatic approach.', howToUse: 'Use for practical decisions.' }
    ];

    test('generates 5 structured quiz questions for target words', () => {
      const questions = generateDailyQuiz(mockPool, mockPool);

      assert.equal(questions.length, 5);
      questions.forEach((q, idx) => {
        assert.ok(q.id);
        assert.ok(q.wordId);
        assert.ok(q.targetWord);
        assert.ok(q.type);
        assert.ok(q.prompt);
        assert.ok(q.contextText);
        assert.ok(Array.isArray(q.options));
        assert.ok(q.options.length >= 2);
        assert.ok(typeof q.correctIndex === 'number');
        assert.ok(q.correctIndex >= 0 && q.correctIndex < q.options.length);
        assert.ok(q.explanation);
      });
    });

    test('cycles through varied question types', () => {
      const questions = generateDailyQuiz(mockPool, mockPool);
      const types = questions.map(q => q.type);

      assert.ok(types.includes('meaning_to_word'));
      assert.ok(types.includes('word_to_meaning'));
      assert.ok(types.includes('fill_in_blank'));
      assert.ok(types.includes('situation_usage'));
      assert.ok(types.includes('example_selection'));
    });

    test('correctIndex accurately points to the correct answer in options', () => {
      const questions = generateDailyQuiz(mockPool, mockPool);

      questions.forEach(q => {
        const selectedAnswer = q.options[q.correctIndex];
        assert.ok(selectedAnswer, `Option at correctIndex must exist for ${q.type}`);

        if (q.type === 'meaning_to_word' || q.type === 'fill_in_blank' || q.type === 'situation_usage') {
          assert.equal(selectedAnswer, q.targetWord);
        } else if (q.type === 'word_to_meaning') {
          const target = mockPool.find(w => w.id === q.wordId);
          assert.equal(selectedAnswer, target.meaning);
        } else if (q.type === 'example_selection') {
          const target = mockPool.find(w => w.id === q.wordId);
          assert.equal(selectedAnswer, target.example);
        }
      });
    });
  });
});
