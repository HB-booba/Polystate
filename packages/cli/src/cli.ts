#!/usr/bin/env node

/**
 * Polystate CLI
 * Code generation tool for framework-agnostic store definitions
 */

import { validateStoreDefinition, type StoreAST } from '@polystate/definition';
import {
    generateAngularFacadeFromAST,
    generateNgRxActionsFromAST,
    generateNgRxEffectsFromAST,
    generateNgRxReducerFromAST,
    generateNgRxSelectorsFromAST,
    generateNgRxStateFromAST,
    generateStoreModule,
} from '@polystate/generator-angular';
import {
    generateHooksFromAST,
    generateReduxStoreFromAST,
    generateTypesFromAST,
} from '@polystate/generator-react';
import { program } from 'commander';
import * as fs from 'fs';
import { createRequire } from 'module';
import * as path from 'path';
import * as ts from 'typescript';
import { pathToFileURL } from 'url';
import { parseDefinitionFile } from './ast-parser.js';

interface GenerateOptions {
  outDir?: string;
  react?: boolean;
  angular?: boolean;
  both?: boolean;
  overwrite?: boolean;
}

interface CheckOptions {
  storeDir?: string;
  react?: boolean;
  angular?: boolean;
}

const CLI_VERSION = '0.1.0';

program
  .name('polystate')
  .description('Polystate code generator for framework-agnostic stores')
  .version(CLI_VERSION);

