# AuditTrail: Secure Multi-Tenant B2B Compliance Hub

AuditTrail is a highly secure, production-grade B2B Compliance Hub built using Next.js (App Router), Tailwind CSS, and AWS serverless services. The platform enables multi-tenant enterprise architectures to parse and audit cloud infrastructure settings, IAM policies, and system compliance standards against industry frameworks (e.g. SOC 2 Type II, ISO 27001:2022, and HIPAA Security Rule) with real-time AI-assisted remediation suggestions.

---

## 🏗️ System Architecture

AuditTrail leverages a serverless cloud infrastructure built for high performance, zero-secrets security, and cost efficiency. Below is the master architecture mapping the data flow:

```mermaid
graph TD
    %% Define Nodes
    Client["🌐 Client Browser (Subdomain Routing)"]
    EdgeMiddleware["🛡️ Next.js Edge Middleware"]
    NextJSApp["⚡ Next.js App Router (Vercel)"]
    OIDC["🔑 Vercel-AWS OIDC Trust"]
    S3Bucket["🗄️ Amazon S3 Policy Store"]
    Bedrock["🤖 AWS Bedrock (Claude 3.5 Sonnet)"]
    DynamoDB["💾 Amazon DynamoDB (Single-Table NoSQL)"]
    AWSLambda["⚙️ AWS Lambda (CDK/SST Executants)"]

    %% Define Flows
    Client -->|1. Request Subdomain: company-free.audittrail.com| EdgeMiddleware
    EdgeMiddleware -->|2. Resolve Tenant ID & Inject Header x-tenant-id| NextJSApp
    NextJSApp -->|3. Query Usage Quota & Fetch Frameworks| DynamoDB
    NextJSApp -->|4. Authenticate Session via Webhook/Tokens| OIDC
    OIDC -->|5. Grant Short-Lived IAM Role Credentials| NextJSApp
    NextJSApp -->|6. Fetch Config File (if documentPath provided)| S3Bucket
    NextJSApp -->|7. Stream Document to compliance parser| Bedrock
    Bedrock -->|8. Real-time token SSE response streaming| NextJSApp
    NextJSApp -->|9. Render Compliance Terminal & Save Status| DynamoDB
    AWSLambda -.->|IaC Deployment & CRON Status Ingestion| DynamoDB
```

---

## 🛠️ The Engineering Highlights

AuditTrail is built with strict B2B SaaS security and reliability constraints. It is ready for production environments today, based on three main pillars:

### 1. Zero-Secrets AWS OIDC Security

Rather than using static, long-lived AWS IAM access keys stored in environment variables (which risk leakages), AuditTrail utilizes **OpenID Connect (OIDC)** federated trust.

- During deployment, Vercel/SST exchanges a short-lived JSON Web Token (JWT) with AWS STS.
- AWS verifies the token provider and issues a temporary IAM session role.
- If a serverless environment or developer key is compromised, there are zero static secrets to revoke.

### 2. Single-Table DynamoDB Strategy

To ensure sub-millisecond querying performance and absolute tenant data isolation, we utilize a single DynamoDB table mapping complex composite keys:

- **Tenant Metadata / Settings**: Partition Key `PK = TENANT#<tenant_id>`, Sort Key `SK = METADATA`
- **Framework Status (SOC 2, ISO 27001)**: Partition Key `PK = TENANT#<tenant_id>`, Sort Key `SK = FRAMEWORK#<framework_id>`
- **Control Checkpoint**: Partition Key `PK = TENANT#<tenant_id>#FRAMEWORK#<framework_id>`, Sort Key `SK = CONTROL#<control_id>`

> [!IMPORTANT]
> **Tenant Isolation Assertion**:
> Database queries are strictly gated inside `lib/db.ts` to prepend and match the active requester's `x-tenant-id` header. Cross-tenant leakage is mathematically impossible at the database access layer.

### 3. Edge Subdomain Request Routing

Incoming requests to `*.audittrail.com` are parsed on Vercel's global edge network before hitting the main application routing servers:

- Subdomain strings (e.g. `acme.audittrail.com`) are resolved to tenant IDs.
- Invalid subdomains or sessions without authenticated tenant contexts are safely redirected to the root `/login` portal.
- Resolves tenant headers downstream to enforce fine-grained access limits.

---

## 📂 Repository Layout

