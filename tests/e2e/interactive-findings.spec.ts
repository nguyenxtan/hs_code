import { test, expect } from '@playwright/test';

test('natural description returns stamps rather than fur and shrimp in both panes', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' })
    .fill('Tôi cần tra con dấu');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.thinking')).toHaveCount(0);
  await expect(page.locator('.references button').first()).toContainText('96110000');
  await expect(page.locator('.references button')).toHaveCount(1);
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
});

test('new queries do not show the previous product rows while waiting for results', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  const box = page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' });
  await box.fill('01.01');
  await expect(page.locator('.code-link').first()).toHaveText('0101.21.00');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/search?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('q') === 'con dấu') await gate;
    await route.continue();
  });
  try {
    await box.fill('con dấu');
    await expect(page.locator('.search-progress')).toContainText('Đang tìm');
    await expect(page.locator('.result-list')).not.toBeVisible();
  } finally {
    release();
  }
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
});

test('declared facts feed the lookup request and chat without applying exclusion filters', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('con dau');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.thinking')).toHaveCount(0);
  const next = page.waitForRequest((r) => {
    const u = new URL(r.url());
    return (
      u.pathname === '/api/search' &&
      r.method() === 'POST' &&
      r.postData()?.includes('cao su') === true
    );
  });
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })
    .fill('Bằng tay, vỏ nhựa, mặt cao su');
  await page.getByRole('button', { name: 'Gửi mô tả', exact: true }).click();
  const request = await next;
  expect(JSON.parse(request.postData()!).facts).toEqual(['bằng tay', 'nhựa', 'cao su']);
  await expect(page.locator('.thinking')).toHaveCount(0);
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
  await expect(
    page.locator('.message.assistant').last().locator('.references button').first(),
  ).toContainText('96110000');
});

test('ranking hints are bounded and do not remove lookup candidates', async ({ request }) => {
  const before = await (await request.get('/api/search?q=con%20dau')).json();
  const ranked = await (
    await request.post('/api/search?q=con%20dau', { data: { facts: ['bằng tay', 'nhựa'] } })
  ).json();
  expect(ranked.total).toBe(before.total);
  for (const facts of [{ body: 'nhựa' }, [42], ['x'.repeat(201)]]) {
    expect((await request.post('/api/search?q=con%20dau', { data: { facts } })).status()).toBe(400);
  }
});

test('resuming a long mobile conversation opens at the newest reply', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' })
    .fill('Tôi cần tra con dấu');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.thinking')).toHaveCount(0);
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })
    .fill('Bằng tay, vỏ nhựa, mặt cao su');
  await page.getByRole('button', { name: 'Gửi mô tả', exact: true }).click();
  await expect(page.locator('.thinking')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await expect
    .poll(() =>
      page.locator('.messages').evaluate((e) => e.scrollHeight - e.clientHeight - e.scrollTop),
    )
    .toBeLessThan(10);
});
