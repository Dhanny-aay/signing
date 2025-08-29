"use client";
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useDocumentStore } from '@/lib/stores/documentStore';

const PdfViewerInner = dynamic(() => import('./PdfViewerInner'), { ssr: false, loading: () => <div className="py-10 text-center text-slate-500">Loading PDF…</div> });

type Props = {
  className?: string;
  width?: number; // if provided, use directly without internal measurement
};

export default function DocumentViewer({ className, width: forcedWidth }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { currentDocument, zoom, currentPage, pages } = useDocumentStore(s => ({
    currentDocument: s.currentDocument,
    zoom: s.zoom,
    currentPage: s.currentPage,
    pages: s.pages,
  }));

  const [width, setWidth] = useState<number>(600);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        setWidth(containerRef.current.clientWidth);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);
  const measured = Math.max(200, Math.min(1200, width));
  const pageWidth = typeof forcedWidth === 'number' ? forcedWidth : measured * zoom;

  if (!currentDocument) return (
    <div ref={containerRef} className={className}>
      <div className="h-full grid place-items-center text-slate-500">No document loaded</div>
    </div>
  );

  return (
    <div ref={containerRef} className={className}>
      {currentDocument.kind === 'pdf' ? (
        <PdfViewerInner file={currentDocument.url} pageNumber={currentPage} width={pageWidth} onLoad={(numPages: number) => {
          if (pages.length !== numPages) {
            useDocumentStore.setState({ pages: Array.from({ length: numPages }, (_, i) => ({ index: i + 1 })) });
          }
        }} />
      ) : (
        <img src={currentDocument.url} alt={currentDocument.name} style={{ width: pageWidth }} className="block mx-auto" />
      )}
    </div>
  );
}
