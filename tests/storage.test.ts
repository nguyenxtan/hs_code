import { it, expect } from 'vitest';
import { createWorkspace, serializeWorkspace, restoreWorkspace } from '../src/lib/session';
it('stores only code/version references instead of duplicating raw rows', () => {
  const w = createWorkspace();
  w.products[0].messages = [
    {
      role: 'assistant',
      content: 'x',
      references: [
        { code: '96110000', version: 'snapshot-1', raw: { huge: 'x'.repeat(100000) } } as never,
      ],
    },
  ];
  const text = serializeWorkspace(w);
  expect(text.length).toBeLessThan(2000);
  expect(text).not.toContain('huge');
  expect(restoreWorkspace(JSON.parse(text))?.products[0].messages[0].references).toEqual([
    { code: '96110000', version: 'snapshot-1' },
  ]);
});
it('drops broken references but preserves the product and dialogue during restoration', () => {
  const w = createWorkspace();
  w.products[0].name = 'Con dấu';
  w.products[0].messages = [
    { role: 'assistant', content: 'Giữ lời trao đổi', references: [{} as never] },
  ];
  const out = restoreWorkspace(w);
  expect(out?.products[0].name).toBe('Con dấu');
  expect(out?.products[0].messages[0].references).toEqual([]);
});
it('preserves the highest citation returned by the assistant after reload', () => {
  const w = createWorkspace();
  const references = Array.from({ length: 10 }, (_, i) => ({
    code: String(10000000 + i),
    version: 'snapshot-1',
  }));
  w.products[0].messages = [
    { role: 'assistant', content: 'Đối chiếu nguồn thứ mười [10]', references },
  ];
  const restored = restoreWorkspace(JSON.parse(serializeWorkspace(w)));
  expect(restored?.products[0].messages[0].references).toEqual(references);
});
it('migrates legacy custom fact fields into bounded notes so chat remains usable', async () => {
  const { validFacts } = await import('../src/lib/search');
  const w = createWorkspace();
  w.products[0].facts = { body: 'nhựa', custom_purpose: 'đóng dấu bao bì' };
  const restored = restoreWorkspace(w)!;
  expect(restored.products[0].facts.body).toBe('nhựa');
  expect(restored.products[0].facts.notes).toContain('đóng dấu bao bì');
  expect(validFacts(restored.products[0].facts)).toBe(true);
  expect(restored.products[0].facts.custom_purpose).toBeUndefined();
});
