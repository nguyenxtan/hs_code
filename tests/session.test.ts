import { describe, it, expect } from 'vitest';
import {
  createWorkspace,
  updateProduct,
  undoProduct,
  addProduct,
  extractFacts,
  validWorkspace,
} from '../src/lib/session';
describe('product session', () => {
  it('corrects a fact, can undo, and keeps another product independent', () => {
    let w = createWorkspace();
    const id = w.activeId;
    w = updateProduct(w, id, { name: 'Con dấu', facts: { ink: 'tự có mực' } });
    w = updateProduct(w, id, { facts: { ink: 'khay mực rời' } });
    expect(w.products[0].facts.ink).toBe('khay mực rời');
    w = undoProduct(w, id);
    expect(w.products[0].facts.ink).toBe('tự có mực');
    w = addProduct(w, 'Máy in');
    expect(w.products[1].facts).toEqual({});
    expect(w.products[0].name).toBe('Con dấu');
  });
  it('extracts an explicit correction with separate ink and operation facts', () => {
    expect(extractFacts('À phải chấm khay mực ngoài, dùng bằng tay')).toEqual({
      ink: 'khay mực rời',
      operation: 'bằng tay',
    });
  });
  it('does not accept corrupted saved history that would break undo', () => {
    const w = createWorkspace();
    (w.products[0].history as unknown[]).push(null);
    expect(validWorkspace(w)).toBe(false);
  });
});
it('does not turn negated corrections into positive facts', () => {
  expect(extractFacts('À không, nó gắn máy tự động chứ không phải bằng tay')).toEqual({
    operation: 'gắn máy',
  });
  expect(extractFacts('Không phải vỏ nhựa')).toEqual({});
  expect(extractFacts('Không phải vỏ nhựa', { body: 'nhựa' })).toEqual({ body: '' });
});
it('groups typing into one undo operation and ignores unchanged updates', () => {
  let w = createWorkspace();
  const id = w.activeId;
  w = updateProduct(w, id, { name: 'Tên gốc' });
  const before = w.products[0].history.length;
  w = updateProduct(w, id, { name: 'A' }, 'edit-one');
  w = updateProduct(w, id, { name: 'AB' }, 'edit-one');
  w = updateProduct(w, id, { name: 'ABC' }, 'edit-one');
  expect(w.products[0].history.length).toBe(before + 1);
  w = undoProduct(w, id);
  expect(w.products[0].name).toBe('Tên gốc');
  const len = w.products[0].history.length;
  w = updateProduct(w, id, { name: 'Tên gốc' });
  expect(w.products[0].history.length).toBe(len);
  w = updateProduct(w, id, { facts: { body: 'nhựa' } });
  w = updateProduct(w, id, { facts: { body: '' } });
  expect(w.products[0].facts).not.toHaveProperty('body');
});
it('handles negation across ordinary descriptive words and a Vietnamese contrast clause', () => {
  expect(extractFacts('Không phải loại dùng bằng tay')).toEqual({});
  expect(extractFacts('Không phải bằng tay mà gắn máy')).toEqual({ operation: 'gắn máy' });
  expect(extractFacts('Không biết có phải bằng tay không')).toEqual({});
});
it('persists a code discussion, clears its focus on query edit and restores it on undo', async () => {
  const { restoreWorkspace, serializeWorkspace } = await import('../src/lib/session');
  let w = createWorkspace();
  const id = w.activeId;
  w = updateProduct(w, id, { query: '96110000', focus_code: '96110000' });
  w = restoreWorkspace(JSON.parse(serializeWorkspace(w)))!;
  expect(w.products[0].focus_code).toBe('96110000');
  w = updateProduct(w, id, { query: 'con dấu' });
  expect(w.products[0].focus_code).toBeUndefined();
  w = undoProduct(w, id);
  expect(w.products[0].focus_code).toBe('96110000');
  w = undoProduct(w, id);
  expect(w.products[0].focus_code).toBeUndefined();
});

it('guards model updates against edits and does not roll revision back on undo', async () => {
  const { applyModelProfile } = await import('../src/lib/session');
  let w = createWorkspace();
  const id = w.activeId;
  w = updateProduct(w, id, { query: 'con dấu' });
  const revision = w.products[0].revision;
  w = updateProduct(w, id, { facts: { body: 'nhựa' } });
  expect(
    applyModelProfile(w, id, revision, { core_query: 'con dấu', facts: { body: 'kim loại' } }),
  ).toEqual(w);
  const current = w.products[0].revision;
  w = undoProduct(w, id);
  expect(w.products[0].revision).toBeGreaterThan(current);
});
it('migrates saved sessions without revisions', async () => {
  const { restoreWorkspace } = await import('../src/lib/session');
  const w = createWorkspace();
  delete (w.products[0] as unknown as Record<string, unknown>).revision;
  expect(restoreWorkspace(w)?.products[0].revision).toBe(0);
});
it('moves only a missed new-product turn and leaves earlier profile facts intact', async () => {
  const { finishAssistantTurn } = await import('../src/lib/session');
  let w = createWorkspace();
  const id = w.activeId;
  w = updateProduct(w, id, { query: 'con dấu', facts: { body: 'nhựa' } });
  const before = w.products[0];
  w = {
    ...w,
    products: w.products.map((p) => ({
      ...p,
      revision: p.revision + 1,
      messages: [{ id: 'turn', role: 'user' as const, content: 'máy in' }],
    })),
  };
  const result = finishAssistantTurn(
    w,
    { id, revision: w.products[0].revision, turnId: 'turn', before, editToken: 'edit' },
    { core_query: 'máy in', query: 'máy in', facts: {}, new_product: true },
    { role: 'assistant', content: 'Nguồn máy in' },
  );
  expect(result.workspace.products).toHaveLength(2);
  expect(result.workspace.products[0].facts).toEqual({ body: 'nhựa' });
  expect(result.workspace.products[0].messages).toEqual([]);
  expect(result.workspace.products[1].facts).toEqual({});
  expect(result.workspace.products[1].messages).toHaveLength(2);
});
it('does not optimistically store a confirmation question as a declared fact', () => {
  expect(extractFacts('Có phải vỏ nhựa không?')).toEqual({});
});
it('records a declared material without inventing the part', () => {
  expect(extractFacts('con dấu kim loại')).toEqual({ material_unknown: 'kim loại' });
  expect(extractFacts('không biết có phải kim loại không?')).toEqual({});
});
