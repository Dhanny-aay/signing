"use client";
import { create } from 'zustand';
import type { DocumentRef, DocumentState, SigningElement } from '@/lib/types/document';

function uid(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  currentDocument: null,
  pages: [],
  currentPage: 1,
  zoom: 1,
  elements: [],
  snapToGrid: true,
  gridSize: 8,
  selectedElementId: null,
  loadDocument: async (file: File) => {
    const url = URL.createObjectURL(file);
    const ext = file.name.toLowerCase().split('.').pop();
    const kind: DocumentRef['kind'] = ext === 'pdf' ? 'pdf' : 'image';

    const doc: DocumentRef = {
      id: uid('doc'),
      name: file.name,
      url,
      kind,
    };

    // Pages are determined later by viewer; initialize with one
    set({ currentDocument: doc, pages: [{ index: 1 }], currentPage: 1, zoom: 1, elements: [] });
  },
  setCurrentPage: (page: number) => set({ currentPage: page }),
  setZoom: (zoom: number) => set({ zoom }),
  addElement: (element: SigningElement) => set({ elements: [...get().elements, element] }),
  updateElement: (id: string, updates: Partial<SigningElement>) =>
    set({ elements: get().elements.map(el => (el.id === id ? { ...el, ...updates } : el)) }),
  removeElement: (id: string) => set({ elements: get().elements.filter(el => el.id !== id) }),
  bringToFront: (id: string) => set({ elements: [...get().elements.filter(e => e.id !== id), get().elements.find(e => e.id === id)!].filter(Boolean) as SigningElement[] }),
  setSnapToGrid: (enabled: boolean) => set({ snapToGrid: enabled }),
  setGridSize: (size: number) => set({ gridSize: Math.max(1, Math.round(size)) }),
  setSelectedElement: (id: string | null) => set({ selectedElementId: id }),
  duplicateElement: (id: string) => {
    const el = get().elements.find(e => e.id === id);
    if (!el) return;
    const copy: SigningElement = { ...el, id: `el_${Math.random().toString(36).slice(2, 9)}`, position: { x: el.position.x + 8, y: el.position.y + 8 } };
    set({ elements: [...get().elements, copy], selectedElementId: copy.id });
  },
  clear: () => set({ currentDocument: null, pages: [], currentPage: 1, zoom: 1, elements: [] })
}));
