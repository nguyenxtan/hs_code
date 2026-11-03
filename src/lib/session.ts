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
  const p = product(name);
  return { ...w, activeId: p.id, products: [...w.products, p] };
}
export function updateProduct(
  w: Workspace,
  id: string,
  patch: Partial<ProductRevision>,
): Workspace {
  return {
    ...w,
    products: w.products.map((p) =>
      p.id !== id
        ? p
        : {
            ...p,
            ...patch,
            facts: { ...p.facts, ...patch.facts },
            history: [
              ...p.history.slice(-29),
              { name: p.name, query: p.query, facts: { ...p.facts } },
            ],
          },
    ),
  };
}
export function undoProduct(w: Workspace, id: string): Workspace {
  return {
    ...w,
    products: w.products.map((p) => {
      const prev = p.history.at(-1);
      return p.id !== id || !prev ? p : { ...p, ...prev, history: p.history.slice(0, -1) };
    }),
  };
}
export function extractFacts(text: string): Record<string, string> {
  const facts: Record<string, string> = {};
  const s = text.toLocaleLowerCase('vi');
  if (/khay mực|chấm mực|mực ngoài|mực rời/.test(s)) facts.ink = 'khay mực rời';
  else if (/sẵn mực|tự có mực|liền mực/.test(s)) facts.ink = 'tự có mực';
  if (/bằng tay|cầm tay|thủ công/.test(s)) facts.operation = 'bằng tay';
  else if (/tự động|gắn máy/.test(s)) facts.operation = 'gắn máy';
  const body = s.match(/vỏ\s+(nhựa|kim loại|gỗ|thép|inox)/);
  if (body) facts.body = body[1];
  const face = s.match(/mặt\s+(cao su|kim loại|nhựa)/);
  if (face) facts.face = face[1];
  return facts;
}
export function validWorkspace(input: unknown): input is Workspace {
  if (!input || typeof input !== 'object') return false;
  const w = input as Workspace;
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
    w.products.some((p) => p.id === w.activeId) &&
    w.products.every(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        typeof p.name === 'string' &&
        typeof p.query === 'string' &&
        facts(p.facts) &&
        Array.isArray(p.messages) &&
        p.messages.every(
          (m) => m && ['user', 'assistant'].includes(m.role) && typeof m.content === 'string',
        ) &&
        Array.isArray(p.history) &&
        p.history.every(
          (h) => h && typeof h.name === 'string' && typeof h.query === 'string' && facts(h.facts),
        ),
    )
  );
}
