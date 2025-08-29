"use client";
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import Header from '@/components/layout/Header';
import { useDocumentStore } from '@/lib/stores/documentStore';

export default function Page() {
  const router = useRouter();
  const loadDocument = useDocumentStore(s => s.loadDocument);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    await loadDocument(file);
    const id = useDocumentStore.getState().currentDocument?.id;
    if (id) router.push(`/sign/${id}`);
  }, [loadDocument, router]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxSize: 20 * 1024 * 1024,
    multiple: false
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 grid place-items-center px-4">
        <div
          {...getRootProps()}
          className={`w-full max-w-2xl border-2 border-dashed rounded-xl p-10 text-center cursor-pointer ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50/50'}`}
          aria-label="Upload document"
        >
          <input {...getInputProps()} />
          <div className="text-xl font-semibold">Drop PDF or Image here</div>
          <div className="mt-2 text-slate-500">or click to browse — up to 20 MB</div>
        </div>
      </main>
    </div>
  );
}

