import { NextRequest, NextResponse } from 'next/server';
import { loadRecord } from '@/lib/db';
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') || '',
    version = req.nextUrl.searchParams.get('version') || '';
  if (!/^\d{8}$/.test(code) || (version && !/^[a-zA-Z0-9_-]{1,100}$/.test(version)))
    return NextResponse.json({ error: 'Mã hoặc phiên bản không hợp lệ.' }, { status: 400 });
  try {
    const record = await loadRecord(code, version || undefined);
    return record
      ? NextResponse.json({ record })
      : NextResponse.json(
          { error: 'Không còn bản dữ liệu tham chiếu này. Nội dung trao đổi vẫn được giữ nguyên.' },
          { status: 404 },
        );
  } catch {
    return NextResponse.json(
      { error: 'Chưa đọc được dữ liệu tham chiếu. Vui lòng thử lại.' },
      { status: 503 },
    );
  }
}
