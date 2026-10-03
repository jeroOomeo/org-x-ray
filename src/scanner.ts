import type { Connection } from '@salesforce/core';
import type { ApexSource, ApexTriggerSource, CheckResult, ScanContext, ScanResult, Severity } from './types.js';
import { CHECKS } from './checks/index.js';

const WEIGHT: Record<Severity, number> = { high: 8, medium: 3, low: 1, info: 0 };
// cap per check so one noisy area doesn't sink the whole score
const MAX_PENALTY_PER_CHECK = 25;

async function loadContext(conn: Connection): Promise<ScanContext> {
  const [classes, triggers, latest] = await Promise.all([
    conn.query<ApexSource>(
      'SELECT Id, Name, ApiVersion, Body, LengthWithoutComments FROM ApexClass WHERE NamespacePrefix = null',
      { autoFetch: true, maxFetch: 10000 }
    ),
    conn.query<ApexTriggerSource>(
      'SELECT Id, Name, ApiVersion, Body, TableEnumOrId, Status FROM ApexTrigger WHERE NamespacePrefix = null',
      { autoFetch: true, maxFetch: 10000 }
    ),
    conn.retrieveMaxApiVersion(),
  ]);
  return {
    conn,
    latestApiVersion: Number(latest),
    classes: classes.records.filter((c) => c.Body && c.Body !== '(hidden)'),
    triggers: triggers.records.filter((t) => t.Body && t.Body !== '(hidden)'),
  };
}

export function scoreOf(checks: CheckResult[]): number {
  const penalty = checks.reduce((sum, check) => {
    const points = check.findings.reduce((s, f) => s + WEIGHT[f.severity], 0);
    return sum + Math.min(points, MAX_PENALTY_PER_CHECK);
  }, 0);
  return Math.max(0, 100 - penalty);
}

export async function scan(conn: Connection, username: string): Promise<ScanResult> {
  const context = await loadContext(conn);
  const checks: CheckResult[] = [];
  for (const check of CHECKS) {
    const base = { id: check.id, title: check.title, category: check.category };
    try {
      checks.push({ ...base, ...(await check.run(context)) });
    } catch (error) {
      // e.g. missing permission or feature not enabled - report it and keep going
      checks.push({ ...base, summary: 'Could not run this check.', findings: [], error: (error as Error).message });
    }
  }
  const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0, info: 0 };
  checks.forEach((c) => c.findings.forEach((f) => (counts[f.severity] += 1)));
  return {
    org: { username, instanceUrl: conn.instanceUrl, orgId: conn.getAuthInfoFields().orgId ?? '' },
    scannedAt: new Date().toISOString(),
    score: scoreOf(checks),
    counts,
    checks,
  };
}
