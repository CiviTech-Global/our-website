import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    /**
     * Set before anything imports `src/config/env.ts`. `dotenv/config` does not
     * overwrite a variable that already has a value, so this wins over the
     * development `.env` and the suite gets a Redis database of its own —
     * see src/test/globalSetup.ts for what went wrong without it.
     */
    env: {
      REDIS_URL: 'redis://localhost:6379/15',
    },
    globalSetup: ['./src/test/globalSetup.ts'],
  },
});
