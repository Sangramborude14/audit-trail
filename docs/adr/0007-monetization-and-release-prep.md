# ADR 0007: Monetization Limits and Release Architecture

- **Status**: Accepted
- **Date**: 2026-06-17
- **Author**: Product Lead & Senior Technical Writer

---

## Context and Problem Statement

As we prepare the AuditTrail B2B Compliance Hub for its final release submission to the H0 Hackathon judges, we must:

1. Define a clear monetization gating mechanism (paywalls) protecting the compliance parsing pipeline.
2. Outline developer API integrations for downstream clients to fetch compliance statuses.
3. Structure installation guides and architectural blueprints in the master documentation repository.

## Decision Drivers

- **Judge Playability**: Judges must be able to easily toggle and preview both standard flows and the upgrade paywall experience.
- **Developer Accessibility**: Clear documentation for REST integration.
- **Production Readiness**: Strong architectural presentation emphasizing data isolation, zero-secrets security, and OIDC auth.

---

## Proposed Decisions

### 1. Pricing & Monetization Model

We implement three subscription tiers for tenants:

- **Free Tier**: Limited to **1** compliance scan per month. Attempts to upload additional files or run more audits will trigger the paywall modal interface.
- **Premium Tier**: Unlimited compliance scans, real-time AI remediation advices, and ISO 27001 / SOC 2 control mappings.
- **Enterprise Tier**: Unlimited scans, dedicated AWS Bedrock throughput, HIPAA & GDPR framework checklists, and programmatic webhook alerts.

To allow judges to test both paths easily, we configure `lib/billing.ts` to identify the tier dynamically:

- Tenant IDs ending in `-free` (e.g. `acme-free`) are resolved as Free Tier with a mock quota limit reached.
- Other tenant IDs default to Premium.

### 2. Paywall UI Trigger (UpgradeModal)

- We design a highly-styled, modern paywall dialog (`UpgradeModal.tsx`) featuring:
  - Zinc/emerald styling matching the dashboard aesthetic.
  - Transparent value proposition (gating unlimited scans, SLA uptime, custom frameworks).
  - Clean client trigger state hooks.

### 3. API Reference Specifications (`docs/api-spec.md`)

We document two key developer endpoints:

- `POST /api/audit/parse`: Edge-parsed authentication, payload validation, Bedrock Claude models, and SSE data stream response structure.
- `GET /api/frameworks/status`: Outline payload definitions to fetch tenant-isolated compliant scores for ingestion by external CI/CD gates or security controls.

### 4. Master README (`README.md`)

We overwrite the root README to serve as the master handbook for judges:

- Include a complete Mermaid.js system architecture diagram.
- Highlight core engineering pillars: zero-secrets OIDC verification, single-table NoSQL performance, edge request interception, and comprehensive mock testing coverage.
- Outline local startup, Vitest test execution, and Playwright E2E command targets.

---

## Consequences

- **Pros**:
  - High-fidelity product presentation showcasing commercial viability.
  - Comprehensive, friction-free testing guide for hackathon reviewers.
  - Zero manual credentials required to spin up the local development loop.
- **Cons**:
  - Quota checks are currently evaluated in-memory/mock state and will require integration with Stripe Billing in the post-hackathon roadmap.
