const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const geminiService = require('../services/geminiService');

describe('Gemini AI Service Tests', () => {
  describe('evaluateSentence', () => {
    test('returns score 0 and error feedback for empty sentence', async () => {
      const result = await geminiService.evaluateSentence({ word: 'Bottleneck', sentence: '' });
      assert.equal(result.score, 0);
      assert.equal(result.isGood, false);
      assert.ok(result.feedback);
    });

    test('returns structured evaluation schema with score, isGood, feedback, and polishedSentence', async () => {
      const result = await geminiService.evaluateSentence({
        word: 'Streamline',
        sentence: 'We need to streamline the delivery operations.',
        meaning: 'Make more efficient'
      });

      assert.ok(typeof result.score === 'number');
      assert.ok(typeof result.isGood === 'boolean');
      assert.ok(typeof result.feedback === 'string');
      assert.ok(typeof result.polishedSentence === 'string');
    });
  });

  describe('getWordInsights', () => {
    test('returns mnemonic, workplaceDialogue, and collocations', async () => {
      const result = await geminiService.getWordInsights({
        word: 'Tentative',
        meaning: 'Not certain or fixed',
        example: 'We reached a tentative agreement.'
      });

      assert.ok(result.mnemonic);
      assert.ok(result.workplaceDialogue);
      assert.ok(Array.isArray(result.collocations));
      assert.ok(result.collocations.length > 0);
    });
  });

  describe('getQuizHint', () => {
    test('returns a non-empty hint string', async () => {
      const hint = await geminiService.getQuizHint({
        word: 'Pragmatic',
        question: 'Which word means realistic and sensible?',
        options: ['Pragmatic', 'Elusive', 'Hassle', 'Tentative']
      });

      assert.ok(typeof hint === 'string');
      assert.ok(hint.length > 5);
    });
  });

  describe('generateWordMeaning', () => {
    test('returns clear definition string', async () => {
      const meaning = await geminiService.generateWordMeaning({
        word: 'Hassle',
        example: 'Finding a parking spot downtown was a real hassle.'
      });

      assert.ok(typeof meaning === 'string');
      assert.ok(meaning.length > 5);
    });
  });

  describe('generateExampleSentence (New Feature)', () => {
    test('generates a valid example sentence using the target word', async () => {
      const sentence = await geminiService.generateExampleSentence({
        word: 'Bottleneck',
        meaning: 'A point of congestion or delay'
      });

      assert.ok(typeof sentence === 'string');
      assert.ok(sentence.length > 10);
      assert.match(sentence.toLowerCase(), /bottleneck/);
    });

    test('avoids previousSentences to ensure variety on regenerate', async () => {
      const previousSentences = [
        'The team encountered a significant bottleneck that forced them to rethink their entire strategy.',
        'Her clear explanation helped everyone understand why this bottleneck mattered so much.'
      ];

      const newSentence = await geminiService.generateExampleSentence({
        word: 'Bottleneck',
        meaning: 'A point of congestion or delay',
        previousSentences
      });

      assert.ok(typeof newSentence === 'string');
      assert.ok(!previousSentences.includes(newSentence), 'Generated sentence must be different from previous sentences');
    });

    test('handles empty input gracefully', async () => {
      const emptyResult = await geminiService.generateExampleSentence({ word: '' });
      assert.equal(emptyResult, '');
    });
  });
});
