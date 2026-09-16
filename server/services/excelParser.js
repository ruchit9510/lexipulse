const XLSX = require('xlsx');

/**
 * Converts Excel serial date number to ISO YYYY-MM-DD string
 * @param {number|string|Date} val 
 * @returns {string} ISO date string YYYY-MM-DD
 */
function normalizeDate(val) {
  if (!val) return '';
  
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  
  if (typeof val === 'number') {
    // Excel epoch: Dec 30, 1899 (accounts for the Lotus 1-2-3 1900 leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const msPerDay = 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + Math.round(val * msPerDay));
    return date.toISOString().split('T')[0];
  }

  const str = String(val).trim();
  // Check if string is numeric serial
  if (/^\d+(\.\d+)?$/.test(str)) {
    const num = parseFloat(str);
    return normalizeDate(num);
  }

  // If already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Try parsing standard date strings
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return str;
}

/**
 * Parses an Excel file buffer or file path into normalized vocabulary items
 * @param {Buffer|string} source - Buffer or file path
 * @returns {{ headers: string[], records: Array, dates: string[] }}
 */
function parseExcelFile(source) {
  let workbook;
  if (Buffer.isBuffer(source)) {
    workbook = XLSX.read(source, { type: 'buffer' });
  } else {
    workbook = XLSX.readFile(source);
  }

  // Find sheet: look for 'Sheet1' or use first sheet
  const sheetName = workbook.SheetNames.includes('Sheet1') 
    ? 'Sheet1' 
    : workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in Excel file`);
  }

  // Convert to array of arrays
  const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true });
  if (!rawRows || rawRows.length === 0) {
    return { headers: [], records: [], dates: [] };
  }

  const headerRow = rawRows[0] || [];
  const headers = headerRow.map(h => String(h || '').trim());

  // Map header column indices
  let dateCol = -1;
  let wordCol = -1;
  let meaningCol = -1;
  let exampleCol = -1;
  let howToUseCol = -1;

  headers.forEach((h, idx) => {
    const lower = h.toLowerCase();
    if (lower === 'date') dateCol = idx;
    else if (lower === 'word') wordCol = idx;
    else if (lower.includes('meaning')) meaningCol = idx;
    else if (lower.includes('example')) exampleCol = idx;
    else if (lower.includes('how to use') || lower.includes('usage')) howToUseCol = idx;
  });

  // Fallback to standard columns A=0, B=1, C=2, D=3, E=4 if headers not named exactly
  if (dateCol === -1) dateCol = 0;
  if (wordCol === -1) wordCol = 1;
  if (meaningCol === -1) meaningCol = 2;
  if (exampleCol === -1) exampleCol = 3;
  if (howToUseCol === -1) howToUseCol = 4;

  const records = [];
  const seenIds = new Set();
  const datesSet = new Set();

  for (let r = 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || row.length === 0) continue;

    const rawWord = row[wordCol];
    if (rawWord === undefined || rawWord === null) continue;

    const word = String(rawWord).trim();
    // Ignore rows where Word is empty (Requirement 28)
    if (!word) continue;

    const rawDate = row[dateCol];
    const dateStr = normalizeDate(rawDate);
    if (dateStr) {
      datesSet.add(dateStr);
    }

    const rawMeaning = row[meaningCol];
    // Requirement 28: If meaning is missing, show "Meaning unavailable"
    const meaning = (rawMeaning !== undefined && rawMeaning !== null && String(rawMeaning).trim() !== '')
      ? String(rawMeaning).trim()
      : 'Meaning unavailable';

    const rawExample = row[exampleCol];
    const example = (rawExample !== undefined && rawExample !== null)
      ? String(rawExample).trim()
      : '';

    const rawHowToUse = row[howToUseCol];
    const howToUse = (rawHowToUse !== undefined && rawHowToUse !== null)
      ? String(rawHowToUse).trim()
      : '';

    // Requirement 26: Deterministic identifier based on normalized word + date
    const cleanWordKey = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    const id = `${cleanWordKey}_${dateStr || 'nodate'}`;

    // Deduplication: prevent accidental identical duplicate rows in the same sync
    if (seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    records.push({
      id,
      word,
      date: dateStr,
      meaning,
      example,
      howToUse
    });
  }

  const sortedDates = Array.from(datesSet).sort();

  return {
    headers,
    records,
    dates: sortedDates
  };
}

module.exports = {
  normalizeDate,
  parseExcelFile
};
