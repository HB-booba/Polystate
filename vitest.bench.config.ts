/**
 * Vitest benchmark config.
 *
 * Run:
 *   npx vitest bench --config vitest.bench.config.ts
 */
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@polystate/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
        },
    },
    test: {
        globals: true,
        include: ['bench/**/*.bench.ts'],
        benchmark: {
            // tinybench options
            include: ['bench/**/*.bench.ts'],
            outputFile: './bench/results.json',
        },
    },
});
