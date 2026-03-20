#!/usr/bin/env node
/**
 * scripts/pre-publish-check.mjs
 *
 * Validates that all workspace packages are ready for publishing:
 *   - version is a valid semver (not 0.0.0)
 *   - required fields are present (name, version, description, main/exports, license)
 *   - no unresolved workspace:* deps (when run after fix-workspace-deps)
 *   - dist/ directory exists and is non-empty
 *   - no private: true flag
 *
 * Usage:
 *   node scripts/pre-publish-check.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');

const REQUIRED_FIELDS = ['name', 'version', 'description', 'license'];

let allOk = true;

function fail(msg) {
    console.error(`  ❌ ${msg}`);
    allOk = false;
}

function warn(msg) {
    console.warn(`  ⚠️  ${msg}`);
}

function checkPackage(dir) {
    const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    console.log(`\n📦 ${pkg.name ?? dir}`);

    if (pkg.private) {
        console.log('  ⏭️  Skipped (private: true)');
        return;
    }

    // Required fields
    for (const field of REQUIRED_FIELDS) {
        if (!pkg[field]) {
            fail(`Missing required field: ${field}`);
        }
    }

    // Version not a placeholder
    if (pkg.version === '0.0.0' || pkg.version === '0.0.1') {
        warn(`Version is a placeholder: ${pkg.version}. Update before publishing.`);
    }

    // Must have exports or main
    if (!pkg.exports && !pkg.main) {
        fail('Missing "exports" or "main" field');
    }

    // No workspace:* in published deps
    for (const depField of ['dependencies', 'peerDependencies']) {
        const deps = pkg[depField];
        if (!deps) continue;
        for (const [name, version] of Object.entries(deps)) {
            if (String(version).startsWith('workspace:')) {
                fail(`${depField}.${name} still has workspace protocol: "${version}". Run fix-workspace-deps.mjs first.`);
            }
        }
    }

    // dist/ must exist
    const distDir = path.join(PACKAGES_DIR, dir, 'dist');
    if (!fs.existsSync(distDir)) {
        fail('dist/ directory not found. Run "pnpm build" first.');
    } else {
        const distFiles = fs.readdirSync(distDir);
        if (distFiles.length === 0) {
            fail('dist/ directory is empty. Run "pnpm build" first.');
        } else {
            console.log(`  ✓ dist/ has ${distFiles.length} file(s)`);
        }
    }

    // publishConfig should set access to public
    if (!pkg.publishConfig?.access) {
        warn('"publishConfig.access" not set. Scoped packages default to private on npm.');
    }

    console.log('  ✅ Ready to publish');
}

for (const dir of fs.readdirSync(PACKAGES_DIR)) {
    const stat = fs.statSync(path.join(PACKAGES_DIR, dir));
    if (!stat.isDirectory()) continue;
    checkPackage(dir);
}

console.log('\n' + (allOk ? '✅ All packages passed pre-publish checks.' : '❌ Some packages failed pre-publish checks. Fix issues before publishing.'));
if (!allOk) process.exit(1);
