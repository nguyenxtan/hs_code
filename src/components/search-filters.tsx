'use client';
import { useEffect, useState, useRef } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import type { HSRecord } from '@/lib/types';
import { categories } from '@/lib/categories';
import Dialog from '@/components/dialog';

type Facet = { chapter: string; count: number };
export function ChapterChips({
  chapter,
  facets,
  samples,
  query,
  loading,
  onChange,
}: {
  chapter: string;
  facets: Facet[];
  samples: HSRecord[];
  query: string;
  loading: boolean;
  onChange: (chapter: string) => void;
}) {
  const [mobile, setMobile] = useState(false),
    [picker, setPicker] = useState(false),
    [filter, setFilter] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const m = matchMedia('(max-width:760px)');
    const update = () => setMobile(m.matches);
    update();
    m.addEventListener('change', update);
    return () => m.removeEventListener('change', update);
  }, []);
  const available = facets.filter((f) => f.count > 0);
  if (chapter && !available.some((f) => f.chapter === chapter))
    available.push({ chapter, count: 0 });
  available.sort((a, b) =>
    query.trim()
      ? b.count - a.count || a.chapter.localeCompare(b.chapter)
      : a.chapter.localeCompare(b.chapter),
  );
  const total = facets.reduce((n, f) => n + f.count, 0);
  const limit = mobile ? 3 : 5;
  const visible = available.slice(0, limit);
  if (chapter && !visible.some((f) => f.chapter === chapter)) {
    if (visible.length === limit) visible.pop();
    visible.push(available.find((f) => f.chapter === chapter)!);
  }
  const rest = available.length - visible.length;
  const filtered = available.filter((f) => f.chapter.includes(filter.trim()));
  function choose(c: string) {
    onChange(c === chapter ? '' : c);
    setPicker(false);
    setFilter('');
  }
  return (
    <>
      <div
        className={`chapter-chips ${loading ? 'refreshing' : ''}`}
        role="group"
        aria-label="Lọc theo chương"
        aria-busy={loading}
      >
        <span className="chapter-label">Chương</span>
        <button aria-pressed={!chapter} onClick={() => onChange('')}>
          Tất cả <span>{total.toLocaleString('vi-VN')}</span>
        </button>
        {visible.map((f) => (
          <button
            key={f.chapter}
            aria-label={`Chương ${f.chapter}, ${f.count} kết quả`}
            aria-pressed={chapter === f.chapter}
            onClick={() => choose(f.chapter)}
          >
            Ch. {f.chapter}
            {f.chapter === '98' && <span className="chapter98-hint"> · bổ sung VN</span>}
            <span>{f.count.toLocaleString('vi-VN')}</span>
          </button>
        ))}
        {rest > 0 && (
          <button
            className="more-chapters"
            aria-label={`Xem thêm ${rest} chương`}
            onClick={() => {
              setFilter('');
              setPicker(true);
            }}
          >
            + {rest} chương
            <ChevronDown size={13} />
          </button>
        )}
      </div>
      {picker && (
        <Dialog title="Chọn chương" className="picker-dialog" onClose={() => setPicker(false)}>
          <div className="picker-search">
            <Search size={17} />
            <input
              ref={input}
              autoFocus
              aria-label="Gõ số chương"
              placeholder="Gõ số chương…"
              value={filter}
              onChange={(e) => setFilter(e.target.value.replace(/\D/g, '').slice(0, 2))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filtered.length) {
                  e.preventDefault();
                  choose(filtered[0].chapter);
                }
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  document.querySelector<HTMLButtonElement>('.chapter-option')?.focus();
                }
              }}
            />
          </div>
          <div
            className="chapter-options"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                const buttons = Array.from(
                  e.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
                );
                const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
                buttons[
                  Math.max(0, Math.min(buttons.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))
                ]?.focus();
              }
            }}
          >
            {filtered.map((f) => {
              const sample = samples.find((r) => r.chapter === f.chapter);
              return (
                <button
                  key={f.chapter}
                  className="chapter-option"
                  aria-label={`Chương ${f.chapter}${f.chapter === '98' ? ', bổ sung VN' : ''}, ${f.count} kết quả`}
                  aria-pressed={f.chapter === chapter}
                  onClick={() => choose(f.chapter)}
                >
                  <span>
                    <b>
                      Chương {f.chapter}
                      {f.chapter === '98' ? ' · bổ sung VN' : ''}
                    </b>
                    <span>{f.count.toLocaleString('vi-VN')} mã</span>
                  </span>
                  {sample && <small>vd: {sample.description.replace(/^(?:-\s*)+/, '')}</small>}
                </button>
              );
            })}
            {!filtered.length && (
              <p className="picker-empty">Không có chương phù hợp trong kết quả hiện tại.</p>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}

export function RankLens({
  category,
  onChange,
}: {
  category: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = categories.find((c) => c.id === category);
  return (
    <>
      <button
        className="rank-trigger"
        aria-label={`Xếp trước: ${selected?.label || 'Mặc định'}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <span>
          Xếp trước<span className="rank-value">: {selected?.label || 'Mặc định'}</span>
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <Dialog
          title="Đưa nhóm này lên trước"
          className="picker-dialog"
          onClose={() => setOpen(false)}
        >
          <p className="picker-note">
            Chỉ đổi thứ tự, không ẩn mã nào. Nhóm là gợi ý tiện dụng, chưa phải phân loại chính
            thức.
          </p>
          <fieldset className="rank-options">
            <legend className="sr-only">Nhóm ưu tiên</legend>
            {[{ id: '', label: 'Mặc định (độ khớp)' }, ...categories].map((c) => (
              <label key={c.id}>
                <input
                  type="radio"
                  name="ranking"
                  value={c.id}
                  checked={c.id === category}
                  onChange={() => {
                    onChange(c.id);
                  }}
                />
                {c.label}
                {c.id === category && <Check size={15} />}
              </label>
            ))}
          </fieldset>
          <div className="picker-actions">
            <button className="primary-button" onClick={() => setOpen(false)}>
              Xong
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
