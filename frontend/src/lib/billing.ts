export interface BillingUsage {
  scanCount: number;
  scanLimit: number;
  tier: 'FREE' | 'PREMIUM' | 'ENTERPRISE';
}

/**
 * Retrieves the billing context and compliance scan usage for a tenant.
 * For the B2B Hub hackathon demo, we simulate the tiers dynamically:
 * - Tenant IDs ending in "-free" are mapped to the FREE tier with their limit exhausted.
 * - Other tenants default to the unlimited PREMIUM tier.
 */
export async function getTenantUsage(tenantId: string): Promise<BillingUsage> {
  const isFreeTier = tenantId.toLowerCase().endsWith('-free');

  if (isFreeTier) {
    return {
      scanCount: 1, // Has already run 1 scan
      scanLimit: 1, // Only allowed 1 scan per month
      tier: 'FREE',
    };
  }

  return {
    scanCount: 0,
    scanLimit: Infinity, // Unlimited scans
    tier: 'PREMIUM',
  };
}

/**
 * Validates if the tenant has quota remaining to run a compliance scan.
 */
export function isQuotaExhausted(usage: BillingUsage): boolean {
  return usage.scanCount >= usage.scanLimit;
}
