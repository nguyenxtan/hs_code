import { NextResponse } from 'next/server';
import { chatProvider } from '@/lib/chat-provider';
import { loadSnapshot } from '@/lib/db';
export async function GET() {
  try {
    const s = await loadSnapshot();
    return NextResponse.json({
      version: s.version,
      date: s.source_date,
      count: s.records.length,
      main: s.records.filter((r) => r.dataset === 'main').length,
      chapter98: s.records.filter((r) => r.dataset === 'chapter98').length,
      chapters: new Set(s.records.map((r) => r.chapter)).size,
      context_complete: s.context_complete,
      attribution: s.attribution,
      chat: chatProvider().status().enabled ? 'configured' : 'extractive',
      ai: chatProvider().status(),
      audit: s.audit,
    });
  } catch {
    return NextResponse.json({ error: 'Dữ liệu chưa sẵn sàng.' }, { status: 503 });
  }
}
