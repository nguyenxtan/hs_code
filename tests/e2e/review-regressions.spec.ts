import { test, expect } from '@playwright/test';
test('assistant accepts the browser origin and rejects another host', async ({ request }) => {
  const data = { message: 'con dấu', query: 'con dấu', facts: {} };
  const same = await request.post('/api/assistant', {
    data,
    headers: { Origin: 'http://127.0.0.1:3100' },
  });
  expect(same.status()).toBe(200);
  expect((await same.json()).references[0].code).toBe('96110000');
  const other = await request.post('/api/assistant', {
    data,
    headers: { Origin: 'http://unrelated.example:3100' },
  });
  expect(other.status()).toBe(403);
});
test('retrieval abstains on nonsense and ranks the advertised unaccented stamp query first', async ({
  request,
}) => {
  for (const q of ['xqzvw', 'asdfghjk', '847130201']) {
    const r = await (await request.get('/api/search?q=' + q)).json();
    expect(r.total).toBe(0);
  }
  for (const q of ['con dau', 'con dấu bằng tay']) {
    const r = await (await request.get('/api/search?q=' + encodeURIComponent(q))).json();
    expect(r.items[0].code).toBe('96110000');
  }
});
test('assistant asks for a product instead of browsing the first four codes', async ({
  request,
}) => {
  for (const query of ['', 'tìm mã', 'tra hs', 'giúp tôi']) {
    const r = await (
      await request.post('/api/assistant', { data: { message: 'Giúp tôi', query, facts: {} } })
    ).json();
    expect(r.references).toEqual([]);
  }
});
test('assistant respects explicit dataset and chapter filters', async ({ request }) => {
  const r = await (
    await request.post('/api/assistant', {
      data: {
        message: 'con dấu',
        query: 'con dấu',
        facts: {},
        filters: { dataset: 'chapter98', chapter: '98' },
      },
    })
  ).json();
  expect(r.references.every((x: { code: string }) => x.code.startsWith('98'))).toBe(true);
  expect(
    (
      await request.post('/api/assistant', {
        data: { message: 'x', query: 'con dấu', facts: {}, filters: { chapter: 'bad' } },
      })
    ).status(),
  ).toBe(400);
});
test('mobile help is brought into view, typing is undoable as one edit, dialog focus returns', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('01012100');
  const code = page.locator('.code-link').first();
  await code.click();
  await page.keyboard.press('Escape');
  await expect(code).toBeFocused();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa' })).toBeInViewport();
  await page.getByRole('button', { name: /^Hồ sơ / }).click();
  const name = page.getByRole('textbox', { name: 'Tên sản phẩm', exact: true });
  await name.fill('Một tên sản phẩm dài hơn ba mươi ký tự để thử hoàn tác');
  await name.blur();
  await page.getByRole('button', { name: 'Hoàn tác thay đổi hồ sơ' }).click();
  await expect(name).toHaveValue('Sản phẩm mới');
});
test('shared links identify missing codes and mismatched dataset versions', async ({ page }) => {
  await page.goto('/?codes=99999999&snapshot=an-older-snapshot');
  await expect(page.locator('.shared-warning')).toContainText('Khác phiên bản');
  await expect(page.locator('.shared-warning')).toContainText('99999999');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
