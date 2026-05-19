import { estimateDriveMinutes } from './drive';

describe('estimateDriveMinutes', () => {
  it('floors at 5 minutes for very short distances', () => {
    expect(estimateDriveMinutes(0)).toBe(5);
    expect(estimateDriveMinutes(1)).toBe(5);
    expect(estimateDriveMinutes(2)).toBe(5);
  });

  it('rounds to the nearest 5 minutes', () => {
    expect(estimateDriveMinutes(10)).toBe(20);
    expect(estimateDriveMinutes(20)).toBe(40);
    expect(estimateDriveMinutes(30)).toBe(65);
  });

  it('scales roughly linearly with distance', () => {
    const m20 = estimateDriveMinutes(20);
    const m40 = estimateDriveMinutes(40);
    expect(m40 / m20).toBeGreaterThan(1.8);
    expect(m40 / m20).toBeLessThan(2.2);
  });
});
