#!/usr/bin/env node
// run without linking into sf:
//   node bin/run.js xray scan --target-org myOrg
import { execute } from '@oclif/core';

await execute({ dir: import.meta.url });
