/**
 * Vitest integration config — resolves @polystate/* from BUILT dist/ artifacts,
 * exactly as a real consumer app would after `npm install @polystate/core` etc.
 *
 * Run with:
 *   npx vitest run --config vitest.integration.config.ts
 */
import react from '@vitejs/plugin-react';
import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

const root = path.resolve(__dirname);

export default defineConfig({
    plugins: [react()],
    resolve: {
        // Point every @polystate/* to its compiled dist — no source bridging.
        alias: {
            '@polystate/core': path.resolve(root, 'packages/core/dist/index.js'),
            '@polystate/react': path.resolve(root, 'packages/react/dist/index.js'),
            '@polystate/angular': path.resolve(root, 'packages/angular/dist/index.js'),
            '@polystate/definition': path.resolve(root, 'packages/definition/dist/index.js'),
            '@polystate/devtools': path.resolve(root, 'packages/devtools/dist/index.js'),
        },
    },
    test: {
        name: 'integration',
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
        include: ['tests/integration/**/*.test.{ts,tsx}'],
        exclude: [...configDefaults.exclude, '**/__MACOSX/**'],
    },
});
