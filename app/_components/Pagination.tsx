"use client";

import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

type Props = {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  className?: string;
};

export default function Pagination({ page, total, pageSize, onChange, className = "" }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function getPages(): (number | "…")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const result: (number | "…")[] = [1];
    if (page > 3) result.push("…");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      result.push(i);
    }
    if (page < totalPages - 2) result.push("…");
    result.push(totalPages);
    return result;
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <p className="text-[12px] text-subtle">
        {from}–{to} sur {total}
      </p>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] text-subtle hover:bg-surface disabled:opacity-30 transition-colors"
        >
          <FiChevronLeft size={14} />
        </button>
        {getPages().map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="w-7 h-7 flex items-center justify-center text-[12px] text-subtle">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p as number)}
              className={`w-7 h-7 flex items-center justify-center rounded-[6px] text-[12px] font-medium transition-colors ${
                p === page ? "bg-primary text-white" : "text-subtle hover:bg-surface"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-[6px] text-subtle hover:bg-surface disabled:opacity-30 transition-colors"
        >
          <FiChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
