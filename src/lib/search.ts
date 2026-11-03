import type { HSRecord, SearchOptions, SearchResult } from './types';
import { categoryMatch } from './categories';
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLocaleLowerCase('vi')
    .replace(/\s+/g, ' ')
    .trim();
}
export function parseQuery(query: string): { text: string; numeric: boolean } {
  const text = query.trim();
  const digits = text.replace(/[.\s/_-]/g, '');
  return /^[\d.\s/_-]+$/.test(text) && /^\d+$/.test(digits)
    ? { text: digits, numeric: true }
    : { text: fold(text), numeric: false };
}
const stops = new Set([
  'con',
  'cai',
  'loai',
  'hang',
  'hoa',
  'tra',
  'ma',
  'hs',
  'toi',
  'cho',
  'la',
  'va',
  'mot',
  'chiec',
  'giup',
  'tim',
  'can',
  'muon',
  'biet',
  've',
  'duoc',
  'xin',
]);
export function isGreeting(query: string): boolean {
  const text = query
    .normalize('NFC')
    .toLocaleLowerCase('vi')
    .trim()
    .replace(/[.!?,]+$/g, '')
    .trim();
  // Keep accents here: “chào” is a greeting; “chảo” and “tra chao” are product queries.
  return /^(?:(?:xin\s+)?chào(?:\s+(?:bạn|anh|chị|em))?|xin chao(?: ban)?|hello|hi|alo|cảm ơn(?: bạn)?|cam on(?: ban)?)$/.test(
    text,
  );
}
export function hasSearchIntent(query: string): boolean {
  if (isGreeting(query)) return false;
  const p = parseQuery(query);
  return p.numeric
    ? /^\d{1,8}$/.test(p.text)
    : p.text.split(' ').some((t) => t.length > 1 && !stops.has(t));
}
function grams(s: string): Set<string> {
  const v = new Set<string>();
  for (let i = 0; i < s.length - 2; i++) v.add(s.slice(i, i + 3));
  return v;
}
function similarity(a: string, b: string): number {
  const x = grams(a),
    y = grams(b);
  let common = 0;
  for (const g of x) if (y.has(g)) common++;
  return x.size + y.size ? (2 * common) / (x.size + y.size) : 0;
}
export function searchRecords(records: HSRecord[], options: SearchOptions): SearchResult {
  const parsed = parseQuery(options.q ?? '');
  const words = parsed.text.split(' ');
  const hasProductTerm = words.some((t) => t && !stops.has(t));
  // Keep “con” inside product names (con dấu, con lăn). Dropping it makes
  // unaccented “dấu” indistinguishable from “đầu” plus generic attributes.
  const terms = words.filter((t) => t && (!stops.has(t) || (t === 'con' && hasProductTerm)));
  const facts = (options.facts ?? []).map(fold);
  let hits = records
    .filter(
      (r) =>
        (!options.chapter || r.chapter === options.chapter) &&
        (!options.dataset || options.dataset === 'all' || r.dataset === options.dataset),
    )
    .map((r) => {
      const text = fold(r.search_text || `${r.description} ${r.description_en}`);
      let score = 0,
        allTerms = false;
      if (parsed.numeric)
        score = r.code === parsed.text ? 10000 : r.code.startsWith(parsed.text) ? 1000 : 0;
      else if (!parsed.text) score = 1;
      else if (!terms.length) score = 0;
      else {
        const words = new Set(text.match(/[a-z0-9]+/g) || []);
        const matched = terms.filter((t) =>
          /^[a-z0-9]+$/.test(t) ? words.has(t) : text.includes(t),
        ).length;
        allTerms = matched === terms.length;
        if (matched) score = (matched / terms.length) * 100 + (text.includes(parsed.text) ? 50 : 0);
      }
      const boost =
        facts.reduce((n, f) => n + (f && text.includes(f) ? 3 : 0), 0) +
        (categoryMatch(options.category, r.code) ? 35 : 0);
      return { r, score, boost, allTerms };
    })
    .filter((x) => x.score > 0);
  if (!parsed.numeric && terms.length > 1 && hits.some((x) => x.allTerms))
    hits = hits.filter((x) => x.allTerms);
  if (!hits.length && !parsed.numeric && terms.length > 0 && parsed.text.length >= 4) {
    hits = records
      .filter(
        (r) =>
          (!options.chapter || r.chapter === options.chapter) &&
          (!options.dataset || options.dataset === 'all' || r.dataset === options.dataset),
      )
      .map((r) => ({
        r,
        score: similarity(parsed.text, fold(r.description + ' ' + r.description_en)) * 100,
        boost: 0,
        allTerms: false,
      }))
      .filter((x) => x.score > 20);
  }
  hits.sort((a, b) => b.score + b.boost - (a.score + a.boost) || a.r.code.localeCompare(b.r.code));
  const counts = new Map<string, number>();
  for (const { r } of hits) counts.set(r.chapter, (counts.get(r.chapter) || 0) + 1);
  const offset = Math.max(0, options.offset ?? 0),
    limit = Math.min(20000, Math.max(1, options.limit ?? 30));
  return {
    items: hits.slice(offset, offset + limit).map((x) => x.r),
    total: hits.length,
    facets: [...counts]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([chapter, count]) => ({ chapter, count })),
    numeric: parsed.numeric,
  };
}
