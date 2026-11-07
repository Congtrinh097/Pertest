---
name: setup
description: Set up a target application repository from GitHub or Git URL into the 'codebase/' directory. Clones or updates the repository, checks out specified branches, and automatically triggers the AI Discovery Agent to analyze APIs, DTOs, and architecture for automated K6 performance testing. Trigger when the user provides a GitHub repo link, asks to 'setup repo', 'checkout repo', 'clone repo', 'truyền repo link', or runs /setup.
---

# Codebase Setup & Target Repository Onboarding Skill

This skill handles onboarding an external application repository (Angular, React, .NET, Node.js, Spring Boot, etc.) into the performance testing agent by cloning or updating it into the dedicated `codebase/` directory.

## Triggering

Activate this skill when:
- The user provides a GitHub or Git repository URL (e.g. `https://github.com/org/repo`, `org/repo`, `git@github.com:...`).
- The user asks to "setup repo", "checkout repo", "clone repo", "truyền link repo", "tải source code về", or runs `/setup <repo-url>`.

## Workflow

### 1. Validate & Normalize Repository URL
The skill accepts any of the following formats and standardizes them:
- Full HTTPS: `https://github.com/org/service.git`
- Web URL: `https://github.com/org/service`
- Shorthand: `org/service` (auto-expanded to `https://github.com/org/service.git`)
- SSH: `git@github.com:org/service.git`

### 2. Checkout into `codebase/`
Always checkout into the root `codebase/` directory (`E:\Pertest\codebase`), which is isolated and excluded from version control via `.gitignore`.

Run the automated setup agent command:
```powershell
node agent/cli.js setup <repo-url> [branch]
# hoặc:
npm run agent:setup -- <repo-url> [branch]
```

### 3. Automatic Discovery on `codebase/`
The setup agent will automatically:
1. Clone or pull the latest commits for the target branch.
2. Inspect the codebase for:
   - Framework detection (.NET ASP.NET Core, Node.js NestJS/Express, Angular, React, etc.)
   - OpenAPI/Swagger definitions (`swagger.json`, `openapi.yaml`)
   - API Controllers, routes, and HTTP methods
   - DTO models, request body schemas, and parameters
   - Authentication mechanisms (Bearer JWT, OAuth2, API Key)
3. Generate the updated `k6-discovery-manifest.json`.

### 4. Next Steps for Autonomous Testing
After checkout and discovery:
```powershell
# Generate K6 API Services, Data Factories & Scenarios based on the new codebase
node agent/cli.js generate

# Validate K6 scripts and safety gates
node agent/cli.js validate

# Run Smoke Test
node agent/cli.js run smoke
```
Or execute the entire sequence autonomously in one command:
```powershell
node agent/cli.js auto codebase smoke
```
