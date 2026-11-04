import { expect, it, vi } from 'vitest';
import { answerChat } from '../src/lib/chat-service';
import type { Snapshot, HSRecord } from '../src/lib/types';
const row = {
  code: '96110000',
  description: 'Con dấu đóng để sử dụng thủ công',
  description_en: '',
  chapter: '96',
  dataset: 'main',
  search_text: 'con dau dong de su dung thu cong',
} as HSRecord;
const snapshot = { version: 'test', records: [row] } as Snapshot;
const request = {
  message: 'con dấu kim loại',
  query: 'con dấu kim loại',
  core_query: 'con dấu',
  facts: {},
  history: [],
  filters: {},
  use_ai: true,
  product_id: 'stamp',
  revision: 1,
  previous_query: 'con dấu',
};
const turn = {
  intent: 'refine',
  core_query: 'con dấu',
  fact_ops: [{ field: 'material_unknown', op: 'set', value: 'kim loại', evidence: 'kim loại' }],
  clarification: 'Bạn đóng bằng tay hay gắn vào máy?',
  explanations: [],
};
it('uses structured intent/facts, retrieves again after a patch and allows pure clarification', async () => {
  const model = vi.fn().mockResolvedValue({ ok: true, data: turn });
  const out = await answerChat(snapshot, request, { model });
  expect(out.profile_update?.facts).toEqual({ material_unknown: 'kim loại' });
  expect(out.content).toContain('bằng tay');
  expect(out.base_revision).toBe(1);
  expect(model).toHaveBeenCalledTimes(1);
  expect(out.content).toBe('Sản phẩm được sử dụng bằng tay hay gắn vào máy?');
  expect(out.references).toEqual([]);
  expect(out.candidate_codes).toContain('96110000');
});
it('does not use the network for tax, greetings, numeric lookup or local-only mode', async () => {
  const model = vi.fn();
  for (const patch of [
    { message: 'thuế VAT bao nhiêu' },
    { message: 'chào' },
    { message: '96110000', query: '96110000' },
    { use_ai: false },
  ])
    await answerChat(snapshot, { ...request, ...patch }, { model });
  expect(model).not.toHaveBeenCalled();
});
it('keeps useful extracted sources when model is unavailable', async () => {
  const out = await answerChat(snapshot, request, {
    model: vi.fn().mockResolvedValue({ ok: false, reason: 'quota' }),
  });
  expect(out.mode).toBe('extractive');
  expect(out.content).toContain('96110000');
  expect(out.notice).toContain('trích');
});
it('discards earlier explanations when the model changes product and clears earlier facts', async () => {
  const printer = {
    ...row,
    code: '84431200',
    chapter: '84',
    description: 'Máy in văn phòng',
    search_text: 'may in van phong',
  };
  const model = vi
    .fn()
    .mockResolvedValueOnce({
      ok: true,
      data: {
        ...turn,
        intent: 'new',
        core_query: 'máy in',
        fact_ops: [],
        explanations: [{ ref: 1, text: 'Cũ', quote: 'sử dụng thủ công' }],
      },
    })
    .mockResolvedValueOnce({ ok: false, reason: 'quota' });
  const out = await answerChat(
    { ...snapshot, records: [row, printer] },
    { ...request, message: 'tôi muốn đổi sang máy in', facts: { body: 'nhựa' } },
    { model },
  );
  expect(out.profile_update?.new_product).toBe(true);
  expect(out.profile_update?.facts).toEqual({});
  expect(out.content).not.toContain('Cũ');
  expect(out.candidate_codes[0]).toBe('84431200');
  expect(model.mock.calls.length).toBeLessThanOrEqual(2);
});
