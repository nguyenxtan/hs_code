import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import type { Snapshot } from './types';
let cached: Promise<Snapshot> | undefined;
export async function loadSnapshot(): Promise<Snapshot> {
  if (!cached)
    cached = (async () => {
      if (process.env.DATABASE_URL) {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
        try {
          const active = await pool.query(
            'SELECT version, metadata FROM snapshots WHERE active = true',
          );
          if (!active.rows.length) throw Error('No active dataset');
          const { version, metadata } = active.rows[0];
          const rows = await pool.query(
            'SELECT entry FROM hs_records WHERE version=$1 ORDER BY code',
            [version],
          );
          return { ...metadata, version, records: rows.rows.map((r) => r.entry) } as Snapshot;
        } finally {
          await pool.end();
        }
      }
      const filename = process.env.HS_SNAPSHOT_PATH || 'data/processed/2026-11-03/snapshot.json';
      // Dataset is a separately mounted runtime artifact, never bundled into the app.
      return JSON.parse(await readFile(/* turbopackIgnore: true */ filename, 'utf-8')) as Snapshot;
    })().catch((e) => {
      cached = undefined;
      throw e;
    });
  return cached;
}
