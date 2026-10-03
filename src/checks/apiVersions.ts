import type { Check, Finding } from '../types.js';

// ~3 years, 3 releases a year
const MAX_AGE = 9;

export const apiVersionCheck: Check = {
  id: 'old-api-versions',
  title: 'Old API versions',
  category: 'Code quality',
  async run({ latestApiVersion, classes, triggers }) {
    const cutoff = latestApiVersion - MAX_AGE;
    const findings: Finding[] = [...classes.map((c) => ({ ...c, kind: 'Class' })), ...triggers.map((t) => ({ ...t, kind: 'Trigger' }))]
      .filter((unit) => unit.ApiVersion < cutoff)
      .sort((a, b) => a.ApiVersion - b.ApiVersion)
      .map((unit) => ({
        item: `${unit.kind} ${unit.Name}`,
        detail: `API ${unit.ApiVersion.toFixed(1)} (latest ${latestApiVersion.toFixed(1)})`,
        severity: unit.ApiVersion < cutoff - MAX_AGE ? 'medium' : 'low',
      }));
    return {
      summary: `${findings.length} Apex class(es) or trigger(s) older than API ${cutoff.toFixed(1)} (about three years behind).`,
      findings,
    };
  },
};
