export type DocumentKind = 'pdf' | 'image';

export interface DocumentRef {
  id: string;
  name: string;
  url: string;
  kind: DocumentKind;
  pageCount?: number;
}

export interface PageRef {
  index: number; // 1-based
  width?: number;
  height?: number;
}

export type ElementType = 'signature' | 'text' | 'date' | 'checkbox' | 'stamp' | 'initials' | 'radio';

export interface SigningElement {
  id: string;
  type: ElementType;
  position: { x: number; y: number }; // relative to page in px
  size: { width: number; height: number };
  page: number; // 1-based
  properties: Record<string, any>;
}

export interface DocumentState {
  currentDocument: DocumentRef | null;
  pages: PageRef[];
  currentPage: number;
  zoom: number;
  elements: SigningElement[];
  snapToGrid?: boolean;
  gridSize?: number; // in page units (px at 100%)
  selectedElementId?: string | null;
  loadDocument: (file: File) => Promise<void>;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  addElement: (element: SigningElement) => void;
  updateElement: (id: string, updates: Partial<SigningElement>) => void;
  removeElement: (id: string) => void;
  bringToFront: (id: string) => void;
  setSnapToGrid: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setSelectedElement: (id: string | null) => void;
  duplicateElement: (id: string) => void;
  clear: () => void;
}
