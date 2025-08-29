"use client";
import { useDocumentStore } from '@/lib/stores/documentStore';

export default function DocumentPreview() {
  const { currentDocument } = useDocumentStore();
  if (!currentDocument) return null;
  return (
    <div className="text-xs text-slate-500 truncate">{currentDocument.name}</div>
  );
}

