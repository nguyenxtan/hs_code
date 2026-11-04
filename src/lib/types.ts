export type HSRecord = {
  code: string;
  dataset: 'main' | 'chapter98';
  description: string;
  description_en: string;
  en_scope: string;
  raw: Record<string, string>;
  search_text: string;
  chapter: string;
  heading: string;
  subheading: string;
  corresponding_code: string;
  context_complete: boolean;
  dash_level: number;
  transforms: string[];
  presence: Record<string, string>;
  provenance: { raw_row_index: number; sheet: string; source_sha256: string; ruleset: string };
};
export type Snapshot = {
  version: string;
  source_date: string;
  context_complete: boolean;
  attribution: string;
  license: string;
  records: HSRecord[];
  audit: Record<string, unknown>;
  records_sha256?: string;
};
export type SearchOptions = {
  q?: string;
  chapter?: string;
  dataset?: string;
  category?: string;
  facts?: string[] | Record<string, string>;
  limit?: number;
  offset?: number;
};
export type SearchResult = {
  items: HSRecord[];
  total: number;
  facets: { chapter: string; count: number }[];
  available_facets?: { chapter: string; count: number }[];
  numeric: boolean;
  version?: string;
  source_date?: string;
  mode?: string;
};
export type Message = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  references?: CodeReference[];
  mode?: string;
};
export type CodeReference = { code: string; version: string };
export type ProductRevision = {
  name: string;
  facts: Record<string, string>;
  query: string;
  focus_code?: string;
  core_query?: string;
};
export type Product = ProductRevision & {
  revision: number;
  id: string;
  messages: Message[];
  history: ProductRevision[];
  lastEditToken?: string;
};
export type Workspace = { version: 1; activeId: string; products: Product[] };
