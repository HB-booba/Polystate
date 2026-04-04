import react from '@vitejs/plugin-react';
import path from 'path';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@polystate/definition': path.resolve(__dirname, 'packages/definition/src/index.ts'),
            '@polystate/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
            '@polystate/devtools': path.resolve(__dirname, 'packages/devtools/src/index.ts'),
            '@polystate/react': path.resolve(__dirname, 'packages/react/src/index.ts'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: [path.resolve(__dirname, 'vitest.setup.ts')],
        exclude: [...configDefaults.exclude, '**/__MACOSX/**', 'tests/integration/**'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'coverage/',
            ],
        },
    },
});
