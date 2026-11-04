import { test, expect } from '@playwright/test';

test('home offers one input at a time with the assistant selected first', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).not.toBeVisible();
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }),
  ).not.toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).toBeVisible();
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' })).toBeFocused();
});

test('a refined search uses the latest description and clearing lookup keeps chat in place', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('con dấu');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.message.assistant')).toHaveCount(1);
  const before = await page.locator('.assistant-panel').boundingBox();
  const request = page.waitForRequest(
    (r) => r.url().includes('/api/assistant') && r.method() === 'POST',
  );
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })
    .fill('tìm con dấu kim loại');
  await page.getByRole('button', { name: 'Gửi mô tả', exact: true }).click();
  expect((await request).postDataJSON().query).toBe('con dấu kim loại');
  await expect(page.locator('.assistant-context')).toHaveText('Đang hỏi về: con dấu kim loại');
  await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).toHaveValue(
    'con dấu kim loại',
  );
  await expect(page.locator('.message.assistant')).toHaveCount(2);
  await expect(page.locator('.message.assistant').last().locator('.references button')).toHaveCount(
    1,
  );
  await expect(
    page.locator('.message.assistant').last().locator('.references button'),
  ).toContainText('96110000');
  await page.getByRole('button', { name: 'Xóa truy vấn' }).click();
  const after = await page.locator('.assistant-panel').boundingBox();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(5);
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })).toBeInViewport();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('hs-atlas-workspace-v1')!).products.length,
    ),
  ).toBe(1);
});

test('lookup handoff applies changed properties and a tax question keeps the product', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('con dấu vỏ nhựa');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.message.assistant')).toHaveCount(1);
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('con dấu vỏ kim loại');
  await page.getByRole('button', { name: 'Hỏi về mặt hàng này', exact: true }).click();
  const next = page.waitForRequest(
    (r) => r.url().includes('/api/assistant') && r.method() === 'POST',
  );
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })
    .fill('con dấu chịu thuế bao nhiêu');
  await page.getByRole('button', { name: 'Gửi mô tả', exact: true }).click();
  const data = (await next).postDataJSON();
  expect(data.query).toBe('con dấu vỏ kim loại');
  expect(data.facts).toEqual({ body: 'kim loại' });
  await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).toHaveValue(
    'con dấu vỏ kim loại',
  );
});

test('opening help after a different lookup uses that product and preserves the earlier session', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('con dấu vỏ nhựa');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.message.assistant')).toHaveCount(1);
  await page.getByRole('button', { name: 'Đóng hỗ trợ' }).click();
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('máy in');
  await expect(page.locator('.code-link').first()).toBeVisible();
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await expect(page.locator('.assistant-context')).toHaveText('Đang hỏi về: máy in');
  await expect(page.locator('.messages')).not.toContainText('con dấu vỏ nhựa');
  const products = await page.evaluate(
    () => JSON.parse(localStorage.getItem('hs-atlas-workspace-v1')!).products,
  );
  expect(products).toHaveLength(2);
  expect(products[0].facts).toEqual({ body: 'nhựa' });
  expect(products[1].facts).toEqual({});
});

test('a different item mentioning the former product gets its own retrieval history', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('máy in vỏ nhựa');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.message.assistant')).toHaveCount(1);
  const next = page.waitForRequest(
    (r) => r.url().includes('/api/assistant') && r.method() === 'POST',
  );
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true }).fill('tìm mực máy in');
  await page.getByRole('button', { name: 'Gửi mô tả', exact: true }).click();
  const data = (await next).postDataJSON();
  expect(data.query).toBe('mực máy in');
  expect(data.facts).toEqual({});
  expect(data.history).toEqual([]);
  await expect(page.locator('.messages')).not.toContainText('máy in vỏ nhựa');
});
