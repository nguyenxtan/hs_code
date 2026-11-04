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
  search_text: fold(description),
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
it('recognizes code separators and never treats overlong numeric input as product text', () => {
  expect(parseQuery('8471-30')).toEqual({ text: '847130', numeric: true });
  expect(parseQuery('8471/30')).toEqual({ text: '847130', numeric: true });
  expect(parseQuery('847130201').numeric).toBe(true);
  expect(searchRecords(rows, { q: '847130201' }).total).toBe(0);
});
it('does not interpret a help-only query as browsing the catalogue', () => {
  expect(searchRecords(rows, { q: 'tìm mã' }).total).toBe(0);
});
it('retains a product phrase when generic attributes also match unrelated goods', () => {
  const records = [
    row('39249020', 'Miếng bảo vệ đầu ngực, phễu vắt sữa bằng tay'),
    row('96110000', 'Con dấu ngày; con dấu đóng thủ công và bộ in bằng tay'),
  ];
  expect(searchRecords(records, { q: 'con dấu bằng tay' }).items.map((r) => r.code)).toEqual([
    '96110000',
  ]);
});
it('keeps the leading product phrase when an added material is absent from its HS description', () => {
  const records = [
    row('96110000', 'Con dấu ngày, con dấu niêm phong; bộ in bằng tay'),
    row('71070000', 'Kim loại cơ bản được dát phủ bạc'),
    row('28444200', 'Các đồng vị phóng xạ và hợp kim'),
    row('43011000', 'Da nguyên con, có hoặc không có đầu'),
  ];
  expect(searchRecords(records, { q: 'con dấu kim loại' }).items.map((r) => r.code)).toEqual([
    '96110000',
  ]);
  expect(searchRecords(records, { q: 'con dau vo kim loai' }).items.map((r) => r.code)).toEqual([
    '96110000',
  ]);
  expect(searchRecords(records, { q: 'kim loại' }).items.map((r) => r.code)).toContain('71070000');
});
it('does not narrow candidates on a generic leading phrase such as parts or accessories', () => {
  const records = [
    row('84439100', 'Bộ phận và phụ kiện của máy in dùng để in bằng các bộ phận in'),
    row('84439910', 'Của máy in kiểu lưới dùng để sản xuất tấm mạch in hoặc tấm dây in'),
  ];
  expect(searchRecords(records, { q: 'bộ phận máy in lưới' }).items.map((r) => r.code)).toContain(
    '84439910',
  );
});
it('does not classify a greeting as a product but preserves cookware and product phrases', async () => {
  const { hasSearchIntent } = await import('../src/lib/search');
  expect(hasSearchIntent('chào')).toBe(false);
  expect(hasSearchIntent('Xin chào bạn!')).toBe(false);
  expect(hasSearchIntent('hello')).toBe(false);
  expect(hasSearchIntent('chảo')).toBe(true);
  expect(hasSearchIntent('tra chao')).toBe(true);
});
it('uses accents to avoid treating con dấu as còn/đầu when a full typed match exists', () => {
  const r = searchRecords(
    [
      row('43011000', 'Của loài chồn, da nguyên con, có hoặc không có đầu'),
      row('03061721', 'Đã bỏ đầu, còn đuôi'),
      row('96110000', 'Con dấu ngày, con dấu niêm phong; bộ in bằng tay'),
    ],
    { q: 'Tôi cần tra con dấu' },
  );
  expect(r.items.map((x) => x.code)).toEqual(['96110000']);
  expect(searchRecords(rows, { q: 'ngua thuan' }).items[0].code).toBe('01012100');
});
it('keeps named body/face materials distinct when ranking without excluding candidates', () => {
  const records = [
    row('11111111', 'Vỏ nhựa, mặt kim loại'),
    row('22222222', 'Vỏ kim loại, mặt nhựa'),
  ];
  const r = searchRecords(records, { q: '', facts: { body: 'kim loại', face: 'nhựa' } });
  expect(r.items[0].code).toBe('22222222');
  expect(r.total).toBe(2);
});
