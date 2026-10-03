import type { Check, Finding } from '../types.js';
import { isTestClass, lineOf, stripComments } from '../apex.js';

// users, profiles, record types, queues, etc.
const PREFIXES = ['001', '003', '005', '006', '00D', '00G', '00Q', '00e', '012', '01I', '0PS', '500', '701', '00T', '00U'];
const ID_IN_STRING = new RegExp(`'((?:${PREFIXES.join('|')})[a-zA-Z0-9]{12}(?:[a-zA-Z0-9]{3})?)'`, 'g');
const ORG_URL_IN_STRING = /'(https?:\/\/[a-z0-9.-]+\.(?:my\.)?(?:salesforce|force|site|visualforce)\.com[^']*)'/gi;

export const hardcodedCheck: Check = {
  id: 'hardcoded-ids-urls',
  title: 'Hardcoded IDs and URLs',
  category: 'Code quality',
  async run({ classes, triggers }) {
    const findings: Finding[] = [];
    for (const unit of [...classes, ...triggers]) {
      if (!('TableEnumOrId' in unit) && isTestClass(unit.Body)) {
        continue; // tests use fake ids all the time
      }
      const body = stripComments(unit.Body);
      for (const match of body.matchAll(ID_IN_STRING)) {
        if (/x{3}/i.test(match[1])) {
          continue; // placeholder in the SF sample classes, e.g. '001x000xxx35tPN'
        }
        findings.push({
          item: unit.Name,
          detail: `Line ${lineOf(body, match.index ?? 0)}: record ID '${match[1]}'`,
          severity: 'high',
        });
      }
      for (const match of body.matchAll(ORG_URL_IN_STRING)) {
        findings.push({
          item: unit.Name,
          detail: `Line ${lineOf(body, match.index ?? 0)}: org URL '${match[1]}'`,
          severity: 'medium',
        });
      }
    }
    return {
      summary: `${findings.length} hardcoded record ID(s) or org URL(s) found in non-test Apex. Use Custom Metadata, Named Credentials or queries instead.`,
      findings,
    };
  },
};
