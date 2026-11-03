import { NextRequest, NextResponse } from 'next/server';
import { loadSnapshot } from '@/lib/db';
import { hybridSearch } from '@/lib/semantic';
import { categories } from '@/lib/categories';
import { searchRecords } from '@/lib/search';
export const runtime = 'nodejs';
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams,
    q = p.get('q') || '',
    chapter = p.get('chapter') || '',
    dataset = p.get('dataset') || 'all',
    category = p.get('category') || '';
  if (
    q.length > 200 ||
    (chapter && !/^\d{2}$/.test(chapter)) ||
    !['all', 'main', 'chapter98'].includes(dataset) ||
    (category && !categories.some((c) => c.id === category))
  )
    return NextResponse.json({ error: 'Truy vấn không hợp lệ.' }, { status: 400 });
  try {
    const s = await loadSnapshot();
    const result = await hybridSearch(s, {
      q,
      chapter,
      dataset,
      category,
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
