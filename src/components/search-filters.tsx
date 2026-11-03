'use client';

import { useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { categories } from '@/lib/categories';

type Selection = { chapter: string; dataset: string; category: string };
type Props = Selection & {
  facets: { chapter: string; count: number }[];
  loading: boolean;
  onChange: (selection: Selection) => void;
};

export default function SearchFilters({
  chapter,
  dataset,
  category,
  facets,
  loading,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const selection = { chapter, dataset, category };
  const filterCount = Number(!!chapter) + Number(dataset !== 'all');
  const hasSelection = filterCount > 0 || !!category;
  const priority = categories.find((c) => c.id === category);
  const chapters = facets.filter((f) => f.count > 0 && (dataset !== 'main' || f.chapter !== '98'));
  if (chapter && !chapters.some((f) => f.chapter === chapter)) chapters.push({ chapter, count: 0 });
  chapters.sort((a, b) => a.chapter.localeCompare(b.chapter));
  const reset = () => onChange({ chapter: '', dataset: 'all', category: '' });

  function changeDataset(next: string) {
    onChange({
      ...selection,
      dataset: next,
      chapter: next === 'chapter98' || (next === 'main' && chapter === '98') ? '' : chapter,
    });
  }

  return (
    <div className="search-filters">
      <div className="filter-toolbar">
        <button
          className={`filter-trigger ${open ? 'selected' : ''}`}
          aria-label="Bộ lọc"
          aria-describedby="active-filter-count"
          aria-expanded={open}
          aria-controls="search-filter-panel"
          onClick={() => setOpen((v) => !v)}
        >
          <SlidersHorizontal size={16} />
          Bộ lọc
          {filterCount > 0 && <span className="filter-count">{filterCount}</span>}
          <ChevronDown size={14} className={open ? 'turned' : ''} />
        </button>
        <span id="active-filter-count" className="sr-only">
          {filterCount} bộ lọc đang áp dụng{priority ? `; ưu tiên ${priority.label}` : ''}.
        </span>
        {dataset !== 'all' && (
          <button
            className="filter-chip"
            aria-label={dataset === 'main' ? 'Bỏ lọc danh mục chính' : 'Bỏ lọc chương 98 bổ sung'}
            onClick={() => changeDataset('all')}
          >
            {dataset === 'main' ? 'Danh mục chính' : 'Chương 98 bổ sung'}
            <X size={13} />
          </button>
        )}
        {chapter && (
          <button
            className="filter-chip"
            aria-label={`Bỏ lọc chương ${chapter}`}
            onClick={() => onChange({ ...selection, chapter: '' })}
          >
            Chương {chapter}
            <X size={13} />
          </button>
        )}
        {priority && (
          <button
            className="filter-chip priority-chip"
            aria-label={`Bỏ ưu tiên ${priority.label}`}
            onClick={() => onChange({ ...selection, category: '' })}
          >
            Ưu tiên: {priority.label}
            <X size={13} />
          </button>
        )}
        {hasSelection && (
          <button
            className="filter-reset"
            aria-label="Xóa tất cả bộ lọc và ưu tiên"
            onClick={reset}
          >
            Xóa tất cả
          </button>
        )}
      </div>
      <section
        id="search-filter-panel"
        className="filter-panel"
        hidden={!open}
        aria-label="Tùy chọn tra cứu"
      >
        <div className="filter-panel-heading">
          <h2>Phạm vi tra cứu</h2>
          <span>Tự cập nhật khi chọn</span>
        </div>
        <div className="filter-fields">
          <label className="filter-field">
            <span>Bộ mã</span>
            <select
              aria-label="Bộ dữ liệu"
              value={dataset}
              onChange={(e) => changeDataset(e.target.value)}
            >
              <option value="all">Tất cả mã HS</option>
              <option value="main">Danh mục chính · HS 2022</option>
              <option value="chapter98">Chương 98 bổ sung</option>
            </select>
          </label>
          <label className="filter-field">
            <span>Chương</span>
            <select
              aria-label="Chương"
              aria-describedby="chapter-filter-hint"
              disabled={dataset === 'chapter98'}
              aria-busy={loading}
              value={dataset === 'chapter98' ? '98' : chapter}
              onChange={(e) => onChange({ ...selection, chapter: e.target.value })}
            >
              {dataset === 'chapter98' ? (
                <option value="98">Chương 98</option>
              ) : (
                <>
                  <option value="">Tất cả chương</option>
                  {chapters.map((f) => (
                    <option key={f.chapter} value={f.chapter}>
                      Chương {f.chapter} · {f.count.toLocaleString('vi-VN')} mã
                    </option>
                  ))}
                </>
              )}
            </select>
          </label>
        </div>
        <p id="chapter-filter-hint" className="filter-hint" aria-live="polite">
          {loading
            ? 'Đang cập nhật số mã…'
            : dataset === 'chapter98'
              ? 'Bộ mã này chỉ gồm chương 98.'
              : 'Chỉ hiện các chương có mã khớp với tìm kiếm của bạn.'}
        </p>
        <details className="filter-priority">
          <summary>
            <span>Ưu tiên kết quả</span>
            {priority && <span className="priority-value">{priority.label}</span>}
            <ChevronDown size={15} />
          </summary>
          <div className="priority-content">
            <label className="filter-field">
              <span>Nhóm hàng gợi ý</span>
              <select
                aria-label="Ưu tiên nhóm gợi ý"
                value={category}
                onChange={(e) => onChange({ ...selection, category: e.target.value })}
              >
                <option value="">Không ưu tiên nhóm</option>
                {categories.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <p>Đưa nhóm đã chọn lên trước, vẫn giữ kết quả ở các nhóm khác.</p>
          </div>
        </details>
      </section>
    </div>
  );
}
