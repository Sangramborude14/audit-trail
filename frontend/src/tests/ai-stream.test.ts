import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../app/api/audit/parse/route';
import { streamText } from 'ai';

// Use vi.hoisted to instantiate mocks before vi.mock executes
const { mockS3Send } = vi.hoisted(() => {
  return {
    mockS3Send: vi.fn(),
  };
});

// Mock the '@aws-sdk/client-s3' module to prevent credential/network requests
vi.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: class {
      send = mockS3Send;
    },
    GetObjectCommand: class {
      constructor(public params: any) {}
    },
  };
});

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
    streamText: vi.fn(),
  };
});

describe('AuditTrail AI Compliance Parsing Pipeline Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject with 401 if x-tenant-id header is missing', async () => {
    const request = new Request('http://localhost:3000/api/audit/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        configJson: { Version: '2012-10-17', Statement: [] },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.error).toContain('SECURITY_ALERT');
    expect(streamText).not.toHaveBeenCalled();
  });

  it('should successfully fetch document from S3, run AI analysis, and stream SSE responses', async () => {
    // 1. Mock S3 download response
    mockS3Send.mockResolvedValueOnce({
      Body: {
        transformToString: async () =>
          JSON.stringify({
            Version: '2012-10-17',
            Statement: [
              {
                Effect: 'Allow',
                Action: '*',
                Resource: '*',
              },
            ],
          }),
      },
    } as any);

    // 2. Mock Vercel AI SDK streamText response structure
    const textEncoder = new TextEncoder();
    const mockStreamTextResult = {
      textStream: new ReadableStream({
        start(controller) {
          controller.enqueue('ISO 27001 Violation: Wildcard admin access.\n');
          controller.enqueue('Control ID: A.8.15\n');
          controller.enqueue('Severity: High\n');
          controller.close();
        },
      }),
      toDataStreamResponse() {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              textEncoder.encode('0:"ISO 27001 Violation: Wildcard admin access.\\n"\n')
            );
            controller.enqueue(textEncoder.encode('0:"Control ID: A.8.15\\n"\n'));
            controller.enqueue(textEncoder.encode('0:"Severity: High\\n"\n'));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      },
    };

    vi.mocked(streamText).mockResolvedValueOnce(mockStreamTextResult as any);

    // 3. Make mock POST request
    const request = new Request('http://localhost:3000/api/audit/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'company-a',
      },
      body: JSON.stringify({
        documentPath: 'policies/iam-admin-policy.json',
      }),
    });

    const response = await POST(request);

    // 4. Assert response states
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('text/plain');

    // Read the stream contents
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let resultText = '';
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      resultText += decoder.decode(value, { stream: true });
    }

    expect(resultText).toContain('ISO 27001 Violation');
    expect(resultText).toContain('Control ID: A.8.15');
    expect(resultText).toContain('Severity: High');

    expect(mockS3Send).toHaveBeenCalledTimes(1);
    expect(streamText).toHaveBeenCalledTimes(1);
  });

  it('should audit raw configJson directly and stream responses', async () => {
    // 1. Mock Vercel AI SDK streamText response
    const textEncoder = new TextEncoder();
    const mockStreamTextResult = {
      textStream: new ReadableStream({
        start(controller) {
          controller.enqueue('SOC 2 Audit Output\n');
          controller.close();
        },
      }),
      toDataStreamResponse() {
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(textEncoder.encode('0:"SOC 2 Audit Output\\n"\n'));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
          },
        });
      },
    };

    vi.mocked(streamText).mockResolvedValueOnce(mockStreamTextResult as any);

    // 2. Make mock POST request
    const request = new Request('http://localhost:3000/api/audit/parse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-tenant-id': 'company-b',
      },
      body: JSON.stringify({
        configJson: {
          Port: 80,
          Protocol: 'HTTP',
        },
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const decoder = new TextDecoder();
    let resultText = '';
    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      resultText += decoder.decode(value, { stream: true });
    }

    expect(resultText).toContain('SOC 2 Audit Output');
    expect(mockS3Send).not.toHaveBeenCalled(); // direct JSON configuration: no S3 fetch
    expect(streamText).toHaveBeenCalledTimes(1);
  });
});
