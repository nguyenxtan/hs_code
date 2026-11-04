import { test, expect } from './fixtures';

test('failed lookup can be retried without showing stale rows or losing the query', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' });
  await input.fill('96110000');
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
  await page.route('**/api/search?**', (route) => route.abort('failed'));
  await input.fill('01.01');
  await expect(page.locator('.error-box')).toBeVisible();
  await expect(page.locator('.result-list')).not.toBeVisible();
  await page.unroute('**/api/search?**');
  await page.getByRole('button', { name: 'Thử tải lại', exact: true }).click();
  await expect(page.locator('.code-link').first()).toHaveText('0101.21.00');
  await expect(input).toHaveValue('01.01');
  await expect(page.locator('.error-box')).toHaveCount(0);
});

test('a filtered code can be handed to the assistant while retaining the result scope', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' });
  await input.fill('con dấu');
  await expect(page.locator('.code-link').first()).toHaveText('9611.00.00');
  await page.getByRole('button', { name: /^Chương 96, / }).click();
  await page.locator('.code-link').first().click();
  await page.getByRole('button', { name: 'Hỏi trợ lý về mã này', exact: true }).click();
  await expect(page.getByText('Đang hỏi về: 96110000', { exact: true })).toBeVisible();
  const message = page.getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true });
  await message.fill('Mặt bằng cao su');
  await page.getByRole('button', { name: 'Gửi mô tả', exact: true }).click();
  await expect(page.locator('.thinking')).toHaveCount(0);
  await expect(page.locator('.references button').last()).toContainText('96110000');
  await expect(input).toHaveValue('con dấu');
  await expect(page.getByRole('button', { name: /^Chương 96, / })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('a greeting asks for goods without returning unrelated HS references', async ({ request }) => {
  const r = await request.post('/api/assistant', {
    data: { message: 'chào', query: 'chào', facts: {} },
  });
  expect(r.status()).toBe(200);
  expect((await r.json()).references).toEqual([]);
});

test('handoff from a compared code closes comparison before opening its conversation', async ({
  page,
}) => {
  await page.goto('/?codes=96110000,01012100');
  const compare = page.getByRole('dialog', { name: 'So sánh mã ứng viên' });
  await expect(compare).toBeVisible();
  await compare.getByRole('button', { name: 'Mở chi tiết & nguồn ↗' }).first().click();
  await page.getByRole('button', { name: 'Hỏi trợ lý về mã này', exact: true }).click();
  await expect(compare).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })).toBeInViewport();
});

test('explicit code discussion keeps lookup chapter but retrieves the chosen code outside it', async ({
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
            facts: {},
            history: [],
            messages: [
              {
                role: 'assistant',
                content: 'Mã tham khảo',
                references: [{ code: '96110000', version: '' }],
              },
            ],
          },
        ],
      }),
    ),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Tra danh mục', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('01.01');
  await expect(page.locator('.code-link').first()).toHaveText('0101.21.00');
  await page.getByRole('button', { name: /^Chương 01, / }).click();
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await page.getByRole('button', { name: /^Hồ sơ:/ }).click();
  await page.getByRole('combobox', { name: 'Sản phẩm đang trao đổi' }).selectOption('stamp');
  await page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' }).fill('01.01');
  await page.locator('.references button').first().click();
  await page.getByRole('button', { name: 'Hỏi trợ lý về mã này', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa', exact: true })
    .fill('Tôi cần đối chiếu mã đang xem');
  await page.getByRole('button', { name: 'Gửi mô tả', exact: true }).click();
  await expect(page.locator('.thinking')).toHaveCount(0);
  await expect(page.locator('.references button').last()).toContainText('96110000');
  await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).toHaveValue('01.01');
  await expect(page.getByRole('button', { name: /^Chương 01, / })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
