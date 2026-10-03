import type { Connection } from '@salesforce/core';

export type Severity = 'high' | 'medium' | 'low' | 'info';

export type Finding = {
  item: string;
  detail: string;
  severity: Severity;
};

export type CheckResult = {
  id: string;
  title: string;
  category: 'Code quality' | 'Security' | 'Automation' | 'Limits';
  summary: string;
  findings: Finding[];
  // set when the check couldn't run
  error?: string;
};

export type ApexSource = {
  Id: string;
  Name: string;
  ApiVersion: number;
  Body: string;
  LengthWithoutComments?: number;
};

export type ApexTriggerSource = ApexSource & { TableEnumOrId: string; Status: string };

// loaded once per scan and shared by all checks
export type ScanContext = {
  conn: Connection;
  latestApiVersion: number;
  classes: ApexSource[];
  triggers: ApexTriggerSource[];
};

export type Check = {
  id: string;
  title: string;
  category: CheckResult['category'];
  run: (context: ScanContext) => Promise<Omit<CheckResult, 'id' | 'title' | 'category'>>;
};

export type ScanResult = {
  org: { username: string; instanceUrl: string; orgId: string };
  scannedAt: string;
  score: number;
  counts: Record<Severity, number>;
  checks: CheckResult[];
  reportPath?: string;
};
