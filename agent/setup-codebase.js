/**
 * AI Codebase Setup Agent
 * Clones or updates a target software repository from a GitHub/Git URL into `codebase/`,
 * checks out the specified branch, and triggers static discovery analysis.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const DiscoveryAgent = require('./discovery-agent.js');

class CodebaseSetupAgent {
  constructor(options = {}) {
    this.rootDir = path.resolve(options.rootDir || process.cwd());
    this.codebaseDir = path.resolve(options.targetDir || path.join(this.rootDir, 'codebase'));
    this.repoUrl = options.repoUrl || null;
    this.branch = options.branch || null;
    this.force = Boolean(options.force);
  }

  normalizeRepoUrl(rawUrl) {
    if (!rawUrl) throw new Error('Repository URL is required.');
    let url = rawUrl.trim();

    // Handle GitHub shorthand: "owner/repo" -> "https://github.com/owner/repo.git"
    if (/^[a-zA-Z0-9_\.-]+\/[a-zA-Z0-9_\.-]+$/.test(url)) {
      url = `https://github.com/${url}.git`;
    } else if (url.startsWith('github.com/')) {
      url = `https://${url}`;
    }

    if (!url.endsWith('.git') && url.startsWith('http')) {
      url = `${url}.git`;
    }

    return url;
  }

  checkGitInstalled() {
    try {
      execSync('git --version', { stdio: 'pipe' });
      return true;
    } catch (_) {
      throw new Error('Git CLI is not installed or not found on PATH. Please install Git first.');
    }
  }

  checkout(repoUrlInput, branchInput) {
    this.checkGitInstalled();
    const repoUrl = this.normalizeRepoUrl(repoUrlInput || this.repoUrl);
    const branch = branchInput || this.branch;

    console.log(`\n===================================================================`);
    console.log(`             SETUP TARGET CODEBASE REPOSITORY                      `);
    console.log(`===================================================================`);
    console.log(`Repository URL : ${repoUrl}`);
    console.log(`Target Dir     : ${this.codebaseDir}`);
    if (branch) console.log(`Target Branch  : ${branch}`);

    const dirExists = fs.existsSync(this.codebaseDir);

    if (dirExists) {
      let isGitRepo = false;
      try {
        const check = execSync(`git -C "${this.codebaseDir}" rev-parse --is-inside-work-tree`, { stdio: 'pipe' }).toString().trim();
        isGitRepo = check === 'true';
      } catch (_) {}

      if (isGitRepo && !this.force) {
        console.log(`\n[Info] Existing Git repository detected in 'codebase/'. Updating...`);
        try {
          execSync(`git -C "${this.codebaseDir}" fetch --all --prune`, { stdio: 'inherit' });
          if (branch) {
            execSync(`git -C "${this.codebaseDir}" checkout "${branch}"`, { stdio: 'inherit' });
          }
          execSync(`git -C "${this.codebaseDir}" pull`, { stdio: 'inherit' });
          console.log(`[Pass] Codebase successfully updated.`);
        } catch (err) {
          console.warn(`[Warn] Pull failed (${err.message}). Attempting clean clone...`);
          this.cleanAndClone(repoUrl, branch);
        }
      } else {
        console.log(`\n[Notice] Cleaning existing 'codebase/' directory for fresh clone...`);
        this.cleanAndClone(repoUrl, branch);
      }
    } else {
      this.cloneFresh(repoUrl, branch);
    }

    // Get current commit info
    let commitInfo = 'Unknown';
    let currentBranch = 'Unknown';
    try {
      commitInfo = execSync(`git -C "${this.codebaseDir}" log -1 --oneline`, { stdio: 'pipe' }).toString().trim();
      currentBranch = execSync(`git -C "${this.codebaseDir}" rev-parse --abbrev-ref HEAD`, { stdio: 'pipe' }).toString().trim();
    } catch (_) {}

    console.log(`\n[Pass] Checked out branch: ${currentBranch}`);
    console.log(`[Pass] Latest commit    : ${commitInfo}`);

    // Automatically trigger AI Discovery on newly cloned codebase
    console.log(`\n[Agent] Scanning cloned codebase for API routes, DTOs, and architecture...`);
    const discovery = new DiscoveryAgent({ targetDir: this.codebaseDir });
    const manifest = discovery.run();
    const manifestFile = discovery.saveManifest(path.join(this.rootDir, 'k6-discovery-manifest.json'));

    console.log(`\n=== Setup & Discovery Summary ===`);
    console.log(`Backend Stacks  : ${manifest.detectedStacks.backend.join(', ') || 'Not detected / Greenfield'}`);
    console.log(`Frontend Stacks : ${manifest.detectedStacks.frontend.join(', ') || 'Not detected'}`);
    console.log(`API Specs       : ${manifest.apiSpecs.length} found`);
    console.log(`Endpoints       : ${manifest.endpoints.length} discovered`);
    console.log(`Manifest Path   : ${manifestFile}`);
    console.log(`\nNext Steps:`);
    console.log(`  1. Generate K6 Framework : npm run agent:generate`);
    console.log(`  2. Run Full Auto Pipeline: npm run agent:auto codebase smoke`);

    return {
      success: true,
      codebaseDir: this.codebaseDir,
      branch: currentBranch,
      commit: commitInfo,
      manifest,
    };
  }

  cleanAndClone(repoUrl, branch) {
    try {
      fs.rmSync(this.codebaseDir, { recursive: true, force: true });
    } catch (_) {
      // If file lock in windows, rename or clear contents
      try {
        execSync(`rmdir /s /q "${this.codebaseDir}"`, { stdio: 'pipe' });
      } catch (_) {}
    }
    this.cloneFresh(repoUrl, branch);
  }

  cloneFresh(repoUrl, branch) {
    console.log(`\n[Info] Cloning repository into '${this.codebaseDir}'...`);
    const branchFlag = branch ? `--branch "${branch}"` : '';
    execSync(`git clone ${branchFlag} "${repoUrl}" "${this.codebaseDir}"`, { stdio: 'inherit' });
    console.log(`[Pass] Clone complete.`);
  }
}

module.exports = CodebaseSetupAgent;

if (require.main === module) {
  const repoUrl = process.argv[2];
  const branch = process.argv[3];
  if (!repoUrl) {
    console.error('Usage: node agent/setup-codebase.js <github-repo-url> [branch]');
    process.exit(1);
  }
  const agent = new CodebaseSetupAgent({ repoUrl, branch });
  agent.checkout();
}
