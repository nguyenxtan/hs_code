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
