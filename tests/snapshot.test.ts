import { it, expect } from 'vitest';
import { recordsHash, assertImmutableSnapshot } from '../src/lib/snapshot';
it('refuses replacing an existing version with different records', () => {
  const old = [{ code: '01012100', raw: { mo_ta_vi: 'A' } }],
    next = [{ code: '01012100', raw: { mo_ta_vi: 'B' } }];
  expect(() => assertImmutableSnapshot(old, next)).toThrow(/immutable/i);
  expect(() => assertImmutableSnapshot(old, old)).not.toThrow();
  expect(recordsHash([{ code: '01012100', raw: { b: 'x', a: 'y' } }])).toBe(
    recordsHash([{ raw: { a: 'y', b: 'x' }, code: '01012100' }]),
  );
});
