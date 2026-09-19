import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Pure logic only: the PIN policy mirror, the mock gateway's rules and the auth state
    // machine. No jsdom and no component tests, so the suite stays one dev dependency.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
