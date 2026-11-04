import { fold, hasSearchIntent, queryPhrase } from './search';

// This is deliberately a small fallback for deployments without a language model.
// Explicit searches replace the query; questions and attribute answers retain it.
export function resolveTurn(
  message: string,
  previous: string,
): { query: string; newProduct: boolean } {
  const fresh = message.match(/^(?:giờ tra|chuyển sang|sản phẩm mới[:\s]+)\s*(.+)/i);
  const lookup = message.match(
    /^(?:(?:tôi\s+)?(?:cần|muốn)\s+)?(?:tra(?:\s+cứu)?|tìm)(?:\s+(?:mã\s+)?hs|\s+mã)?\s+(.+)/i,
  );
  const candidate = (fresh?.[1] || lookup?.[1] || message).trim().slice(0, 200);
  if (!hasSearchIntent(candidate)) return { query: previous, newProduct: false };
  if (!hasSearchIntent(previous)) return { query: candidate, newProduct: false };
  if (fresh) return { query: candidate, newProduct: true };
  const words = queryPhrase(previous).split(' ').slice(0, 2);
  const current = queryPhrase(candidate).split(' ');
  const related = words.length > 0 && words.every((w, i) => current[i] === w);
  if (lookup) return { query: candidate, newProduct: !related };
  const question =
    /[?？]|\b(?:không|chưa)\s*$/i.test(candidate) ||
    /(?:^|\s)(?:thuế|vat|bao nhiêu|mã nào|mã gì|như thế nào|tại sao|vì sao|có phải)(?:\s|$)/i.test(
      candidate,
    ) ||
    /^(?:thuế|vat|mã này|đây|cái này|có phải|vì sao|tại sao|bao nhiêu)/i.test(candidate);
  if (related && !question && fold(candidate) !== fold(previous))
    return { query: candidate, newProduct: false };
  return { query: previous, newProduct: false };
}
