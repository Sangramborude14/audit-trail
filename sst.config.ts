/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: 'audittrail',
      removal: input.stage === 'production' ? 'retain' : 'remove',
      home: 'aws',
    };
  },
  async run() {
    // 1. Private S3 Bucket for policy documents
    const bucket = new sst.aws.Bucket('PolicyDocuments', {
      // By default, SST Ion buckets are private (BPA enabled, encrypted).
    });

    // 2. DynamoDB Table for single-table AuditTrail storage
    const table = new sst.aws.Dynamo('AuditTrailTable', {
      fields: {
        pk: 'string',
        sk: 'string',
      },
      primaryIndex: { hashKey: 'pk', rangeKey: 'sk' },
    });

    // 3. AWS OIDC Provider for Vercel integration
    // Vercel's OIDC issuer is https://oidc.vercel.com
    const vercelOIDCProvider = new aws.iam.OpenIdConnectProvider('VercelOIDCProvider', {
      url: 'https://oidc.vercel.com',
      clientIdLists: ['https://oidc.vercel.com'],
      // Standard SSL thumbprint for Vercel's OIDC certificate issuer
      thumbprintLists: ['6938fd4d98bab03faadb97b34396831e3780aea1'],
    });

    // 4. AWS IAM Role with OIDC trust policy for Vercel OpenID Connect
    const vercelRole = new aws.iam.Role('VercelDeploymentRole', {
      name: 'audittrail-vercel-oidc-role',
      description:
        'Allows Vercel CI/CD deployments and runtime functions to securely access AWS resources',
      assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Federated: vercelOIDCProvider.arn,
            },
            Action: 'sts:AssumeRoleWithWebIdentity',
            Condition: {
              StringEquals: {
                'oidc.vercel.com:aud': 'https://oidc.vercel.com',
              },
              StringLike: {
                // Constraints matching Vercel's workspace name 'audittrail-workspace'
                // and project name 'audittrail-app' across any deployment environments.
                'oidc.vercel.com:sub':
                  'owner:audittrail-workspace:project:audittrail-app:environment:*',
              },
            },
          },
        ],
      }),
    });

    // 5. Fine-grained IAM Policy for the Vercel Role
    new aws.iam.RolePolicy('VercelAccessPolicy', {
      name: 'audittrail-vercel-access-policy',
      role: vercelRole.name,
      policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          // S3 Access: Restricted read access to policy document bucket
          {
            Effect: 'Allow',
            Action: ['s3:GetObject', 's3:ListBucket'],
            Resource: [bucket.arn, `${bucket.arn}/*`],
          },
          // DynamoDB Access: Full Read/Write access to AuditTrail table
          {
            Effect: 'Allow',
            Action: [
              'dynamodb:GetItem',
              'dynamodb:PutItem',
              'dynamodb:UpdateItem',
              'dynamodb:DeleteItem',
              'dynamodb:Query',
              'dynamodb:Scan',
              'dynamodb:BatchGetItem',
              'dynamodb:BatchWriteItem',
            ],
            Resource: [table.arn, `${table.arn}/index/*`],
          },
          // Amazon Bedrock Access: Execute and stream Claude foundation models
          {
            Effect: 'Allow',
            Action: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
            Resource: ['arn:aws:bedrock:*:*:foundation-model/anthropic.claude-*'],
          },
        ],
      }),
    });

    return {
      bucketName: bucket.name,
      bucketArn: bucket.arn,
      tableName: table.name,
      tableArn: table.arn,
      roleArn: vercelRole.arn,
    };
  },
});
