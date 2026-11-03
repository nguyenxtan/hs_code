import { it, expect } from 'vitest';
import { extractiveReply, safeGeneratedText } from '../src/lib/assistant';
it('does not turn raw VAT into a rate', () => {
  const r = extractiveReply('thuế VAT là bao nhiêu', []);
  expect(r.content).toContain('chưa xác định');
  expect(r.content).not.toMatch(/\d+\s*%/);
});
it('rejects generated unknown codes and tax assertions', () => {
  expect(safeGeneratedText('Mã 99999999', ['01012100'])).toBe(false);
  expect(safeGeneratedText('VAT 8%', ['01012100'])).toBe(false);
  expect(safeGeneratedText('Ứng viên 01012100 [1]', ['01012100'])).toBe(true);
});
