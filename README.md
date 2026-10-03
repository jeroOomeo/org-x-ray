# org-xray

A Salesforce CLI plugin that audits an org and writes a one-page HTML health report: Apex coverage, old API versions, hardcoded IDs and URLs, trigger design, high-power access and org limits, with a 0–100 health score.

It is **read-only**: it queries metadata and limits and changes nothing in the org.

```text
$ sf xray scan --target-org myOrg

✖ Apex test coverage: Org-wide coverage 84%. 2 item(s) below 75%.
✔ Old API versions: 0 Apex class(es) or trigger(s) older than API 58.0.
▲ Hardcoded IDs and URLs: 1 hardcoded record ID(s) or org URL(s) found in non-test Apex.
✔ Trigger design: 0 active trigger(s) on 0 object(s); 0 design issue(s).
▲ High-power access: 3 profile(s) or permission set(s) grant org-wide data access.
✔ Storage and API limits: All watched limits are below 75%.

Health score 83/100 · 1 high · 3 medium · 0 low
Report: reports/org-xray-me@example.com-2026-10-04.html
```

## Checks

| Check | Looks for | Severity |
|---|---|---|
| Apex test coverage | Org-wide coverage below 75%; classes and triggers below 75% or with no coverage | High below 50%, otherwise medium. Salesforce-generated site classes are low. |
| Old API versions | Apex classes and triggers about three years (9 releases) behind the latest API | Low, or medium past six years |
| Hardcoded IDs and URLs | Record IDs (users, profiles, record types, queues…) and org URLs in string literals of non-test Apex | IDs high, URLs medium |
| Trigger design | Objects with more than one active trigger; loops, conditions, SOQL or DML written in a trigger body | High / medium |
| High-power access | Profiles and permission sets with Modify All Data or View All Data, with active users holding them | Medium, high for Modify All Data held by more than 3 users |
| Storage and API limits | Data and file storage, daily API requests, async Apex and workflow emails | Medium at 75%, high at 90% |

Managed-package code is skipped. Comments and test classes are ignored where they would cause false positives.

**Coverage tip:** Salesforce clears a class's coverage when it is redeployed. Refresh it before scanning:

```bash
sf apex run test --test-level RunLocalTests --wait 30 --target-org myOrg
```

## Health score

Starts at 100. Each finding subtracts points (high 8, medium 3, low 1, info 0), and one check can cost at most 25 points, so a single noisy area cannot hide everything else.

| Score | Grade |
|---|---|
| 90–100 | Healthy |
| 70–89 | Needs attention |
| 50–69 | At risk |
| 0–49 | Critical |

## Usage

```bash
npm install
npm run build

# Run without installing into the CLI
node bin/run.js xray scan --target-org myOrg

# Or link it into the sf CLI
sf plugins link .
sf xray scan --target-org myOrg --output-dir reports
sf xray scan --target-org myOrg --json      # machine-readable, e.g. for CI
sf xray scan --target-org myOrg --no-report # terminal summary only
```

The report is one self-contained HTML file (no external assets). It follows light or dark mode and prints cleanly.

## Development

```bash
npm run build && npm test
```

Each check is a module in `src/checks/` that receives a shared context (connection, Apex classes and triggers loaded once) and returns findings. Add a check by writing a module and listing it in `src/checks/index.ts`.

## Roadmap

1. **More checks:** flows without fault paths, Process Builder and Workflow Rules left to migrate, unused custom fields, `without sharing` classes, guest-user access.
2. **CI mode:** fail the run below a score (`--min-score 80`), SARIF output for code scanning.
3. **Compare two orgs:** sandbox against production, or a scan against an earlier scan.
4. **Plain-English summary** for client handovers.

Only scan orgs you are allowed to audit.

## License

MIT
