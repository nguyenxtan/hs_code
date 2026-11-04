import { expect, it } from 'vitest';
import { resolveTurn } from '../src/lib/conversation';

it.each([
  ['tìm con dấu kim loại', 'con dấu', 'con dấu kim loại', false],
  ['con dấu kim loại', 'con dấu', 'con dấu kim loại', false],
  ['tìm con dấu nhựa', 'con dấu kim loại', 'con dấu nhựa', false],
  ['Tôi cần tra máy in laser', 'máy in', 'máy in laser', false],
  ['Bằng tay, vỏ nhựa, mặt cao su', 'con dấu', 'con dấu', false],
  ['Không phải vỏ nhựa mà vỏ kim loại', 'con dấu', 'con dấu', false],
  ['Đây có phải máy in phun không?', '84431200', '84431200', false],
  ['thuế VAT bao nhiêu?', 'con dấu', 'con dấu', false],
  ['con dấu chịu thuế bao nhiêu', 'con dấu', 'con dấu', false],
  ['con dấu có mã nào phù hợp', 'con dấu', 'con dấu', false],
  ['tìm máy in', 'con dấu', 'máy in', true],
  ['tìm máy pha cà phê', 'cà phê', 'máy pha cà phê', true],
  ['tìm mực máy in', 'máy in', 'mực máy in', true],
  ['giờ tra cà phê', 'con dấu', 'cà phê', true],
  ['tìm con dấu', '', 'con dấu', false],
] as const)('resolves %s after %s', (message, previous, query, newProduct) => {
  expect(resolveTurn(message, previous)).toEqual({ query, newProduct });
});
