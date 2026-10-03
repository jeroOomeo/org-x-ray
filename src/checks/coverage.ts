import type { Check, Finding } from '../types.js';
import { isGeneratedClass, isTestClass } from '../apex.js';

const TARGET = 75;

type CoverageRow = {
  ApexClassOrTriggerId: string;
  NumLinesCovered: number;
  NumLinesUncovered: number;
};

// Note: coverage is whatever the last test run left behind.
export const coverageCheck: Check = {
  id: 'apex-coverage',
  title: 'Apex test coverage',
  category: 'Code quality',
  async run({ conn, classes, triggers }) {
    const orgWide = await conn.tooling.query<{ PercentCovered: number }>(
      'SELECT PercentCovered FROM ApexOrgWideCoverage'
    );
    const percent = orgWide.records[0]?.PercentCovered;
    const rows = await conn.tooling.query<CoverageRow>(
      'SELECT ApexClassOrTriggerId, NumLinesCovered, NumLinesUncovered FROM ApexCodeCoverageAggregate'
    );
    const byId = new Map(rows.records.map((row) => [row.ApexClassOrTriggerId, row]));

    const findings: Finding[] = [];
    const code = [
      ...classes.filter((c) => !isTestClass(c.Body)).map((c) => ({ ...c, kind: 'Class' })),
      ...triggers.map((t) => ({ ...t, kind: 'Trigger' })),
    ];
    for (const unit of code) {
      const row = byId.get(unit.Id);
      const total = row ? row.NumLinesCovered + row.NumLinesUncovered : 0;
      const generated = isGeneratedClass(unit.Name);
      const label = `${unit.kind} ${unit.Name}${generated ? ' (Salesforce sample)' : ''}`;
      if (!row || total === 0) {
        findings.push({ item: label, detail: 'No coverage recorded', severity: generated ? 'low' : 'medium' });
        continue;
      }
      const pct = Math.round((row.NumLinesCovered / total) * 100);
      if (pct < TARGET) {
        findings.push({
          item: label,
          detail: `${pct}% covered (${row.NumLinesUncovered} of ${total} lines uncovered)`,
          severity: generated ? 'low' : pct < 50 ? 'high' : 'medium',
        });
      }
    }
    findings.sort((a, b) => a.item.localeCompare(b.item));
    if (percent !== undefined && percent < TARGET) {
      findings.unshift({
        item: 'Org-wide coverage',
        detail: `${percent}% — production deployments need at least ${TARGET}%`,
        severity: 'high',
      });
    }
    return {
      summary:
        percent === undefined
          ? `No org-wide coverage recorded yet (run all tests to measure it). ${findings.length} classes or triggers below ${TARGET}%.`
          : `Org-wide coverage ${percent}%. ${findings.length} item(s) below ${TARGET}%. ` +
            'Coverage is cleared when a class is redeployed, so refresh it first with: sf apex run test --test-level RunLocalTests --wait 30',
      findings,
    };
  },
};
