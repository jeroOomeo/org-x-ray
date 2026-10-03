import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Flags, SfCommand } from '@salesforce/sf-plugins-core';
import type { ScanResult, Severity } from '../../types.js';
import { scan } from '../../scanner.js';
import { renderHtml } from '../../report/html.js';

export default class Scan extends SfCommand<ScanResult> {
  public static readonly summary = 'Audit an org for tech debt, security risks and limits, and write an HTML health report.';
  public static readonly description =
    'Read-only: queries Apex, permission and limit metadata and changes nothing in the org. ' +
    'Checks Apex coverage, old API versions, hardcoded IDs and URLs, trigger design, high-power access and org limits.';
  public static readonly examples = [
    '<%= config.bin %> <%= command.id %> --target-org myOrg',
    '<%= config.bin %> <%= command.id %> --target-org myOrg --output-dir reports --json',
  ];

  public static readonly flags = {
    'target-org': Flags.requiredOrg(),
    'api-version': Flags.orgApiVersion(),
    'output-dir': Flags.directory({
      char: 'd',
      summary: 'Folder for the HTML report.',
      default: 'reports',
    }),
    'no-report': Flags.boolean({ summary: 'Skip writing the HTML report.' }),
  };

  public async run(): Promise<ScanResult> {
    const { flags } = await this.parse(Scan);
    const org = flags['target-org'];
    const conn = org.getConnection(flags['api-version']);
    const username = org.getUsername() ?? 'unknown';

    this.spinner.start(`Scanning ${username}`);
    const result = await scan(conn, username);
    this.spinner.stop(`score ${result.score}/100`);

    if (!flags['no-report']) {
      const dir = resolve(flags['output-dir']);
      await mkdir(dir, { recursive: true });
      const file = join(dir, `org-xray-${username.replace(/[^a-z0-9.@_-]/gi, '_')}-${result.scannedAt.slice(0, 10)}.html`);
      await writeFile(file, renderHtml(result), 'utf8');
      result.reportPath = file;
    }

    const icon: Record<Severity, string> = { high: '✖', medium: '▲', low: '•', info: '·' };
    this.log('');
    for (const check of result.checks) {
      const worst = (['high', 'medium', 'low'] as Severity[]).find((s) => check.findings.some((f) => f.severity === s));
      this.log(`${check.error ? '!' : worst ? icon[worst] : '✔'} ${check.title}: ${check.error ? check.error : check.summary}`);
    }
    this.log('');
    this.log(`Health score ${result.score}/100 · ${result.counts.high} high · ${result.counts.medium} medium · ${result.counts.low} low`);
    if (result.reportPath) {
      this.log(`Report: ${result.reportPath}`);
    }
    return result;
  }
}
