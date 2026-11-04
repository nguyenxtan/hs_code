import { expect, it } from 'vitest';
import { validateTurn, renderExplanations } from '../src/lib/chat-contract';

const base = {
  intent: 'refine',
  core_query: 'con dấu',
  fact_ops: [],
  clarification: '',
  explanations: [],
};
it('keeps an unspecified metal part ambiguous instead of inventing a shell fact', () => {
  const result = validateTurn(
    { ...base, fact_ops: [{ field: 'body', op: 'set', value: 'kim loại', evidence: 'kim loại' }] },
    'con dấu kim loại',
    'con dấu',
    {},
  );
  expect(result?.facts).toEqual({ material_unknown: 'kim loại' });
});
it('accepts an explicit correction and refuses a negated set or invented fact', () => {
  const result = validateTurn(
    {
      ...base,
      fact_ops: [
        { field: 'body', op: 'set', value: 'nhựa', evidence: 'vỏ nhựa' },
        { field: 'body', op: 'set', value: 'kim loại', evidence: 'vỏ kim loại' },
        { field: 'face', op: 'set', value: 'cao su', evidence: 'mặt cao su' },
      ],
    },
    'không phải vỏ nhựa mà vỏ kim loại',
    'con dấu',
    { body: 'nhựa' },
  );
  expect(result?.facts).toEqual({ body: 'kim loại' });
});
it('allows a clarification without citations and preserves the query for a code question', () => {
  const result = validateTurn(
    {
      ...base,
      intent: 'question',
      core_query: 'máy in',
      clarification: 'Bạn đang hỏi về phần nào của sản phẩm?',
    },
    'cái này có phải 9611 không',
    'con dấu',
    {},
  );
  expect(result?.core_query).toBe('con dấu');
  expect(result?.clarification).toContain('phần nào');
});
it('ignores unsupported query rewrites and clears old facts for a new item', () => {
  const result = validateTurn(
    { ...base, intent: 'new', core_query: 'mực máy in' },
    'giờ tra mực máy in',
    'con dấu',
    { body: 'nhựa' },
  );
  expect(result?.facts).toEqual({});
  expect(result?.core_query).toBe('mực máy in');
  expect(
    validateTurn({ ...base, core_query: 'tàu thủy' }, 'vỏ nhựa', 'con dấu', {})?.core_query,
  ).toBe('con dấu');
});
it('renders codes from source indices, discarding fabricated quotes and tax text', () => {
  const rows = [{ code: '96110000', description: 'Con dấu đóng để sử dụng thủ công' }];
  const result = renderExplanations(
    [
      { ref: 1, text: 'Đối chiếu cách vận hành.', quote: 'sử dụng thủ công' },
      { ref: 1, text: 'VAT 8%', quote: 'sử dụng thủ công' },
      { ref: 2, text: 'Mã khác.', quote: 'sử dụng thủ công' },
      { ref: 1, text: 'Phân loại.', quote: 'mực tự động' },
    ],
    rows,
  );
  expect(result).toContain('96110000');
  expect(result).toContain('[1]');
  expect(result).not.toContain('8%');
  expect(result).not.toContain('mực tự động');
});
it.each([
  ['vo nhua', 'body', 'nhựa', 'vo nhua', { body: 'nhựa' }],
  ['khong phai vo nhua', 'body', 'nhựa', 'vo nhua', {}],
  ['có phải vỏ nhựa không?', 'body', 'nhựa', 'vỏ nhựa', {}],
  ['không rõ vỏ nhựa', 'body', 'nhựa', 'vỏ nhựa', {}],
  ['thân inox', 'body', 'inox', 'thân inox', { body: 'inox' }],
  ['mat cao su', 'face', 'cao su', 'mat cao su', { face: 'cao su' }],
] as const)('only accepts declared facts: %s', (message, field, value, evidence, want) => {
  expect(
    validateTurn(
      { ...base, fact_ops: [{ field, op: 'set', value, evidence }] },
      message,
      'con dấu',
      {},
    )?.facts,
  ).toEqual(want);
});
it('does not interpret a negated switch as a new product', () => {
  expect(
    validateTurn(
      { ...base, intent: 'new', core_query: 'máy in' },
      'không tra máy in',
      'con dấu',
      {},
    ),
  ).toBeNull();
});
it('does not repeat known attributes or assume a material when asking about operation', async () => {
  const { normalizeClarification } = await import('../src/lib/chat-contract');
  expect(normalizeClarification('Con dấu kim loại này đóng tay hay gắn máy?', {})).toBe(
    'Sản phẩm được sử dụng bằng tay hay gắn vào máy?',
  );
  expect(normalizeClarification('Con dấu đóng tay hay gắn máy?', { operation: 'bằng tay' })).toBe(
    '',
  );
  expect(normalizeClarification('Vỏ bằng nhựa hay kim loại?', { body: 'nhựa' })).toBe('');
});
it('does not clear a known fact when the user negates a different value', () => {
  expect(
    validateTurn(
      {
        ...base,
        fact_ops: [{ field: 'body', op: 'clear', value: '', evidence: 'không phải vỏ kim loại' }],
      },
      'không phải vỏ kim loại',
      'con dấu',
      { body: 'nhựa' },
    )?.facts,
  ).toEqual({ body: 'nhựa' });
});
it('keeps a declared technology soft and rejects instruction words as product notes', () => {
  const recorded = {
    intent: 'refine',
    core_query: 'máy in laser',
    fact_ops: [
      { field: 'notes', op: 'set', value: 'laser', evidence: 'laser' },
      { field: 'notes', op: 'set', value: 'giờ tra', evidence: 'giờ tra' },
    ],
    clarification: 'Bạn cần máy hoàn chỉnh hay bộ phận?',
    explanations: [],
  };
  const parsed = validateTurn(recorded, 'giờ tra máy in laser', 'máy in laser', {});
  expect(parsed?.facts).toEqual({ notes: 'laser' });
  expect(parsed?.core_query).toBe('máy in');
});
