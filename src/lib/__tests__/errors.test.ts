import { getErrorMessage } from '../errors';

describe('getErrorMessage', () => {
  test('returns message from Error instances', () => {
    expect(getErrorMessage(new Error('falhou'), 'fallback')).toBe('falhou');
  });

  test('returns message from Supabase-style error objects', () => {
    expect(getErrorMessage({ message: 'permission denied' }, 'fallback')).toBe('permission denied');
    expect(getErrorMessage({ details: 'row not found' }, 'fallback')).toBe('row not found');
  });

  test('returns plain strings as-is', () => {
    expect(getErrorMessage('erro direto', 'fallback')).toBe('erro direto');
  });

  test('falls back for null, undefined and empty objects', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback');
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(getErrorMessage({}, 'fallback')).toBe('fallback');
  });
});
