import type { Workspace, Product, ProductRevision } from './types';
function product(name = 'Sản phẩm mới'): Product {
  return {
    id: globalThis.crypto.randomUUID(),
    name,
    query: '',
    facts: {},
    messages: [],
    history: [],
  };
}
export function createWorkspace(): Workspace {
  const p = product();
  return { version: 1, activeId: p.id, products: [p] };
}
export function addProduct(w: Workspace, name = 'Sản phẩm mới'): Workspace {
  if (w.products.length >= 99) return w;
  const p = product(name);
  return { ...w, activeId: p.id, products: [...w.products, p] };
}
export function updateProduct(
  w: Workspace,
  id: string,
  patch: Partial<ProductRevision>,
  editToken?: string,
): Workspace {
  return {
    ...w,
    products: w.products.map((p) => {
      if (p.id !== id) return p;
      const facts = { ...p.facts };
      for (const [k, v] of Object.entries(patch.facts || {})) {
        if (v === '') delete facts[k];
        else facts[k] = v;
      }
      const next = { ...p, ...patch, facts };
      if (patch.query !== undefined && patch.query !== p.query && patch.focus_code === undefined)
        next.focus_code = undefined;
      if (
        next.name === p.name &&
        next.query === p.query &&
        next.focus_code === p.focus_code &&
        JSON.stringify(facts) === JSON.stringify(p.facts)
      )
        return p;
      const coalesce = !!editToken && p.lastEditToken === editToken;
      return {
        ...next,
        lastEditToken: editToken,
        history: coalesce
          ? p.history
          : [
              ...p.history.slice(-29),
              { name: p.name, query: p.query, facts: { ...p.facts }, focus_code: p.focus_code },
            ],
      };
    }),
  };
}

export function undoProduct(w: Workspace, id: string): Workspace {
  return {
    ...w,
    products: w.products.map((p) => {
      const prev = p.history.at(-1);
      return p.id !== id || !prev
        ? p
        : {
            ...p,
            ...prev,
            focus_code: prev.focus_code,
            lastEditToken: undefined,
            history: p.history.slice(0, -1),
          };
    }),
  };
}
export function extractFacts(
  text: string,
  previous: Record<string, string> = {},
): Record<string, string> {
  const facts: Record<string, string> = {};
  const s = text.toLocaleLowerCase('vi');
  const scan = (field: string, regex: RegExp, value: (m: RegExpMatchArray) => string) => {
    for (const m of s.matchAll(regex)) {
      const clause =
        s
          .slice(0, m.index)
          .split(/[,;.!?]|\s+(?:mà|nhưng|thay vào đó)\s+/)
          .at(-1) || '';
      if (/không rõ|chưa biết|không biết/.test(clause)) continue;
      const v = value(m),
        negated = /(?:^|\s)(?:không|chẳng|chưa)(?:\s|$)/.test(clause);
      if (negated) {
        if ((facts[field] ?? previous[field]) === v) facts[field] = '';
      } else facts[field] = v;
    }
  };
  scan('ink', /khay mực|chấm mực|mực ngoài|mực rời|sẵn mực|tự có mực|liền mực/g, (m) =>
    /khay|chấm|ngoài|rời/.test(m[0]) ? 'khay mực rời' : 'tự có mực',
  );
  scan('operation', /bằng tay|cầm tay|thủ công|tự động|gắn máy/g, (m) =>
    /tự động|gắn máy/.test(m[0]) ? 'gắn máy' : 'bằng tay',
  );
  scan('body', /vỏ\s+(?:bằng\s+)?(nhựa|kim loại|gỗ|thép|inox)/g, (m) => m[1]);
  scan('face', /mặt\s+(?:bằng\s+)?(cao su|kim loại|nhựa)/g, (m) => m[1]);
  return facts;
}
export function validWorkspace(input: unknown): input is Workspace {
  if (!input || typeof input !== 'object') return false;
  const w = input as Workspace;
  const focus = (v: unknown) => v === undefined || (typeof v === 'string' && /^\d{8}$/.test(v));
  const facts = (v: unknown) =>
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === 'string');
  return (
    w.version === 1 &&
    typeof w.activeId === 'string' &&
    Array.isArray(w.products) &&
    w.products.length > 0 &&
    w.products.length < 100 &&
    w.products.some((p) => p && p.id === w.activeId) &&
    w.products.every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.query === 'string' &&
        focus(p.focus_code) &&
        facts(p.facts) &&
        Array.isArray(p.messages) &&
        p.messages.every(
          (m) =>
            m &&
            ['user', 'assistant'].includes(m.role) &&
            typeof m.content === 'string' &&
            (!m.references ||
              (Array.isArray(m.references) &&
                m.references.every(
                  (r) => r && /^\d{8}$/.test(r.code) && typeof r.version === 'string',
                ))),
        ) &&
        Array.isArray(p.history) &&
        p.history.every(
          (h) =>
            h &&
            typeof h.name === 'string' &&
            typeof h.query === 'string' &&
            focus(h.focus_code) &&
            facts(h.facts),
        ),
    )
  );
}
export function restoreWorkspace(input: unknown): Workspace | null {
  if (!input || typeof input !== 'object') return null;
  try {
    const w = JSON.parse(JSON.stringify(input));
    if (Array.isArray(w.products))
      for (const p of w.products) {
        if (Array.isArray(p.messages))
          p.messages = p.messages.slice(-50).map((m: Record<string, unknown>) => {
            if (!m || typeof m !== 'object') return m;
            return {
              ...m,
              references: Array.isArray(m.references)
                ? m.references
                    .filter((r) => r && typeof r.code === 'string' && /^\d{8}$/.test(r.code))
                    .slice(0, 4)
                    .map((r) => ({
                      code: r.code,
                      version: typeof r.version === 'string' ? r.version : '',
                    }))
                : [],
            };
          });
      }
    return validWorkspace(w) ? w : null;
  } catch {
    return null;
  }
}
export function serializeWorkspace(w: Workspace): string {
  const compact = restoreWorkspace(w);
  if (!compact) throw Error('Invalid workspace');
  return JSON.stringify(compact);
}
