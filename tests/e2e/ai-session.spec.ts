import { test, expect } from './fixtures';

test('AI applies a checked profile update while keeping the latest description visible', async ({
  page,
}) => {
  await page.route('**/api/status', async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    await route.fulfill({
      json: { ...data, ai: { enabled: true, provider: 'openrouter', model: 'free-test' } },
    });
  });
  let context: Record<string, unknown> = {};
  await page.route('**/api/assistant', async (route) => {
    const body = route.request().postDataJSON();
    context = body;
    await route.fulfill({
      json: {
        content: 'Bạn đóng bằng tay hay gắn máy?',
        mode: 'llm',
        references: [],
        product_id: body.product_id,
        base_revision: body.revision,
        profile_update: {
          core_query: 'con dấu',
          facts: { material_unknown: 'kim loại' },
          new_product: false,
        },
      },
    });
  });
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' })
    .fill('con dấu kim loại');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.message.assistant')).toContainText('bằng tay');
  expect(context.use_ai).toBe(true);
  expect(context.revision).toEqual(expect.any(Number));
  await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).toHaveValue(
    'con dấu kim loại',
  );
  await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click();
  await expect(
    page.getByRole('textbox', { name: 'Vật liệu chưa rõ bộ phận', exact: true }),
  ).toHaveValue('kim loại');
  await expect(page.getByRole('textbox', { name: 'Vật liệu vỏ', exact: true })).toHaveCount(0);
});

test('a delayed AI response cannot overwrite a profile edited while waiting', async ({ page }) => {
  await page.route('**/api/status', async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      json: { ...(await r.json()), ai: { enabled: true, provider: 'openrouter' } },
    });
  });
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  await page.route('**/api/assistant', async (route) => {
    const body = route.request().postDataJSON();
    await gate;
    await route.fulfill({
      json: {
        content: 'Gợi ý cho câu trước',
        mode: 'llm',
        references: [],
        product_id: body.product_id,
        base_revision: body.revision,
        profile_update: { core_query: 'con dấu', facts: { body: 'kim loại' }, new_product: false },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('con dấu');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  try {
    await expect(page.locator('.thinking')).toBeVisible();
    await page.getByRole('button', { name: 'Sửa hồ sơ', exact: true }).click();
    await page.getByRole('textbox', { name: 'Tên hàng dùng để tìm' }).fill('máy in');
  } finally {
    release();
  }
  await expect(page.locator('.thinking')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: 'Tên hàng dùng để tìm' })).toHaveValue('máy in');
  await expect(page.getByRole('textbox', { name: 'Vật liệu vỏ', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Quay lại hội thoại' }).click();
  await expect(page.locator('.messages')).toContainText('Hồ sơ đã thay đổi');
});

test('local-only choice is sent explicitly and survives a reload', async ({ page }) => {
  await page.route('**/api/status', async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      json: { ...(await r.json()), ai: { enabled: true, provider: 'openrouter' } },
    });
  });
  let useAI: unknown;
  await page.route('**/api/assistant', async (route) => {
    useAI = route.request().postDataJSON().use_ai;
    await route.fulfill({ json: { content: 'Nguồn nội bộ', mode: 'extractive', references: [] } });
  });
  await page.goto('/');
  await page.getByRole('checkbox', { name: 'Dùng AI khi bắt đầu' }).uncheck();
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('con dấu');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.message.assistant')).toContainText('Nguồn nội bộ');
  expect(useAI).toBe(false);
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'Dùng AI khi bắt đầu' })).not.toBeChecked();
});

test('a high source citation remains openable after reloading the conversation', async ({
  page,
  request,
}) => {
  const data = await (await request.get('/api/search?q=01')).json();
  const references = data.items
    .slice(0, 10)
    .map((x: { code: string }) => ({ code: x.code, version: data.version }));
  await page.route('**/api/assistant', (route) =>
    route.fulfill({ json: { content: 'Đối chiếu nguồn thứ mười [10]', mode: 'llm', references } }),
  );
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' }).fill('con dấu');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  await expect(page.locator('.references button')).toHaveCount(10);
  await page.reload();
  await page.getByRole('button', { name: 'Hỗ trợ tìm mã', exact: true }).click();
  await expect(page.locator('.references button')).toHaveCount(10);
  await page.locator('.references button').nth(9).click();
  await expect(page.getByRole('dialog', { name: /^Mã / })).toContainText('Dòng nguồn');
});

test('AI core-query changes hide the prior rows even when the visible description stays the same', async ({
  page,
}) => {
  let releaseAI!: () => void, releaseSearch!: () => void;
  const aiGate = new Promise<void>((r) => (releaseAI = r)),
    searchGate = new Promise<void>((r) => (releaseSearch = r));
  await page.route('**/api/assistant', async (route) => {
    const body = route.request().postDataJSON();
    await aiGate;
    await route.fulfill({
      json: {
        content: 'Đang đối chiếu',
        mode: 'llm',
        references: [],
        product_id: body.product_id,
        base_revision: body.revision,
        profile_update: {
          core_query: 'con dấu',
          facts: { material_unknown: 'kim loại' },
          new_product: false,
        },
      },
    });
  });
  await page.route('**/api/search?**', async (route) => {
    if (new URL(route.request().url()).searchParams.get('q') === 'con dấu') await searchGate;
    await route.continue();
  });
  await page.goto('/');
  await page
    .getByRole('textbox', { name: 'Mô tả hàng hóa để hỏi trợ lý' })
    .fill('con dấu kim loại');
  await page.getByRole('button', { name: 'Tra cùng trợ lý', exact: true }).click();
  try {
    await expect(page.locator('.code-link').first()).toBeVisible();
    releaseAI();
    await expect(page.locator('.message.assistant')).toHaveCount(1);
    await expect(page.locator('.result-list')).not.toBeVisible();
    await expect(page.locator('.retrieval-context')).toContainText('con dấu');
    await expect(page.getByRole('textbox', { name: 'Tìm mã HS hoặc tên hàng' })).toHaveValue(
      'con dấu kim loại',
    );
  } finally {
    releaseAI();
    releaseSearch();
  }
  await expect(page.locator('.code-link').first()).toBeVisible();
});
