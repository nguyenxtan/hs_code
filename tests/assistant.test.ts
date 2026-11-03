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
it('rejects unknown dotted codes and incorrect citation-to-code assignments', () => {
  expect(safeGeneratedText('Mã 8471.30.90 [1]', ['96110000'])).toBe(false);
  expect(safeGeneratedText('Nhóm 8471 [1]', ['96110000'])).toBe(false);
  expect(safeGeneratedText('9611.00.00 [2]', ['96110000', '01012100'])).toBe(false);
  expect(safeGeneratedText('9611.00.00 [1]', ['96110000'])).toBe(true);
});
it('checks two-digit grouped HS notation as well as the UI notation', () => {
  expect(safeGeneratedText('Mã 84.71.30.90 [1]', ['96110000'])).toBe(false);
  expect(safeGeneratedText('Mã 96.11.00.00 [1]', ['96110000'])).toBe(true);
});
