/**
 * AI Performance Insights Analyzer
 * Evaluates K6 execution metrics, percentiles (P90, P95, P99), error rates,
 * identifies bottlenecks (TTFB, database queries, connection stalls),
 * and generates actionable performance audit reports.
 */

const fs = require('fs');
const path = require('path');

class InsightsAnalyzer {
  constructor(options = {}) {
    this.rootDir = path.resolve(options.rootDir || process.cwd());
    this.jsonPath = options.jsonPath || null;
  }

  locateLatestJsonReport() {
    if (this.jsonPath && fs.existsSync(this.jsonPath)) return this.jsonPath;

    const jsonDir = path.join(this.rootDir, 'k6-performance', 'reports', 'json');
    if (!fs.existsSync(jsonDir)) return null;

    const files = fs.readdirSync(jsonDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: f, time: fs.statSync(path.join(jsonDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    return files.length > 0 ? path.join(jsonDir, files[0].name) : null;
  }

  analyze(jsonFile) {
    const file = jsonFile || this.locateLatestJsonReport();
    if (!file || !fs.existsSync(file)) {
      throw new Error(`K6 JSON report not found at: ${file || 'reports/json/*.json'}. Please run a test first.`);
    }

    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const metrics = data.metrics || {};

    const reqDuration = metrics.http_req_duration?.values || {};
    const reqFailed = metrics.http_req_failed?.values || {};
    const reqWaiting = metrics.http_req_waiting?.values || {};
    const reqConnecting = metrics.http_req_connecting?.values || {};
    const totalRequests = metrics.http_reqs?.values?.count || 0;
    const reqRate = metrics.http_reqs?.values?.rate || 0;
    const checks = metrics.checks?.values || {};

    const findings = [];
    const recommendations = [];

    // 1. Latency & SLA Threshold Analysis
    const p95 = reqDuration['p(95)'] || 0;
    const p99 = reqDuration['p(99)'] || 0;
    const avg = reqDuration.avg || 0;
    const max = reqDuration.max || 0;

    if (p95 > 2000) {
      findings.push(`CRITICAL: 95th percentile latency is ${p95.toFixed(1)}ms, which exceeds standard SLA (<2000ms).`);
      recommendations.push('Implement caching (Redis/CDN) for read operations and optimize expensive database queries.');
    } else if (p95 > 800) {
      findings.push(`WARNING: 95th percentile latency is ${p95.toFixed(1)}ms, indicating moderate queuing under load.`);
      recommendations.push('Review database indexing and consider horizontal pod autoscaling (HPA).');
    } else {
      findings.push(`HEALTHY: 95th percentile latency is ${p95.toFixed(1)}ms, well within acceptable SLA bounds.`);
    }

    // 2. Latency Tail Spike (P99 vs P95)
    if (p99 > p95 * 2.5 && p99 > 500) {
      findings.push(`ANOMALY: Long-tail latency spike detected (P99=${p99.toFixed(1)}ms vs P95=${p95.toFixed(1)}ms).`);
      recommendations.push('Inspect JVM/Node.js Garbage Collection pauses, thread pool starvation, or cold-start container spin-ups.');
    }

    // 3. TTFB vs Transfer Overhead (Server processing vs network)
    const avgWaiting = reqWaiting.avg || 0;
    if (avg > 0 && (avgWaiting / avg) > 0.85) {
      findings.push(`BOTTLENECK: Server processing (TTFB) accounts for ${((avgWaiting / avg) * 100).toFixed(1)}% of total response time.`);
      recommendations.push('Backend API processing / SQL query latency is the primary bottleneck rather than network transfer.');
    }

    // 4. Connection Handshake Overhead
    const avgConn = reqConnecting.avg || 0;
    if (avgConn > 50) {
      findings.push(`NETWORK: High connection establishment latency averaging ${avgConn.toFixed(1)}ms.`);
      recommendations.push('Enable HTTP Keep-Alive / TCP Connection Pooling on reverse proxies and load balancers.');
    }

    // 5. Error Rate & Check Failure
    const failRate = (reqFailed.rate || 0) * 100;
    if (failRate > 5) {
      findings.push(`CRITICAL: HTTP request error rate is ${failRate.toFixed(2)}%, exceeding tolerance threshold (<5%).`);
      recommendations.push('Inspect server logs for 5xx unhandled exceptions, database connection pool exhaustion, or rate-limiting (429).');
    } else if (failRate > 0) {
      findings.push(`NOTICE: Minor HTTP request error rate of ${failRate.toFixed(2)}%.`);
    } else {
      findings.push(`STABLE: 0% HTTP request failures across all ${totalRequests} requests.`);
    }

    const checkPassRate = ((checks.passes || 0) / ((checks.passes || 0) + (checks.fails || 0) || 1)) * 100;

    const report = {
      timestamp: new Date().toISOString(),
      reportSource: path.basename(file),
      summary: {
        totalRequests,
        throughputRps: Number(reqRate.toFixed(2)),
        avgDurationMs: Number(avg.toFixed(2)),
        p90DurationMs: Number((reqDuration['p(90)'] || 0).toFixed(2)),
        p95DurationMs: Number(p95.toFixed(2)),
        p99DurationMs: Number(p99.toFixed(2)),
        maxDurationMs: Number(max.toFixed(2)),
        errorRatePercent: Number(failRate.toFixed(2)),
        checksPassRatePercent: Number(checkPassRate.toFixed(2)),
      },
      findings,
      recommendations,
    };

    return report;
  }

  generateMarkdownReport(report) {
    const s = report.summary;
    return `# AI Performance Insights & Optimization Audit

**Generated:** ${report.timestamp}  
**Source Metric File:** \`${report.reportSource}\`

---

## 1. Executive Performance Metrics

| Metric | Measured Value | Target SLA | Status |
| :--- | :--- | :--- | :--- |
| **Total Requests** | ${s.totalRequests.toLocaleString()} | - | Complete |
| **Throughput (RPS)** | ${s.throughputRps} req/s | Profile Target | Monitored |
| **Average Response Time** | ${s.avgDurationMs} ms | $< 300\text{ms}$ | ${s.avgDurationMs < 300 ? '✅ Pass' : '⚠️ Warning'} |
| **95th Percentile (P95)** | **${s.p95DurationMs} ms** | $< 800\text{ms}$ | ${s.p95DurationMs < 800 ? '✅ Pass' : '❌ SLA Breach'} |
| **99th Percentile (P99)** | **${s.p99DurationMs} ms** | $< 1500\text{ms}$ | ${s.p99DurationMs < 1500 ? '✅ Pass' : '⚠️ Warning'} |
| **Max Latency** | ${s.maxDurationMs} ms | - | Info |
| **HTTP Error Rate** | **${s.errorRatePercent}%** | $< 2.0\%$ | ${s.errorRatePercent < 2.0 ? '✅ Pass' : '❌ Critical'} |
| **Assertions (Checks)** | ${s.checksPassRatePercent}% | $> 99.0\%$ | ${s.checksPassRatePercent > 99.0 ? '✅ Pass' : '❌ Fail'} |

---

## 2. AI Diagnostics & Findings

${report.findings.map(f => `- ${f}`).join('\n')}

---

## 3. Engineering Recommendations

${report.recommendations.map((r, i) => `${i + 1}. **${r}**`).join('\n')}

---

*Report automatically synthesized by AI Performance Testing Agent.*
`;
  }

  saveReport(report, outputDir) {
    const targetDir = outputDir || path.join(this.rootDir, 'k6-performance', 'reports');
    const mdPath = path.join(targetDir, 'ai-performance-insights.md');
    fs.writeFileSync(mdPath, this.generateMarkdownReport(report));
    return mdPath;
  }
}

module.exports = InsightsAnalyzer;

if (require.main === module) {
  const analyzer = new InsightsAnalyzer();
  const report = analyzer.analyze();
  const file = analyzer.saveReport(report);
  console.log(`\n=== AI Performance Insights Analysis Complete ===`);
  console.log(`Report written to: ${file}`);
}
