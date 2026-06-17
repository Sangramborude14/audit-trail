# AuditTrail Developer API Reference

Welcome to the **AuditTrail B2B Compliance Hub API Reference**. This documentation outlines the endpoints, authentication mechanisms, schema formats, and streaming output protocols designed for downstream integrations, custom CI/CD build gates, and automated security reporting pipelines.

---

## Authentication and Global Headers

All API requests to the AuditTrail platform must verify the tenant context and authorize the request using secure headers.

| Header Name     | Type   | Required | Description                                                                      |
| :-------------- | :----- | :------- | :------------------------------------------------------------------------------- |
| `x-tenant-id`   | String | **Yes**  | The unique identifier of the tenant context (e.g., `acme-corp`, `netflix-free`). |
| `Authorization` | String | **Yes**  | Bearer token format (`Bearer <JWT>`) for authenticating the client session.      |

> [!WARNING]
> Requests missing a validated `x-tenant-id` header or using `UNKNOWN` will be rejected with a `401 Unauthorized` response.

---

## Endpoint Specifications

### 1. AI Compliance Policy Parser

`POST /api/audit/parse`

Submits raw cloud configurations, IAM policies, or S3-stored policy documents to the AI Compliance Engine. It performs real-time gap analysis and streams the remediation report.

#### Request Body

The request payload must be a JSON object containing either a reference to an S3 object (`documentPath`) or a raw JSON/YAML configuration (`configJson`).

```json
{
  "documentPath": "string (optional)",
  "configJson": "object | string (optional)"
}
```

- **`documentPath`**: The absolute object key of a document stored within the tenant's secure compliance bucket.
- **`configJson`**: A direct configuration block (e.g. Terraform HCL representation, AWS security group config, or JSON-formatted policy).

> [!IMPORTANT]
> Either `documentPath` or `configJson` must be provided. If both are omitted, a `400 Bad Request` will be returned.

#### Response Format

This endpoint utilizes a streamed Server-Sent Events (SSE) protocol using the Vercel AI SDK text stream representation. The response content type is `text/plain; charset=utf-8` (or `text/event-stream`).

#### Sample Request

```bash
curl -X POST https://api.audittrail.com/api/audit/parse \
  -H "Content-Type: application/json" \
  -H "x-tenant-id: acme-corp" \
  -H "Authorization: Bearer eyJhbGciOi..." \
  -d '{
    "configJson": {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": "*",
          "Resource": "*"
        }
      ]
    }
  }'
```

#### Sample Streamed Response

The response streams text chunks using the Vercel AI SDK format (prefixed with `0:` for text chunks).

````text
0:"[INFO] Sending payload to AI Compliance Parser API Route...\n"
0:"[INFO] Connecting to Bedrock Claude 3.5 Sonnet...\n"
0:"[INFO] Connection established. Starting audit pipeline...\n"
0:"### AUDIT REPORT: IAM Policy Wildcard Check\n\n"
0:"- **Control ID**: CC6.1 (Logical Access Controls) / A.5.15 (Access Control Policy)\n"
0:"- **Vulnerability Gap**: Wildcard Administrator Permission allowed (`Action: *` with `Resource: *`). This violates the principle of least privilege.\n"
0:"- **Severity**: High\n"
0:"- **Remediation**:\n"
0:"  ```json\n"
0:"  {\n"
0:"    \"Effect\": \"Allow\",\n"
0:"    \"Action\": [\n"
0:"      \"s3:GetObject\",\n"
0:"      \"s3:PutObject\"\n"
0:"    ],\n"
0:"    \"Resource\": \"arn:aws:s3:::audittrail-policy-bucket/*\"\n"
0:"  }\n"
0:"  ```\n"
0:"[INFO] Audit pipeline run completed. Overall score: 72%. Status: FAILED.\n"
````

#### Status Codes

- **`200 OK`**: Connection initialized. Streaming body chunk response started.
- **`400 Bad Request`**: Both `documentPath` and `configJson` are missing.
- **`401 Unauthorized`**: Missing or invalid tenant credentials.
- **`500 Internal Server Error`**: Catastrophic bedrock runtime exception or credentials failure.

---

### 2. Programmatic Framework Status

`GET /api/frameworks/status`

Enables developers to programmatically fetch the current posture score, checklist compliance, and failing controls list for custom CI/CD pipelines (e.g. blocking deployments if compliance falls below a threshold).

#### Query Parameters

| Parameter     | Type   | Required | Description                                                                                                                    |
| :------------ | :----- | :------- | :----------------------------------------------------------------------------------------------------------------------------- |
| `frameworkId` | String | **No**   | Filters results to a specific framework (`SOC2`, `ISO27001`, `HIPAA`). If omitted, returns statuses for all active frameworks. |

#### Sample Request

```bash
curl -X GET "https://api.audittrail.com/api/frameworks/status?frameworkId=SOC2" \
  -H "x-tenant-id: acme-corp" \
  -H "Authorization: Bearer eyJhbGciOi..."
```

#### Response Payload Schema (`200 OK`)

```json
{
  "tenantId": "acme-corp",
  "frameworkId": "SOC2",
  "status": "NON_COMPLIANT",
  "overallScore": 72,
  "passedControlsCount": 9,
  "totalControlsCount": 12,
  "lastAuditedAt": "2026-06-17T17:34:53Z",
  "controls": [
    {
      "id": "CC6.1",
      "title": "Logical Access Controls",
      "status": "PASSED"
    },
    {
      "id": "CC7.1",
      "title": "Vulnerability Management System",
      "status": "FAILED",
      "severity": "High",
      "gapDescription": "Unencrypted EBS volume configuration identified during the active config scanning.",
      "remediation": "aws ec2 modify-volume-attribute --volume-id <vol-id> --encrypted"
    }
  ]
}
```

#### Status Codes

- **`200 OK`**: Framework details returned successfully.
- **`401 Unauthorized`**: Tenant context header absent or auth token validation failed.
- **`404 Not Found`**: Request for a framework ID that is not configured or recognized.
