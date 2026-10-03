import type { Check, Finding } from '../types.js';

type Limit = { Max: number; Remaining: number };

const WATCHED: Array<[string, string]> = [
  ['DataStorageMB', 'Data storage (MB)'],
  ['FileStorageMB', 'File storage (MB)'],
  ['DailyApiRequests', 'API requests (24h)'],
  ['DailyAsyncApexExecutions', 'Async Apex executions (24h)'],
  ['DailyWorkflowEmails', 'Workflow emails (24h)'],
];

export const limitsCheck: Check = {
  id: 'org-limits',
  title: 'Storage and API limits',
  category: 'Limits',
  async run({ conn }) {
    const limits = await conn.request<Record<string, Limit>>(`/services/data/v${conn.getApiVersion()}/limits`);
    const findings: Finding[] = [];
    for (const [key, label] of WATCHED) {
      const limit = limits[key];
      if (!limit || !limit.Max) {
        continue;
      }
      const used = limit.Max - limit.Remaining;
      const pct = Math.round((used / limit.Max) * 100);
      findings.push({
        item: label,
        detail: `${used.toLocaleString()} of ${limit.Max.toLocaleString()} used (${pct}%)`,
        severity: pct >= 90 ? 'high' : pct >= 75 ? 'medium' : 'info',
      });
    }
    const pressing = findings.filter((f) => f.severity !== 'info').length;
    return {
      summary: pressing ? `${pressing} limit(s) at 75% or more.` : 'All watched limits are below 75%.',
      findings,
    };
  },
};
