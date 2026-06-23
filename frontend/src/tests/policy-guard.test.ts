import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../app/api/audit/lint/route';
import { generateObject } from 'ai';

// Mock the '@ai-sdk/amazon-bedrock' module to avoid region/credentials checks
vi.mock('@ai-sdk/amazon-bedrock', () => {
  return {
    bedrock: vi.fn().mockReturnValue({}),
  };
});

// Mock the 'ai' module exports
vi.mock('ai', async (importOriginal) => {
  const original = await importOriginal<typeof import('ai')>();
  return {
    ...original,
    generateObject: vi.fn(),
  };
});

describe('AuditTrail AI Policy Guard Linter Endpoint Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject with 401 if x-tenant-id header is missing or empty', async () => {
    const request = new Request('http://localhost:3000/api/audit/lint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policyText: '{"Statement": []}',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('SECURITY_ALERT');
    expect(generateObject).not.toHaveBeenCalled();
  });

  it('should return a high severity violation when wildcard actions are used in fallback mock mode', async () => {
    const maliciousPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*"
    }
  ]
}`;

    const request = new Request('http://localhost:3000/api/audit/lint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'acme-corp',
      },
      body: JSON.stringify({
        policyText: maliciousPolicy,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.score).toBeLessThan(100);
    expect(data.violations).toBeDefined();

    // Verify it detected wildcard actions
    const wildcardActionViolation = data.violations.find((v: any) =>
      v.message.includes('Wildcard Action')
    );
    expect(wildcardActionViolation).toBeDefined();
    expect(wildcardActionViolation.severity).toBe('High');
    expect(wildcardActionViolation.line).toBe(6); // line 6 has "Action": "*"

    // Verify it has remediated version
    expect(data.remediatedPolicy).toBeDefined();
    expect(data.remediatedPolicy).not.toContain('"Action": "*"');
  });

  it('should return 100 security score if the policy is secure in mock mode', async () => {
    const securePolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::my-secure-bucket/*"
    }
  ]
}`;

    const request = new Request('http://localhost:3000/api/audit/lint', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'acme-corp',
      },
      body: JSON.stringify({
        policyText: securePolicy,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.score).toBe(100);
    expect(data.violations).toHaveLength(0);
  });
});
