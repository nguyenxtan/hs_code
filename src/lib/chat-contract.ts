import { fold, hasSearchIntent, queryPhrase } from './search';
import { extractFacts } from './session';

const fields = ['body', 'face', 'ink', 'operation', 'notes', 'material_unknown'] as const;
export type Explanation = { ref: number; text: string; quote: string };
export type ParsedTurn = {
  intent: 'same' | 'refine' | 'new' | 'question';
  core_query: string;
  facts: Record<string, string>;
  clarification: string;
  explanations: Explanation[];
};
const text = { type: 'string' };
const explanations = {
  type: 'array',
  maxItems: 4,
  items: {
    type: 'object',
    properties: { ref: { type: 'integer' }, text, quote: text },
    required: ['ref', 'text', 'quote'],
    additionalProperties: false,
  },
};
export const turnSchema = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['same', 'refine', 'new', 'question'] },
    core_query: text,
    fact_ops: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          field: { type: 'string', enum: fields },
          op: { type: 'string', enum: ['set', 'clear'] },
          value: text,
          evidence: text,
        },
        required: ['field', 'op', 'value', 'evidence'],
        additionalProperties: false,
      },
    },
    clarification: text,
    explanations,
  },
  required: ['intent', 'core_query', 'fact_ops', 'clarification', 'explanations'],
  additionalProperties: false,
};
export const explanationSchema = {
  type: 'object',
  properties: { clarification: text, explanations },
  required: ['clarification', 'explanations'],
  additionalProperties: false,
};
const normal = (s: string) =>
  s.normalize('NFC').toLocaleLowerCase('vi').replace(/\s+/g, ' ').trim();
