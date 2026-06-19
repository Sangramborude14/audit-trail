import { describe, it, expect } from 'vitest';

// Simulating CSV mapping logic for unit verification
export function compileCSVReport(
  frameworks: Array<{
    name: string;
    controls: Array<{ id: string; title: string; status: string; severity?: string }>;
  }>
): string {
  const headers = 'Framework,Control ID,Title,Status,Severity\n';
  const rows = frameworks
    .flatMap((fw) =>
      fw.controls.map(
        (c) =>
          `"${fw.name}","${c.id}","${c.title.replace(/"/g, '""')}","${c.status}","${c.severity || 'N/A'}"`
      )
    )
    .join('\n');
  return headers + rows;
}

describe('Dashboard Improvements Logic Tests', () => {
  describe('compileCSVReport', () => {
    it('should format framework controls into clean CSV rows', () => {
      const mockFrameworks = [
        {
          name: 'SOC 2 Type II',
          controls: [
            {
              id: 'CC7.1',
              title: 'Vulnerability Management System',
              status: 'FAILED',
              severity: 'High',
            },
            {
              id: 'CC6.1',
              title: 'Logical Access Controls',
              status: 'PASSED',
            },
          ],
        },
      ];

      const csv = compileCSVReport(mockFrameworks);
      const lines = csv.split('\n');

      expect(lines[0]).toBe('Framework,Control ID,Title,Status,Severity');
      expect(lines[1]).toBe(
        '"SOC 2 Type II","CC7.1","Vulnerability Management System","FAILED","High"'
      );
      expect(lines[2]).toBe('"SOC 2 Type II","CC6.1","Logical Access Controls","PASSED","N/A"');
    });

    it('should properly escape double quotes inside titles', () => {
      const mockFrameworks = [
        {
          name: 'ISO 27001',
          controls: [
            {
              id: 'A.8.12',
              title: 'Data leakage prevention using "DLP" systems',
              status: 'PASSED',
            },
          ],
        },
      ];

      const csv = compileCSVReport(mockFrameworks);
      expect(csv).toContain('"Data leakage prevention using ""DLP"" systems"');
    });
  });
});
