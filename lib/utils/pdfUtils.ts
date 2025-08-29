export async function configurePdfWorker() {
  if (typeof window === 'undefined') return;
  try {
    const { pdfjs } = await import('react-pdf');
    // @ts-expect-error - dynamic import URL for worker
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url).toString();
  } catch (e) {
    // no-op: react-pdf may have already set a worker; avoid crashing
    console.warn('PDF worker configuration skipped:', e);
  }
}

export function estimatePageCount(): number {
  return 1;
}
