import { test, expect } from '@playwright/test';

test.describe('AuditTrail Dashboard E2E Tests', () => {
  test('should handle file upload, render AI audit stream, and update compliance scores dynamically', async ({
    page,
  }) => {
    // 1. Navigate to the dashboard under a simulated tenant subdomain on localhost
    // We append tenantId as query param to trigger the local routing fallback in Edge middleware
    await page.goto('http://localhost:3000/company-a/dashboard?tenantId=company-a');

    // Verify initial dashboard states
    const initialHeader = page.locator('h1');
    await expect(initialHeader).toContainText('COMPANY-A Compliance Dashboard');

    const healthIndicator = page.locator('#health-score-indicator');
    await expect(healthIndicator).toHaveText('86%');

    const statusBadge = page.locator('#compliance-status-badge');
    await expect(statusBadge).toContainText('COMPLIANT');

    // 2. Mock and Intercept the compliance parsing API route stream response
    await page.route('**/api/audit/parse', async (route) => {
      const responseHeaders = {
        'Content-Type': 'text/plain; charset=utf-8',
        'x-tenant-id': 'company-a',
      };

      // Fulfill request with custom streaming body simulating AI parser responses
      await route.fulfill({
        status: 200,
        headers: responseHeaders,
        body:
          '0:"[INFO] Security group analysis initiated.\\n"\n' +
          '0:"[INFO] Scanning ingress rules for security group: sg-12345\\n"\n' +
          '0:"[WARN] Ingress rule A.8.15 Violation: Open SSH port 22 allows world ingress (0.0.0.0/0).\\n"\n' +
          '0:"[REMEDIATION] Run: aws ec2 revoke-security-group-ingress --group-id sg-12345 --protocol tcp --port 22 --cidr 0.0.0.0/0\\n"\n' +
          '0:"[INFO] Parsing complete. 1 warning found.\\n"\n',
      });
    });

    // 3. Select and trigger file upload via the hidden input element
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Locate and click the upload label which targets the file input
    await page.locator('text=Upload Security Configuration').click();
    const fileChooser = await fileChooserPromise;

    // Set a mock JSON file to initiate the upload and audit pipeline
    await fileChooser.setFiles({
      name: 'security-group-policy.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          SecurityGroups: [
            {
              GroupId: 'sg-12345',
              IpPermissions: [
                {
                  FromPort: 22,
                  ToPort: 22,
                  IpProtocol: 'tcp',
                  IpRanges: [{ CidrIp: '0.0.0.0/0' }],
                },
              ],
            },
          ],
        })
      ),
    });

    // 4. Assert that the "Audit Playback Terminal" displays mock stream logs
    // Wait for the scanning triggers to complete and print logs on the terminal viewport
    await expect(page.locator('text=Security group analysis initiated.')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=Open SSH port 22 allows world ingress')).toBeVisible();
    await expect(page.locator('text=aws ec2 revoke-security-group-ingress')).toBeVisible();
    await expect(page.locator('text=Parsing complete. 1 warning found.')).toBeVisible();

    // 5. Assert that the overall compliance score and pass/fail badges update dynamically
    // The logs contain "warn/violation", so the dashboard updates to 72% health (NON-COMPLIANT)
    await expect(healthIndicator).toHaveText('72%', { timeout: 5000 });
    await expect(statusBadge).toContainText('NON-COMPLIANT');
  });
});
