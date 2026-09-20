process.env.NODE_ENV = 'test';
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../index');
const db = require('../services/db');
const mongo = require('../services/mongo');

describe('Express API Endpoints Integration Tests', () => {
  let server;
  let baseUrl;

  before(async () => {
    // Ensure test word exists in db
    db.upsertVocabulary([{
      id: 'test_word_endpoint_1',
      word: 'Streamline',
      meaning: 'To make an organization or system more efficient',
      example: 'We streamlined the process.',
      howToUse: 'Use when improving workflow.',
      date: '2026-09-20'
    }]);

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (mongo.disconnectMongo) {
      await mongo.disconnectMongo();
    }
  });

  test('GET /api/words/all returns words and success true', async () => {
    const res = await fetch(`${baseUrl}/api/words/all`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.words));
  });

  test('GET /api/words/today returns today words array and date', async () => {
    const res = await fetch(`${baseUrl}/api/words/today`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.words));
    assert.ok(data.date);
  });

  test('POST /api/words/:id/review records review feedback', async () => {
    const res = await fetch(`${baseUrl}/api/words/test_word_endpoint_1/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcome: 'known' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.word);
    assert.ok(data.word.progress);
  });

  test('POST /api/words/:id/sentence saves custom sentence', async () => {
    const res = await fetch(`${baseUrl}/api/words/test_word_endpoint_1/sentence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence: 'Integration test sentence for streamline.' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.progress.userSentence, 'Integration test sentence for streamline.');
  });

  test('POST /api/words/:id/favorite toggles favorite status', async () => {
    const res = await fetch(`${baseUrl}/api/words/test_word_endpoint_1/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(typeof data.isFavorite === 'boolean');
  });

  test('POST /api/ai/generate-sentence generates a new distinct example sentence', async () => {
    const res = await fetch(`${baseUrl}/api/ai/generate-sentence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wordId: 'test_word_endpoint_1',
        word: 'Streamline',
        meaning: 'Make more efficient',
        previousSentences: ['We streamlined the process.']
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(typeof data.sentence === 'string');
    assert.ok(data.sentence.length > 5);
  });

  test('POST /api/ai/generate-sentence returns 400 when word is missing', async () => {
    const res = await fetch(`${baseUrl}/api/ai/generate-sentence`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  test('POST /api/ai/word-insights returns insights data', async () => {
    const res = await fetch(`${baseUrl}/api/ai/word-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: 'Pragmatic', meaning: 'Sensible and realistic' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.insights);
  });

  test('GET /api/analytics/overview returns analytics data', async () => {
    const res = await fetch(`${baseUrl}/api/analytics/overview`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.overview);
  });

  test('GET /api/xp/history returns gamification profile and history', async () => {
    const res = await fetch(`${baseUrl}/api/xp/history`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.gamification);
    assert.ok(data.levelInfo);
    assert.ok(Array.isArray(data.history));
  });

  test('GET /api/confusing-words returns confusing word pairs', async () => {
    const res = await fetch(`${baseUrl}/api/confusing-words`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.pairs));
  });

  test('GET /api/achievements returns all achievements status', async () => {
    const res = await fetch(`${baseUrl}/api/achievements`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.achievements));
  });
});
