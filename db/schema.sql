CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE TABLE IF NOT EXISTS snapshots (
  version text PRIMARY KEY,
  metadata jsonb NOT NULL,
  active boolean NOT NULL DEFAULT false,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_snapshot ON snapshots(active) WHERE active;
CREATE TABLE IF NOT EXISTS hs_records (
  version text NOT NULL REFERENCES snapshots(version),
  code varchar(8) NOT NULL CHECK (code ~ '^[0-9]{8}$'),
  entry jsonb NOT NULL,
  search_text text NOT NULL,
  PRIMARY KEY(version, code)
);
CREATE INDEX IF NOT EXISTS hs_records_search_trgm ON hs_records USING gin(search_text gin_trgm_ops);
