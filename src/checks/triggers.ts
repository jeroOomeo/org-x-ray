import type { Check, Finding } from '../types.js';
import { stripComments, stripStrings } from '../apex.js';

// rough signs that the logic lives in the trigger instead of a handler
const LOGIC = /\b(for\s*\(|if\s*\(|\[\s*select\b|insert\s|update\s|delete\s|upsert\s)/i;

export const triggerCheck: Check = {
  id: 'trigger-design',
  title: 'Trigger design',
  category: 'Automation',
  async run({ triggers }) {
    const findings: Finding[] = [];
    const active = triggers.filter((t) => t.Status === 'Active');
    const byObject = new Map<string, string[]>();
    active.forEach((t) => byObject.set(t.TableEnumOrId, [...(byObject.get(t.TableEnumOrId) ?? []), t.Name]));
    for (const [object, names] of byObject) {
      if (names.length > 1) {
        findings.push({
          item: object,
          detail: `${names.length} active triggers (${names.join(', ')}); their order is not guaranteed`,
          severity: 'high',
        });
      }
    }
    for (const trigger of active) {
      const code = stripStrings(stripComments(trigger.Body));
      const inner = code.slice(code.indexOf('{') + 1);
      if (LOGIC.test(inner)) {
        findings.push({
          item: trigger.Name,
          detail: 'Contains logic (loops, conditions, SOQL or DML); move it into a handler class',
          severity: 'medium',
        });
      }
    }
    return {
      summary: `${active.length} active trigger(s) on ${byObject.size} object(s); ${findings.length} design issue(s).`,
      findings,
    };
  },
};
