"use client";
import { useDocumentStore } from '@/lib/stores/documentStore';

export default function PageNavigation() {
  const { pages, currentPage, setCurrentPage } = useDocumentStore(s => ({
    pages: s.pages,
    currentPage: s.currentPage,
    setCurrentPage: s.setCurrentPage
  }));

  const total = pages.length || 1;

  return (
    <div className="flex items-center gap-2 text-sm">
      <button className="px-2 py-1 border rounded disabled:opacity-50" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} aria-label="Previous page">Prev</button>
      <span className="tabular-nums">{currentPage} / {total}</span>
      <button className="px-2 py-1 border rounded disabled:opacity-50" onClick={() => setCurrentPage(Math.min(total, currentPage + 1))} disabled={currentPage >= total} aria-label="Next page">Next</button>
    </div>
  );
}

