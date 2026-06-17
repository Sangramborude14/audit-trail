import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { bedrock } from '@ai-sdk/amazon-bedrock';
import { streamText } from 'ai';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Helper function to read S3 object
async function getS3ObjectContent(bucket: string, key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  const response = await s3Client.send(command);
  if (!response.Body) return '';
  return await response.Body.transformToString();
}

const SYSTEM_PROMPT = `You are an accredited Senior Lead Auditor specializing in ISO 27001:2022 (Annex A controls) and SOC 2 Type II (Common Criteria).
Your task is to audit the provided cloud resources, IAM policies, security configurations, or compliance policy documents.

Evaluate the resource content and perform the following actions:
1. Identify security gaps, configuration errors, and compliance violations.
2. For each violation, specify:
   - Control ID: Reference the relevant SOC 2 Common Criteria (e.g., CC6.1, CC7.1) or ISO 27001 Annex A control (e.g., A.8.12, A.8.15).
   - Vulnerability Gap: Describe the exposure and the risk it introduces.
   - Severity: Assign a severity level (Low, Medium, High).
   - Remediation: Write precise, copy-pasteable CLI commands (such as AWS CLI commands, Terraform definitions) or JSON/YAML patches that resolve the vulnerability directly.

Structure your response using clean, professional markdown headers. Provide only accurate information, and do not use generic placeholders.`;

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');

  // 1. Authorization check
  if (!tenantId || tenantId.trim() === '' || tenantId === 'UNKNOWN') {
    return new Response(
      JSON.stringify({
        error: 'SECURITY_ALERT: Unauthorized access. Tenant ID is required.',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body = await request.json();
    const { documentPath, configJson } = body;

    let resourceContent = '';

    // 2. Fetch data from S3 if documentPath is provided
    if (documentPath) {
      const bucket = process.env.S3_BUCKET_NAME || 'audittrail-policy-bucket';
      resourceContent = await getS3ObjectContent(bucket, documentPath);
    } else if (configJson) {
      // 3. Fallback to raw configuration JSON
      resourceContent =
        typeof configJson === 'string' ? configJson : JSON.stringify(configJson, null, 2);
    } else {
      return new Response(
        JSON.stringify({
          error: 'Bad Request: Either documentPath or configJson is required.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Invoke Amazon Bedrock Claude model using Vercel AI SDK streamText
    const model = bedrock('anthropic.claude-3-5-sonnet-20240620');

    const result = await streamText({
      model,
      system: SYSTEM_PROMPT,
      prompt: `Please audit the following resource content:\n\n${resourceContent}\n\nProvide the compliance report containing gap analysis, severities, and remediations.`,
    });

    // 5. Stream the response payload step-by-step
    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error(`[ERROR] Compliance parsing failure for tenant '${tenantId}':`, error);
    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        details: error.message || String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
