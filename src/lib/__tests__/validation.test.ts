import { cleanText, isNonEmpty, isValidIsoDate, isValidUrl, LIMITS, parsePrice } from '../validation';

describe('cleanText', () => {
  test('trims surrounding whitespace', () => {
    expect(cleanText('  olá  ', 50)).toBe('olá');
  });

  test('truncates text beyond the limit', () => {
    expect(cleanText('a'.repeat(100), LIMITS.title)).toHaveLength(LIMITS.title);
  });

  test('returns empty string for whitespace-only input', () => {
    expect(cleanText('   ', 50)).toBe('');
  });
});

describe('isNonEmpty', () => {
  test('rejects whitespace-only strings', () => {
    expect(isNonEmpty('   ')).toBe(false);
  });

  test('accepts strings with content', () => {
    expect(isNonEmpty(' oi ')).toBe(true);
  });
});

describe('parsePrice', () => {
  test('parses Brazilian currency format', () => {
    expect(parsePrice('R$ 1.234,56')).toBe(1234.56);
  });

  test('parses plain decimal format', () => {
    expect(parsePrice('1234.56')).toBe(1234.56);
  });

  test('returns null for invalid input', () => {
    expect(parsePrice('abc')).toBeNull();
  });

  test('returns null for negative values', () => {
    expect(parsePrice('-10')).toBeNull();
  });
});

describe('isValidUrl', () => {
  test('accepts http and https URLs', () => {
    expect(isValidUrl('https://example.com/x')).toBe(true);
    expect(isValidUrl('http://example.com')).toBe(true);
  });

  test('rejects other protocols and garbage', () => {
    expect(isValidUrl('javascript:alert(1)')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
  });
});

describe('isValidIsoDate', () => {
  test('accepts YYYY-MM-DD', () => {
    expect(isValidIsoDate('2026-06-11')).toBe(true);
  });

  test('rejects wrong format or invalid date', () => {
    expect(isValidIsoDate('11/06/2026')).toBe(false);
    expect(isValidIsoDate('2026-13-45')).toBe(false);
  });
});
