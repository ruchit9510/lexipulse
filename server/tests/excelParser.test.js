const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');
const { normalizeDate, parseExcelFile } = require('../services/excelParser');

describe('excelParser Service Tests', () => {
  describe('normalizeDate', () => {
    test('returns empty string for falsy input', () => {
      assert.equal(normalizeDate(null), '');
      assert.equal(normalizeDate(undefined), '');
      assert.equal(normalizeDate(''), '');
    });

    test('normalizes JavaScript Date object to YYYY-MM-DD', () => {
      const d = new Date('2026-09-20T12:00:00Z');
      assert.equal(normalizeDate(d), '2026-09-20');
    });

    test('normalizes Excel numeric serial dates', () => {
      // 45555 in Excel serial corresponds to a 2024 date
      const result = normalizeDate(45555);
      assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
    });

    test('handles numeric serial passed as string', () => {
      const result = normalizeDate('45555');
      assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
    });

    test('preserves already formatted ISO YYYY-MM-DD string', () => {
      assert.equal(normalizeDate('2026-09-20'), '2026-09-20');
      assert.equal(normalizeDate('2026-01-01'), '2026-01-01');
    });

    test('parses readable date strings to ISO format', () => {
      const result = normalizeDate('2026-09-20T00:00:00.000Z');
      assert.equal(result, '2026-09-20');
    });
  });

  describe('parseExcelFile', () => {
    test('successfully parses Excel buffer with standard column headers', () => {
      const data = [
        ['Date', 'Word', 'Meaning', 'Example Sentence', 'How to Use It'],
        ['2026-09-20', 'Bottleneck', 'A point of congestion or blockage', 'Traffic creates a bottleneck.', 'Use when describing delays.'],
        ['2026-09-20', 'Streamline', 'To make an organization or system more efficient', 'We need to streamline the process.', 'Use for optimization.']
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const parsed = parseExcelFile(buffer);
      assert.ok(parsed);
      assert.equal(parsed.records.length, 2);
      assert.equal(parsed.records[0].word, 'Bottleneck');
      assert.equal(parsed.records[0].meaning, 'A point of congestion or blockage');
      assert.equal(parsed.records[1].word, 'Streamline');
      assert.ok(parsed.dates.includes('2026-09-20'));
    });

    test('handles fallback column positioning when headers are non-standard', () => {
      const data = [
        ['ColA', 'ColB', 'ColC', 'ColD', 'ColE'],
        ['2026-09-21', 'Pragmatic', 'Dealing with things sensibly and realistically', 'A pragmatic approach is required.', 'Use for practical mindsets.']
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const parsed = parseExcelFile(buffer);
      assert.equal(parsed.records.length, 1);
      assert.equal(parsed.records[0].word, 'Pragmatic');
    });

    test('handles empty sheet gracefully', () => {
      const ws = XLSX.utils.aoa_to_sheet([]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const parsed = parseExcelFile(buffer);
      assert.deepEqual(parsed.records, []);
      assert.deepEqual(parsed.headers, []);
    });
  });
});
