import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { middleware } from '../middleware';
import { NextRequest } from 'next/server';
import { StructuredLogger } from '../lib/logger';
import { withTracing } from '../lib/tracer';

describe('AuditTrail Observability & Routing Interception Tests', () => {
  let consoleLogSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    if (consoleLogSpy) {
      consoleLogSpy.mockRestore();
    }
  });

  describe('Structured Logger Tests', () => {
    it('should output standard context footprint in JSON format', () => {
      const logger = new StructuredLogger({
        tenantId: 'company-a',
        correlationId: '1234-uuid',
      });

      logger.info('Executing compliance check', { frameworkId: 'SOC2' });

      expect(consoleLogSpy).toHaveBeenCalledTimes(1);
      const printedStr = consoleLogSpy.mock.calls[0][0];
      const parsedLog = JSON.parse(printedStr);

      expect(parsedLog).toHaveProperty('timestamp');
      expect(parsedLog).toHaveProperty('level', 'INFO');
      expect(parsedLog).toHaveProperty('message', 'Executing compliance check');
      expect(parsedLog).toHaveProperty('tenantId', 'company-a');
      expect(parsedLog).toHaveProperty('correlationId', '1234-uuid');
      expect(parsedLog).toHaveProperty('frameworkId', 'SOC2');
    });

    it('should generate a valid correlation ID using randomUUID', () => {
      const cid = StructuredLogger.generateCorrelationId();
      expect(cid).toBeTypeOf('string');
      expect(cid.length).toBeGreaterThan(10);
    });
  });

  describe('Tracer Profiling Tests', () => {
    it('should measure and log execution spans and return target result', async () => {
      const result = await withTracing(
        'test-db-query',
        async () => {
          return { data: 'success' };
        },
        { tenantId: 'company-a', correlationId: 'tracer-uuid' }
      );

      expect(result).toEqual({ data: 'success' });
      expect(consoleLogSpy).toHaveBeenCalledTimes(2);

      const startLog = JSON.parse(consoleLogSpy.mock.calls[0][0]);
      expect(startLog.message).toContain('[TRACE-START]');
      expect(startLog.tenantId).toBe('company-a');

      const endLog = JSON.parse(consoleLogSpy.mock.calls[1][0]);
      expect(endLog.message).toContain('[TRACE-END]');
      expect(endLog).toHaveProperty('durationMs');
      expect(endLog.success).toBe(true);
    });
  });

  describe('Edge Middleware Routing Tests', () => {
    it('should parse production subdomain and inject x-tenant-id header', () => {
      const req = new NextRequest('https://company-a.audittrail.com/dashboard/compliance', {
        headers: {
          host: 'company-a.audittrail.com',
        },
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res?.headers.get('x-tenant-id')).toBe('company-a');
    });

    it('should fallback to query parameters on localhost and inject x-tenant-id header', () => {
      const req = new NextRequest('http://localhost:3000/dashboard?tenantId=company-b', {
        headers: {
          host: 'localhost:3000',
        },
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res?.headers.get('x-tenant-id')).toBe('company-b');
    });

    it('should redirect unauthenticated dashboard requests without tenant context to /login', () => {
      const req = new NextRequest('http://localhost:3000/dashboard/compliance', {
        headers: {
          host: 'localhost:3000',
        },
      });
      const res = middleware(req);

      expect(res).toBeDefined();
      expect(res?.status).toBe(307);
      expect(res?.headers.get('location')).toContain('/login');
    });
  });
});
