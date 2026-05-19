import { describe, it, expect } from 'vitest';
import { calculateHaversineDistance } from '@/lib/geo';

describe('Haversine Distance Utility', () => {
  it('should return 0 for the exact same coordinate', () => {
    const lat = 19.4326;
    const lon = -99.1332;

    const distance = calculateHaversineDistance(lat, lon, lat, lon);
    expect(distance).toBe(0);
  });

  it('should calculate the correct distance between two known points', () => {
    const lat1 = 19.4326;
    const lon1 = -99.1332;
    const lat2 = 20.6597;
    const lon2 = -103.3496;

    const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);

    expect(distance).toBeCloseTo(461.1, 1);
  });

  it('should correctly validate points within the 10km radius limit', () => {
    const lat1 = 19.4326;
    const lon1 = -99.1332;
    const lat2 = 19.45;
    const lon2 = -99.115;

    const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    expect(distance).toBeLessThan(10);
  });
});
