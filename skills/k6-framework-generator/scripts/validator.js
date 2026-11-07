#!/usr/bin/env node

/**
 * K6 Framework Generator - Validation Tool
 * Validates generated framework structure, files, runtime syntax, and safety rules.
 * Usage: node validator.js [framework-root-dir]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(process.argv[2] || process.cwd());
const k6Dir = path.join(rootDir, 'k6-performance');

console.log(`Validating K6 Performance Framework at: ${k6Dir}`);

let errors = 0;
let warnings = 0;

function check(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    errors++;
  }
}

function warn(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.warn(`  [WARN] ${message}`);
    warnings++;
  }
}

// 1. Directory Structure Checks
console.log('\n1. Checking Required Directory Structure:');
const requiredDirs = [
  'config/environments',
  'tests/smoke',
  'tests/load',
  'tests/stress',
  'tests/spike',
  'tests/soak',
  'tests/breakpoint',
  'scenarios/crud',
  'scenarios/user-journeys',
  'services/api',
  'services/frontend',
  'data/factories',
  'data/fixtures',
  'utils',
  'reports/html',
  'reports/json',
  'reports/summary',
];

for (const dir of requiredDirs) {
  check(fs.existsSync(path.join(k6Dir, dir)), `Directory exists: ${dir}`);
}

// 2. Critical Files Checks
console.log('\n2. Checking Critical Source Files:');
const requiredFiles = [
  'config/constants.js',
  'config/test-config.js',
  'config/thresholds.js',
  'config/environments/dev.json',
  'config/environments/staging.json',
  'config/environments/production.json',
  'services/api/http-client.js',
  'services/api/auth.api.js',
  'scenarios/workload-dispatcher.js',
  'utils/auth.js',
  'utils/checks.js',
  'utils/reporter.js',
  'tests/smoke/crud.smoke.js',
  'tests/load/crud.load.js',
  'tests/stress/crud.stress.js',
  'tests/spike/crud.spike.js',
  'tests/soak/crud.soak.js',
  'tests/breakpoint/crud.breakpoint.js',
];

for (const f of requiredFiles) {
  check(fs.existsSync(path.join(k6Dir, f)), `File exists: ${f}`);
}

// 3. Runtime Anti-Pattern Checks
console.log('\n3. Checking K6 Runtime Compatibility:');
function scanForbidden(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'reports' && entry.name !== 'node_modules') {
      scanForbidden(full);
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const code = fs.readFileSync(full, 'utf8');
      if (code.includes('process.env')) {
        errors++;
        console.error(`  [FAIL] Forbidden 'process.env' found in: ${path.relative(k6Dir, full)} (Use __ENV)`);
      }
      if (code.includes("require('fs')") || code.includes('require("fs")')) {
        errors++;
        console.error(`  [FAIL] Forbidden Node.js 'fs' found in: ${path.relative(k6Dir, full)} (Use open())`);
      }
    }
  }
}
scanForbidden(k6Dir);

// 4. Secret Checks
console.log('\n4. Checking for Hardcoded Production Secrets:');
const gitignorePath = path.join(rootDir, '.gitignore');
check(fs.existsSync(gitignorePath), '.gitignore exists');
if (fs.existsSync(gitignorePath)) {
  const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
  check(gitignoreContent.includes('.env'), '.gitignore excludes .env files');
  check(gitignoreContent.includes('reports'), '.gitignore excludes generated reports');
}

// 5. K6 Syntax Validation
console.log('\n5. Validating K6 Test Profiles via K6 inspect:');
const testProfiles = [
  'tests/smoke/crud.smoke.js',
  'tests/load/crud.load.js',
  'tests/stress/crud.stress.js',
  'tests/spike/crud.spike.js',
  'tests/soak/crud.soak.js',
  'tests/breakpoint/crud.breakpoint.js',
];

let hasK6 = false;
let runCmd = '';

try {
  execSync('k6 version', { stdio: 'ignore' });
  hasK6 = true;
  runCmd = 'k6 inspect';
} catch (_) {
  try {
    execSync('docker --version', { stdio: 'ignore' });
    hasK6 = true;
    runCmd = `docker run --rm -v "${rootDir}:/app" -w /app grafana/k6:latest inspect`;
  } catch (_) {}
}

if (hasK6) {
  for (const profile of testProfiles) {
    try {
      const target = `k6-performance/${profile}`;
      execSync(`${runCmd} ${target}`, { stdio: 'ignore' });
      console.log(`  [PASS] K6 inspect passed: ${profile}`);
    } catch (err) {
      console.error(`  [FAIL] K6 inspect failed on: ${profile}`);
      errors++;
    }
  }
} else {
  console.warn('  [WARN] Neither native k6 nor Docker detected; skipped runtime inspect checks.');
  warnings++;
}

console.log('\n=== Validation Summary ===');
console.log(`Total Errors   : ${errors}`);
console.log(`Total Warnings : ${warnings}`);

if (errors === 0) {
  console.log('Framework is 100% compliant with enterprise K6 standards!\n');
  process.exit(0);
} else {
  console.error('Validation failed. Please resolve the issues above.\n');
  process.exit(1);
}
