import { NextRequest, NextResponse } from 'next/server';
import { loadSnapshot } from '@/lib/db';
import { hybridSearch } from '@/lib/semantic';
import { groundedReply } from '@/lib/assistant';
import { hasSearchIntent, isGreeting } from '@/lib/search';
import { categories } from '@/lib/categories';
export const runtime = 'nodejs';
const requests: number[] = [];
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  if (origin) {
    try {
      // NextURL normalizes loopback addresses to localhost. The HTTP Host
      // retains the authority the browser actually used (including its port).
      if (new URL(origin).host !== (req.headers.get('host') || req.nextUrl.host)) throw Error();
    } catch {
      return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
    }
  }
  const now = Date.now();
  while (requests.length && requests[0] < now - 60000) requests.shift();
  if (requests.length >= 30)
    return NextResponse.json({ error: 'Vui lòng chờ một chút rồi thử lại.' }, { status: 429 });
  if (Number(req.headers.get('content-length') || 0) > 20000)
    return NextResponse.json({ error: 'Nội dung quá dài.' }, { status: 413 });
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 20000) throw Error();
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Dữ liệu gửi không hợp lệ.' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    return NextResponse.json({ error: 'Dữ liệu gửi không hợp lệ.' }, { status: 400 });
  const { message, query, facts } = body;
  const history = body.history ?? [];
  if (
    !Array.isArray(history) ||
    history.length > 6 ||
    history.some(
      (m) =>
        !m ||
        !['user', 'assistant'].includes(m.role) ||
        typeof m.content !== 'string' ||
        m.content.length > 2000,
    )
  )
    return NextResponse.json({ error: 'Lịch sử gửi không hợp lệ.' }, { status: 400 });
  if (
    typeof message !== 'string' ||
    !message.trim() ||
    message.length > 1500 ||
    typeof query !== 'string' ||
    query.length > 200 ||
    !facts ||
    typeof facts !== 'object' ||
    Array.isArray(facts) ||
    Object.keys(facts).length > 20 ||
    Object.values(facts).some((v) => typeof v !== 'string' || v.length > 200)
  )
    return NextResponse.json({ error: 'Nội dung hoặc hồ sơ không hợp lệ.' }, { status: 400 });
  requests.push(now);
  const filters = body.filters ?? {};
  if (
    !filters ||
    typeof filters !== 'object' ||
    Array.isArray(filters) ||
    ('chapter' in filters &&
      (typeof filters.chapter !== 'string' ||
        (filters.chapter && !/^\d{2}$/.test(filters.chapter)))) ||
    (filters.dataset && !['all', 'main', 'chapter98'].includes(filters.dataset)) ||
    (filters.category && !categories.some((c) => c.id === filters.category))
  )
    return NextResponse.json({ error: 'Bộ lọc không hợp lệ.' }, { status: 400 });
  if (isGreeting(message) || !hasSearchIntent(query))
    return NextResponse.json({
      content:
        'Bạn muốn tra mặt hàng nào? Hãy nhập tên hàng, công dụng hoặc mã HS dự kiến để bắt đầu.',
      mode: 'extractive',
      references: [],
    });
  try {
    const s = await loadSnapshot();
    const result = await hybridSearch(s, {
      q: query,
      facts: Object.values(facts) as string[],
      limit: 4,
      chapter: filters.chapter,
      dataset: filters.dataset,
      category: filters.category,
    });
    const reply = await groundedReply(
      message,
      result.items,
      JSON.stringify({ query, facts, filters }),
      history,
    );
    return NextResponse.json({
      ...reply,
      ...(!result.items.length &&
      (filters.chapter || (filters.dataset && filters.dataset !== 'all'))
        ? {
            content:
              'Chưa tìm thấy mã phù hợp trong bộ lọc đang chọn. Bạn có thể bỏ bộ lọc chương hoặc bộ dữ liệu rồi thử lại; mình chưa tự thay bộ lọc của bạn.',
          }
        : {}),
      references: result.items.map((r) => ({ code: r.code, version: s.version })),
      version: s.version,
      retrieval_mode: result.mode,
    });
  } catch {
    return NextResponse.json(
      { error: 'Chưa truy xuất được dữ liệu. Tin nhắn vẫn được lưu trên thiết bị.' },
      { status: 503 },
    );
  }
}
