import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import type { Snapshot } from '../src/lib/types';
import { recordsHash, assertImmutableSnapshot, canonicalJSON } from '../src/lib/snapshot';
const snapshot: Snapshot = JSON.parse(
  await readFile(
    process.env.HS_SNAPSHOT_PATH || 'data/processed/2026-11-03/snapshot.json',
    'utf-8',
  ),
);
const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || 'postgresql://hs_code:hs_code_local@127.0.0.1:55439/hs_code',
});
const db = await pool.connect();
try {
  await db.query(await readFile('db/schema.sql', 'utf-8'));
  await db.query('BEGIN');
  await db.query('SELECT pg_advisory_xact_lock(742067)');
  const { records, ...metadata } = snapshot;
  if (snapshot.records_sha256 !== recordsHash(records))
    throw Error('Snapshot records checksum mismatch');
  const existing = await db.query('SELECT metadata FROM snapshots WHERE version=$1', [
    snapshot.version,
  ]);
  if (existing.rows.length) {
    const old = await db.query('SELECT entry FROM hs_records WHERE version=$1 ORDER BY code', [
      snapshot.version,
    ]);
    assertImmutableSnapshot(
      old.rows.map((r) => r.entry),
      records,
    );
    if (canonicalJSON(existing.rows[0].metadata) !== canonicalJSON(metadata))
      throw Error('Immutable snapshot metadata collision');
  }
  await db.query('UPDATE snapshots SET active=false WHERE active');
  await db.query(
    'INSERT INTO snapshots(version,metadata,active) VALUES($1,$2,true) ON CONFLICT(version) DO UPDATE SET active=true',
    [snapshot.version, metadata],
  );
  for (let i = 0; !existing.rows.length && i < records.length; i += 250) {
    const group = records.slice(i, i + 250);
    const args: unknown[] = [];
    const values = group.map((r, j) => {
      args.push(snapshot.version, r.code, JSON.stringify(r), r.search_text);
      return `($${j * 4 + 1},$${j * 4 + 2},$${j * 4 + 3}::jsonb,$${j * 4 + 4})`;
    });
    await db.query(
      `INSERT INTO hs_records(version,code,entry,search_text) VALUES ${values.join(',')}`,
      args,
    );
  }
  const count = await db.query('SELECT count(*)::int AS count FROM hs_records WHERE version=$1', [
    snapshot.version,
  ]);
  if (count.rows[0].count !== records.length) throw Error('Imported row count mismatch');
  await db.query('COMMIT');
  console.log(JSON.stringify({ version: snapshot.version, imported: count.rows[0].count }));
} catch (e) {
  await db.query('ROLLBACK');
  throw e;
} finally {
  db.release();
  await pool.end();
}
