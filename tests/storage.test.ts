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
