import { NextRequest, NextResponse } from 'next/server';
import { loadSnapshot } from '@/lib/db';
import { hybridSearch } from '@/lib/semantic';
import { categories } from '@/lib/categories';
import { searchRecords, validFacts } from '@/lib/search';
export const runtime = 'nodejs';
async function lookup(req: NextRequest, facts: unknown) {
  const p = req.nextUrl.searchParams,
    q = p.get('q') || '',
    chapter = p.get('chapter') || '',
    dataset = p.get('dataset') || 'all',
    category = p.get('category') || '';
  if (
    q.length > 200 ||
    (chapter && !/^\d{2}$/.test(chapter)) ||
    !['all', 'main', 'chapter98'].includes(dataset) ||
    (category && !categories.some((c) => c.id === category)) ||
    !validFacts(facts)
  )
    return NextResponse.json({ error: 'Truy vấn hoặc lời khai không hợp lệ.' }, { status: 400 });
  try {
    const s = await loadSnapshot();
    const result = await hybridSearch(s, {
      q,
      chapter,
      dataset,
      category,
      facts,
      limit: 30,
      offset: Math.max(0, Number(p.get('offset')) || 0),
    });
    const available_facets = searchRecords(s.records, { q, dataset, limit: 1 }).facets;
    return NextResponse.json({
      ...result,
      available_facets,
      version: s.version,
      source_date: s.source_date,
    });
  } catch {
    return NextResponse.json(
      { error: 'Chưa nạp được dữ liệu. Chạy bước chuẩn bị dữ liệu theo README.' },
      { status: 503 },
    );
  }
}
export async function GET(req: NextRequest) {
  return lookup(req, []);
}
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    if (raw.length > 12000)
      return NextResponse.json({ error: 'Nội dung quá dài.' }, { status: 413 });
    const body = JSON.parse(raw);
    return lookup(req, body?.facts);
  } catch {
    return NextResponse.json({ error: 'Lời khai gửi không hợp lệ.' }, { status: 400 });
  }
}
