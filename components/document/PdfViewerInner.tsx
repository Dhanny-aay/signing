"use client";
import { Document, Page, pdfjs } from 'react-pdf';

type Props = {
  file: string;
  pageNumber: number;
  width: number;
  onLoad: (numPages: number) => void;
};

// Configure worker at module load so it's set before <Document>
try {
  if (typeof window !== 'undefined') {
    // Always use JS worker which ships in pdfjs-dist
    // @ts-expect-error - import.meta.url for bundler resolution
    const workerUrl = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
    // @ts-expect-error - pdfjs typing may not include GlobalWorkerOptions
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  }
} catch {}

export default function PdfViewerInner({ file, pageNumber, width, onLoad }: Props) {
  return (
    <Document file={file} onLoadError={(e) => console.error('PDF load error', e)} onLoadSuccess={(info) => onLoad(info.numPages)} loading={<div className="py-10 text-center text-slate-500">Loading PDF…</div>}>
      <Page pageNumber={pageNumber} width={width} renderTextLayer={false} renderAnnotationLayer={false} />
    </Document>
  );
}
