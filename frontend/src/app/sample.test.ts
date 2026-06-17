import { describe, it, expect } from 'vitest';

export const validateAuditRecord = (record: {
  tenantId: string;
  action: string;
  timestamp: number;
}) => {
  if (!record.tenantId) throw new Error('Tenant ID is required');
  if (!record.action) throw new Error('Action is required');
  return true;
};

describe('AuditRecord Validation', () => {
  it('should validate a correct record', () => {
    const record = {
      tenantId: 'tenant-123',
      action: 'policy.upload',
      timestamp: Date.now(),
    };
    expect(validateAuditRecord(record)).toBe(true);
  });

  it('should throw error if tenantId is missing', () => {
    const record = {
      tenantId: '',
      action: 'policy.upload',
      timestamp: Date.now(),
    };
    expect(() => validateAuditRecord(record)).toThrow('Tenant ID is required');
  });

  it('should throw error if action is missing', () => {
    const record = {
      tenantId: 'tenant-123',
      action: '',
      timestamp: Date.now(),
    };
    expect(() => validateAuditRecord(record)).toThrow('Action is required');
  });
});
