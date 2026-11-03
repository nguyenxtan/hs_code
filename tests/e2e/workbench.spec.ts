import { test, expect } from '@playwright/test';

test('search becomes a compact workbench without losing input focus and shows dense rows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' });
  await input.focus();
  await page.keyboard.type('máy in');
  await expect(input).toHaveValue('máy in');
  await expect(input).toBeFocused();
  await expect(page.locator('.result-row').first()).toBeVisible();
  const boxes = await page.locator('.result-row').evaluateAll((rows) =>
    rows.map((r) => {
      const b = r.getBoundingClientRect();
      return { top: b.top, bottom: b.bottom };
    }),
  );
  expect(boxes[0].top).toBeLessThanOrEqual(200);
  expect(boxes.filter((b) => b.top >= 0 && b.bottom <= 960).length).toBeGreaterThanOrEqual(5);
  await page.evaluate(() => scrollTo(0, 1600));
  await expect(input).toBeInViewport();
});

test('mobile assistant inherits query and returns to the same scroll and opener', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('máy in');
  await expect(page.locator('.result-row').nth(9)).toBeVisible();
  const first = await page.locator('.result-row').first().boundingBox();
  expect(first!.y).toBeLessThanOrEqual(260);
  const visible = await page.locator('.result-row').evaluateAll(
    (rows) =>
      rows.filter((r) => {
        const b = r.getBoundingClientRect();
        return b.top >= 0 && b.bottom <= innerHeight;
      }).length,
  );
  expect(visible).toBeGreaterThanOrEqual(2);
  await page.locator('.result-row').nth(9).scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => scrollY);
  const opener = page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'Hỗ trợ tìm mã' })).toBeVisible();
  await expect(page.getByText('Đang hỏi về: máy in', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa' })).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();
  expect(Math.abs((await page.evaluate(() => scrollY)) - before)).toBeLessThanOrEqual(10);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('detail navigation and compare remain in the lookup flow', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('01.01');
  const code = page.locator('.code-link').first();
  await expect(code).toHaveText(/0101.21.00/);
  const second = await page.locator('.code-link').nth(1).innerText();
  await code.click();
  await page.getByRole('button', { name: 'Mã sau', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(second.trim());
  await page.getByRole('checkbox', { name: 'Thêm vào so sánh' }).check();
  await page.keyboard.press('Escape');
  await expect(code).toBeFocused();
  await expect(page.locator('.compare-bar')).toContainText('1');
});

test('saved chat remains available without automatically blocking mobile lookup', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() =>
    localStorage.setItem(
      'hs-atlas-workspace-v1',
      JSON.stringify({
        version: 1,
        activeId: 'saved-product',
        products: [
          {
            id: 'saved-product',
            name: 'Con dấu',
            query: 'con dấu',
            facts: { operation: 'bằng tay' },
            history: [],
            messages: [{ role: 'user', content: 'Tra con dấu bằng tay' }],
          },
        ],
      }),
    ),
  );
  await page.goto('/');
  await expect(page.locator('.assistant-panel')).not.toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('96110000');
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await expect(page.locator('.messages')).toContainText('Tra con dấu bằng tay');
  await expect(page.getByText('Đang hỏi về: con dấu', { exact: true })).toBeVisible();
});

test('resizing with code details open keeps the detail dialog above the assistant', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('01.01');
  await expect(page.locator('.code-link').first()).toHaveText('0101.21.00');
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await page.locator('.code-link').first().click();
  const detail = page.getByRole('dialog', { name: /^Mã / });
  await page.setViewportSize({ width: 1100, height: 900 });
  await expect
    .poll(() =>
      detail.evaluate((d) => {
        const b = d.querySelector('header button')!.getBoundingClientRect();
        return (
          document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('dialog') === d
        );
      }),
    )
    .toBe(true);
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa' })).toBeInViewport();
});

test('composition state preserves the same search element through the layout transition', async ({
  page,
}) => {
  await page.goto('/');
  const input = page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' });
  await input.focus();
  await input.evaluate((e) => e.setAttribute('data-instance', 'same-input'));
  await input.dispatchEvent('compositionstart');
  await input.fill('máy in');
  await expect(input).toHaveAttribute('data-instance', 'same-input');
  await expect(input).toBeFocused();
  await input.dispatchEvent('compositionend', { data: 'máy in' });
  await expect(page.locator('.result-row').first()).toBeVisible();
  await expect(input).toHaveValue('máy in');
});

test('primary assistant entry starts a sourced conversation directly from the home page', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const description = page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' });
  await expect(description).toBeVisible();
  await description.fill('Tra HS con dấu bằng tay');
  const send = page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true });
  await expect(send).toBeInViewport();
  await send.click();
  await expect(page.getByRole('dialog', { name: 'Hỗ trợ tìm mã' })).toBeVisible();
  await expect(page.locator('.thinking')).toHaveCount(0);
  await expect(page.locator('.references button').first()).toBeVisible();
  await expect(page.locator('.messages')).toContainText('Tra HS con dấu bằng tay');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).toBeFocused();
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
});

test('a new home-page description keeps earlier product facts in their original profile', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'hs-atlas-workspace-v1',
      JSON.stringify({
        version: 1,
        activeId: 'stamp',
        products: [
          {
            id: 'stamp',
            name: 'Con dấu',
            query: 'con dấu',
            facts: { body: 'kim loại' },
            history: [],
            messages: [{ role: 'user', content: 'Con dấu vỏ kim loại' }],
          },
        ],
      }),
    ),
  );
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('máy in');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.thinking')).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => JSON.parse(localStorage.getItem('hs-atlas-workspace-v1')!).products.length,
      ),
    )
    .toBe(2);
  const products = await page.evaluate(
    () => JSON.parse(localStorage.getItem('hs-atlas-workspace-v1')!).products,
  );
  expect(products[0].facts).toEqual({ body: 'kim loại' });
  expect(products[1].query).toBe('máy in');
  expect(products[1].facts).toEqual({});
});
