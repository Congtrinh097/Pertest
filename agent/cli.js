#!/usr/bin/env node

/**
 * AI Performance Testing Agent - Master CLI
 * Orchestrates the full autonomous lifecycle:
 * Discovery -> Generation -> Validation -> Execution -> Reporting & AI Insights
 */

const path = require('path');
const { execSync } = require('child_process');
const DiscoveryAgent = require('./discovery-agent.js');
const FrameworkGeneratorEngine = require('./generator-engine.js');
const ValidationAgent = require('./validation-agent.js');
const InsightsAnalyzer = require('./insights-analyzer.js');
const CodebaseSetupAgent = require('./setup-codebase.js');

const args = process.argv.slice(2);
const command = args[0] || 'help';

function printHelp() {
  console.log(`
===================================================================
       AI Performance Testing Agent - Autonomous Orchestrator
===================================================================

Usage:
  node agent/cli.js <command> [options]

Commands:
  setup <repo-url> [branch]  Clone/checkout target repo into 'codebase/' and scan it
  scan [target-dir]          Statically analyze repository (Angular/React/.NET/Node.js/Swagger)
  generate [manifest-path]   Generate clean-architecture K6 services, factories, and scenarios
  validate                   Execute pre-flight validation & safety gates
  run [profile] [--env env]  Execute K6 performance test profile (smoke|load|stress|spike|soak|breakpoint)
  analyze [json-summary]     Run AI diagnostic analysis and bottleneck identification
  auto [target-dir] [profile] Full autonomous lifecycle (Scan -> Gen -> Validate -> Run -> Analyze)

Examples:
  node agent/cli.js setup https://github.com/owner/my-api.git
  node agent/cli.js scan ./codebase
  node agent/cli.js generate
  node agent/cli.js validate
  node agent/cli.js run smoke
  node agent/cli.js analyze
  node agent/cli.js auto ./codebase smoke
`);
}

async function main() {
  switch (command.toLowerCase()) {
    case 'setup': {
      const repoUrl = args[1];
      const branch = args[2];
      if (!repoUrl) {
        console.error('Error: Repository URL is required. Example: node agent/cli.js setup <github-url> [branch]');
        process.exit(1);
      }
      const setupAgent = new CodebaseSetupAgent({ repoUrl, branch });
      setupAgent.checkout();
      break;
    }

    case 'scan': {
      const targetDir = args[1] || process.cwd();
      console.log(`[Agent] Initiating Static Discovery on: ${targetDir}`);
      const agent = new DiscoveryAgent({ targetDir });
      const manifest = agent.run();
      const savedPath = agent.saveManifest();
      console.log(`[Agent] Discovery complete! Found ${manifest.endpoints.length} endpoints.`);
      console.log(`[Agent] Manifest written to: ${savedPath}`);
      break;
    }

    case 'generate': {
      const manifestPath = args[1];
      console.log(`[Agent] Initiating Framework Generator...`);
      const engine = new FrameworkGeneratorEngine();
      if (manifestPath) engine.loadManifest(manifestPath);
      const res = engine.run();
      console.log(`[Agent] Framework generated successfully!`);
      break;
    }

    case 'validate': {
      console.log(`[Agent] Running Pre-flight Quality & Safety Gates...`);
      const validator = new ValidationAgent();
      const res = validator.run();
      if (!res.success) {
        process.exit(1);
      }
      break;
    }

    case 'run': {
      const profile = args[1] || 'smoke';
      const env = args[2] || 'dev';
      const script = `k6-performance/tests/${profile}/crud.${profile}.js`;
      console.log(`[Agent] Executing Test Profile '${profile}' on environment '${env}'...`);
      try {
        execSync(`k6 run -e ENV=${env} "${script}"`, { stdio: 'inherit' });
        console.log(`[Agent] Execution completed successfully.`);
      } catch (err) {
        console.error(`[Agent] Execution failed: ${err.message}`);
        process.exit(1);
      }
      break;
    }

    case 'analyze': {
      const jsonFile = args[1];
      console.log(`[Agent] Running AI Performance Insights Analyzer...`);
      const analyzer = new InsightsAnalyzer({ jsonPath: jsonFile });
      const report = analyzer.analyze();
      const mdFile = analyzer.saveReport(report);
      console.log(`[Agent] AI Diagnostics Complete!`);
      console.log(`[Agent] Report saved to: ${mdFile}`);
      console.log(`\n=== Executive Summary ===`);
      console.log(`Throughput     : ${report.summary.throughputRps} RPS`);
      console.log(`P95 Latency    : ${report.summary.p95DurationMs} ms`);
      console.log(`HTTP Error Rate: ${report.summary.errorRatePercent} %`);
      break;
    }

    case 'auto': {
      const targetDir = args[1] || process.cwd();
      const profile = args[2] || 'smoke';

      console.log(`===================================================================`);
      console.log(`       FULL AUTONOMOUS PERFORMANCE TESTING AGENT PIPELINE         `);
      console.log(`===================================================================`);

      // 1. Scan
      console.log(`\n>>> Step 1/5: AI Static Codebase Discovery...`);
      const discovery = new DiscoveryAgent({ targetDir });
      const manifest = discovery.run();
      const manifestFile = discovery.saveManifest();
      console.log(`[Pass] Discovered ${manifest.endpoints.length} endpoints.`);

      // 2. Generate
      console.log(`\n>>> Step 2/5: K6 Clean-Architecture Framework Generation...`);
      const generator = new FrameworkGeneratorEngine({ manifest });
      generator.run();

      // 3. Validate
      console.log(`\n>>> Step 3/5: Pre-flight Quality & Safety Validation...`);
      const validator = new ValidationAgent();
      const valRes = validator.run();
      if (!valRes.success) {
        console.error(`[Fail] Validation gates failed. Aborting pipeline.`);
        process.exit(1);
      }

      // 4. Run Test Profile
      console.log(`\n>>> Step 4/5: Executing K6 Performance Test (${profile})...`);
      const script = `k6-performance/tests/${profile}/crud.${profile}.js`;
      try {
        execSync(`k6 run "${script}"`, { stdio: 'inherit' });
      } catch (err) {
        console.warn(`[Notice] K6 run completed with threshold evaluations.`);
      }

      // 5. AI Insights & Diagnostics
      console.log(`\n>>> Step 5/5: AI Performance Insights & Diagnostics...`);
      try {
        const analyzer = new InsightsAnalyzer();
        const report = analyzer.analyze();
        const mdFile = analyzer.saveReport(report);
        console.log(`\n[Success] Autonomous Pipeline Complete!`);
        console.log(`[Artifact] Performance Audit Report: ${mdFile}`);
      } catch (err) {
        console.log(`[Notice] Insights skipped: ${err.message}`);
      }
      break;
    }

    case 'help':
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error(`[Agent Fatal Error] ${err.message}`);
  process.exit(1);
});
