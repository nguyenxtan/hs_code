'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Search,
  Layers3,
  ArrowUpRight,
  SlidersHorizontal,
  Plus,
  ArrowUp,
  Undo2,
  X,
  GitCompareArrows,
  Database,
  ChevronRight,
  BookOpen,
  Download,
  Share2,
  Info,
  Trash2,
  Check,
  MessageSquare,
} from 'lucide-react';
import type { HSRecord, SearchResult, Workspace as WorkspaceData, Message } from '@/lib/types';
import {
  createWorkspace,
  addProduct,
  updateProduct,
  undoProduct,
  extractFacts,
  validWorkspace,
} from '@/lib/session';
import { categories } from '@/lib/categories';

const STORAGE = 'hs-atlas-workspace-v1';
const factLabels: Record<string, string> = {
  ink: 'Cấp mực',
  operation: 'Vận hành',
  body: 'Vật liệu vỏ',
  face: 'Vật liệu mặt',
};
const num = (n: number) => n.toLocaleString('vi-VN');
function displayCode(code: string) {
  return `${code.slice(0, 4)}.${code.slice(4, 6)}.${code.slice(6)}`;
}
function sourceURL(r: HSRecord) {
  const url = r.raw.source_url || r.raw.nguon || '';
  return /^https:\/\//.test(url) ? url : 'https://github.com/ozvietnam/hs-code-api';
}
function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Đóng" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function RecordDetails({ record: r, onClose }: { record: HSRecord; onClose: () => void }) {
  return (
    <Dialog title={`Mã ${displayCode(r.code)}`} onClose={onClose}>
      <div className="detail-body">
        <span className="eyebrow">
          {r.dataset === 'chapter98' ? 'CHƯƠNG 98 BỔ SUNG' : 'DANH MỤC HS 2022'} · NGUỒN THAM KHẢO
        </span>
        <h3>{r.description}</h3>
        <p className="muted">{r.description_en || 'Chưa có mô tả tiếng Anh tham khảo.'}</p>
        <div className="notice">
          <Info size={16} />
          <span>
            Mô tả cấp cha chưa đầy đủ. Tiếng Anh là tham khảo, không mặc định là bản dịch của dòng 8
            số.
          </span>
        </div>
        <dl className="details-grid">
          <div>
            <dt>Đơn vị trong nguồn</dt>
            <dd>{r.raw.don_vi_tinh || 'Chưa ghi nhận'}</dd>
          </div>
          <div>
            <dt>Mã tương ứng trong nguồn</dt>
            <dd>{r.corresponding_code || 'Chưa ghi nhận'}</dd>
          </div>
        </dl>
        <h4>Thuế ghi trong nguồn</h4>
        <p className="small muted">
          Chưa xác định mức áp dụng theo hàng thực tế, khâu giao dịch, điều kiện và thời điểm.
        </p>
        <dl className="tax-grid">
          {[
            ['MFN', 'thue_nk_uu_dai_mfn_raw'],
            ['Thông thường', 'thue_nk_thong_thuong_raw'],
            ['VAT', 'vat_raw'],
            ['ACFTA', 'acfta_raw'],
            ['BVMT', 'bvmt_raw'],
          ].map(([label, k]) => (
            <div key={k}>
              <dt>{label}</dt>
              <dd>{r.raw[k] || 'Chưa ghi nhận'}</dd>
            </div>
          ))}
        </dl>
        <h4>Ghi chú quản lý chuyên ngành</h4>
        <p className="preserve">
          {r.raw.quan_ly_chuyen_nganh_raw ||
            'Nguồn chưa ghi nhận. Không đồng nghĩa không có yêu cầu.'}
        </p>
        <h4>Ghi chú VAT trong nguồn</h4>
        <p className="preserve">{r.raw.giam_vat_raw || 'Nguồn chưa ghi nhận.'}</p>
        <div className="source-card">
          <BookOpen size={18} />
          <div>
            <b>
              Dòng nguồn {r.provenance.raw_row_index + 1} · {r.provenance.sheet}
            </b>
            <p>Snapshot 03/11/2026 · Mã HS chưa được xác nhận cho lô hàng</p>
            <a href={sourceURL(r)} target="_blank" rel="noreferrer">
              Mở nguồn upstream <ArrowUpRight size={13} />
            </a>
          </div>
        </div>
        <details>
          <summary>Xem mô tả gốc và biến đổi kỹ thuật</summary>
          <pre>
            {JSON.stringify(
              { mo_ta_vi: r.raw.mo_ta_vi, transforms: r.transforms, provenance: r.provenance },
              null,
              2,
            )}
          </pre>
        </details>
      </div>
    </Dialog>
  );
}

