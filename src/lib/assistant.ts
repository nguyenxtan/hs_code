import type { HSRecord } from './types';
export function extractiveReply(
  message: string,
  items: HSRecord[],
): { content: string; mode: string } {
  if (/\bvat\b|thuế|gtgt/i.test(message))
    return {
      mode: 'extractive',
      content:
        'VAT áp dụng hiện chưa xác định. Chuỗi VAT trong nguồn không phải thuế suất của lô hàng. Cần khâu giao dịch, thời điểm, mô tả thực tế và quy tắc có căn cứ đã được duyệt. Bạn vẫn có thể xem nguyên văn các trường thuế trong chi tiết mã.',
    };
  if (!items.length)
    return {
      mode: 'extractive',
      content:
        'Chưa tìm thấy ứng viên trong phạm vi dữ liệu và truy vấn hiện tại. Bạn có thể thử tên công dụng, tên tiếng Anh hoặc mã dự kiến. Điều này không có nghĩa hàng không có mã HS. Mình chưa đủ căn cứ để tự gán “Loại khác”.',
    };
  return {
    mode: 'extractive',
    content: `${items.length} mã tham khảo theo hồ sơ hiện tại:\n\n${items
      .map((r, i) => {
        const description = r.description.replace(/^(?:-\s*)+/, '');
        const excerpt =
          description.length > 220 ? description.slice(0, 220).trimEnd() + '…' : description;
        return `${r.code} — ${excerpt} [${i + 1}]`;
      })
      .join(
        '\n\n',
      )}\n\nMở nguồn để đọc đầy đủ hoặc bổ sung công dụng, thông số. Mô tả cấp cha/chú giải chưa đầy đủ; đây chưa phải kết luận mã.`,
  };
}
export function safeGeneratedText(text: string, codes: string[]): boolean {
  if (!text || text.length > 5000 || /%|phần\s*trăm/i.test(text)) return false;
  const matches = [
    ...text.matchAll(/\b(?:\d{4}(?:[.\s/_-]?\d{2}){0,2}|\d{2}(?:[.\s/_-]\d{2}){1,3})\b/g),
  ];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i],
      code = m[0].replace(/\D/g, '');
    if (!codes.some((c) => c.startsWith(code))) return false;
    const end = matches[i + 1]?.index ?? text.length;
    const tail = text.slice(m.index! + m[0].length, end);
    const citation = tail.match(/\[(\d+)\]/);
    if (!citation || !codes[Number(citation[1]) - 1]?.startsWith(code)) return false;
  }
  return true;
}
