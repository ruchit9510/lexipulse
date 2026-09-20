const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const weaknessService = require('../services/weaknessService');

describe('Weakness Detection Service Tests', () => {
  test('exports DIMENSIONS, DIMENSION_LABELS, and DIMENSION_DESCRIPTIONS', () => {
    assert.ok(Array.isArray(weaknessService.DIMENSIONS));
    assert.equal(weaknessService.DIMENSIONS.length, 6);

    weaknessService.DIMENSIONS.forEach(dim => {
      assert.ok(weaknessService.DIMENSION_LABELS[dim], `Missing label for ${dim}`);
      assert.ok(weaknessService.DIMENSION_DESCRIPTIONS[dim], `Missing description for ${dim}`);
    });
  });

  test('calculateWeaknessProfile returns comprehensive 6-dimension scores', () => {
    const profile = weaknessService.calculateWeaknessProfile();

    assert.ok(profile);
    assert.ok(profile.dimensions);
    assert.ok(profile.weakestArea);
    assert.ok(profile.strongestArea);
    assert.ok(profile.recommendations);
    assert.ok(profile.timestamp);

    weaknessService.DIMENSIONS.forEach(dim => {
      const dimData = profile.dimensions[dim];
      assert.ok(dimData, `Dimension ${dim} must exist in profile`);
      assert.ok(typeof dimData.score === 'number');
      assert.ok(dimData.score >= 0 && dimData.score <= 100);
      assert.ok(dimData.label);
      assert.ok(dimData.description);
    });
  });

  test('profile identifies weakest and strongest learning areas', () => {
    const profile = weaknessService.calculateWeaknessProfile();

    assert.ok(profile.weakestArea.id);
    assert.ok(profile.weakestArea.label);
    assert.ok(profile.weakestArea.diagnosis);

    assert.ok(profile.strongestArea.id);
    assert.ok(profile.strongestArea.label);
  });

  test('recommendations are tailored with exercises and target words', () => {
    const profile = weaknessService.calculateWeaknessProfile();
    const recs = profile.recommendations;

    assert.ok(recs);
    assert.equal(recs.focusDimension, profile.weakestArea.id);
    assert.ok(Array.isArray(recs.items));
    assert.ok(recs.items.length >= 2);
    assert.ok(recs.estimatedMinutes > 0);
  });
});