export function safeModelText(s: unknown): s is string {
  return (
    typeof s === 'string' &&
    s.length <= 400 &&
    !/(?:\d[\s./_-]?){4}|%|phần trăm|thuế|\bvat\b|gtgt|kết luận mã/i.test(s)
  );
}
export function normalizeClarification(s: string, facts: Record<string, string>): string {
  if (!safeModelText(s)) return '';
  const cues = {
    operation: /\b(?:tay|thu cong|gan may|tu dong)\b/,
    body: /\b(?:vo|than|khung|tay cam)\b/,
    face: /\b(?:mat|dau dau)\b/,
    ink: /\bmuc\b/,
  };
  const question = fold(s);
  const requested = Object.entries(cues)
    .filter(([, cue]) => cue.test(question))
    .map(([field]) => field);
  if (requested.length && requested.every((field) => !!facts[field])) return '';
  if (requested.length === 1 && requested[0] === 'operation')
    return 'Sản phẩm được sử dụng bằng tay hay gắn vào máy?';
  return s;
}
function explanationList(v: unknown): Explanation[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 4)
    .filter(
      (x): x is Explanation =>
        !!x &&
        Number.isInteger(x.ref) &&
        safeModelText(x.text) &&
        typeof x.quote === 'string' &&
        x.quote.length >= 8 &&
        x.quote.length <= 240,
    );
}
export function validateTurn(
  v: unknown,
  message: string,
  previousQuery: string,
  previousFacts: Record<string, string>,
): ParsedTurn | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (
    !['same', 'refine', 'new', 'question'].includes(String(o.intent)) ||
    typeof o.core_query !== 'string' ||
    !Array.isArray(o.fact_ops) ||
    o.fact_ops.length > 8 ||
    typeof o.clarification !== 'string'
  )
    return null;
  const intent = o.intent as ParsedTurn['intent'];
  const facts: Record<string, string> = intent === 'new' ? {} : { ...previousFacts };
  const candidate = o.core_query.trim();
  if (intent === 'new') {
    const prefix =
      fold(message)
        .split(fold(candidate))[0]
        .split(/[,;.!?]|\s+(?:ma|nhung|thay vao do)\s+/)
        .at(-1) || '';
    if (/(?:^|\s)(?:khong|chang|chua)(?:\s|$)/.test(prefix)) return null;
  }
  const allowedWords = new Set(
    queryPhrase(intent === 'new' ? message : `${message} ${previousQuery}`).split(' '),
  );
  const validQuery =
    hasSearchIntent(candidate) &&
    candidate.length <= 80 &&
    candidate.split(/\s+/).length <= 6 &&
    !/\d{4}/.test(candidate) &&
    queryPhrase(candidate)
      .split(' ')
      .every((w) => allowedWords.has(w));
  let core_query = intent === 'question' || !validQuery ? previousQuery : candidate;
  if (intent === 'new' && !validQuery) return null;
  const s = normal(message);
  for (const raw of o.fact_ops) {
    if (!raw || typeof raw !== 'object') continue;
    const x = raw as Record<string, unknown>;
    if (
      !fields.includes(x.field as (typeof fields)[number]) ||
      !['set', 'clear'].includes(String(x.op)) ||
      typeof x.value !== 'string' ||
      typeof x.evidence !== 'string'
    )
      continue;
    const evidence = normal(x.evidence),
      value = x.value.trim();
    if (!evidence || evidence.length > 200 || value.length > 200 || !s.includes(evidence)) continue;
    let field = String(x.field);
    if (
      field === 'notes' &&
      fold(value)
        .split(' ')
        .every((w) =>
          [
            'gio',
            'tra',
            'tim',
            'ma',
            'hs',
            'toi',
            'can',
            'muon',
            'doi',
            'sang',
            'giup',
            'voi',
            'nhe',
            'ban',
          ].includes(w),
        )
    )
      continue;
    const part =
      field === 'body'
        ? /\b(?:vo|than|khung|tay cam)\b/
        : field === 'face'
          ? /\b(?:mat|dau dau)\b/
          : field === 'ink'
            ? /\bmuc\b/
            : field === 'operation'
              ? /\b(?:tay|may|tu dong|thu cong)\b/
              : null;
    const start = s.indexOf(evidence);
    const clause =
      fold(s.slice(0, start) + evidence)
        .split(/[,;.!?]|\s+(?:ma|nhung|thay vao do)\s+/)
        .at(-1) || '';
    const ev = fold(evidence);
    const rest = s.slice(start + evidence.length);
    const suffix = fold(rest.split(/[,;.!?？]/)[0]);
    const escapedValue = fold(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (
      /^\s*[?？]/.test(rest) ||
      /^(?:(?:dung|phai)\s+)?(?:khong|chua|ha|hay)\b/.test(suffix) ||
      /\b(?:khong|chua|ha)\s*[?？]?$/.test(ev) ||
      (value && new RegExp(`${escapedValue}\\s*[?？]$`).test(ev)) ||
      (x.op === 'clear' && /[?？]$/.test(evidence))
    )
      continue;
    const negated = /(?:^|\s)(?:khong|chang|chua)(?:\s|$)/.test(clause);
    if (x.op === 'clear') {
      const explicitRemoval = /(?:^|\s)(?:bỏ|xóa|xoá)(?:\s|$)/.test(evidence);
      const negatesCurrentValue = negated && !!facts[field] && ev.includes(fold(facts[field]));
      if ((explicitRemoval || negatesCurrentValue) && (!part || part.test(ev))) delete facts[field];
      continue;
    }
    if (negated || !value || /khong ro|chua biet|khong biet|co phai|lieu|hay la/.test(clause))
      continue;
    const mapped = extractFacts(evidence);
    if (!fold(evidence).includes(fold(value)) && mapped[field] !== value) continue;
    if (field === 'body' || field === 'face') {
      if (!part!.test(ev)) field = 'material_unknown';
      else {
        const associated = new RegExp(
          `${part!.source}\\s+(?:(?:bang|la|lam tu|duoc lam tu)\\s+)?${escapedValue}(?:\\b|$)`,
        );
        if (mapped[field] !== value && !associated.test(ev)) continue;
      }
    }
    if ((field === 'ink' || field === 'operation') && !part!.test(ev)) continue;
    facts[field] = value;
  }
  if (facts.material_unknown && [facts.body, facts.face].includes(facts.material_unknown))
    delete facts.material_unknown;
  // Attributes declared as soft facts must not remain a hard keyword suffix.
  for (const value of Object.values(facts).sort((a, b) => b.length - a.length)) {
    const suffix = fold(value);
    if (!suffix || !fold(core_query).endsWith(' ' + suffix)) continue;
    const words = core_query.split(/\s+/);
    const prefix = words
      .slice(0, words.length - value.split(/\s+/).length)
      .join(' ')
      .replace(/\s+(?:vỏ|mặt|bằng|thân|khung)$/i, '')
      .trim();
    if (queryPhrase(prefix).split(' ').length >= 2) core_query = prefix;
  }
  return {
    intent,
    core_query,
    facts,
    clarification: safeModelText(o.clarification) ? o.clarification : '',
    explanations: explanationList(o.explanations),
  };
}
export function renderExplanations(
  v: unknown,
  rows: { code: string; description: string }[],
): string {
  return explanationList(v)
    .flatMap((e) => {
      const row = rows[e.ref - 1];
      if (!row || !normal(row.description).includes(normal(e.quote))) return [];
      return [`${row.code} — ${e.text}\n“${e.quote}” [${e.ref}]`];
    })
    .join('\n\n');
}
