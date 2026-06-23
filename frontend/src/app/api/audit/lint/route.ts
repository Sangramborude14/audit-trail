import { bedrock } from '@ai-sdk/amazon-bedrock';
import { generateObject } from 'ai';
import { z } from 'zod';

const lintSchema = z.object({
  score: z.number().min(0).max(100),
  violations: z.array(
    z.object({
      line: z.number(),
      message: z.string(),
      severity: z.enum(['Low', 'Medium', 'High']),
      remediation: z.string(),
    })
  ),
  remediatedPolicy: z.string(),
});

const SYSTEM_PROMPT = `You are a cloud security expert and compliance auditor.
Your job is to audit the provided AWS IAM Policy or Terraform JSON configuration, check for security risks (e.g. wildcard actions, wildcard resources, privilege escalation paths, missing encryption), and return a structured linting report.

For each security violation you identify, determine the line number (1-indexed) in the original JSON input where the violation occurs.
Provide an overall security score from 0 (completely insecure) to 100 (fully secure).
Generate a clean, remediated version of the JSON policy with the identified violations fixed.`;

export async function POST(request: Request) {
  const tenantId = request.headers.get('x-tenant-id');

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
    const { policyText } = await request.json();

    if (!policyText || typeof policyText !== 'string') {
      return new Response(JSON.stringify({ error: 'Bad Request: policyText is required.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Try live AWS Bedrock call if credentials are configured
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        const model = bedrock('anthropic.claude-3-5-sonnet-20240620');
        const result = await generateObject({
          model,
          schema: lintSchema,
          system: SYSTEM_PROMPT,
          prompt: `Please lint the following policy configuration:\n\n${policyText}\n\nReturn the structured security audit report.`,
        });
        return new Response(JSON.stringify(result.object), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        console.warn(
          '[WARNING] Bedrock live lint execution failed, falling back to mock evaluator:',
          err.message
        );
      }
    }

    // High-fidelity fallback evaluator for offline demo mode
    const lines = policyText.split('\n');
    const violations: Array<{
      line: number;
      message: string;
      severity: 'Low' | 'Medium' | 'High';
      remediation: string;
    }> = [];

    let score = 100;
    let remediatedPolicyText = policyText;

    // Scan lines for common security violations
    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const trimmed = lineText.trim();

      // 1. Wildcard Action Check
      if (trimmed.includes('"Action"') && trimmed.includes('"*"')) {
        violations.push({
          line: lineNum,
          message:
            'Wildcard Action ("*") grants administrative privileges. Restrict to fine-grained access actions.',
          severity: 'High',
          remediation: 'Replace "*" with specific actions, e.g., ["s3:GetObject", "s3:PutObject"]',
        });
        score -= 30;
      }

      // 2. Wildcard Resource Check
      if (
        trimmed.includes('"Resource"') &&
        trimmed.includes('"*"') &&
        !trimmed.includes('dynamodb')
      ) {
        violations.push({
          line: lineNum,
          message:
            'Wildcard Resource ("*") exposes all service instances. Restrict to specific ARNs.',
          severity: 'Medium',
          remediation: 'Replace "*" with specific ARNs, e.g., "arn:aws:s3:::my-secure-bucket/*"',
        });
        score -= 20;
      }

      // 3. IAM Full admin check
      if (trimmed.includes('iam:*') || (trimmed.includes('iam:') && trimmed.includes('*'))) {
        violations.push({
          line: lineNum,
          message: 'Administrative IAM permissions detected. Privilege escalation hazard.',
          severity: 'High',
          remediation:
            'Restrict access to specific write/read commands. Never allow full "iam:*" rights.',
        });
        score -= 35;
      }
    });

    score = Math.max(10, score);

    // Simple regex-based auto-remediation logic for mock output
    try {
      const remediatedObj = JSON.parse(policyText);
      if (remediatedObj && Array.isArray(remediatedObj.Statement)) {
        remediatedObj.Statement = remediatedObj.Statement.map((stmt: any) => {
          const newStmt = { ...stmt };
          if (newStmt.Action === '*') {
            newStmt.Action = [
              's3:GetObject',
              's3:PutObject',
              'dynamodb:GetItem',
              'dynamodb:PutItem',
            ];
          }
          if (
            newStmt.Resource === '*' &&
            newStmt.Action &&
            newStmt.Action.includes &&
            newStmt.Action.includes('s3:GetObject')
          ) {
            newStmt.Resource = 'arn:aws:s3:::audittrail-compliance-logs/*';
          }
          return newStmt;
        });
        remediatedPolicyText = JSON.stringify(remediatedObj, null, 2);
      }
    } catch {
      // In case of invalid JSON syntax in the editor, fall back to string replacements
      remediatedPolicyText = policyText
        .replace(/"Action"\s*:\s*"\*"/g, '"Action": ["s3:GetObject", "s3:PutObject"]')
        .replace(
          /"Resource"\s*:\s*"\*"/g,
          '"Resource": "arn:aws:s3:::audittrail-compliance-logs/*"'
        );
    }

    const payload = {
      score,
      violations,
      remediatedPolicy: remediatedPolicyText,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('[ERROR] Linter execution failure:', error);
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
