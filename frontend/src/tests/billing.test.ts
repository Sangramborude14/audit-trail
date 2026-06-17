import { describe, it, expect } from 'vitest';
import { getTenantUsage, isQuotaExhausted } from '../lib/billing';

describe('Billing & Monetization Limits', () => {
  describe('getTenantUsage', () => {
    it('should assign FREE tier with 1/1 scan usage for tenants ending in -free (case-insensitive)', async () => {
      const freeUsageUpper = await getTenantUsage('ACME-FREE');
      expect(freeUsageUpper.tier).toBe('FREE');
      expect(freeUsageUpper.scanCount).toBe(1);
      expect(freeUsageUpper.scanLimit).toBe(1);

      const freeUsageLower = await getTenantUsage('acme-free');
      expect(freeUsageLower.tier).toBe('FREE');
      expect(freeUsageLower.scanCount).toBe(1);
      expect(freeUsageLower.scanLimit).toBe(1);
    });

    it('should assign PREMIUM tier with 0/Infinity scans for default/other tenants', async () => {
      const premiumUsage = await getTenantUsage('acme-corp');
      expect(premiumUsage.tier).toBe('PREMIUM');
      expect(premiumUsage.scanCount).toBe(0);
      expect(premiumUsage.scanLimit).toBe(Infinity);
    });
  });

  describe('isQuotaExhausted', () => {
    it('should return true if scanCount >= scanLimit', () => {
      expect(isQuotaExhausted({ tier: 'FREE', scanCount: 1, scanLimit: 1 })).toBe(true);
      expect(isQuotaExhausted({ tier: 'FREE', scanCount: 2, scanLimit: 1 })).toBe(true);
    });

    it('should return false if scanCount < scanLimit', () => {
      expect(isQuotaExhausted({ tier: 'FREE', scanCount: 0, scanLimit: 1 })).toBe(false);
      expect(isQuotaExhausted({ tier: 'PREMIUM', scanCount: 10, scanLimit: Infinity })).toBe(false);
    });
  });
});
