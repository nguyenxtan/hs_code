import { test, expect } from '@playwright/test';

test('chapter toggle narrows results and keeps focus, clearing it preserves query', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' });
  await input.fill('01.01');
  await expect(page.locator('.code-link').first()).toHaveText('0101.21.00');
  const chip = page.getByRole('button', { name: /^Chương 01, / });
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(chip).toBeFocused();
  await expect(page.locator('.result-row:not([data-chapter="01"])')).toHaveCount(0);
  await input.fill('96110000');
  await expect(page.locator('.empty-state')).toContainText('Không có mã khớp trong Chương 01.');
  await page.getByRole('button', { name: 'Xem 1 kết quả ở mọi chương', exact: true }).click();
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
  await expect(input).toHaveValue('96110000');
});

test('chapter picker includes chapter 98 without a separate dataset form and restores focus', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Duyệt theo chương' }).click();
  const more = page.getByRole('button', { name: /^Xem thêm \d+ chương$/ });
  await more.click();
  const dialog = page.getByRole('dialog', { name: 'Chọn chương' });
  await expect(dialog).toBeVisible();
  const input = page.getByRole('textbox', { name: 'Gõ số chương' });
  await input.fill('98');
  await expect(dialog.locator('.chapter-option')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(more).toBeFocused();
  await more.click();
  await input.fill('98');
  await page.keyboard.press('Enter');
  await expect(page.locator('.dataset-tag').first()).toHaveText('Bổ sung VN');
  await expect(page.locator('.result-row:not([data-chapter="98"])')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: 'Bộ dữ liệu' })).toHaveCount(0);
});

test('rank priority changes separately from scope and preserves result count', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('con dấu');
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
  const count = await page.locator('.result-count').innerText();
  await page.getByRole('button', { name: 'Xếp trước: Mặc định', exact: true }).click();
  await page.getByRole('radio', { name: 'Văn phòng & in ấn', exact: true }).check();
  await page.getByRole('button', { name: 'Xong', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Xếp trước: Văn phòng & in ấn', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.result-count')).toHaveText(count);
  await page.getByRole('button', { name: 'Xếp trước: Văn phòng & in ấn', exact: true }).click();
  await page.getByRole('radio', { name: 'Mặc định (độ khớp)', exact: true }).check();
  await page.getByRole('button', { name: 'Xong', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Xếp trước: Mặc định', exact: true }),
  ).toBeVisible();
});

test('mobile stamp result is fully visible without opening a filter panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('con dấu');
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
  const b = await page.locator('.result-row').first().boundingBox();
  expect(b!.y + b!.height).toBeLessThan(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('rank picker allows moving through several options with the keyboard', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('con dấu');
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
  await page.getByRole('button', { name: 'Xếp trước: Mặc định', exact: true }).click();
  const first = page.getByRole('radio', { name: 'Mặc định (độ khớp)', exact: true });
  await first.focus();
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('radio', { name: 'Nông nghiệp', exact: true })).toBeChecked();
  await expect(page.getByRole('dialog', { name: 'Đưa nhóm này lên trước' })).toBeVisible();
  await page.getByRole('button', { name: 'Xong', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Xếp trước: Nông nghiệp', exact: true }),
  ).toBeFocused();
});
