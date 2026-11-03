import { test, expect } from '@playwright/test';
test('search, filter, compare and share without product facts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).toBeVisible();
  await expect(page.locator('.assistant-panel')).not.toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('01.01');
  await expect(page.locator('.code-link').first()).toHaveText(/0101\.21\.00/);
  await page.getByRole('checkbox', { name: 'So sánh 01012100', exact: true }).check();
  await page.getByRole('checkbox', { name: 'So sánh 01012900', exact: true }).check();
  await page.getByRole('button', { name: 'So sánh mã', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('VAT trong nguồn');
  await page.getByRole('button', { name: 'Chia sẻ danh sách mã' }).click();
  const link = await page.getByRole('textbox', { name: 'Link chia sẻ' }).inputValue();
  expect(link).toContain('codes=01012100,01012900');
  expect(link).not.toContain('facts');
  expect(link).not.toContain('q=');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('');
  await page.getByRole('button', { name: 'Duyệt theo chương' }).click();
  await page.getByRole('button', { name: /^Xem thêm / }).click();
  await page.getByRole('textbox', { name: 'Gõ số chương' }).fill('98');
  await page.keyboard.press('Enter');
  await expect(page.locator('.dataset-tag').first()).toHaveText('Bổ sung VN');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '.cache/desktop.png', fullPage: false });
});
test('conversation facts are corrected, undone and persisted on this browser', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  const box = page.getByRole('textbox', { name: 'Mô tả hàng hóa' });
  for (const text of ['Tra HS con dấu bằng tay', 'Có sẵn mực', 'À phải chấm khay mực ngoài']) {
    await box.fill(text);
    await page.getByRole('button', { name: 'Gửi mô tả' }).click();
    await expect(page.locator('.thinking')).toHaveCount(0);
  }
  await page.locator('.references button').first().click();
  await expect(page.getByRole('dialog', { name: /^Mã / })).toContainText('Dòng nguồn');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Cấp mực', exact: true })).toHaveValue(
    'khay mực rời',
  );
  await page.getByRole('button', { name: 'Hoàn tác thay đổi hồ sơ' }).click();
  await expect(page.getByRole('textbox', { name: 'Cấp mực', exact: true })).toHaveValue(
    'tự có mực',
  );
  await page
    .getByRole('textbox', { name: 'Thông tin bổ sung' })
    .fill('Dùng đóng dấu lên bao bì giấy');
  await page.reload();
  await expect(page.locator('.assistant-panel')).not.toBeVisible();
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Cấp mực', exact: true })).toHaveValue(
    'tự có mực',
  );
  await expect(page.getByRole('textbox', { name: 'Thông tin bổ sung' })).toHaveValue(
    'Dùng đóng dấu lên bao bì giấy',
  );
});
test('mobile fits viewport and details explain raw taxes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('01012100');
  await page.locator('.code-link').first().click();
  await expect(page.getByRole('dialog')).toContainText('Chưa xác định mức áp dụng');
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: '.cache/mobile.png', fullPage: false });
});
test('API rejects malformed input and serves exact code from snapshot', async ({ request }) => {
  const status = await (await request.get('/api/status')).json();
  expect(status.count).toBe(11871);
  const found = await (await request.get('/api/search?q=01.01.21.00')).json();
  expect(found.items[0].code).toBe('01012100');
  expect(found.items[0].raw.vat_raw).toBe('*/8/10');
  expect((await request.get('/api/search?chapter=abc')).status()).toBe(400);
  const bad = await request.post('/api/assistant', {
    data: { message: 'x', query: 'x', facts: {} },
    headers: { Origin: 'invalid' },
  });
  expect(bad.status()).toBe(403);
  expect(
    (
      await request.post('/api/assistant', {
        data: 'null',
        headers: { 'Content-Type': 'application/json' },
      })
    ).status(),
  ).toBe(400);
});
