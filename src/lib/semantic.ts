import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Snapshot, SearchOptions, SearchResult } from './types';
import { searchRecords, parseQuery } from './search';
export function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    aa = 0,
    bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  return aa && bb ? dot / Math.sqrt(aa * bb) : 0;
}
export function fuseRanks(a: string[], b: string[]): string[] {
  const scores = new Map<string, number>();
  for (const list of [a, b])
    list.forEach((code, i) => scores.set(code, (scores.get(code) || 0) + 1 / (60 + i + 1)));
  return [...scores].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map((x) => x[0]);
}
export type EmbeddingIndex = {
  version: string;
  model: string;
  dimensions: number;
  count: number;
  complete: boolean;
  rows: { code: string; vector: number[] }[];
};
let extractor: Promise<unknown> | undefined;
let indexCache: Promise<EmbeddingIndex> | undefined;
export async function embeddingExtractor(model: string) {
  if (!extractor)
    extractor = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers');
      env.cacheDir = path.resolve('.cache/models');
      return pipeline('feature-extraction', model, { dtype: 'q8', device: 'cpu' });
    })();
  return (await extractor) as {
    (input: string[], options: Record<string, unknown>): Promise<{ tolist(): number[][] }>;
  };
}
export async function hybridSearch(
  snapshot: Snapshot,
  options: SearchOptions,
): Promise<SearchResult> {
  const lexical = searchRecords(snapshot.records, options);
  if (process.env.HS_EMBEDDINGS_ENABLED !== 'true' || !options.q || parseQuery(options.q).numeric)
    return { ...lexical, mode: 'lexical' };
  try {
    const filename = process.env.HS_EMBEDDINGS_PATH || '.cache/embeddings.json';
    if (!indexCache)
      indexCache = readFile(/* turbopackIgnore: true */ filename, 'utf-8')
        .then(JSON.parse)
        .catch((e) => {
          indexCache = undefined;
          throw e;
        });
    const index = await indexCache!;
    if (index.version !== snapshot.version) throw Error('Embedding snapshot mismatch');
    const semanticQuery = [options.q, ...(options.facts || [])].join(' ');
    const embed = await embeddingExtractor(index.model);
    const [vector] = (
      await embed(['query: ' + semanticQuery], { pooling: 'mean', normalize: true })
    ).tolist();
    if (vector.length !== index.dimensions) throw Error('Embedding dimensions mismatch');
    const allowed = new Map(
      snapshot.records
        .filter(
          (r) =>
            (!options.chapter || r.chapter === options.chapter) &&
            (!options.dataset || options.dataset === 'all' || r.dataset === options.dataset),
        )
        .map((r) => [r.code, r]),
    );
    const semantic = index.rows
      .filter((r) => allowed.has(r.code))
      .map((r) => ({ code: r.code, score: cosine(vector, r.vector) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 40)
      .map((r) => r.code);
    const lex = searchRecords(snapshot.records, {
      ...options,
      limit: snapshot.records.length,
      offset: 0,
    });
    const merged = fuseRanks(
      lex.items.map((r) => r.code),
      semantic,
    );
    const offset = options.offset ?? 0,
      limit = options.limit ?? 30;
    const counts = new Map<string, number>();
    for (const code of merged) {
      const chapter = allowed.get(code)!.chapter;
      counts.set(chapter, (counts.get(chapter) || 0) + 1);
    }
    return {
      ...lexical,
      items: merged.slice(offset, offset + limit).map((code) => allowed.get(code)!),
      total: merged.length,
      facets: [...counts]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([chapter, count]) => ({ chapter, count })),
      mode: index.complete ? 'hybrid' : 'hybrid_partial_index',
    };
  } catch {
    return { ...lexical, mode: 'lexical_fallback' };
  }
}
