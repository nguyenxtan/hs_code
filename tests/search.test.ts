import { describe, it, expect } from 'vitest';
import { searchRecords, parseQuery, fold } from '../src/lib/search';
import type { HSRecord } from '../src/lib/types';
const row = (code: string, description: string): HSRecord => ({
  code,
  description,
  dataset: 'main',
  description_en: '',
  chapter: code.slice(0, 2),
  heading: code.slice(0, 4),
  subheading: code.slice(0, 6),
  search_text: description,
  raw: { vat_raw: '8/10' },
  context_complete: false,
  corresponding_code: '',
  dash_level: 0,
  transforms: [],
  presence: {},
  en_scope: 'reference_unverified',
  provenance: { raw_row_index: 0, sheet: 'HS_2022', source_sha256: 'x', ruleset: 'test' },
});
const rows = [
  row('01012100', 'Ngựa thuần chủng'),
  row('96110000', 'Dấu ngày, dấu niêm phong, dùng bằng tay'),
  row('15071000', 'Dầu đậu tương'),
];
describe('search contracts', () => {
  it('keeps leading zero and understands dotted numeric prefix', () => {
    expect(parseQuery('01.01 21')).toEqual({ text: '010121', numeric: true });
    expect(searchRecords(rows, { q: '01.01' }).items[0].code).toBe('01012100');
  });
  it('searches Vietnamese without accents but never changes displayed descriptions', () => {
    expect(fold('Đậu tương')).toBe('dau tuong');
    expect(searchRecords(rows, { q: 'ngua thuan' }).items[0].description).toBe('Ngựa thuần chủng');
  });
  it('facts rank but never remove candidates, explicit filters do', () => {
    expect(searchRecords(rows, { q: '', facts: ['bằng tay'] }).total).toBe(3);
    expect(searchRecords(rows, { q: '', chapter: '96' }).items.map((x) => x.code)).toEqual([
      '96110000',
    ]);
  });
  it('treats no result as empty data scope without inventing a catch-all', () => {
    expect(searchRecords(rows, { q: 'zzzzzzzz' }).total).toBe(0);
  });
  it('facet counts include matching rows before pagination', () => {
    expect(searchRecords(rows, { q: '', limit: 1 }).total).toBe(3);
    expect(searchRecords(rows, { q: '', limit: 1 }).facets.reduce((n, x) => n + x.count, 0)).toBe(
      3,
    );
  });
  it('proposed utility groups prioritize without excluding other codes', () => {
    const r = searchRecords(rows, { q: '', category: 'office' });
    expect(r.items[0].code).toBe('96110000');
    expect(r.total).toBe(3);
  });
  it('does not match the short word in inside breeding', () => {
    expect(searchRecords([row('01012100', 'Breeding animals')], { q: 'in' }).total).toBe(0);
  });
  it('prefers complete keyword matches instead of thousands of partial matches', () => {
    const r = searchRecords([row('84431200', 'Máy in'), row('85011000', 'Máy điện')], {
      q: 'máy in',
    });
    expect(r.items.map((x) => x.code)).toEqual(['84431200']);
  });
});
