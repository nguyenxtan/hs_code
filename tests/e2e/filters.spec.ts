import { test, expect } from '@playwright/test';

test('changing the dataset clears an incompatible chapter instead of hiding all results', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await page.getByRole('combobox', { name: 'Chương', exact: true }).selectOption('01');
  await expect(page.locator('.dataset-tag').first()).toHaveText('CHƯƠNG 01');
  await page.getByRole('combobox', { name: 'Bộ dữ liệu' }).selectOption('chapter98');
  await expect(page.locator('.dataset-tag').first()).toHaveText('CHƯƠNG 98');
  await expect(page.getByRole('combobox', { name: 'Chương', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Bộ dữ liệu' }).selectOption('all');
  await page.getByRole('combobox', { name: 'Chương', exact: true }).selectOption('98');
  await page.getByRole('combobox', { name: 'Bộ dữ liệu' }).selectOption('main');
  await expect(page.getByRole('combobox', { name: 'Chương', exact: true })).toHaveValue('');
  await expect(page.locator('.dataset-tag').first()).toHaveText('CHƯƠNG 01');
});

test('chapter choices reflect the query while keeping an empty selected scope removable', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('01012100');
  await expect(page.locator('.code-link').first()).toHaveText('0101.21.00');
  const chapter = page.getByRole('combobox', { name: 'Chương', exact: true });
  await expect(chapter.locator('option')).toHaveCount(2);
  await chapter.selectOption('01');
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('96110000');
  await expect(page.locator('.empty-state')).toBeVisible();
  await expect(chapter).toHaveValue('01');
  await page.getByRole('button', { name: 'Bỏ lọc chương 01', exact: true }).click();
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
});

test('mobile filters retain visible selections when closed and reset priority with scope', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const toggle = page.getByRole('button', { name: 'Bộ lọc', exact: true });
  await toggle.click();
  await page.getByRole('combobox', { name: 'Bộ dữ liệu' }).selectOption('main');
  await page.getByText('Ưu tiên kết quả', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Ưu tiên nhóm gợi ý' }).selectOption('office');
  await toggle.click();
  await expect(page.getByRole('combobox', { name: 'Bộ dữ liệu' })).not.toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Bỏ lọc danh mục chính', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /^Bỏ ưu tiên / })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa tất cả bộ lọc và ưu tiên' }).click();
  await toggle.click();
  await expect(page.getByRole('combobox', { name: 'Bộ dữ liệu' })).toHaveValue('all');
  await expect(page.getByRole('combobox', { name: 'Ưu tiên nhóm gợi ý' })).toHaveValue('');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('chapter selection preserves keyboard focus while results refresh', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Bộ lọc', exact: true }).click();
  const chapter = page.getByRole('combobox', { name: 'Chương', exact: true });
  await expect(chapter.locator('option[value="01"]')).toHaveCount(1);
  await chapter.focus();
  await chapter.selectOption('01');
  await expect(chapter).toBeFocused();
  await expect(page.locator('.dataset-tag').first()).toHaveText('CHƯƠNG 01');
  await expect(chapter).toBeFocused();
});
