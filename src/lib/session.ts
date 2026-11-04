import type { Workspace, Product, ProductRevision, Message } from './types';
function product(name = 'Sản phẩm mới'): Product {
  return {
    id: globalThis.crypto.randomUUID(),
    revision: 0,
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
      if (patch.query !== undefined && patch.query !== p.query && patch.core_query === undefined)
        next.core_query = undefined;
      if (
        next.name === p.name &&
        next.query === p.query &&
        next.focus_code === p.focus_code &&
        next.core_query === p.core_query &&
        JSON.stringify(facts) === JSON.stringify(p.facts)
      )
        return p;
      const coalesce = !!editToken && p.lastEditToken === editToken;
      return {
        ...next,
        revision: (p.revision || 0) + 1,
        lastEditToken: editToken,
        history: coalesce
          ? p.history
          : [
              ...p.history.slice(-29),
              {
                name: p.name,
                query: p.query,
                facts: { ...p.facts },
                focus_code: p.focus_code,
                core_query: p.core_query,
              },
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
            revision: (p.revision || 0) + 1,
            core_query: prev.core_query,
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
  if (/[?？]|có phải|đúng không|phải không/i.test(text)) return facts;
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
  if (!/vỏ|mặt|thân|khung|tay cầm/.test(s))
    scan('material_unknown', /kim loại|cao su|inox|nhựa|thép|gỗ/g, (m) => m[0]);
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
        (p.revision === undefined || (Number.isSafeInteger(p.revision) && p.revision >= 0)) &&
        (p.core_query === undefined ||
          (typeof p.core_query === 'string' && p.core_query.length <= 200)) &&
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
        if (p.revision === undefined) p.revision = 0;
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

export function applyModelProfile(
  w: Workspace,
  id: string,
  revision: number,
  patch: Partial<ProductRevision>,
  editToken?: string,
): Workspace {
  const p = w.products.find((p) => p.id === id);
  if (!p || (p.revision || 0) !== revision) return w;
  const facts = { ...patch.facts };
  if (patch.facts)
    for (const key of Object.keys(p.facts)) if (!(key in patch.facts)) facts[key] = '';
  return updateProduct(w, id, { ...patch, ...(patch.facts ? { facts } : {}) }, editToken);
}

export function finishAssistantTurn(
  w: Workspace,
  turn: { id: string; revision: number; turnId: string; before: Product; editToken: string },
  patch:
    | { core_query: string; facts: Record<string, string>; new_product: boolean; query?: string }
    | undefined,
  reply: Message,
) {
  const p = w.products.find((p) => p.id === turn.id);
  if (!p) return { workspace: w, stale: true };
  const stale = p.revision !== turn.revision;
  let next = w,
    target = turn.id;
  if (patch && !stale) {
    if (patch.new_product && w.products.length < 99) {
      const user = p.messages.find((m) => m.id === turn.turnId);
      next = {
        ...w,
        products: w.products.map((x) =>
          x.id === p.id
            ? {
                ...turn.before,
                revision: p.revision + 1,
                messages: p.messages.filter((m) => m.id !== turn.turnId),
              }
            : x,
        ),
      };
      const wasActive = w.activeId === turn.id;
      next = addProduct(next, patch.query || patch.core_query);
      target = next.activeId;
      next = updateProduct(next, target, {
        query: patch.query || patch.core_query,
        core_query: patch.core_query,
        facts: patch.facts,
      });
      next = {
        ...next,
        activeId: wasActive ? target : w.activeId,
        products: next.products.map((x) =>
          x.id === target ? { ...x, messages: user ? [user] : [] } : x,
        ),
      };
    } else if (!patch.new_product)
      next = applyModelProfile(
        next,
        p.id,
        turn.revision,
        { core_query: patch.core_query, facts: patch.facts },
        turn.editToken,
      );
  }
  const content = stale
    ? {
        ...reply,
        content:
          reply.content +
          '\n\nHồ sơ đã thay đổi trong lúc chờ. Kết quả này dành cho câu hỏi trước; lời khai mới được giữ nguyên.',
      }
    : reply;
  return {
    workspace: {
      ...next,
      products: next.products.map((x) =>
        x.id === target ? { ...x, messages: [...x.messages.slice(-49), content] } : x,
      ),
    },
    stale,
  };
}
