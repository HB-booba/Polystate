#!/usr/bin/env node
/**
 * scripts/fix-workspace-deps.mjs
 *
 * Replaces `workspace:*` references in each package's dependencies with the
 * actual version from the referenced package.json. Intended to be called
 * right before publishing so that the published tarball contains real semver
 * ranges instead of `workspace:*` (which is a pnpm-only protocol and is not
 * understood by npm/yarn consumers).
 *
 * Usage:
 *   node scripts/fix-workspace-deps.mjs           # replace workspace:* in place
 *   node scripts/fix-workspace-deps.mjs --restore # restore workspace:* from backup
 *
 * NOTE: pnpm publish and changeset publish handle this automatically when using
 * pnpm workspaces. This script is only needed if you publish with plain npm.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(ROOT, 'packages');

const RESTORE = process.argv.includes('--restore');
const BACKUP_SUFFIX = '.workspace-backup.json';

// Discover all workspace packages and collect their versions
function discoverPackages() {
    const packages = new Map(); // name → { dir, version }
    for (const dir of fs.readdirSync(PACKAGES_DIR)) {
        const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
        if (!fs.existsSync(pkgPath)) continue;
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        packages.set(pkg.name, { dir: path.join(PACKAGES_DIR, dir), version: pkg.version });
    }
    return packages;
}

function replaceDeps(deps, packages) {
    if (!deps) return deps;
    const result = { ...deps };
    for (const [name, version] of Object.entries(result)) {
        if (version === 'workspace:*' || version.startsWith('workspace:')) {
            const pkg = packages.get(name);
            if (!pkg) {
                console.warn(`  ⚠️  Could not resolve workspace package: ${name}`);
                continue;
            }
            result[name] = `^${pkg.version}`;
            console.log(`  ${name}: workspace:* → ^${pkg.version}`);
        }
    }
    return result;
}

function backupAndFix(pkgPath, packages) {
    const content = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(content);

    const backupPath = pkgPath + BACKUP_SUFFIX;
    fs.writeFileSync(backupPath, content, 'utf-8');

    const fixed = {
        ...pkg,
        dependencies: replaceDeps(pkg.dependencies, packages),
        devDependencies: replaceDeps(pkg.devDependencies, packages),
        peerDependencies: replaceDeps(pkg.peerDependencies, packages),
    };
    fs.writeFileSync(pkgPath, JSON.stringify(fixed, null, 2) + '\n', 'utf-8');
}

function restore(pkgPath) {
    const backupPath = pkgPath + BACKUP_SUFFIX;
    if (!fs.existsSync(backupPath)) {
        console.warn(`  ⚠️  No backup found for ${pkgPath}`);
        return;
    }
    fs.copyFileSync(backupPath, pkgPath);
    fs.unlinkSync(backupPath);
    console.log(`  Restored ${path.basename(path.dirname(pkgPath))}/package.json`);
}

const packages = discoverPackages();

for (const dir of fs.readdirSync(PACKAGES_DIR)) {
    const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    console.log(`\n📦 ${pkg.name}`);

    if (RESTORE) {
        restore(pkgPath);
    } else {
        backupAndFix(pkgPath, packages);
    }
}

console.log(RESTORE ? '\n✅ Restored workspace:* references.' : '\n✅ workspace:* references replaced with semver ranges.');
console.log(RESTORE ? '' : 'Run "node scripts/fix-workspace-deps.mjs --restore" to revert.\n');
