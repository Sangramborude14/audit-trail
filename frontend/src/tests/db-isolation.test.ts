import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuditTrailDbClient } from '../lib/db';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Spy on the prototype send method of the DynamoDBDocumentClient
const mockSend = vi.spyOn(DynamoDBDocumentClient.prototype, 'send');

describe('AuditTrail Db Isolation & Authorization Security Guard Tests', () => {
  let dbClient: AuditTrailDbClient;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    dbClient = new AuditTrailDbClient(new DynamoDBClient({ region: 'us-east-1' }));
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleErrorSpy) {
      consoleErrorSpy.mockRestore();
    }
  });

  describe('Test 1: Catastrophic Authorization Guard', () => {
    it('should instantly throw a security alert when tenantId is empty string', async () => {
      await expect(dbClient.getTenantConfig('')).rejects.toThrow(
        'SECURITY_ALERT: Catastrophic Authorization Failure.'
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should instantly throw a security alert when tenantId contains only spaces', async () => {
      await expect(dbClient.getFrameworkStatus('   ', 'SOC2')).rejects.toThrow(
        'SECURITY_ALERT: Catastrophic Authorization Failure.'
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should instantly throw a security alert when tenantId is null/undefined (typecast validation)', async () => {
      // @ts-expect-error - testing runtime defense against bypassed typescript typings
      await expect(dbClient.getComplianceControl(null, 'SOC2', 'CC1.1')).rejects.toThrow(
        'SECURITY_ALERT: Catastrophic Authorization Failure.'
      );
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('should instantly throw a security alert when tenantId contains delimiter characters', async () => {
      await expect(dbClient.getTenantConfig('Tenant#A')).rejects.toThrow(
        'SECURITY_ALERT: Catastrophic Authorization Failure.'
      );
      expect(mockSend).not.toHaveBeenCalled();
    });
  });

  describe('Test 2: Malicious Tenant Isolation Bypass Blocker', () => {
    it('should allow querying when tenantId matches target partition key namespace', async () => {
      // Mock successful AWS response
      (mockSend as any).mockResolvedValueOnce({
        Item: { tenantId: 'TenantA', name: 'Acme Corp' },
      });

      const config = await dbClient.getTenantConfig('TenantA');
      expect(config).not.toBeNull();
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should block attempts by TenantA session to query TenantB data directly via key manipulation', () => {
      const runAttack = () => {
        // Access the private guard directly to simulate low-level key assembly bypass checks
        (dbClient as any).enforceIsolation('TenantA', 'TENANT#TenantB');
      };

      expect(runAttack).toThrow(
        'SECURITY_ALERT: Cross-tenant access violation. Database operation blocked.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[HIGH-SEVERITY ALERT]');
      expect(consoleErrorSpy.mock.calls[0][0]).toContain(
        'Tenant isolation breach attempt detected!'
      );
    });

    it('should block attempts by TenantA session to access framework keys starting with TenantB', () => {
      const runAttack = () => {
        (dbClient as any).enforceIsolation('TenantA', 'TENANT#TenantB#FRAMEWORK#SOC2');
      };

      expect(runAttack).toThrow(
        'SECURITY_ALERT: Cross-tenant access violation. Database operation blocked.'
      );
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[HIGH-SEVERITY ALERT]');
    });

    it('should allow TenantA session to access its own framework keys', () => {
      const runSafe = () => {
        (dbClient as any).enforceIsolation('TenantA', 'TENANT#TenantA#FRAMEWORK#SOC2');
      };

      expect(runSafe).not.toThrow();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});
