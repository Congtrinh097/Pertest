/**
 * AI Discovery Agent
 * Statically analyzes application codebases (Angular, React, .NET, Node.js, etc.)
 * or OpenAPI/Swagger specifications to discover APIs, DTO contracts, authentication schemes,
 * and business flows.
 */

const fs = require('fs');
const path = require('path');

const IGNORED_DIRS = new Set([
  'node_modules', '.git', 'bin', 'obj', 'dist', 'build', 
  'target', '.idea', '.vscode', 'venv', '.venv', 'coverage',
  'reports', '.vs', 'out', 'agent', 'skills', 'k6-performance'
]);

class DiscoveryAgent {
  constructor(options = {}) {
    this.targetDir = path.resolve(options.targetDir || process.cwd());
    this.manifest = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      targetDirectory: this.targetDir,
      detectedStacks: {
        backend: [],
        frontend: [],
      },
      apiSpecs: [],
      endpoints: [],
      dtos: {},
      auth: {
        type: 'Bearer JWT',
        loginEndpoint: '/api/v1/auth/login',
        tokenField: 'token',
        headerName: 'Authorization',
        headerPrefix: 'Bearer ',
      },
      businessFlows: [],
      recommendations: [],
    };
  }

  walk(dir, callback) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        this.walk(fullPath, callback);
      } else if (entry.isFile()) {
        callback(fullPath, entry.name);
      }
    }
  }

  detectStacks() {
    this.walk(this.targetDir, (filePath, fileName) => {
      // 1. OpenAPI / Swagger files
      if (/swagger.*\.(json|ya?ml)$/i.test(fileName) || /openapi.*\.(json|ya?ml)$/i.test(fileName)) {
        this.manifest.apiSpecs.push(filePath);
      }

      // 2. Node.js & Frontend package manifests
      if (fileName === 'package.json') {
        try {
          const pkg = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);

          if (deps['@nestjs/core']) this.manifest.detectedStacks.backend.push('NestJS');
          else if (deps['express']) this.manifest.detectedStacks.backend.push('Express.js');
          else if (deps['fastify']) this.manifest.detectedStacks.backend.push('Fastify');

          if (deps['@angular/core']) this.manifest.detectedStacks.frontend.push('Angular');
          if (deps['react']) this.manifest.detectedStacks.frontend.push('React');
          if (deps['vue']) this.manifest.detectedStacks.frontend.push('Vue');
          if (deps['next']) this.manifest.detectedStacks.frontend.push('Next.js');
        } catch (_) {}
      }

      // 3. .NET Solutions & Projects
      if (fileName.endsWith('.csproj') || fileName.endsWith('.sln')) {
        this.manifest.detectedStacks.backend.push('.NET (ASP.NET Core)');
      }

      // 4. Java / Kotlin
      if (fileName === 'pom.xml' || fileName === 'build.gradle' || fileName === 'build.gradle.kts') {
        this.manifest.detectedStacks.backend.push('Java (Spring Boot / JVM)');
      }

      // 5. Python
      if (fileName === 'pyproject.toml' || fileName === 'requirements.txt') {
        this.manifest.detectedStacks.backend.push('Python (FastAPI / Django / Flask)');
      }

      // 6. Go
      if (fileName === 'go.mod') {
        this.manifest.detectedStacks.backend.push('Go');
      }
    });

    this.manifest.detectedStacks.backend = [...new Set(this.manifest.detectedStacks.backend)];
    this.manifest.detectedStacks.frontend = [...new Set(this.manifest.detectedStacks.frontend)];
  }

  parseOpenApiSpecs() {
    for (const specPath of this.manifest.apiSpecs) {
      try {
        let content = fs.readFileSync(specPath, 'utf8');
        let spec;
        if (specPath.endsWith('.json')) {
          spec = JSON.parse(content);
        } else {
          // Rudimentary JSON / YAML fallback
          try {
            spec = JSON.parse(content);
          } catch (_) {
            continue;
          }
        }

        if (!spec || !spec.paths) continue;

        // Extract base URL
        if (spec.servers && spec.servers[0] && spec.servers[0].url) {
          this.manifest.baseUrl = spec.servers[0].url;
        }

        // Extract paths
        for (const [routePath, methods] of Object.entries(spec.paths)) {
          for (const [method, operation] of Object.entries(methods)) {
            if (!['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) continue;

            const domain = (operation.tags && operation.tags[0]) || this.extractDomainFromRoute(routePath);
            const endpoint = {
              route: routePath,
              method: method.toUpperCase(),
              operationId: operation.operationId || `${method}_${routePath.replace(/\W+/g, '_')}`,
              domain: domain.toLowerCase(),
              summary: operation.summary || '',
              parameters: operation.parameters || [],
              source: `OpenAPI Spec (${path.basename(specPath)})`,
            };

            // Request body schema extraction
            if (operation.requestBody?.content?.['application/json']?.schema) {
              endpoint.requestSchema = operation.requestBody.content['application/json'].schema;
            }

            this.manifest.endpoints.push(endpoint);
          }
        }

        // Extract DTO schemas
        const schemas = spec.components?.schemas || spec.definitions || {};
        for (const [schemaName, schemaObj] of Object.entries(schemas)) {
          if (schemaObj.properties) {
            this.manifest.dtos[schemaName] = {
              type: schemaObj.type || 'object',
              properties: Object.keys(schemaObj.properties),
              required: schemaObj.required || [],
            };
          }
        }
      } catch (_) {}
    }
  }

  parseSourceCodeRoutes() {
    this.walk(this.targetDir, (filePath, fileName) => {
      const ext = path.extname(fileName).toLowerCase();
      if (!['.js', '.ts', '.cs', '.java', '.py', '.go'].includes(ext)) return;

      let content;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch (_) {
        return;
      }

      // 1. .NET ASP.NET Core Controllers & Minimal APIs
      if (ext === '.cs') {
        this.discoverDotNetEndpoints(content, filePath);
      }

      // 2. Node.js (NestJS / Express / Fastify)
      if (ext === '.js' || ext === '.ts') {
        this.discoverNodeEndpoints(content, filePath);
        this.discoverFrontendApiClients(content, filePath);
      }

      // 3. Python (FastAPI / Flask / Django)
      if (ext === '.py') {
        this.discoverPythonEndpoints(content, filePath);
      }
    });
  }

  discoverPythonEndpoints(content, filePath) {
    // FastAPI / Flask: @app.get('/api/...'), @router.post('/api/...')
    const pyMatches = content.matchAll(/@(?:app|router)\.(get|post|put|delete|patch)\(["']([^"']+)["']/gi);
    for (const match of pyMatches) {
      const verb = match[1].toUpperCase();
      const route = match[2];
      this.manifest.endpoints.push({
        route,
        method: verb,
        domain: this.extractDomainFromRoute(route),
        source: `Python FastAPI Router (${path.basename(filePath)})`,
      });
    }

    // Pydantic DTO models: class LeadRequest(BaseModel):
    const pydanticMatches = content.matchAll(/class\s+(\w+)\s*\((?:BaseModel|Schema)\):([\s\S]*?)(?=\n(?:class|\S|$))/g);
    for (const match of pydanticMatches) {
      const modelName = match[1];
      const body = match[2];
      const props = [];
      const propMatches = body.matchAll(/^\s{4}(\w+)\s*:/gm);
      for (const p of propMatches) {
        props.push(p[1]);
      }
      if (props.length > 0) {
        this.manifest.dtos[modelName] = {
          type: 'object',
          properties: props,
          source: `Pydantic Model (${path.basename(filePath)})`,
        };
      }
    }
  }

  discoverDotNetEndpoints(content, filePath) {
    // Controller class level route: [Route("api/[controller]")] or [Route("api/users")]
    let classRoute = '';
    const classRouteMatch = content.match(/\[Route\(["']([^"']+)["']\)\]/);
    if (classRouteMatch) {
      classRoute = classRouteMatch[1];
      const controllerMatch = path.basename(filePath).match(/(\w+)Controller\.cs$/);
      if (controllerMatch && classRoute.includes('[controller]')) {
        classRoute = classRoute.replace('[controller]', controllerMatch[1].toLowerCase());
      }
    }

    // Method attributes: [HttpGet], [HttpPost("search")], etc.
    const methodMatches = content.matchAll(/\[(HttpGet|HttpPost|HttpPut|HttpDelete|HttpPatch)(?:\(["']([^"']*)["']\))?\]/g);
    for (const match of methodMatches) {
      const verb = match[1].replace('Http', '').toUpperCase();
      const subRoute = match[2] || '';
      let fullRoute = '/' + [classRoute, subRoute].filter(Boolean).join('/').replace(/\/+/g, '/');
      if (!fullRoute.startsWith('/')) fullRoute = '/' + fullRoute;

      const domain = this.extractDomainFromRoute(fullRoute);
      this.manifest.endpoints.push({
        route: fullRoute,
        method: verb,
        domain: domain,
        source: `.NET Controller (${path.basename(filePath)})`,
      });
    }

    // Minimal APIs: app.MapGet("/api/...", ...), app.MapPost(...)
    const minimalMatches = content.matchAll(/app\.Map(Get|Post|Put|Delete)\(["']([^"']+)["']/g);
    for (const match of minimalMatches) {
      this.manifest.endpoints.push({
        route: match[2],
        method: match[1].toUpperCase(),
        domain: this.extractDomainFromRoute(match[2]),
        source: `.NET Minimal API (${path.basename(filePath)})`,
      });
    }

    // C# DTO / Model properties discovery
    const classMatches = content.matchAll(/(?:public\s+)?(?:class|record)\s+(\w+)(?:Dto|Model|Request|Response)?\s*\{([^}]+)\}/g);
    for (const match of classMatches) {
      const modelName = match[1];
      const body = match[2];
      const props = [];
      const propMatches = body.matchAll(/public\s+[\w<>?\[\]]+\s+(\w+)\s*\{\s*get;/g);
      for (const p of propMatches) {
        props.push(p[1]);
      }
      if (props.length > 0) {
        this.manifest.dtos[modelName] = {
          type: 'object',
          properties: props,
          source: `.NET Model (${path.basename(filePath)})`,
        };
      }
    }
  }

  discoverNodeEndpoints(content, filePath) {
    // NestJS: @Controller('users') + @Get(':id')
    let basePrefix = '';
    const ctrlMatch = content.match(/@Controller\(["']?([^"')]+)?["']?\)/);
    if (ctrlMatch && ctrlMatch[1]) {
      basePrefix = ctrlMatch[1];
    }

    const nestMethods = content.matchAll(/@(Get|Post|Put|Delete|Patch)\(["']?([^"')]+)?["']?\)/g);
    for (const match of nestMethods) {
      const verb = match[1].toUpperCase();
      const sub = match[2] || '';
      let fullRoute = '/' + [basePrefix, sub].filter(Boolean).join('/').replace(/\/+/g, '/');
      if (!fullRoute.startsWith('/')) fullRoute = '/' + fullRoute;

      this.manifest.endpoints.push({
        route: fullRoute,
        method: verb,
        domain: this.extractDomainFromRoute(fullRoute),
        source: `NestJS Controller (${path.basename(filePath)})`,
      });
    }

    // Express / Fastify: router.get('/...', ...), app.post('/...', ...)
    const exprMatches = content.matchAll(/(?:router|app)\.(get|post|put|delete|patch)\(["']([^"']+)["']/gi);
    for (const match of exprMatches) {
      this.manifest.endpoints.push({
        route: match[2],
        method: match[1].toUpperCase(),
        domain: this.extractDomainFromRoute(match[2]),
        source: `Express/Fastify Router (${path.basename(filePath)})`,
      });
    }

    // TypeScript interface / type DTO detection
    const ifaceMatches = content.matchAll(/(?:export\s+)?interface\s+(\w+)(?:Dto|Model|Request|Response)?\s*\{([^}]+)\}/g);
    for (const match of ifaceMatches) {
      const name = match[1];
      const body = match[2];
      const props = [];
      const pMatches = body.matchAll(/(\w+)\s*\??\s*:/g);
      for (const p of pMatches) {
        props.push(p[1]);
      }
      if (props.length > 0) {
        this.manifest.dtos[name] = {
          type: 'object',
          properties: props,
          source: `TS Interface (${path.basename(filePath)})`,
        };
      }
    }
  }

  discoverFrontendApiClients(content, filePath) {
    // Angular HttpClient: this.http.get('/api/...'), this.http.post('/api/...')
    const ngMatches = content.matchAll(/this\.http\.(get|post|put|delete)\s*(?:<[^>]+>)?\s*\(\s*[`'"]([^`'"]+)[`'"]/g);
    for (const match of ngMatches) {
      if (match[2].startsWith('/') || match[2].startsWith('http')) {
        this.manifest.endpoints.push({
          route: match[2],
          method: match[1].toUpperCase(),
          domain: this.extractDomainFromRoute(match[2]),
          source: `Angular Service (${path.basename(filePath)})`,
        });
      }
    }

    // Axios / Fetch: axios.get('/api/...'), fetch('/api/...')
    const axiosMatches = content.matchAll(/(?:axios|apiClient)\.(get|post|put|delete)\s*\(\s*[`'"]([^`'"]+)[`'"]/g);
    for (const match of axiosMatches) {
      if (match[2].startsWith('/') || match[2].startsWith('http')) {
        this.manifest.endpoints.push({
          route: match[2],
          method: match[1].toUpperCase(),
          domain: this.extractDomainFromRoute(match[2]),
          source: `React Axios Client (${path.basename(filePath)})`,
        });
      }
    }
  }

  extractDomainFromRoute(route) {
    const parts = route.replace(/^https?:\/\/[^\/]+/, '').split('/').filter(Boolean);
    if (!parts.length) return 'default';
    if (parts[0] === 'api') {
      if (parts[1] && /^v\d+$/i.test(parts[1])) {
        return parts[2] ? parts[2].toLowerCase() : 'api';
      }
      return parts[1] ? parts[1].toLowerCase() : 'api';
    }
    return parts[0].toLowerCase();
  }

  deduceBusinessFlows() {
    // Group endpoints by domain
    const domains = {};
    for (const ep of this.manifest.endpoints) {
      if (!domains[ep.domain]) domains[ep.domain] = [];
      domains[ep.domain].push(ep);
    }

    // Deduce CRUD workflows
    for (const [domain, epList] of Object.entries(domains)) {
      const hasGet = epList.some(e => e.method === 'GET');
      const hasPost = epList.some(e => e.method === 'POST');
      const hasPut = epList.some(e => e.method === 'PUT' || e.method === 'PATCH');
      const hasDelete = epList.some(e => e.method === 'DELETE');

      if (hasGet && hasPost) {
        this.manifest.businessFlows.push({
          id: `flow-${domain}-crud`,
          name: `${domain.toUpperCase()} CRUD Lifecycle`,
          domain: domain,
          type: 'CRUD',
          steps: [
            hasPost ? 'POST (Create entity)' : null,
            hasGet ? 'GET (Verify entity retrieval)' : null,
            hasPut ? 'PUT (Update entity)' : null,
            hasDelete ? 'DELETE (Clean up entity)' : null,
          ].filter(Boolean),
        });
      }
    }

    // Deduce User Journey
    if (domains['auth'] || domains['user'] || domains['product'] || domains['order']) {
      this.manifest.businessFlows.push({
        id: 'flow-user-journey-checkout',
        name: 'End-to-End User Management & Transaction Journey',
        type: 'UserJourney',
        steps: [
          'Authenticate / Login',
          'Fetch User Profile',
          'Search / Query Resource Catalog',
          'Execute Transaction / Modification',
          'Graceful Session Termination',
        ],
      });
    }
  }

  cleanAndDeduplicate() {
    const seen = new Set();
    const uniqueEndpoints = [];

    for (const ep of this.manifest.endpoints) {
      if (!ep.route || ep.route.includes('...') || ep.route.length < 2) continue;
      const key = `${ep.method}:${ep.route}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEndpoints.push(ep);
      }
    }

    this.manifest.endpoints = uniqueEndpoints;

    // Fallback baseline endpoints if greenfield / none detected
    if (this.manifest.endpoints.length === 0) {
      this.manifest.endpoints = [
        { route: '/api/v1/auth/login', method: 'POST', domain: 'auth', source: 'Standard Baseline' },
        { route: '/api/v1/users', method: 'GET', domain: 'user', source: 'Standard Baseline' },
        { route: '/api/v1/users', method: 'POST', domain: 'user', source: 'Standard Baseline' },
        { route: '/api/v1/users/:id', method: 'PUT', domain: 'user', source: 'Standard Baseline' },
        { route: '/api/v1/users/:id', method: 'DELETE', domain: 'user', source: 'Standard Baseline' },
        { route: '/api/v1/products', method: 'GET', domain: 'product', source: 'Standard Baseline' },
        { route: '/api/v1/products', method: 'POST', domain: 'product', source: 'Standard Baseline' },
        { route: '/api/v1/products/:id', method: 'PUT', domain: 'product', source: 'Standard Baseline' },
        { route: '/api/v1/products/:id', method: 'DELETE', domain: 'product', source: 'Standard Baseline' },
      ];
    }
  }

  run() {
    this.detectStacks();
    this.parseOpenApiSpecs();
    this.parseSourceCodeRoutes();
    this.cleanAndDeduplicate();
    this.deduceBusinessFlows();

    return this.manifest;
  }

  saveManifest(outputPath) {
    const dest = outputPath || path.join(this.targetDir, 'k6-discovery-manifest.json');
    fs.writeFileSync(dest, JSON.stringify(this.manifest, null, 2));
    return dest;
  }
}

module.exports = DiscoveryAgent;

if (require.main === module) {
  const targetDir = process.argv[2] || process.cwd();
  console.log(`Starting AI Discovery Agent on: ${targetDir}`);
  const agent = new DiscoveryAgent({ targetDir });
  const manifest = agent.run();
  const file = agent.saveManifest();
  console.log(`Discovery complete. Found ${manifest.endpoints.length} endpoints across ${manifest.businessFlows.length} business flows.`);
  console.log(`Manifest saved: ${file}`);
}
