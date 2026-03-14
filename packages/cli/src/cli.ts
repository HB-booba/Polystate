#!/usr/bin/env node

/**
 * Polystate CLI
 * Code generation tool for framework-agnostic store definitions
 */

import {
    normalizeStoreDefinition,
    validateStoreDefinition,
} from '@polystate/definition';
import {
    generateAngularFacade,
    generateNgRxActions,
    generateNgRxReducer,
    generateNgRxSelectors,
    generateNgRxState,
    generateStoreModule,
} from '@polystate/generator-angular';
import {
    generateHooks,
    generateTypes as generateReactTypes,
    generateReduxStore,
} from '@polystate/generator-react';
import { program } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

interface GenerateOptions {
    outDir?: string;
    react?: boolean;
    angular?: boolean;
    overwrite?: boolean;
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
    .action(async (definitionFile: string, options: any) => {
        try {
            console.log('🔍 Loading store definition...');

            // Resolve the definition file path
            const absolutePath = path.resolve(process.cwd(), definitionFile);

            if (!fs.existsSync(absolutePath)) {
                console.error(`❌ Definition file not found: ${absolutePath}`);
                process.exit(1);
            }

            // Load the definition file
            const moduleExports = require(absolutePath);
            const definition =
                moduleExports.default || Object.values(moduleExports)[0];

            if (!definition) {
                console.error('❌ No default export or store definition found');
                process.exit(1);
            }

            // Validate the definition
            console.log('✓ Validating store definition...');
            const validation = validateStoreDefinition(definition);

            if (!validation.valid) {
                console.error('❌ Validation errors:');
                validation.errors.forEach((err) => console.error(`   - ${err}`));
                process.exit(1);
            }

            if (validation.warnings.length > 0) {
                console.warn('⚠️  Warnings:');
                validation.warnings.forEach((warn) => console.warn(`   - ${warn}`));
            }

            const normalized = normalizeStoreDefinition(definition);

            // Determine which generators to run
            const generateReact =
                options.react || options.both || (!options.angular && !options.both);
            const generateAngular = options.angular || options.both;

            const outDir = options.outDir || 'src/store';
            const overwrite = options.overwrite || false;

            if (generateReact) {
                console.log('\n📦 Generating React Redux code...');
                generateReactCode(normalized, outDir, overwrite);
            }

            if (generateAngular) {
                console.log('\n📦 Generating Angular NgRx code...');
                generateAngularCode(normalized, outDir, overwrite);
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
    .action((definitionFile: string) => {
        try {
            console.log('🔍 Validating store definition...');

            const absolutePath = path.resolve(process.cwd(), definitionFile);

            if (!fs.existsSync(absolutePath)) {
                console.error(`❌ Definition file not found: ${absolutePath}`);
                process.exit(1);
            }

            const moduleExports = require(absolutePath);
            const definition =
                moduleExports.default || Object.values(moduleExports)[0];

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

program.parse(process.argv);

// ============================================================================
// Helper Functions
// ============================================================================

function generateReactCode(definition: any, outDir: string, overwrite: boolean) {
    ensureDir(outDir);

    const storeCode = generateReduxStore(definition);
    const hooksCode = generateHooks(definition);
    const typesCode = generateReactTypes(definition);

    writeFile(path.join(outDir, 'store.ts'), storeCode, overwrite);
    writeFile(path.join(outDir, 'hooks.ts'), hooksCode, overwrite);
    writeFile(path.join(outDir, 'types.ts'), typesCode, overwrite);

    console.log('   ✓ store.ts');
    console.log('   ✓ hooks.ts');
    console.log('   ✓ types.ts');
}

function generateAngularCode(definition: any, outDir: string, overwrite: boolean) {
    ensureDir(outDir);

    const stateCode = generateNgRxState(definition);
    const actionsCode = generateNgRxActions(definition);
    const reducerCode = generateNgRxReducer(definition);
    const selectorsCode = generateNgRxSelectors(definition);
    const facadeCode = generateAngularFacade(definition);
    const moduleCode = generateStoreModule(definition);

    writeFile(path.join(outDir, 'state.ts'), stateCode, overwrite);
    writeFile(path.join(outDir, 'actions.ts'), actionsCode, overwrite);
    writeFile(path.join(outDir, 'reducer.ts'), reducerCode, overwrite);
    writeFile(path.join(outDir, 'selectors.ts'), selectorsCode, overwrite);
    writeFile(path.join(outDir, 'facade.ts'), facadeCode, overwrite);
    writeFile(path.join(outDir, 'store.module.ts'), moduleCode, overwrite);

    console.log('   ✓ state.ts');
    console.log('   ✓ actions.ts');
    console.log('   ✓ reducer.ts');
    console.log('   ✓ selectors.ts');
    console.log('   ✓ facade.ts');
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