```
audittrail/
├── docs/
│   ├── adr/                      # Architectural Decision Records (ADRs 0001 - 0007)
│   └── api-spec.md               # Programmatic developer endpoint reference
├── frontend/
│   ├── src/
│   │   ├── app/                  # Next.js App Router (Dashboard & API routes)
│   │   ├── components/           # Reusable UI (UpgradeModal, AuditTerminal)
│   │   ├── lib/                  # Core helpers (db wrapper, structured logger, billing)
│   │   └── tests/                # Vitest unit & integration test suites
│   ├── tests/e2e/                # Playwright E2E end-to-end user path tests
│   ├── package.json
│   └── tsconfig.json
├── package.json                  # Root npm workspace configuration
├── sst.config.ts                 # SST IaC deployment configuration
└── tsconfig.json                 # Root TypeScript compilation preferences
```

---

## ⚙️ Installation & Deployment

### 1. Local Setup

Ensure you have Node.js 18+ and npm installed. From the repository root, install workspace dependencies:

```bash
# Install all node modules across frontend and root workspace
npm install
```

To configure environment variables for Bedrock connection and DynamoDB client wrapper, create `frontend/.env.local`:

```env
AWS_REGION=us-east-1
S3_BUCKET_NAME=audittrail-policy-bucket
DYNAMODB_TABLE_NAME=AuditTrailTable
```

### 2. Local Development Server

Run the Next.js app on your localhost port `3000`:

```bash
# Starts Next.js Dev Server in the frontend workspace
npm run dev --workspace=frontend
```

#### Demo Tenant Routing Simulation

Since local dev runs on `localhost:3000` (which lacks DNS subdomains), you can trigger different tenant environments using path routing:

- **Premium Tenant (Unlimited Scans)**: http://localhost:3000/acme-corp/dashboard
- **Free Tenant (Quota Trigger)**: http://localhost:3000/acme-free/dashboard
  - _Triggering the paywall_: Attempting to upload a security JSON file in the `/acme-free/dashboard` terminal will immediately display the premium upgrade modal.

---

## 🌟 Interactive Hackathon Features

We have built specific, highly interactive features for hackathon judges to verify the core value and security logic of the platform directly in the browser:

### 1. Zero-Secrets OIDC Trust Sandbox

Accessible via the **OIDC Identity Sandbox** tab:

- Demonstrates the federated token exchange flow in a visual step-by-step UI.
- Simulates requesting temporary access tokens from AWS STS.
- Displays the decrypted Vercel OIDC JWT claim payload and the AWS IAM Role Trust Policy.
- Renders the retrieved short-lived Access Key, Secret Key, and Session Token alongside a dynamic 15-minute countdown clock showing key expiration.

### 2. AI-Powered Cloud Drift Detector

Accessible via the **AI Drift Detector** tab:

- Compares declared compliance target baselines against drifted active AWS configurations (e.g., S3 bucket encryption, open SSH ports on security groups, or wildcard IAM policies).
- Computes difference diffs and details the detected gaps in red/green code formatting.
- Generates copy-pasteable CLI commands to instantly correct the drift and return the system to compliance.

### 3. 'Fix with AI' Auto-Remediation Drawer

On the main **Overview Dashboard** framework checklists:

- Clicking "Fix with AI" next to any failing control card triggers a sliding code drawer showing a side-by-side patch diff.
- Allows developers to inspect the before/after Terraform code and copy the corrected baseline code to their clipboard.

### 4. Executive CSV & PDF Reports

In the dashboard header:

- **Export as CSV Log**: Generates and downloads a CSV spreadsheet listing all framework controls, descriptions, severities, and compliance states.
- **Export as PDF Report**: Triggers `window.print()` using specific print styles that hide terminal terminals, menus, and selector tabs to output a clean, physical audit report.

---

## 🧪 Verification & Testing

Our testing suites enforce type-safety, formatting, security patterns, and user journey paths.

### 1. Code Quality checks

```bash
# Run ESLint validation rules
npm run lint

# Run Prettier style validation
npm run format

# Run TypeScript compilation checks
npm run typecheck
```

### 2. Unit and Integration Tests (Vitest)

Runs tests verifying Bedrock compliance parsing streams, single-table DB isolation queries, structured logger tracing, and billing quota triggers:

```bash
# Execute unit tests across workspaces
npm test
```

### 3. End-to-End Tests (Playwright)

Validates UI rendering, chart responsiveness, interactive framework checklist tabs, and the terminal upload interface:

```bash
# Install Playwright browser dependencies (first-time setup)
npx playwright install --with-deps

# Run Playwright test suite
npx playwright test --config=frontend/playwright.config.ts
```

---

## 🚀 Cloud Deployment (SST / Vercel)

AuditTrail is deployed using SST (Serverless Stack) for AWS infrastructure and Vercel for the edge router dashboard:

```bash
# Preview SST deployment configuration
npx sst diff

# Deploy infrastructure components (S3, DynamoDB, Bedrock IAM configuration) to AWS
npx sst deploy --stage prod
```
