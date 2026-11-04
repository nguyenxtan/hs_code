import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 45000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:3131', headless: true, trace: 'retain-on-failure' },
  webServer: {
    command: 'HS_CHAT_ENABLED=false npx next start --hostname 127.0.0.1 --port 3131',
    url: 'http://127.0.0.1:3131',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
