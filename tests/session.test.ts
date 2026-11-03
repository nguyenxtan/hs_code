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
