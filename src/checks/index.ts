import type { Check } from '../types.js';
import { coverageCheck } from './coverage.js';
import { apiVersionCheck } from './apiVersions.js';
import { hardcodedCheck } from './hardcoded.js';
import { permissionsCheck } from './permissions.js';
import { triggerCheck } from './triggers.js';
import { limitsCheck } from './limits.js';

export const CHECKS: Check[] = [
  coverageCheck,
  apiVersionCheck,
  hardcodedCheck,
  triggerCheck,
  permissionsCheck,
  limitsCheck,
];
