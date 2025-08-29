"use client";
import { useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useDocumentStore } from '@/lib/stores/documentStore';

try {
  if (typeof window !== 'undefined') {
    // @ts-expect-error import.meta for bundler
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
    // @ts-expect-error
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }
} catch {}

export default function PageThumbnails() {
  const { currentDocument, pages, setCurrentPage } = useDocumentStore(s => ({
    currentDocument: s.currentDocument,
    pages: s.pages,
    setCurrentPage: s.setCurrentPage,
  }));
  if (!currentDocument || currentDocument.kind !== 'pdf') return null;
  const file = currentDocument.url;
  return (
    <div className="grid gap-3">
      <div className="text-xs font-medium text-slate-600">Pages</div>
      <Document file={file} loading={<div className="text-xs text-slate-500">Loading thumbnails…</div>}>
        {pages.map(p => (
          <button key={p.index} className="text-left" onClick={() => setCurrentPage(p.index)}>
            <Page pageNumber={p.index} width={120} renderTextLayer={false} renderAnnotationLayer={false} />
            <div className="text-[11px] mt-1 text-center text-slate-500">{p.index}</div>
          </button>
        ))}
      </Document>
    </div>
  );
}

