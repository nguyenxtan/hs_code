import { test as base, expect } from '@playwright/test';
export { expect };
export const test = base.extend<{ offlineGuard: void }>({
  offlineGuard: [
    async ({ request }, use) => {
      const status = await (await request.get('/api/status')).json();
      expect(status.ai?.enabled, 'Browser suite must use the separate remote-disabled server').toBe(
        false,
      );
      await use();
    },
    { auto: true },
  ],
});
