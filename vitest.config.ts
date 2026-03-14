import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@polystate/definition': path.resolve(__dirname, 'packages/definition/src/index.ts'),
            '@polystate/core': path.resolve(__dirname, 'packages/core/src/index.ts'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./vitest.setup.ts'],
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
