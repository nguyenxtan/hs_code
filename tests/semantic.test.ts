import { it, expect } from 'vitest';
import { cosine, fuseRanks, hybridSearch } from '../src/lib/semantic';
import type { Snapshot } from '../src/lib/types';
it('compares normalized directions and refuses dimensional mismatch', () => {
  expect(cosine([1, 0], [1, 0])).toBe(1);
  expect(cosine([1, 0], [0, 1])).toBe(0);
  expect(cosine([1], [1, 0])).toBe(0);
});
it('fuses both lists without losing lexical candidates or duplicating codes', () => {
  const v = fuseRanks(['01012100', '96110000'], ['96110000', '15071000']);
  expect(v[0]).toBe('96110000');
  expect(new Set(v).size).toBe(3);
  expect(v).toContain('01012100');
});
it('keeps lexical results when an enabled vector index is missing', async () => {
  const before = process.env.HS_EMBEDDINGS_ENABLED,
    path = process.env.HS_EMBEDDINGS_PATH;
  process.env.HS_EMBEDDINGS_ENABLED = 'true';
  process.env.HS_EMBEDDINGS_PATH = '/missing/hs-test-index.json';
  try {
    const s = {
      version: 'test',
      records: [
        {
          code: '01012100',
          chapter: '01',
          dataset: 'main',
          description: 'Ngựa',
          description_en: '',
          search_text: 'ngua',
        },
      ],
    } as Snapshot;
    const r = await hybridSearch(s, { q: 'ngựa' });
    expect(r.mode).toBe('lexical_fallback');
    expect(r.items[0].code).toBe('01012100');
  } finally {
    if (before === undefined) delete process.env.HS_EMBEDDINGS_ENABLED;
    else process.env.HS_EMBEDDINGS_ENABLED = before;
    if (path === undefined) delete process.env.HS_EMBEDDINGS_PATH;
    else process.env.HS_EMBEDDINGS_PATH = path;
  }
});
it('prefers lexical evidence over a semantic-only code when scores tie', () => {
  expect(fuseRanks(['96110000'], ['82121000'])[0]).toBe('96110000');
});
it('does not invoke semantic retrieval when there is no lexical evidence', async () => {
  const before = process.env.HS_EMBEDDINGS_ENABLED;
  process.env.HS_EMBEDDINGS_ENABLED = 'true';
  try {
    const s = { version: 'test', records: [] } as unknown as Snapshot;
    const r = await hybridSearch(s, { q: 'xqzvw' });
    expect(r.total).toBe(0);
    expect(r.mode).toBe('lexical_no_candidates');
  } finally {
    if (before === undefined) delete process.env.HS_EMBEDDINGS_ENABLED;
    else process.env.HS_EMBEDDINGS_ENABLED = before;
  }
});
