import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['server/test/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      ALLOW_DEMO_DB: 'true',
      SEED_DEMO: 'true',
      JWT_SECRET: 'test-only-secret-that-is-long-enough-for-hs256',
      BCRYPT_ROUNDS: '4',
      APP_URL: 'http://localhost:5173',
      DATABASE_URL: '',
    },
    testTimeout: 60_000,
    hookTimeout: 60_000,
    sequence: { concurrent: false },
  },
});
