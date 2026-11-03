import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import type { Snapshot } from '../src/lib/types';
import { embeddingExtractor, type EmbeddingIndex } from '../src/lib/semantic';
const snapshot: Snapshot = JSON.parse(
  await readFile(
    process.env.HS_SNAPSHOT_PATH || 'data/processed/2026-11-03/snapshot.json',
    'utf-8',
  ),
);
const model = process.env.HS_EMBEDDING_MODEL || 'Xenova/multilingual-e5-small';
const limit = Number(process.env.HS_EMBEDDING_LIMIT) || snapshot.records.length;
const file = process.env.HS_EMBEDDINGS_PATH || '.cache/embeddings.json';
await mkdir('.cache', { recursive: true });
const embed = await embeddingExtractor(model);
let rows: EmbeddingIndex['rows'] = [];
try {
  const old: EmbeddingIndex = JSON.parse(await readFile(file, 'utf-8'));
  if (old.version === snapshot.version && old.model === model) rows = old.rows;
} catch {}
const known = new Set(rows.map((r) => r.code));
const pending = snapshot.records.slice(0, limit).filter((r) => !known.has(r.code));
for (let i = 0; i < pending.length; i += 16) {
  const batch = pending.slice(i, i + 16);
  const vectors = (
    await embed(
      batch.map((r) => 'passage: ' + r.description + ' ' + r.description_en),
      { pooling: 'mean', normalize: true, truncation: true, max_length: 128 },
    )
  ).tolist();
  rows.push(
    ...batch.map((r, j) => ({
      code: r.code,
      vector: vectors[j].map((n) => Math.round(n * 1e6) / 1e6),
    })),
  );
  if (i % 160 === 0 || i + 16 >= pending.length) {
    const index: EmbeddingIndex = {
      version: snapshot.version,
      model,
      dimensions: rows[0].vector.length,
      count: rows.length,
      complete: rows.length === snapshot.records.length,
      rows,
    };
    await writeFile(file + '.tmp', JSON.stringify(index));
    await rename(file + '.tmp', file);
    console.log(`${rows.length}/${snapshot.records.length} embeddings saved`);
  }
}
