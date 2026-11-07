import { activeConfig } from '../config/test-config.js';

/**
 * K6 Multi-Format Enterprise Reporter
 * Generates an executive HTML report, JSON metrics data, and console summary
 * with timestamps and environment identifiers.
 */

function formatTimestamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

export function generateHtmlReport(data, options = {}) {
  const title = options.title || 'K6 Performance Test Execution Report';
  const timestamp = new Date().toISOString();
  const envName = (activeConfig.environment || 'dev').toUpperCase();
  const testType = data.metadata?.testType || (__ENV.TEST_TYPE || options.testType || 'Standard');

  // Format metric rows
  let metricRows = '';
  const metrics = data.metrics || {};

  for (const [name, metric] of Object.entries(metrics)) {
    const type = metric.type || 'unknown';
    const values = metric.values || {};
    
    let avg = values.avg !== undefined ? values.avg.toFixed(2) : '-';
    let min = values.min !== undefined ? values.min.toFixed(2) : '-';
    let med = values.med !== undefined ? values.med.toFixed(2) : '-';
    let max = values.max !== undefined ? values.max.toFixed(2) : '-';
    let p90 = values['p(90)'] !== undefined ? values['p(90)'].toFixed(2) : '-';
    let p95 = values['p(95)'] !== undefined ? values['p(95)'].toFixed(2) : '-';
    let p99 = values['p(99)'] !== undefined ? values['p(99)'].toFixed(2) : '-';
    let count = values.count !== undefined ? values.count : (values.rate !== undefined ? `${(values.rate * 100).toFixed(2)}%` : '-');

    // Threshold status
    let thresholdStatus = '<span class="badge badge-neutral">N/A</span>';
    if (metric.thresholds) {
      const allPassed = Object.values(metric.thresholds).every((t) => t.ok);
      thresholdStatus = allPassed 
        ? '<span class="badge badge-success">PASSED</span>' 
        : '<span class="badge badge-danger">FAILED</span>';
    }

    metricRows += `
      <tr>
        <td class="metric-name"><code>${name}</code></td>
        <td><span class="type-tag">${type}</span></td>
        <td>${thresholdStatus}</td>
        <td>${count}</td>
        <td>${avg}</td>
        <td>${med}</td>
        <td>${p90}</td>
        <td>${p95}</td>
        <td>${p99}</td>
        <td>${min} / ${max}</td>
      </tr>
    `;
  }

  // Calculate high-level stats
  const httpDuration = metrics['http_req_duration']?.values || {};
  const httpReqs = metrics['http_reqs']?.values || {};
  const httpFailed = metrics['http_req_failed']?.values || {};
  const vusMax = metrics['vus_max']?.values?.value || metrics['vus']?.values?.value || '-';

  const totalReqs = httpReqs.count || 0;
  const reqRate = httpReqs.rate ? httpReqs.rate.toFixed(2) : '0';
  const failRate = httpFailed.rate ? (httpFailed.rate * 100).toFixed(2) + '%' : '0%';
  const p95Latency = httpDuration['p(95)'] ? httpDuration['p(95)'].toFixed(2) + ' ms' : '-';
  const avgLatency = httpDuration.avg ? httpDuration.avg.toFixed(2) + ' ms' : '-';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #38bdf8;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      padding: 30px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 { font-size: 26px; color: var(--text); }
    .header .meta { color: var(--text-muted); font-size: 14px; text-align: right; }
    .badge-env {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-weight: 700;
      font-size: 12px;
      background: #0369a1;
      color: #fff;
      margin-left: 8px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 20px;
    }
    .stat-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .stat-value { font-size: 28px; font-weight: 700; color: var(--primary); margin-top: 8px; }
    .stat-value.danger { color: var(--danger); }
    .stat-value.success { color: var(--success); }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 30px;
      overflow-x: auto;
    }
    .card h2 { font-size: 18px; margin-bottom: 16px; color: var(--text); }
    table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
    th {
      background: #0b1329;
      color: var(--text-muted);
      padding: 10px 14px;
      font-weight: 600;
      border-bottom: 2px solid var(--border);
    }
    td { padding: 10px 14px; border-bottom: 1px solid var(--border); }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
    code { font-family: ui-monospace, Menlo, Monaco, monospace; color: #38bdf8; }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
    }
    .badge-success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
    .badge-danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
    .badge-neutral { background: rgba(148, 163, 184, 0.2); color: var(--text-muted); }
    .type-tag { font-size: 11px; color: var(--text-muted); background: #151f32; padding: 2px 6px; border-radius: 4px; }
    footer { text-align: center; color: var(--text-muted); font-size: 12px; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>${title} <span class="badge-env">${envName}</span></h1>
      <p style="color: var(--primary); margin-top: 4px; font-weight: 500;">Test Profile: ${testType}</p>
    </div>
    <div class="meta">
      <div>Generated (UTC): ${timestamp}</div>
      <div>Framework: K6 Modular Enterprise Architecture</div>
    </div>
  </div>

  <div class="summary-grid">
    <div class="stat-card">
      <div class="stat-label">Total Requests</div>
      <div class="stat-value">${totalReqs}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Throughput</div>
      <div class="stat-value">${reqRate} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">req/s</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Failure Rate</div>
      <div class="stat-value ${parseFloat(failRate) > 1.0 ? 'danger' : 'success'}">${failRate}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">P95 Latency</div>
      <div class="stat-value">${p95Latency}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Avg Latency</div>
      <div class="stat-value">${avgLatency}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Peak VUs</div>
      <div class="stat-value">${vusMax}</div>
    </div>
  </div>

  <div class="card">
    <h2>Detailed Metrics & Thresholds</h2>
    <table>
      <thead>
        <tr>
          <th>Metric Name</th>
          <th>Type</th>
          <th>SLA Status</th>
          <th>Count / Rate</th>
          <th>Avg</th>
          <th>Med</th>
          <th>P90</th>
          <th>P95</th>
          <th>P99</th>
          <th>Min / Max</th>
        </tr>
      </thead>
      <tbody>
        ${metricRows}
      </tbody>
    </table>
  </div>

  <footer>
    Automated Performance Testing Framework &bull; Built with K6 &bull; Antigravity Engineering
  </footer>
</body>
</html>`;
}

/**
 * Standard multi-file summary handler for export function handleSummary(data)
 * Automatically writes timestamped reports for HTML, JSON, and text summaries.
 */
export function buildSummaryHandler(testType = 'test', testName = null) {
  const profileLabel = testName || `${testType.toUpperCase()} Test`;

  return function (data) {
    const env = (activeConfig.environment || 'dev').toLowerCase();
    const ts = formatTimestamp();
    const fileSlug = `${testType}-${env}-${ts}`;
    const reportBase = __ENV.REPORT_PATH || 'k6-performance/reports';

    const htmlReport = generateHtmlReport(data, { 
      title: `K6 Performance: ${profileLabel}`,
      testType: testType
    });
    const jsonSummary = JSON.stringify(data, null, 2);
    const textReport = textSummary(data, profileLabel, env);

    const outputs = {
      'stdout': textReport,
      // Generic latest copies for standard CI consumption
      [`${reportBase}/html/summary.html`]: htmlReport,
      [`${reportBase}/summary.json`]: jsonSummary,

      // Profile, environment, and timestamp specific outputs
      [`${reportBase}/html/${fileSlug}.html`]: htmlReport,
      [`${reportBase}/json/${fileSlug}.json`]: jsonSummary,
      [`${reportBase}/summary/${fileSlug}.txt`]: textReport,
    };

    return outputs;
  };
}

function textSummary(data, profileLabel, env) {
  const metrics = data.metrics || {};
  const httpDuration = metrics['http_req_duration']?.values || {};
  const httpReqs = metrics['http_reqs']?.values || {};
  const httpFailed = metrics['http_req_failed']?.values || {};

  return `
================================================================================
  K6 PERFORMANCE SUMMARY: ${profileLabel} [ENV: ${env.toUpperCase()}]
================================================================================
  Total HTTP Requests : ${httpReqs.count || 0} (${(httpReqs.rate || 0).toFixed(2)} req/s)
  Failed Requests     : ${((httpFailed.rate || 0) * 100).toFixed(2)}%
  Latency (avg)       : ${(httpDuration.avg || 0).toFixed(2)} ms
  Latency (p90)       : ${(httpDuration['p(90)'] || 0).toFixed(2)} ms
  Latency (p95)       : ${(httpDuration['p(95)'] || 0).toFixed(2)} ms
  Latency (p99)       : ${(httpDuration['p(99)'] || 0).toFixed(2)} ms

  Reports generated:
  - HTML Dashboard   : reports/html/
  - JSON Metrics     : reports/json/
  - Summary Text     : reports/summary/
================================================================================
`;
}

export default buildSummaryHandler;
