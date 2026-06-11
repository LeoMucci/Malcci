import { getRelationshipStats } from '../relationship';

describe('getRelationshipStats', () => {
  test('calculates full days together since start date', () => {
    // Arrange
    const start = '2024-12-06';
    const today = new Date('2024-12-16T12:00:00');

    // Act
    const stats = getRelationshipStats(start, today);

    // Assert
    expect(stats.days).toBe(10);
    expect(stats.years).toBe(0);
    expect(stats.months).toBe(0);
    expect(stats.restDays).toBe(10);
  });

  test('calculates years and months across anniversaries', () => {
    const stats = getRelationshipStats('2024-12-06', new Date('2026-01-10T12:00:00'));

    expect(stats.years).toBe(1);
    expect(stats.months).toBe(1);
    expect(stats.restDays).toBe(4);
  });

  test('borrows days from previous month when day-of-month is earlier', () => {
    const stats = getRelationshipStats('2024-12-06', new Date('2025-01-04T12:00:00'));

    expect(stats.years).toBe(0);
    expect(stats.months).toBe(0);
    expect(stats.restDays).toBe(29);
  });

  test('returns days until next anniversary', () => {
    const stats = getRelationshipStats('2024-12-06', new Date('2025-11-30T12:00:00'));

    expect(stats.nextIn).toBe(6);
  });

  test('rolls next anniversary to following year when date already passed', () => {
    const stats = getRelationshipStats('2024-12-06', new Date('2025-12-10T12:00:00'));

    expect(stats.nextIn).toBeGreaterThan(300);
    expect(stats.nextIn).toBeLessThanOrEqual(366);
  });
});