export default function Workspace() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [q, setQ] = useState(''),
    [chapter, setChapter] = useState(''),
    [dataset, setDataset] = useState('all'),
    [category, setCategory] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [status, setStatus] = useState<{
    count: number;
    main: number;
    chapter98: number;
    chapters: number;
    version: string;
    date: string;
    chat: string;
  } | null>(null);
  const [selected, setSelected] = useState<HSRecord[]>([]),
    [detail, setDetail] = useState<HSRecord | null>(null);
  const [compare, setCompare] = useState(false),
    [source, setSource] = useState(false),
    [share, setShare] = useState(false);
  const [chat, setChat] = useState(''),
    [sending, setSending] = useState(false),
    [tab, setTab] = useState<'chat' | 'profile'>('chat');
  const [toast, setToast] = useState(''),
    [composing, setComposing] = useState(false),
    [offset, setOffset] = useState(0);
  const [assistantOpen, setAssistantOpen] = useState(false),
    [showFilters, setShowFilters] = useState(false),
    [browse, setBrowse] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null),
    messagesRef = useRef<HTMLDivElement>(null);
  const active =
    workspace?.products.find((p) => p.id === workspace.activeId) || workspace?.products[0];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      const data = raw ? JSON.parse(raw) : null;
      const saved = validWorkspace(data) ? data : createWorkspace();
      setWorkspace(saved);
      setAssistantOpen(saved.products.some((p) => p.messages.length > 0));
    } catch {
      setWorkspace(createWorkspace());
      setToast('Không đọc được hồ sơ cũ. Đang dùng hồ sơ mới.');
    }
    fetch('/api/status')
      .then((r) => r.json())
      .then((v) => {
        if (v.version) setStatus(v);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (workspace)
      try {
        localStorage.setItem(STORAGE, JSON.stringify(workspace));
      } catch {
        setToast('Trình duyệt chưa lưu được hồ sơ. Bạn nên xuất bản sao.');
      }
  }, [workspace]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);
  useEffect(() => {
    setOffset(0);
  }, [q, chapter, dataset, category]);
  useEffect(() => {
    if (composing) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ q, chapter, dataset, category, offset: String(offset) });
      fetch('/api/search?' + params, { signal: controller.signal })
        .then(async (r) => {
          const v = await r.json();
          if (!r.ok) throw Error(v.error);
          setResult(v);
        })
        .catch((e) => {
          if (e.name !== 'AbortError') setError(e.message || 'Chưa tải được kết quả.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, chapter, dataset, category, offset, composing]);
  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: 'smooth' });
  }, [active?.messages.length, sending]);
  function notify(s: string) {
    setToast(s);
  }
  function toggle(r: HSRecord) {
    setSelected((prev) =>
      prev.some((x) => x.code === r.code)
        ? prev.filter((x) => x.code !== r.code)
        : prev.length < 4
          ? [...prev, r]
          : prev,
    );
    if (selected.length >= 4 && !selected.some((x) => x.code === r.code))
      notify('Bạn có thể so sánh tối đa 4 mã.');
  }
  function download(name: string, value: unknown) {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function send() {
    if (!chat.trim() || sending || !workspace || !active) return;
    const message = chat.trim();
    setChat('');
    let next = workspace;
    let id = active.id;
    const fresh = message.match(/^(?:giờ tra|chuyển sang|sản phẩm mới[:\s]+)\s*(.+)/i);
    if (fresh) {
      next = addProduct(next, fresh[1].slice(0, 80));
      id = next.activeId;
    }
    const p = next.products.find((x) => x.id === id)!;
    const facts = extractFacts(message);
    const initialQuery =
      p.query ||
      (fresh ? fresh[1] : message.replace(/^(?:tra\s+(?:hs\s+)?|tìm\s+(?:mã\s+)?)/i, '')).slice(
        0,
        200,
      );
    next = updateProduct(next, id, {
      query: initialQuery,
      name: p.name === 'Sản phẩm mới' ? initialQuery.slice(0, 80) : p.name,
      facts,
    });
    next = {
      ...next,
      products: next.products.map((x) =>
        x.id === id
          ? {
              ...x,
              messages: [...x.messages.slice(-49), { role: 'user' as const, content: message }],
            }
          : x,
      ),
    };
    setWorkspace(next);
    setSending(true);
    setQ(initialQuery);
    const target = next.products.find((x) => x.id === id)!;
    if (Object.keys(facts).length) notify('Đã cập nhật lời khai. Có thể hoàn tác trong Hồ sơ.');
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          query: target.query,
          facts: target.facts,
          history: target.messages
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      const reply: Message = {
        role: 'assistant',
        content: data.content,
        references: data.references,
        mode: data.mode,
      };
      setWorkspace((w) =>
        w
          ? {
              ...w,
              products: w.products.map((x) =>
                x.id === id ? { ...x, messages: [...x.messages.slice(-49), reply] } : x,
              ),
            }
          : w,
      );
      if (data.notice) notify(data.notice);
    } catch (e) {
      setWorkspace((w) =>
        w
          ? {
              ...w,
              products: w.products.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      messages: [
                        ...x.messages,
                        {
                          role: 'assistant',
                          content:
                            (e as Error).message || 'Chưa phản hồi được. Bạn có thể gửi lại.',
                        },
                      ],
                    }
                  : x,
              ),
            }
          : w,
      );
    } finally {
      setSending(false);
    }
  }
  const shareLink =
    typeof window === 'undefined'
      ? ''
      : `${window.location.origin}/?codes=${selected.map((r) => r.code).join(',')}&snapshot=${encodeURIComponent(status?.version || '')}`;
  const showResults = !!(q.trim() || chapter || dataset !== 'all' || category || browse);
  useEffect(() => {
    const codes = new URLSearchParams(window.location.search)
      .get('codes')
      ?.split(',')
      .filter((c) => /^\d{8}$/.test(c))
      .slice(0, 4);
    if (!codes?.length) return;
    Promise.all(codes.map((c) => fetch('/api/search?q=' + c).then((r) => r.json())))
      .then((all) => {
        setSelected(all.flatMap((x) => x.items || []).filter((r) => codes.includes(r.code)));
        setCompare(true);
        setToast('Đã mở các mã được chia sẻ. Đối chiếu snapshot trước khi sử dụng.');
      })
      .catch(() => setToast('Chưa mở được danh sách chia sẻ.'));
  }, []);

  return (
    <div className="app-shell">
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <Layers3 size={23} />
            <b>HS Atlas</b>
            <span>Tra cứu mã HS Việt Nam</span>
          </div>
          <div className="top-actions">
            <button className="help-toggle" onClick={() => setAssistantOpen((v) => !v)}>
              <MessageSquare size={16} />
              Hỗ trợ tìm mã
            </button>
            <button className="data-status" onClick={() => setSource(true)}>
              <span className="green-dot" />
              HS 2022 <span className="dot-sep">·</span> {status ? num(status.count) : '…'} mã{' '}
              <Info size={14} />
            </button>
          </div>
        </header>
        <main className={`workspace-grid ${assistantOpen ? '' : 'solo'}`}>
          <section className="search-area">
            <div className="page-heading">
              <div>
                <span className="eyebrow">DANH MỤC HÀNG HÓA VIỆT NAM</span>
                <h1>Tra cứu mã HS</h1>
                <p>Nhập mã hoặc tên hàng. So sánh các mã và kiểm tra nguồn khi cần.</p>
              </div>
              <div className="heading-symbol">
                <Layers3 size={42} strokeWidth={1.2} />
              </div>
            </div>
            <div className="search-box">
              <Search size={22} />
              <input
                ref={searchRef}
                aria-label="Tìm mã HS hoặc tên hàng"
                placeholder="Nhập tên hàng, công dụng hoặc mã HS…"
                value={q}
                maxLength={200}
                onCompositionStart={() => setComposing(true)}
                onCompositionEnd={() => setComposing(false)}
                onChange={(e) => setQ(e.target.value)}
              />
              {q ? (
                <button className="icon-button" aria-label="Xóa truy vấn" onClick={() => setQ('')}>
                  <X size={18} />
                </button>
              ) : (
                <kbd>/</kbd>
              )}
            </div>
            <div className="quick-search">
              <span>Thử tìm</span>
              {['con dấu', 'máy in', 'cà phê', '01.01'].map((t) => (
                <button key={t} onClick={() => setQ(t)}>
                  {t}
                  <ArrowUpRight size={12} />
                </button>
              ))}
            </div>
            <div className="filter-toolbar">
              <button
                className={`filter-trigger ${showFilters ? 'selected' : ''}`}
                aria-expanded={showFilters}
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal size={15} />
                Bộ lọc{chapter || dataset !== 'all' ? <span>Đang áp dụng</span> : null}
              </button>
              {chapter && (
                <button className="filter-chip" onClick={() => setChapter('')}>
                  Chương {chapter}
                  <X size={12} />
                </button>
              )}
              {dataset !== 'all' && (
                <button className="filter-chip" onClick={() => setDataset('all')}>
                  {dataset === 'main' ? 'Mã chính' : 'Chương 98'}
                  <X size={12} />
                </button>
              )}
            </div>
            <div className={`filters ${showFilters ? '' : 'hidden'}`}>
              <div className="filter-title">
                <SlidersHorizontal size={16} />
                <span>Bộ lọc</span>
              </div>
              <label>
                <span className="sr-only">Bộ dữ liệu</span>
                <select
                  aria-label="Bộ dữ liệu"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                >
                  <option value="all">Tất cả dữ liệu</option>
                  <option value="main">11.414 mã chính</option>
                  <option value="chapter98">457 mã chương 98</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Chương</span>
                <select
                  aria-label="Chương"
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                >
                  <option value="">Tất cả chương</option>
                  {Array.from({ length: 98 }, (_, i) => String(i + 1).padStart(2, '0'))
                    .filter((c) => c !== '77')
                    .map((c) => (
                      <option key={c} value={c}>
                        Chương {c}
                      </option>
                    ))}
                </select>
              </label>
              {(chapter || dataset !== 'all') && (
                <button
                  className="text-button"
                  onClick={() => {
                    setChapter('');
                    setDataset('all');
                  }}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
            <div className={`utility-groups ${showFilters ? '' : 'hidden'}`}>
              <label>
                <Layers3 size={14} />
                <select
                  aria-label="Ưu tiên nhóm gợi ý"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">Ưu tiên nhóm hàng</option>
                  {categories.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <span>Nhóm gợi ý giúp sắp xếp kết quả, không giới hạn mã tìm được.</span>
            </div>
            <div className={`results-heading ${showResults ? '' : 'hidden'}`}>
              <h2>
                {q ? 'Kết quả tra cứu' : 'Danh mục mã HS'}{' '}
                <span>{loading ? '…' : result ? num(result.total) : '…'}</span>
              </h2>
              <span className="small muted" aria-live="polite">
                {loading
                  ? 'Đang tìm…'
                  : result?.mode?.startsWith('hybrid')
                    ? 'Từ khóa + ngữ nghĩa'
                    : 'Tìm kiếm từ khóa'}
              </span>
            </div>
            <div className={`data-caveat ${showResults ? '' : 'hidden'}`}>
              <Info size={15} />
              <span>Kết quả là gợi ý mã. Mở chi tiết để đối chiếu mô tả, thuế và nguồn.</span>
            </div>
            {!showResults && (
              <div className="search-intro">
                <div>
                  <BookOpen size={22} />
                </div>
                <h2>Bạn muốn tra mặt hàng nào?</h2>
                <p>
                  Có thể nhập tên không dấu, tiếng Anh hoặc một phần mã.
                  <br />
                  Ví dụ: “con dau”, “coffee” hoặc “01.01”.
                </p>
                <button className="text-button" onClick={() => setBrowse(true)}>
                  Duyệt toàn bộ danh mục <ChevronRight size={14} />
                </button>
                <button className="intro-help" onClick={() => setAssistantOpen(true)}>
                  Chưa biết tìm thế nào? Mô tả thêm bằng lời.
                </button>
              </div>
            )}
            {error && (
              <div role="alert" className="error-box">
                {error}
              </div>
            )}
            {showResults && !loading && !error && result?.total === 0 && (
              <div className="empty-state">
                <Search size={32} />
                <h3>Chưa có kết quả trong phạm vi này</h3>
                <p>
                  Thử từ khóa ngắn hơn hoặc bỏ một bộ lọc. Điều này không có nghĩa hàng không có mã
                  HS.
                </p>
                <button
                  onClick={() => {
                    setChapter('');
                    setDataset('all');
                  }}
                >
                  Bỏ bộ lọc
                </button>
              </div>
            )}
            <div
              className={`result-list ${loading ? 'is-loading' : ''} ${showResults ? '' : 'hidden'}`}
              aria-busy={loading}
            >
              {result?.items.map((r) => (
                <article className="result-card" key={r.code}>
                  <div className="record-top">
                    <button className="code-link" onClick={() => setDetail(r)}>
                      {displayCode(r.code)}
                      <ArrowUpRight size={14} />
                    </button>
                    <span className={`dataset-tag ${r.dataset === 'chapter98' ? 'special' : ''}`}>
                      {r.dataset === 'chapter98' ? 'CHƯƠNG 98' : `CHƯƠNG ${r.chapter}`}
                    </span>
                  </div>
                  <button className="description-button" onClick={() => setDetail(r)}>
                    {r.description.replace(/^(?:-\s*)+/, '')}
                  </button>
                  {r.description_en && <p className="english-reference">{r.description_en}</p>}
                  <div className="record-bottom">
                    <span>
                      {r.raw.don_vi_tinh || 'Chưa ghi đơn vị'}
                      <i />
                      Nhóm {r.heading}
                      <i />
                      <span className="reference-label">Nguồn tham khảo</span>
                    </span>
                    <button
                      className={`compare-toggle ${selected.some((x) => x.code === r.code) ? 'on' : ''}`}
                      aria-pressed={selected.some((x) => x.code === r.code)}
                      aria-label={`So sánh ${r.code}`}
                      onClick={() => toggle(r)}
                    >
                      {selected.some((x) => x.code === r.code) ? (
                        <Check size={14} />
                      ) : (
                        <Plus size={14} />
                      )}
                      So sánh
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {showResults && result && result.total > 30 && (
              <div className="pagination">
                <button
                  disabled={offset === 0 || loading}
                  onClick={() => setOffset((n) => Math.max(0, n - 30))}
                >
                  Trang trước
                </button>
                <span>
                  {num(offset + 1)}–{num(Math.min(offset + 30, result.total))} / {num(result.total)}
                </span>
                <button
                  disabled={offset + 30 >= result.total || loading}
                  onClick={() => setOffset((n) => n + 30)}
                >
                  Trang sau
                </button>
              </div>
            )}
            <footer className="results-footer">
              HS Knowledge Base — ozvietnam · Dữ liệu CC BY-SA 4.0 · Bản chuẩn hóa kỹ thuật, chưa
              xác minh pháp lý từng dòng.
            </footer>
          </section>
          <aside className={`assistant-panel ${assistantOpen ? '' : 'hidden'}`}>
            <header>
              <span className="assistant-icon">
                <MessageSquare size={19} />
              </span>
              <div>
                <h2>Hỗ trợ tìm mã</h2>
                <p>Mô tả thêm theo từng sản phẩm</p>
              </div>
              <button
                className="icon-button close-help"
                aria-label="Đóng hỗ trợ"
                onClick={() => setAssistantOpen(false)}
              >
                <X size={16} />
              </button>
            </header>
            <div className="panel-tabs">
              <button className={tab === 'chat' ? 'active' : ''} onClick={() => setTab('chat')}>
                Hội thoại
              </button>
              <button
                className={tab === 'profile' ? 'active' : ''}
                onClick={() => setTab('profile')}
              >
                Hồ sơ <span>{active ? Object.keys(active.facts).length : 0}</span>
              </button>
            </div>
            <div className="active-product">
              <span className="green-dot" />
              <select
                aria-label="Sản phẩm đang trao đổi"
                value={active?.id || ''}
                disabled={sending}
                onChange={(e) => {
                  if (workspace) {
                    const id = e.target.value;
                    setWorkspace({ ...workspace, activeId: id });
                    setQ(workspace.products.find((p) => p.id === id)?.query || '');
                  }
                }}
              >
                {workspace?.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                className="icon-button"
                aria-label="Tạo sản phẩm mới"
                disabled={sending || !workspace}
                onClick={() => workspace && setWorkspace(addProduct(workspace))}
              >
                <Plus size={16} />
              </button>
            </div>
            {tab === 'chat' ? (
              <>
                <div className="messages" ref={messagesRef}>
                  {!active?.messages.length && (
                    <div className="welcome">
                      <div className="welcome-icon">
                        <Layers3 size={28} />
                      </div>
                      <h3>Bắt đầu từ điều bạn biết.</h3>
                      <p>
                        Mô tả hàng hóa bằng lời thường. Thông tin được giữ theo từng sản phẩm và có
                        thể sửa lại.
                      </p>
                      <div className="chat-example">
                        <span>Ví dụ</span>“Tra con dấu đóng mực bằng tay”
                      </div>
                      <p className="small">
                        Bạn có thể sửa lời khai trong Hồ sơ. Kết quả vẫn cần đối chiếu trước khi
                        khai báo.
                      </p>
                    </div>
                  )}
                  {active?.messages.map((m, i) => (
                    <div key={i} className={`message ${m.role}`}>
                      <span className="message-label">
                        {m.role === 'user'
                          ? 'Bạn khai'
                          : m.mode === 'llm'
                            ? 'Diễn giải AI'
                            : 'Theo dữ liệu tham khảo'}
                      </span>
                      <p>{m.content}</p>
                      {m.references?.length ? (
                        <div className="references">
                          {m.references.map((r, j) => (
                            <button key={r.code} onClick={() => setDetail(r)}>
                              [{j + 1}] {r.code}
                              <ArrowUpRight size={12} />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  {sending && (
                    <div className="thinking" role="status">
                      Đang truy xuất hồ sơ và nguồn…
                    </div>
                  )}
                </div>
                <form
                  className="chat-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <textarea
                    aria-label="Mô tả hàng hóa"
                    placeholder="Mô tả hàng hóa hoặc bổ sung lời khai…"
                    value={chat}
                    maxLength={1500}
                    onChange={(e) => setChat(e.target.value)}
                    rows={2}
                  />
                  <div>
                    <span>Chỉ lưu trên trình duyệt này</span>
                    <button aria-label="Gửi mô tả" disabled={sending || !chat.trim()} type="submit">
                      <ArrowUp size={18} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="profile-content">
                <label className="field-label">
                  Tên sản phẩm
                  <input
                    aria-label="Tên sản phẩm"
                    value={active?.name || ''}
                    onChange={(e) =>
                      workspace &&
                      active &&
                      setWorkspace(
                        updateProduct(workspace, active.id, { name: e.target.value.slice(0, 80) }),
                      )
                    }
                  />
                </label>
                <label className="field-label profile-query">
                  Tên hàng dùng để tìm
                  <input
                    aria-label="Tên hàng dùng để tìm"
                    value={active?.query || ''}
                    maxLength={200}
                    onChange={(e) => {
                      if (workspace && active) {
                        setWorkspace(
                          updateProduct(workspace, active.id, { query: e.target.value }),
                        );
                        setQ(e.target.value);
                      }
                    }}
                  />
                </label>
                <h4>Đang hiểu từ lời khai</h4>
                {active && Object.keys(active.facts).length ? (
                  Object.entries(active.facts)
                    .filter(([k]) => k !== 'notes')
                    .map(([k, v]) => (
                      <div className="fact" key={k}>
                        <label>
                          {factLabels[k] || k}
                          <input
                            aria-label={factLabels[k] || k}
                            value={v}
                            onChange={(e) =>
                              workspace &&
                              setWorkspace(
                                updateProduct(workspace, active.id, {
                                  facts: { [k]: e.target.value.slice(0, 200) },
                                }),
                              )
                            }
                          />
                        </label>
                        <span>Bạn khai · có thể sửa</span>
                      </div>
                    ))
                ) : (
                  <p className="muted small">
                    Chưa có thuộc tính được trích từ lời khai. Các thuộc tính này không tự lọc mất
                    mã.
                  </p>
                )}
                <label className="field-label profile-notes">
                  Thông tin bổ sung
                  <textarea
                    aria-label="Thông tin bổ sung"
                    placeholder="Công dụng, vật liệu hoặc thông số bạn đã biết…"
                    maxLength={200}
                    rows={3}
                    value={active?.facts.notes || ''}
                    onChange={(e) =>
                      workspace &&
                      active &&
                      setWorkspace(
                        updateProduct(workspace, active.id, { facts: { notes: e.target.value } }),
                      )
                    }
                  />
                </label>
                <button
                  className="secondary-button full"
                  disabled={!active?.history.length}
                  onClick={() => {
                    if (workspace && active) {
                      const w = undoProduct(workspace, active.id);
                      setWorkspace(w);
                      setQ(w.products.find((p) => p.id === active.id)!.query);
                      notify('Đã hoàn tác hồ sơ. Các tin nhắn trước vẫn là lịch sử.');
                    }
                  }}
                >
                  <Undo2 size={15} />
                  Hoàn tác thay đổi hồ sơ
                </button>
                <div className="profile-actions">
                  <button
                    onClick={() =>
                      active && download('ho-so-hs-local.json', { version: 1, product: active })
                    }
                  >
                    <Download size={15} />
                    Xuất hồ sơ có lời khai
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Xóa toàn bộ hồ sơ trên trình duyệt này?')) {
                        setWorkspace(createWorkspace());
                        setQ('');
                        notify('Đã xóa hồ sơ trên thiết bị.');
                      }
                    }}
                  >
                    <Trash2 size={15} />
                    Xóa dữ liệu trên thiết bị
                  </button>
                </div>
                <div className="notice small">
                  <Info size={15} />
                  <span>
                    Lời khai hỗ trợ xếp hạng trong hội thoại. Bộ lọc danh sách chỉ đổi khi bạn chọn
                    trực tiếp.
                  </span>
                </div>
              </div>
            )}
          </aside>
        </main>
      </div>
      {selected.length > 0 && (
        <div className="compare-bar">
          <span>
            <b>{selected.length}</b> mã đã chọn
          </span>
          <div>
            {selected.map((r) => (
              <button key={r.code} onClick={() => toggle(r)}>
                {r.code}
                <X size={12} />
              </button>
            ))}
          </div>
          <button className="primary-button" onClick={() => setCompare(true)}>
            So sánh mã
            <GitCompareArrows size={16} />
          </button>
        </div>
      )}
      {toast && (
        <div role="status" className="toast">
          {toast}
        </div>
      )}
      {detail && <RecordDetails record={detail} onClose={() => setDetail(null)} />}
      {compare && (
        <Dialog title="So sánh mã ứng viên" onClose={() => setCompare(false)}>
          <div className="detail-body">
            {selected.length < 2 ? (
              <div className="empty-state">
                <GitCompareArrows size={30} />
                <h3>Chọn từ 2 đến 4 mã để đối chiếu</h3>
                <p>Dùng nút “So sánh” trên mỗi kết quả.</p>
              </div>
            ) : (
              <>
                <div
                  className="comparison-grid"
                  style={{ gridTemplateColumns: `repeat(${selected.length},minmax(190px,1fr))` }}
                >
                  {selected.map((r) => (
                    <section key={r.code}>
                      <h3>{displayCode(r.code)}</h3>
                      <b>{r.description}</b>
                      <p className="muted">{r.description_en}</p>
                      <dl>
                        <dt>Đơn vị</dt>
                        <dd>{r.raw.don_vi_tinh || 'Chưa ghi nhận'}</dd>
                        <dt>Nhóm / phân nhóm</dt>
                        <dd>
                          {r.heading} / {r.subheading}
                        </dd>
                        <dt>VAT trong nguồn</dt>
                        <dd>{r.raw.vat_raw || 'Chưa ghi nhận'}</dd>
                      </dl>
                      <button className="text-button" onClick={() => setDetail(r)}>
                        Mở chi tiết & nguồn ↗
                      </button>
                    </section>
                  ))}
                </div>
                <div className="notice">
                  <Info size={16} />
                  <span>
                    Đối chiếu mô tả gốc. Chưa có đủ cấp cha/chú giải để khẳng định điểm phân biệt
                    pháp lý hoặc chốt mã.
                  </span>
                </div>
                <div className="dialog-actions">
                  <button className="secondary-button" onClick={() => setShare(true)}>
                    <Share2 size={15} />
                    Chia sẻ danh sách mã
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() =>
                      download('ma-hs-tham-khao.json', {
                        snapshot: status?.version,
                        notice: 'Mã ứng viên; VAT raw chưa đánh giá điều kiện.',
                        codes: selected.map((r) => ({
                          code: r.code,
                          description: r.description,
                          source: sourceURL(r),
                        })),
                      })
                    }
                  >
                    <Download size={15} />
                    Xuất mã, không kèm lời khai
                  </button>
                </div>
              </>
            )}
          </div>
        </Dialog>
      )}
      {share && (
        <Dialog title="Xem trước link chia sẻ" onClose={() => setShare(false)}>
          <div className="detail-body">
            <p>
              Link chỉ gồm <b>các mã đã chọn và ID snapshot</b>. Không kèm truy vấn tự do, hồ sơ
              hoặc lịch sử chat.
            </p>
            <textarea readOnly value={shareLink} aria-label="Link chia sẻ" rows={4} />
            <button
              className="primary-button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareLink);
                  notify('Đã sao chép link chia sẻ.');
                  setShare(false);
                } catch {
                  notify('Hãy chọn và sao chép link thủ công.');
                }
              }}
            >
              Sao chép link
            </button>
          </div>
        </Dialog>
      )}
      {source && (
        <Dialog title="Dữ liệu & phạm vi sử dụng" onClose={() => setSource(false)}>
          <div className="detail-body">
            <div className="source-stats">
              <div>
                <b>{num(status?.main || 11414)}</b>
                <span>Mã chính HS 2022</span>
              </div>
              <div>
                <b>{num(status?.chapter98 || 457)}</b>
                <span>Mã chương 98</span>
              </div>
              <div>
                <b>{status?.chapters || 97}</b>
                <span>Tiền tố chương có mặt</span>
              </div>
            </div>
            <h3>Giữ nguyên nguồn. Thấy rõ phần còn thiếu.</h3>
            <p>
              Snapshot ngày 03/11/2026, đã chuẩn hóa kỹ thuật song song raw. Nguồn do HS Knowledge
              Base — ozvietnam biên soạn, giấy phép dữ liệu CC BY-SA 4.0.
            </p>
            <ul className="source-list">
              <li>Mô tả cấp cha và chú giải chưa đầy đủ; chưa dựng cây mô tả chính thức.</li>
              <li>Tiếng Anh tham khảo, không mặc định là bản dịch dòng mã 8 số.</li>
              <li>VAT, MFN, ACFTA và BVMT là nguyên văn trong nguồn; chưa xác định mức áp dụng.</li>
              <li>Ô trống nghĩa là chưa ghi nhận, không đồng nghĩa không có nghĩa vụ.</li>
              <li>Hồ sơ chỉ lưu trên trình duyệt. Xóa dữ liệu trình duyệt sẽ mất hồ sơ.</li>
            </ul>
            <p className="small muted">Phiên bản: {status?.version || 'Đang tải…'}</p>
            <div className="dialog-actions">
              <a
                className="secondary-button"
                href="https://github.com/ozvietnam/hs-code-api/blob/main/LICENSE-DATA"
                target="_blank"
                rel="noreferrer"
              >
                Giấy phép dữ liệu
                <ArrowUpRight size={14} />
              </a>
              <a
                className="secondary-button"
                href="https://github.com/nguyenxtan/hs_code"
                target="_blank"
                rel="noreferrer"
              >
                Mã nguồn dự án
                <ArrowUpRight size={14} />
              </a>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