program
  .command('generate <definitionFile>')
  .description('Generate store code from a definition file')
  .option('--out-dir <path>', 'Output directory', 'src/store')
  .option('--react', 'Generate React Redux code')
  .option('--angular', 'Generate Angular NgRx code')
  .option('--both', 'Generate both React and Angular code')
  .option('--overwrite', 'Overwrite existing files')
  .action(async (definitionFile: string, options: GenerateOptions) => {
    try {
      console.log('🔍 Loading store definition...');

      // Resolve the definition file path
      const absolutePath = path.resolve(process.cwd(), definitionFile);

      if (!fs.existsSync(absolutePath)) {
        console.error(`❌ Definition file not found: ${absolutePath}`);
        process.exit(1);
      }

      // Parse definition file into a StoreAST using ts-morph (no code execution)
      const ast = parseDefinitionFile(absolutePath);

      // Basic structural validation
      if (!ast.name) {
        console.error('❌ Definition must have a "name" property');
        process.exit(1);
      }
      if (!ast.fields.length && !ast.actions.length) {
        console.error('❌ Definition must have initialState fields and actions');
        process.exit(1);
      }

      console.log(
        `✓ Parsed store: "${ast.name}" (${ast.actions.length} actions, ${ast.fields.length} fields)`
      );

      // Also load + validate at runtime for extra checks
      try {
        const moduleExports = await loadDefinitionModule(absolutePath);
        const definition = moduleExports.default || Object.values(moduleExports)[0];
        if (definition) {
          const validation = validateStoreDefinition(definition as unknown);
          if (!validation.valid) {
            console.error('❌ Validation errors:');
            validation.errors.forEach((err) => console.error(`   - ${err}`));
            process.exit(1);
          }
          if (validation.warnings.length > 0) {
            console.warn('⚠️  Warnings:');
            validation.warnings.forEach((warn) => console.warn(`   - ${warn}`));
          }
        }
      } catch {
        // Runtime load failed (e.g. workspace:* deps not installed) — skip runtime validation
        console.warn('⚠️  Skipping runtime validation (could not load module)');
      }

      // Determine which generators to run
      const generateReact = options.react || options.both || (!options.angular && !options.both);
      const generateAngular = options.angular || options.both;

      const outDir = options.outDir || 'src/store';
      const overwrite = options.overwrite || false;

      if (generateReact) {
        console.log('\n📦 Generating React Redux code...');
        generateReactCode(ast, outDir, overwrite);
      }

      if (generateAngular) {
        console.log('\n📦 Generating Angular NgRx code...');
        generateAngularCode(ast, outDir, overwrite);
      }

      console.log('\n✅ Code generation complete!');
      console.log(`📁 Output directory: ${path.resolve(outDir)}`);
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('validate <definitionFile>')
  .description('Validate a store definition file')
  .action(async (definitionFile: string) => {
    try {
      console.log('🔍 Validating store definition...');

      const absolutePath = path.resolve(process.cwd(), definitionFile);

      if (!fs.existsSync(absolutePath)) {
        console.error(`❌ Definition file not found: ${absolutePath}`);
        process.exit(1);
      }

      const moduleExports = await loadDefinitionModule(absolutePath);
      const definition = moduleExports.default || Object.values(moduleExports)[0];

      if (!definition) {
        console.error('❌ No default export or store definition found');
        process.exit(1);
      }

      const validation = validateStoreDefinition(definition);

      if (validation.valid) {
        console.log('✅ Definition is valid!');
      } else {
        console.error('❌ Validation errors:');
        validation.errors.forEach((err) => console.error(`   - ${err}`));
        process.exit(1);
      }

      if (validation.warnings.length > 0) {
        console.warn('\n⚠️  Warnings:');
        validation.warnings.forEach((warn) => console.warn(`   - ${warn}`));
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program
  .command('check <definitionFile>')
  .description('Check if generated files are up-to-date with the definition')
  .option('--store-dir <path>', 'Directory containing generated store files', 'src/store')
  .option('--react', 'Check React generated files')
  .option('--angular', 'Check Angular generated files')
  .action(async (definitionFile: string, options: CheckOptions) => {
    const absoluteDefPath = path.resolve(process.cwd(), definitionFile);

    if (!fs.existsSync(absoluteDefPath)) {
      console.error(`❌ Definition file not found: ${absoluteDefPath}`);
      process.exit(1);
    }

    const storeDir = path.resolve(process.cwd(), options.storeDir || 'src/store');
    const defMtime = fs.statSync(absoluteDefPath).mtimeMs;

    console.log(`🔍 Checking generated files in: ${storeDir}`);
    console.log(`📄 Definition: ${absoluteDefPath}`);
    console.log(`   Modified: ${new Date(defMtime).toLocaleString()}\n`);

    const checkReact = options.react || !options.angular;
    const checkAngular = options.angular;

    const reactFiles = ['store.ts', 'hooks.ts', 'types.ts'];
    const angularFiles = [
      'state.ts',
      'actions.ts',
      'reducer.ts',
      'selectors.ts',
      'facade.ts',
      'effects.ts',
    ];

    const filesToCheck = [...(checkReact ? reactFiles : []), ...(checkAngular ? angularFiles : [])];

    let stale = false;
    let missing = false;

    for (const file of filesToCheck) {
      const filePath = path.join(storeDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`  ❓ ${file} — not found (run polystate generate)`);
        missing = true;
        continue;
      }
      const fileMtime = fs.statSync(filePath).mtimeMs;
      const isStale = fileMtime < defMtime;
      const ageLabel = isStale
        ? `${Math.round((defMtime - fileMtime) / 1000)}s older than definition`
        : 'up-to-date';
      console.log(`  ${isStale ? '⚠️ ' : '✅'} ${file} — ${ageLabel}`);
      if (isStale) stale = true;
    }

    console.log('');
    if (missing) {
      console.error('❌ Some generated files are missing. Run: polystate generate');
      process.exit(2);
    } else if (stale) {
      console.warn('⚠️  Some generated files are stale. Run: polystate generate --overwrite');
      process.exit(1);
    } else {
      console.log('✅ All generated files are up-to-date.');
    }
  });

program.parse(process.argv);

// ============================================================================
// Helper Functions
// ============================================================================

function generateReactCode(ast: StoreAST, outDir: string, overwrite: boolean) {
  ensureDir(outDir);

  const storeCode = generateReduxStoreFromAST(ast);
  const hooksCode = generateHooksFromAST(ast);
  const typesCode = generateTypesFromAST(ast);

  writeFile(path.join(outDir, 'store.ts'), storeCode, overwrite);
  writeFile(path.join(outDir, 'hooks.ts'), hooksCode, overwrite);
  writeFile(path.join(outDir, 'types.ts'), typesCode, overwrite);

  console.log('   ✓ store.ts');
  console.log('   ✓ hooks.ts');
  console.log('   ✓ types.ts');
}

function generateAngularCode(ast: StoreAST, outDir: string, overwrite: boolean) {
  ensureDir(outDir);

  const stateCode = generateNgRxStateFromAST(ast);
  const actionsCode = generateNgRxActionsFromAST(ast);
  const reducerCode = generateNgRxReducerFromAST(ast);
  const selectorsCode = generateNgRxSelectorsFromAST(ast);
  const facadeCode = generateAngularFacadeFromAST(ast);
  const effectsCode = generateNgRxEffectsFromAST(ast);
  // generateStoreModule still uses the name string — pass a minimal object
  const moduleCode = generateStoreModule({ name: ast.name, initialState: {}, actions: {} });

  writeFile(path.join(outDir, 'state.ts'), stateCode, overwrite);
  writeFile(path.join(outDir, 'actions.ts'), actionsCode, overwrite);
  writeFile(path.join(outDir, 'reducer.ts'), reducerCode, overwrite);
  writeFile(path.join(outDir, 'selectors.ts'), selectorsCode, overwrite);
  writeFile(path.join(outDir, 'facade.ts'), facadeCode, overwrite);
  writeFile(path.join(outDir, 'effects.ts'), effectsCode, overwrite);
  writeFile(path.join(outDir, 'store.module.ts'), moduleCode, overwrite);

  console.log('   ✓ state.ts');
  console.log('   ✓ actions.ts');
  console.log('   ✓ reducer.ts');
  console.log('   ✓ selectors.ts');
  console.log('   ✓ facade.ts');
  console.log('   ✓ effects.ts');
  console.log('   ✓ store.module.ts');
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function writeFile(filePath: string, content: string, overwrite: boolean) {
  if (fs.existsSync(filePath) && !overwrite) {
    console.warn(`   ⚠️  Skipped ${filePath} (file exists, use --overwrite)`);
    return;
  }
  fs.writeFileSync(filePath, content, 'utf-8');
}

async function loadDefinitionModule(absolutePath: string): Promise<Record<string, unknown>> {
  const ext = path.extname(absolutePath).toLowerCase();

  if (ext === '.ts' || ext === '.tsx') {
    const source = fs.readFileSync(absolutePath, 'utf-8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: absolutePath,
    }).outputText;

    const localRequire = createRequire(absolutePath);
    const mod = { exports: {} as Record<string, unknown> };
    const fn = new Function('require', 'module', 'exports', '__filename', '__dirname', transpiled);

    fn(localRequire, mod, mod.exports, absolutePath, path.dirname(absolutePath));
    return mod.exports;
  }

  // Prefer ESM import when possible, then fall back to CommonJS require.
  try {
    const loaded = await import(pathToFileURL(absolutePath).href);
    return loaded as Record<string, unknown>;
  } catch {
    const localRequire = createRequire(absolutePath);
    return localRequire(absolutePath) as Record<string, unknown>;
  }
}
