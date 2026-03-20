#!/usr/bin/env node

import { execSync } from 'node:child_process';

function run(command) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: 'inherit' });
}

let fixed = false;

try {
  run('pnpm nx run-many --target=build --projects=@polystate/core,@polystate/react,@polystate/angular,@polystate/definition,@polystate/devtools,@polystate/generator-react,@polystate/generator-angular,@polystate/cli');
  run('node scripts/fix-workspace-deps.mjs');
  fixed = true;
  run('node scripts/pre-publish-check.mjs');
  run('pnpm changeset publish');
} finally {
  if (fixed) {
    run('node scripts/fix-workspace-deps.mjs --restore');
  }
}
