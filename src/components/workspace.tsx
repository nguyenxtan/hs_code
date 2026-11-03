'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Search,
  Layers3,
  ArrowUpRight,
  Plus,
  ArrowUp,
  Undo2,
  X,
  GitCompareArrows,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Download,
  Share2,
  Info,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import type {
  HSRecord,
  SearchResult,
  Workspace as WorkspaceData,
  Message,
  CodeReference,
} from '@/lib/types';
import {
  createWorkspace,
  addProduct,
  updateProduct,
  undoProduct,
  extractFacts,
  restoreWorkspace,
  serializeWorkspace,
} from '@/lib/session';
import { ChapterChips, RankLens } from '@/components/search-filters';
import Dialog from '@/components/dialog';
import AssistantPanel from '@/components/assistant-panel';
import { hasSearchIntent } from '@/lib/search';

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
function RecordDetails({
  record: r,
  onClose,
  selected,
  onToggle,
  previous,
  next,
}: {
  record: HSRecord;
  onClose: () => void;
  selected: boolean;
  onToggle: () => void;
  previous?: () => void;
  next?: () => void;
}) {
  return (
    <Dialog
      title={`Mã ${displayCode(r.code)}`}
      onClose={onClose}
      onKeyDown={(e) => {
        if (/INPUT|TEXTAREA|SELECT/.test((e.target as HTMLElement).tagName)) return;
        if (e.key === 'ArrowLeft' && previous) {
          e.preventDefault();
          previous();
        }
        if (e.key === 'ArrowRight' && next) {
          e.preventDefault();
          next();
        }
      }}
    >
      <div className="detail-navigation">
        <label className="compare-toggle">
          <input
            type="checkbox"
            aria-label="Thêm vào so sánh"
            checked={selected}
            onChange={onToggle}
          />
          Thêm vào so sánh
        </label>
        <div>
          <button aria-label="Mã trước" disabled={!previous} onClick={previous}>
            <ArrowLeft size={15} />
            Mã trước
          </button>
          <button aria-label="Mã sau" disabled={!next} onClick={next}>
            Mã sau
            <ArrowRight size={15} />
          </button>
        </div>
      </div>
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
    [category, setCategory] = useState('');
  const dataset = 'all';
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
    [browse, setBrowse] = useState(false);
  const [storageError, setStorageError] = useState(false),
    [shareWarning, setShareWarning] = useState('');
  const ragRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLTextAreaElement>(null),
    editToken = useRef('');
  const searchRef = useRef<HTMLInputElement>(null),
    messagesRef = useRef<HTMLDivElement>(null);
  const active =
    workspace?.products.find((p) => p.id === workspace.activeId) || workspace?.products[0];

  useEffect(() => {
    if (window.innerWidth > 760) ragRef.current?.focus({ preventScroll: true });
    try {
      const raw = localStorage.getItem(STORAGE);
      const data = raw ? JSON.parse(raw) : null;
      const saved = restoreWorkspace(data) || createWorkspace();
      setWorkspace(saved);
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
        localStorage.setItem(STORAGE, serializeWorkspace(workspace));
        setStorageError(false);
      } catch {
        setStorageError(true);
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
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ q, chapter, dataset, category, offset: String(offset) });
      fetch('/api/search?' + params, { signal: controller.signal })
        .then(async (r) => {
          const v = await r
            .json()
            .catch(() => ({ error: 'Chưa đọc được phản hồi. Vui lòng thử lại.' }));
          if (!r.ok || v.error) throw Error(v.error);
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
  function openHelp() {
    if (!showResults && !active?.query && !active?.messages.length) {
      ragRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' });
      ragRef.current?.focus({ preventScroll: true });
      return;
    }
    if (!showResults && active?.query) setQ(active.query);
    if (workspace && active && !active.query.trim() && !active.messages.length && q.trim()) {
      setWorkspace(
        updateProduct(workspace, active.id, { query: q.trim(), name: q.trim().slice(0, 80) }),
      );
    }
    setTab('chat');
    setAssistantOpen(true);
  }
  function beginEdit() {
    editToken.current = crypto.randomUUID();
  }
  async function openReference(ref: CodeReference) {
    try {
      const response = await fetch(
        '/api/record?' + new URLSearchParams({ code: ref.code, version: ref.version }),
      );
      const data = await response
        .json()
        .catch(() => ({ error: 'Chưa đọc được phản hồi. Vui lòng thử lại.' }));
      if (!response.ok || data.error) throw Error(data.error);
      setDetail(data.record);
      if (!ref.version) notify('Tham chiếu cũ chưa ghi phiên bản. Đang xem dữ liệu hiện tại.');
    } catch (e) {
      notify((e as Error).message || 'Chưa mở được tham chiếu.');
    }
  }
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
  async function send(startFresh = false) {
    if (!chat.trim() || sending || !workspace || !active) return;
    const message = chat.trim();
    setChat('');
    let next = workspace;
    let id = active.id;
    const fresh = message.match(/^(?:giờ tra|chuyển sang|sản phẩm mới[:\s]+)\s*(.+)/i);
    if (
      fresh ||
      (startFresh && (active.query || active.messages.length || Object.keys(active.facts).length))
    ) {
      if (next.products.length >= 99) {
        setChat(message);
        notify('Đã đạt 99 hồ sơ. Hãy xuất bản sao và dọn hồ sơ trước khi tạo thêm.');
        return;
      }
      next = addProduct(next, (fresh?.[1] || message).slice(0, 80));
      id = next.activeId;
    }
    const p = next.products.find((x) => x.id === id)!;
    const facts = extractFacts(message, p.facts);
    const inputQuery = (
      fresh ? fresh[1] : message.replace(/^(?:tra\s+(?:hs\s+)?|tìm\s+(?:mã\s+)?)/i, '')
    )
      .trim()
      .slice(0, 200);
    const initialQuery = hasSearchIntent(p.query) ? p.query : inputQuery;
    next = updateProduct(next, id, {
      query: initialQuery,
      name:
        p.name === 'Sản phẩm mới' && hasSearchIntent(initialQuery)
          ? initialQuery.slice(0, 80)
          : p.name,
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
    if (Object.keys(facts).length)
      notify(
        'Đã cập nhật: ' +
          Object.entries(facts)
            .map(([k, v]) => (factLabels[k] || k) + ': ' + (v || 'đã bỏ'))
            .join('; ') +
          '. Có thể hoàn tác.',
      );
    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          query: target.query,
          facts: target.facts,
          filters: { chapter, dataset, category },
          history: target.messages
            .slice(0, -1)
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) })),
        }),
      });
      const data = await response
        .json()
        .catch(() => ({ error: 'Chưa đọc được phản hồi. Vui lòng thử lại.' }));
      if (!response.ok || data.error) throw Error(data.error);
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
                        ...x.messages.slice(-49),
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
  const showResults = !!(q.trim() || chapter || category || browse);
  const allFacets = result?.available_facets || result?.facets || [];
  const allCount = allFacets.reduce((n, f) => n + f.count, 0);
  const [profileMenu, setProfileMenu] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wantedVersion = params.get('snapshot') || '';
    const codes = params
      .get('codes')
      ?.split(',')
      .filter((c) => /^\d{8}$/.test(c))
      .slice(0, 4);
    if (!codes?.length) return;
    Promise.all(codes.map((c) => fetch('/api/search?q=' + c).then((r) => r.json())))
      .then((all) => {
        const found = all.flatMap((x) => x.items || []).filter((r) => codes.includes(r.code));
        setSelected(found);
        setCompare(found.length >= 2);
        if (found.length === 1) setQ(found[0].code);
        const missing = codes.filter((c) => !found.some((r) => r.code === c));
        const current = all[0]?.version;
        const messages = [];
        if (wantedVersion && current !== wantedVersion)
          messages.push(
            'Khác phiên bản dữ liệu: link dùng ' +
              wantedVersion +
              ', ứng dụng đang dùng ' +
              current +
              '. Các mã dưới đây được xem theo bản hiện tại.',
          );
        if (missing.length)
          messages.push('Không tìm thấy mã trong dữ liệu hiện tại: ' + missing.join(', ') + '.');
        setShareWarning(messages.join(' '));
        if (!messages.length) notify('Đã mở danh sách mã; phiên bản dữ liệu khớp.');
      })
      .catch(() => setToast('Chưa mở được danh sách chia sẻ.'));
  }, []);

  return (
    <div className={`app-shell ${showResults ? 'has-results' : 'is-landing'}`}>
      <div className="main-shell">
        {showResults && (
          <a className="skip-link" href="#lookup-results">
            Bỏ qua tới kết quả
          </a>
        )}
        <header className="topbar">
          <a className="brand" href="/" aria-label="HS Atlas — trang tra cứu">
            <Layers3 size={25} />
            <b>HS Atlas</b>
          </a>
          <div className="landing-heading">
            <span className="eyebrow">TRỢ LÝ TRA CỨU HS</span>
            <h1>Mô tả hàng, tìm mã HS</h1>
            <p>
              Khai báo dần đặc điểm hàng hóa. Trợ lý tra cứu dữ liệu và dẫn nguồn để bạn đối chiếu.
            </p>
          </div>
          <div className="rag-start">
            <form
              className="rag-composer"
              onSubmit={(e) => {
                e.preventDefault();
                setTab('chat');
                setAssistantOpen(true);
                send(true);
              }}
            >
              <label htmlFor="rag-description">
                <MessageSquare size={16} />
                Mô tả mặt hàng của bạn
              </label>
              <textarea
                id="rag-description"
                ref={ragRef}
                aria-label="Mô tả hàng hóa để hỏi trợ lý"
                placeholder="Ví dụ: Tôi cần tra con dấu đóng mực bằng tay, vỏ nhựa, mặt cao su…"
                value={chat}
                maxLength={1500}
                onChange={(e) => setChat(e.target.value)}
                rows={3}
              />
              <div className="rag-composer-actions">
                <span>
                  <BookOpen size={15} />
                  {status ? `${num(status.count)} mã` : 'Dữ liệu HS'} · có nguồn tham khảo
                </span>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={sending || !chat.trim() || !workspace}
                >
                  Tra cùng trợ lý <ArrowUpRight size={17} />
                </button>
              </div>
            </form>
            <div className="rag-examples">
              <span>Thử mô tả</span>
              {['Con dấu bằng tay', 'Máy in văn phòng', 'Cà phê rang'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setChat(t);
                    ragRef.current?.focus({ preventScroll: true });
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="search-box">
            <span className="quick-label">Tra nhanh</span>
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
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Escape') {
                  e.stopPropagation();
                  if (q) setQ('');
                  else e.currentTarget.blur();
                }
                if (e.key === 'ArrowDown' && !loading) {
                  e.preventDefault();
                  document.querySelector<HTMLButtonElement>('.code-link')?.focus();
                }
              }}
            />
            {q ? (
              <button className="icon-button" aria-label="Xóa truy vấn" onClick={() => setQ('')}>
                <X size={18} />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </div>

          <div className="top-actions">
            <button
              className="help-toggle"
              aria-label="Hỗ trợ tìm mã"
              aria-expanded={assistantOpen}
              onClick={() => (assistantOpen ? setAssistantOpen(false) : openHelp())}
            >
              <MessageSquare size={18} />
              <span>Hỏi trợ lý HS</span>
            </button>
            <button
              className="data-status"
              aria-label="Dữ liệu và nguồn"
              onClick={() => setSource(true)}
            >
              <span className="green-dot" />
              <span>HS 2022</span>
              <Info size={15} />
            </button>
          </div>
          {!showResults && (
            <div className="landing-options">
              <button className="browse-button" onClick={() => setBrowse(true)}>
                Duyệt theo chương <ArrowRight size={15} />
              </button>
              <p className="search-hint">
                Tìm bằng tên Việt, tiếng Anh, không dấu hoặc một phần mã.
              </p>
            </div>
          )}
        </header>
        {storageError && (
          <div className="storage-warning" role="alert">
            Hồ sơ chưa lưu được trên thiết bị. Đừng đóng trang trước khi xuất bản sao.
            <button onClick={() => workspace && download('ho-so-hs-backup.json', workspace)}>
              Xuất bản sao
            </button>
          </div>
        )}
        <main className={`workspace-grid ${assistantOpen ? 'with-assistant' : 'solo'}`}>
          <section className="search-area" id="lookup-results" tabIndex={-1}>
            {shareWarning && (
              <div className="shared-warning notice" role="status">
                {shareWarning}
              </div>
            )}
            {showResults && (
              <>
                <div className="results-heading">
                  <div>
                    <h1>{q ? 'Kết quả tra cứu' : 'Danh mục HS'}</h1>
                    <span className="result-count" aria-live="polite">
                      {result ? num(result.total) : '…'} mã{chapter ? ` · Chương ${chapter}` : ''}
                    </span>
                  </div>
                  <RankLens category={category} onChange={setCategory} />
                </div>
                <ChapterChips
                  chapter={chapter}
                  facets={allFacets}
                  samples={result?.items || []}
                  query={q}
                  loading={loading}
                  onChange={setChapter}
                />
                <div className="data-caveat">
                  <Info size={14} />
                  <span>Mã tham khảo. Đối chiếu mô tả và nguồn trước khi khai báo.</span>
                  {loading && (
                    <span className="search-progress" role="status">
                      Đang tìm…
                    </span>
                  )}
                </div>
              </>
            )}
            {error && (
              <div role="alert" className="error-box">
                {error}
              </div>
            )}
            {showResults && !loading && !error && result?.total === 0 && (
              <div className="empty-state">
                <Search size={28} />
                <h2>
                  {chapter
                    ? `Không có mã khớp trong Chương ${chapter}.`
                    : 'Chưa tìm thấy mã phù hợp'}
                </h2>
                <p>
                  {chapter && allCount
                    ? `Có ${num(allCount)} kết quả ở chương khác.`
                    : 'Thử tên công dụng, tên tiếng Anh hoặc mô tả cụ thể hơn. Điều này không có nghĩa hàng không có mã HS.'}
                </p>
                {chapter && (
                  <button className="primary-button" onClick={() => setChapter('')}>
                    {allCount ? `Xem ${num(allCount)} kết quả ở mọi chương` : 'Tìm ở mọi chương'}
                  </button>
                )}
                <button className="text-button" onClick={openHelp}>
                  Mô tả hàng bằng lời <ArrowRight size={15} />
                </button>
              </div>
            )}
            <div
              className={`result-list ${loading ? 'is-loading' : ''} ${showResults ? '' : 'hidden'}`}
              aria-busy={loading}
            >
              {result?.items.map((r, i) => (
                <article
                  className="result-row"
                  key={r.code}
                  data-code={r.code}
                  data-chapter={r.chapter}
                >
                  <button
                    className="code-link"
                    onClick={() => setDetail(r)}
                    onKeyDown={(e) => {
                      if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
                        e.preventDefault();
                        const codes = document.querySelectorAll<HTMLButtonElement>('.code-link');
                        codes[
                          Math.max(
                            0,
                            Math.min(codes.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)),
                          )
                        ]?.focus();
                      }
                      if (e.key === ' ' || e.key === 'x') {
                        e.preventDefault();
                        toggle(r);
                      }
                    }}
                  >
                    {displayCode(r.code)}
                  </button>
                  <div className="record-description">
                    <button className="description-button" onClick={() => setDetail(r)}>
                      {r.description.replace(/^(?:-\s*)+/, '')}
                    </button>
                    <div className="record-meta">
                      <span>
                        {r.raw.don_vi_tinh || 'Chưa ghi đơn vị'} · Nhóm {r.heading}
                      </span>
                      {r.dataset === 'chapter98' && (
                        <span className="dataset-tag special">Bổ sung VN</span>
                      )}
                      <span className="english-reference">{r.description_en}</span>
                    </div>
                  </div>
                  <label className="compare-toggle">
                    <input
                      type="checkbox"
                      aria-label={`So sánh ${r.code}`}
                      checked={selected.some((x) => x.code === r.code)}
                      onChange={() => toggle(r)}
                    />
                    <span>So sánh</span>
                  </label>
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
          <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)}>
            <header>
              <span className="assistant-icon">
                <MessageSquare size={19} />
              </span>
              <div>
                <h2>Hỗ trợ tìm mã</h2>
                <p className="assistant-context">Đang hỏi về: {active?.query || q || 'món hàng'}</p>
              </div>
              <button
                className="icon-button close-help"
                aria-label="Đóng hỗ trợ"
                onClick={() => setAssistantOpen(false)}
              >
                <X size={16} />
              </button>
            </header>
            <div className="profile-toolbar">
              {tab === 'profile' ? (
                <button className="text-button" onClick={() => setTab('chat')}>
                  <ArrowLeft size={15} />
                  Quay lại hội thoại
                </button>
              ) : (
                <button
                  className="profile-switch"
                  aria-expanded={profileMenu}
                  onClick={() => setProfileMenu((v) => !v)}
                >
                  Hồ sơ: {active?.name || 'Sản phẩm mới'}
                  <ChevronDown size={14} />
                </button>
              )}
              {tab === 'chat' && (
                <button
                  className="text-button"
                  aria-label="Sửa hồ sơ"
                  onClick={() => setTab('profile')}
                >
                  Sửa thông tin
                </button>
              )}
            </div>
            {profileMenu && tab === 'chat' && (
              <div className="profile-menu">
                <label>
                  Chọn sản phẩm
                  <select
                    aria-label="Sản phẩm đang trao đổi"
                    value={active?.id || ''}
                    disabled={sending}
                    onChange={(e) => {
                      if (workspace) {
                        setWorkspace({ ...workspace, activeId: e.target.value });
                        setQ(workspace.products.find((p) => p.id === e.target.value)?.query || '');
                        setProfileMenu(false);
                      }
                    }}
                  >
                    {workspace?.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="secondary-button"
                  disabled={sending || !workspace}
                  onClick={() => {
                    if (workspace) {
                      setWorkspace(addProduct(workspace));
                      setQ('');
                      setProfileMenu(false);
                    }
                  }}
                >
                  <Plus size={15} />
                  Tra món hàng khác
                </button>
              </div>
            )}
            {tab === 'chat' ? (
              <>
                <div className="messages" ref={messagesRef}>
                  {!active?.messages.length && (
                    <div className="welcome">
                      <MessageSquare size={22} />
                      <h3>Cùng làm rõ mặt hàng</h3>
                      <p>
                        Mô tả công dụng, vật liệu hoặc cách hoạt động của{' '}
                        <b>{active?.query || q || 'món hàng'}</b> để tìm tiếp.
                      </p>
                      <span>Thông tin được giữ riêng theo từng hồ sơ.</span>
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
                            <button key={r.code} onClick={() => openReference(r)}>
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
                    ref={chatRef}
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
                    onFocus={beginEdit}
                    aria-label="Tên sản phẩm"
                    value={active?.name || ''}
                    onChange={(e) =>
                      workspace &&
                      active &&
                      setWorkspace(
                        updateProduct(
                          workspace,
                          active.id,
                          { name: e.target.value.slice(0, 80) },
                          editToken.current,
                        ),
                      )
                    }
                  />
                </label>
                <label className="field-label profile-query">
                  Tên hàng dùng để tìm
                  <input
                    onFocus={beginEdit}
                    aria-label="Tên hàng dùng để tìm"
                    value={active?.query || ''}
                    maxLength={200}
                    onChange={(e) => {
                      if (workspace && active) {
                        setWorkspace(
                          updateProduct(
                            workspace,
                            active.id,
                            { query: e.target.value },
                            editToken.current,
                          ),
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
                            onFocus={beginEdit}
                            aria-label={factLabels[k] || k}
                            value={v}
                            onChange={(e) =>
                              workspace &&
                              setWorkspace(
                                updateProduct(
                                  workspace,
                                  active.id,
                                  {
                                    facts: { [k]: e.target.value.slice(0, 200) },
                                  },
                                  editToken.current,
                                ),
                              )
                            }
                          />
                        </label>
                        <span>Bạn khai · có thể sửa</span>
                        <button
                          className="remove-fact"
                          aria-label={`Xóa ${factLabels[k] || k}`}
                          onClick={() =>
                            workspace &&
                            setWorkspace(
                              updateProduct(workspace, active.id, { facts: { [k]: '' } }),
                            )
                          }
                        >
                          <X size={13} />
                        </button>
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
                    onFocus={beginEdit}
                    aria-label="Thông tin bổ sung"
                    placeholder="Công dụng, vật liệu hoặc thông số bạn đã biết…"
                    maxLength={200}
                    rows={3}
                    value={active?.facts.notes || ''}
                    onChange={(e) =>
                      workspace &&
                      active &&
                      setWorkspace(
                        updateProduct(
                          workspace,
                          active.id,
                          { facts: { notes: e.target.value } },
                          editToken.current,
                        ),
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
                    Lời khai hỗ trợ xếp hạng trong hội thoại. Bộ lọc chương được dùng cho cả danh
                    sách và hội thoại.
                  </span>
                </div>
              </div>
            )}
          </AssistantPanel>
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
      {detail && (
        <RecordDetails
          record={detail}
          onClose={() => setDetail(null)}
          selected={selected.some((r) => r.code === detail.code)}
          onToggle={() => toggle(detail)}
          previous={
            result && result.items.findIndex((r) => r.code === detail.code) > 0
              ? () =>
                  setDetail(result.items[result.items.findIndex((r) => r.code === detail.code) - 1])
              : undefined
          }
          next={
            result &&
            result.items.findIndex((r) => r.code === detail.code) >= 0 &&
            result.items.findIndex((r) => r.code === detail.code) < result.items.length - 1
              ? () =>
                  setDetail(result.items[result.items.findIndex((r) => r.code === detail.code) + 1])
              : undefined
          }
        />
      )}
      {compare && (
        <Dialog title="So sánh mã ứng viên" onClose={() => setCompare(false)}>
          <div className="detail-body">
            {shareWarning && <div className="notice">{shareWarning}</div>}
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
