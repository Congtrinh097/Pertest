#!/usr/bin/env node

/**
 * K6 Framework Generator - Repository Scanner
 * Analyzes target repository to detect tech stack, API routes, DTOs, and workflows.
 * Usage: node scanner.js [target-dir]
 */

const fs = require('fs');
const path = require('path');

const targetDir = path.resolve(process.argv[2] || process.cwd());
console.log(`Scanning repository at: ${targetDir}`);

const manifest = {
  timestamp: new Date().toISOString(),
  targetDirectory: targetDir,
  detectedStacks: {
    backend: [],
    frontend: [],
  },
  apiSpecs: [],
  discoveredEndpoints: [],
  authMechanisms: [],
  recommendations: [],
};

// Ignore noisy directories
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'bin', 'obj', 'dist', 'build', 
  'target', '.idea', '.vscode', 'venv', '.venv'
]);

function walkDir(dir, callback) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return;
  }

  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath, entry.name);
    }
  }
}

// 1. Stack Detection
walkDir(targetDir, (filePath, fileName) => {
  // OpenAPI / Swagger
  if (/swagger.*\.(json|ya?ml)$/i.test(fileName) || /openapi.*\.(json|ya?ml)$/i.test(fileName)) {
    manifest.apiSpecs.push(path.relative(targetDir, filePath));
  }

  // Node / TypeScript
  if (fileName === 'package.json' && !filePath.includes('node_modules')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
      if (deps['express']) manifest.detectedStacks.backend.push('Express.js');
      if (deps['@nestjs/core']) manifest.detectedStacks.backend.push('NestJS');
      if (deps['fastify']) manifest.detectedStacks.backend.push('Fastify');
      if (deps['@angular/core']) manifest.detectedStacks.frontend.push('Angular');
      if (deps['react']) manifest.detectedStacks.frontend.push('React');
      if (deps['vue']) manifest.detectedStacks.frontend.push('Vue');
      if (deps['next']) manifest.detectedStacks.frontend.push('Next.js');
    } catch (_) {}
  }

  // .NET
  if (fileName.endsWith('.csproj') || fileName.endsWith('.sln')) {
    if (!manifest.detectedStacks.backend.includes('.NET')) {
      manifest.detectedStacks.backend.push('.NET (ASP.NET Core)');
    }
  }

  // Java
  if (fileName === 'pom.xml' || fileName === 'build.gradle') {
    if (!manifest.detectedStacks.backend.includes('Java')) {
      manifest.detectedStacks.backend.push('Java (Spring / JVM)');
    }
  }

  // Python
  if (fileName === 'requirements.txt' || fileName === 'pyproject.toml') {
    if (!manifest.detectedStacks.backend.includes('Python')) {
      manifest.detectedStacks.backend.push('Python (FastAPI/Django/Flask)');
    }
  }

  // Go
  if (fileName === 'go.mod') {
    if (!manifest.detectedStacks.backend.includes('Go')) {
      manifest.detectedStacks.backend.push('Go');
    }
  }
});

// Remove duplicates
manifest.detectedStacks.backend = [...new Set(manifest.detectedStacks.backend)];
manifest.detectedStacks.frontend = [...new Set(manifest.detectedStacks.frontend)];

// 2. Route & Service Detection
walkDir(targetDir, (filePath, fileName) => {
  const ext = path.extname(fileName).toLowerCase();
  if (!['.js', '.ts', '.cs', '.java', '.py', '.go'].includes(ext)) return;

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // ASP.NET Core: [Route("...")]
    const csRoutes = content.matchAll(/\[(?:HttpGet|HttpPost|HttpPut|HttpDelete|Route)\(["']([^"']+)["']\)\]/g);
    for (const match of csRoutes) {
      manifest.discoveredEndpoints.push({
        file: path.relative(targetDir, filePath),
        route: match[1],
        source: 'C# Attribute',
      });
    }

    // Express/Nest: router.get('/...', ...) or @Get('...')
    const jsRoutes = content.matchAll(/(?:router|app)\.(get|post|put|delete|patch)\(["']([^"']+)["']/gi);
    for (const match of jsRoutes) {
      manifest.discoveredEndpoints.push({
        file: path.relative(targetDir, filePath),
        method: match[1].toUpperCase(),
        route: match[2],
        source: 'Express/Fastify Router',
      });
    }

    // Spring Boot: @GetMapping("...")
    const javaRoutes = content.matchAll(/@(Get|Post|Put|Delete)Mapping\(["']([^"']+)["']\)/gi);
    for (const match of javaRoutes) {
      manifest.discoveredEndpoints.push({
        file: path.relative(targetDir, filePath),
        method: match[1].toUpperCase(),
        route: match[2],
        source: 'Spring RestController',
      });
    }

    // Auth detection
    if (/Bearer\s+/i.test(content) || /jwt/i.test(content) || /Authorization/i.test(content)) {
      if (!manifest.authMechanisms.includes('Bearer JWT')) {
        manifest.authMechanisms.push('Bearer JWT');
      }
    }
  } catch (_) {}
});

// Output summary
console.log('\n=== Discovery Summary ===');
console.log(`Backend Stack  : ${manifest.detectedStacks.backend.join(', ') || 'Not detected'}`);
console.log(`Frontend Stack : ${manifest.detectedStacks.frontend.join(', ') || 'Not detected'}`);
console.log(`API Specs      : ${manifest.apiSpecs.length} found`);
console.log(`Endpoints      : ${manifest.discoveredEndpoints.length} candidates discovered`);
console.log(`Auth Style     : ${manifest.authMechanisms.join(', ') || 'Unknown / Default to Bearer'}`);

const outputPath = path.join(targetDir, 'k6-discovery-manifest.json');
fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
console.log(`\nManifest written to: ${outputPath}`);
