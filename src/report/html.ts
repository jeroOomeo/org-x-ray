import type { ScanResult, Severity } from '../types.js';

const SEVERITY_LABEL: Record<Severity, string> = { high: 'High', medium: 'Medium', low: 'Low', info: 'Info' };

function escape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function grade(score: number): string {
  if (score >= 90) return 'Healthy';
  if (score >= 70) return 'Needs attention';
  if (score >= 50) return 'At risk';
  return 'Critical';
}

export function renderHtml(result: ScanResult): string {
  const circumference = 2 * Math.PI * 52;
  const dash = (result.score / 100) * circumference;
  const sections = result.checks
    .map((check) => {
      const rows = check.findings
        .map(
          (f) => `<tr><td><span class="sev ${f.severity}">${SEVERITY_LABEL[f.severity]}</span></td><td>${escape(f.item)}</td><td>${escape(f.detail)}</td></tr>`
        )
        .join('');
      const body = check.error
        ? `<p class="error">Could not run: ${escape(check.error)}</p>`
        : rows
          ? `<div class="table-box"><table><thead><tr><th>Severity</th><th>Item</th><th>Detail</th></tr></thead><tbody>${rows}</tbody></table></div>`
          : '<p class="ok">Nothing to fix.</p>';
      return `<section class="check" id="${escape(check.id)}">
  <header><p class="cat">${escape(check.category)}</p><h2>${escape(check.title)}</h2><p class="summary">${escape(check.summary)}</p></header>
  ${body}
</section>`;
    })
    .join('\n');
  const toc = result.checks
    .map((c) => {
      const worst = c.error ? 'error' : (['high', 'medium', 'low'] as Severity[]).find((s) => c.findings.some((f) => f.severity === s)) ?? 'clean';
      return `<li><a href="#${escape(c.id)}"><span class="dot ${worst}"></span>${escape(c.title)}<span class="n">${c.findings.length}</span></a></li>`;
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Org X-Ray · ${escape(result.org.username)}</title>
<style>
:root{--bg:#f6f7f9;--panel:#fff;--line:#dde3ea;--fg:#111820;--muted:#4f5b67;--high:#c62828;--medium:#9a5700;--low:#0176d3;--info:#4f5b67;--ok:#147a45;--accent:#c8432f;color-scheme:light}
@media (prefers-color-scheme:dark){:root{--bg:#0e1216;--panel:#151b21;--line:#243039;--fg:#e6edf3;--muted:#8a98a6;--high:#ff6b6b;--medium:#ffb86b;--low:#33b5e8;--info:#8a98a6;--ok:#7ee0a1;--accent:#ff6f59;color-scheme:dark}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.wrap{max-width:1100px;margin:0 auto;padding:40px 20px 64px}
.mono{font-family:ui-monospace,"SF Mono",Menlo,monospace}
.top{display:flex;flex-wrap:wrap;gap:28px;align-items:center;justify-content:space-between;margin-bottom:28px}
.brand{font-family:ui-monospace,"SF Mono",Menlo,monospace;font-size:13px;color:var(--accent);margin:0 0 6px}
h1{margin:0 0 6px;font-size:30px;letter-spacing:-.02em}
.meta{margin:0;color:var(--muted);font-size:13px}
.score{display:flex;align-items:center;gap:16px}
.score svg{transform:rotate(-90deg)}
.score .num{font-size:34px;font-weight:700;line-height:1}
.score .grade{color:var(--muted);font-size:13px}
.counts{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:28px}
.count{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px}
.count b{display:block;font-size:26px}
.count span{color:var(--muted);font-size:13px}
.layout{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}
nav{flex:1 1 220px;max-width:260px;position:sticky;top:20px}
nav ul{list-style:none;margin:0;padding:0;background:var(--panel);border:1px solid var(--line);border-radius:12px}
nav a{display:flex;align-items:center;gap:10px;padding:10px 14px;color:var(--fg);text-decoration:none;font-size:14px;border-bottom:1px solid var(--line)}
nav li:last-child a{border-bottom:0}
nav .n{margin-left:auto;color:var(--muted);font-family:ui-monospace,Menlo,monospace;font-size:12px}
.dot{width:8px;height:8px;border-radius:50%;background:var(--ok);flex:none}
.dot.high,.dot.error{background:var(--high)}.dot.medium{background:var(--medium)}.dot.low{background:var(--low)}
main{flex:999 1 560px;min-width:0;display:flex;flex-direction:column;gap:18px}
.check{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px}
.check header{margin-bottom:12px}
.cat{margin:0;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
h2{margin:2px 0 6px;font-size:19px}
.summary{margin:0;color:var(--muted)}
.table-box{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:14px;min-width:520px}
th{text-align:left;font-weight:500;font-size:12px;color:var(--muted);padding:8px 10px 8px 0;border-bottom:1px solid var(--line)}
td{padding:9px 10px 9px 0;border-bottom:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}
tr:last-child td{border-bottom:0}
.sev{display:inline-block;white-space:nowrap;font-family:ui-monospace,Menlo,monospace;font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid currentColor}
.sev.high{color:var(--high)}.sev.medium{color:var(--medium)}.sev.low{color:var(--low)}.sev.info{color:var(--info)}
.ok{margin:0;color:var(--ok)}
.error{margin:0;color:var(--high)}
footer{margin-top:28px;color:var(--muted);font-size:12px}
@media print{nav{display:none}body{background:#fff}.check{break-inside:avoid}}
</style>
</head>
<body>
<div class="wrap">
  <div class="top">
    <div>
      <p class="brand">org-xray</p>
      <h1>Org health report</h1>
      <p class="meta mono">${escape(result.org.username)} · ${escape(result.org.instanceUrl)}</p>
      <p class="meta">Scanned ${escape(new Date(result.scannedAt).toLocaleString())}</p>
    </div>
    <div class="score" role="img" aria-label="Health score ${result.score} out of 100">
      <svg width="124" height="124" viewBox="0 0 124 124" aria-hidden="true">
        <circle cx="62" cy="62" r="52" fill="none" stroke="var(--line)" stroke-width="12"/>
        <circle cx="62" cy="62" r="52" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}"/>
      </svg>
      <div><div class="num">${result.score}</div><div class="grade">${grade(result.score)} · out of 100</div></div>
    </div>
  </div>
  <div class="counts">
    <div class="count"><b style="color:var(--high)">${result.counts.high}</b><span>High</span></div>
    <div class="count"><b style="color:var(--medium)">${result.counts.medium}</b><span>Medium</span></div>
    <div class="count"><b style="color:var(--low)">${result.counts.low}</b><span>Low</span></div>
    <div class="count"><b>${result.checks.length}</b><span>Checks run</span></div>
  </div>
  <div class="layout">
    <nav aria-label="Checks"><ul>${toc}</ul></nav>
    <main>
${sections}
    </main>
  </div>
  <footer>Generated by org-xray. Read-only: this scan queried metadata and limits and changed nothing in the org.</footer>
</div>
</body>
</html>
`;
}
