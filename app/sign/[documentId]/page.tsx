"use client";
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import MobileMenu from '@/components/layout/MobileMenu';
import DocumentViewer from '@/components/document/DocumentViewer';
import PageNavigation from '@/components/document/PageNavigation';
import ToolPalette from '@/components/tools/ToolPalette';
import PropertiesPanel from '@/components/tools/PropertiesPanel';
import PageThumbnails from '@/components/document/PageThumbnails';
import Rightbar from '@/components/layout/Rightbar';
import { DndContext, DragEndEvent, useDroppable, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import { useDocumentStore } from '@/lib/stores/documentStore';
import { useToolStore } from '@/lib/stores/toolStore';
import ToolWrapper from '@/components/ui/ToolWrapper';
import { newElement } from '@/lib/utils/dragUtils';
import { useRef, useCallback, useEffect, useState } from 'react';
import { downloadBlob, exportAsImage, exportAsPdf, exportFullPdf } from '@/lib/utils/exportUtils';

function DocumentDropArea({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'document-area' });
  return (
    <div ref={setNodeRef} className={`relative w-full h-full ${isOver ? 'outline outline-2 outline-brand-500/50' : ''}`}>
      {children}
    </div>
  );
}

export default function SignPage() {
  const { currentDocument, elements, addElement, zoom, currentPage, snapToGrid, gridSize, pages } = useDocumentStore(s => ({
    currentDocument: s.currentDocument,
    elements: s.elements,
    addElement: s.addElement,
    zoom: s.zoom,
    currentPage: s.currentPage,
    snapToGrid: s.snapToGrid,
    gridSize: s.gridSize,
    pages: s.pages,
  }));
  const setZoom = useDocumentStore(s => s.setZoom);
  const setSnapToGrid = useDocumentStore(s => s.setSnapToGrid);
  const setGridSize = useDocumentStore(s => s.setGridSize);
  const activeTool = useToolStore(s => s.activeTool);
  const setActiveTool = useToolStore(s => s.setActiveTool);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [baseWidth, setBaseWidth] = useState<number>(800);
  const [exporting, setExporting] = useState<string | null>(null);

  // Measure current page dimensions in base units (zoom=1) and update store only if changed
  useEffect(() => {
    const node = stageRef.current?.querySelector('canvas, img') as HTMLElement | null;
    if (!node) return;
    const baseW = node.clientWidth / zoom;
    const baseH = node.clientHeight / zoom;
    const state = useDocumentStore.getState();
    const curr = state.pages.find((p) => p.index === currentPage);
    const changed = !curr || Math.abs((curr.width ?? 0) - baseW) > 0.5 || Math.abs((curr.height ?? 0) - baseH) > 0.5;
    if (changed) {
      const next = state.pages.map((p) => (p.index === currentPage ? { ...p, width: baseW, height: baseH } : p));
      useDocumentStore.setState({ pages: next });
    }
  }, [currentPage, zoom]);

  // Measure available base width from container unaffected by zoom/content
  useEffect(() => {
    if (!measureRef.current) return;
    const ro = new ResizeObserver(() => {
      const w = measureRef.current?.clientWidth ?? 800;
      setBaseWidth(Math.max(200, Math.min(1200, w)));
    });
    ro.observe(measureRef.current);
    return () => ro.disconnect();
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (!over || over.id !== 'document-area') return;
    const type = active.data.current?.type as any;
    if (!type) return;
    // Compute coordinates relative to the stage (page container)
    const stageEl = stageRef.current;
    const translated = event.active.rect.current.translated;
    if (!stageEl || !translated) {
      // fallback near top-left
      addElement(newElement(type, currentPage, 40 / zoom, 40 / zoom, zoom));
      return;
    }
    const stageRect = stageEl.getBoundingClientRect();
    const x = translated.left - stageRect.left;
    const y = translated.top - stageRect.top;
    // store in page-space (divide by zoom)
    const pageX = Math.max(0, x / zoom);
    const pageY = Math.max(0, y / zoom);
    addElement(newElement(type, currentPage, pageX, pageY, zoom));
  };

  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    // Trackpad pinch sets ctrlKey true on wheel events
    if (!e.ctrlKey) return;
    e.preventDefault();
    const direction = e.deltaY > 0 ? -1 : 1;
    const step = 0.08 * direction;
    setZoom(Math.min(3, Math.max(0.5, parseFloat((zoom + step).toFixed(2)))));
  }, [setZoom, zoom]);

  // Click-to-place: when an active tool is selected and user clicks on the page, add element at click
  const handleStageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const type = activeTool;
    if (!type) return;
    // Prevent adding when clicking existing elements or controls
    const target = e.target as HTMLElement;
    if (target.closest('[data-el]')) return;
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const rect = stageEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Create element to know its default size, then center it around click
    const draft = newElement(type, currentPage, 0, 0, zoom);
    const pageX = Math.max(0, (x / zoom) - draft.size.width / 2);
    const pageY = Math.max(0, (y / zoom) - draft.size.height / 2);
    draft.position = { x: pageX, y: pageY };
    addElement(draft);
    // Deactivate tool after single placement to avoid accidental multiple adds
    setActiveTool(null);
  }, [activeTool, addElement, currentPage, zoom]);

  // Keyboard shortcuts: arrows to nudge, Delete to remove, Cmd/Ctrl-D to duplicate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const state = useDocumentStore.getState();
      const id = state.selectedElementId;
      if (!id) return;
      const el = state.elements.find(x => x.id === id);
      if (!el) return;
      // Avoid when typing in inputs/contentEditable
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      const nudge = (dx: number, dy: number) => {
        useDocumentStore.getState().updateElement(id, { position: { x: Math.max(0, el.position.x + dx), y: Math.max(0, el.position.y + dy) } });
      };
      const resize = (dw: number, dh: number) => {
        const minW = 10, minH = 10;
        const w = Math.max(minW, el.size.width + dw);
        const h = Math.max(minH, el.size.height + dh);
        useDocumentStore.getState().updateElement(id, { size: { width: w, height: h } });
      };
      const step = e.shiftKey ? 10 : 1;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); nudge(-step, 0); break;
        case 'ArrowRight': e.preventDefault(); nudge(step, 0); break;
        case 'ArrowUp': e.preventDefault(); nudge(0, -step); break;
        case 'ArrowDown': e.preventDefault(); nudge(0, step); break;
        case 'h':
          if (e.altKey) { e.preventDefault(); resize(-step, 0); }
          break;
        case 'l':
          if (e.altKey) { e.preventDefault(); resize(step, 0); }
          break;
        case 'k':
          if (e.altKey) { e.preventDefault(); resize(0, -step); }
          break;
        case 'j':
          if (e.altKey) { e.preventDefault(); resize(0, step); }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          useDocumentStore.getState().removeElement(id);
          useDocumentStore.getState().setSelectedElement(null);
          break;
        default:
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            useDocumentStore.getState().duplicateElement(id);
          }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Setup DnD sensors for mouse and touch
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
  );

  const handleExportPdf = async () => {
    if (!currentDocument || !stageRef.current) return;
    try {
      setExporting('Exporting PDF…');
      const pageNode = stageRef.current.querySelector('canvas, img') as HTMLElement | null;
      if (!pageNode) return;
      const ctx = {
        document: currentDocument,
        pageIndex: currentPage,
        stageWidth: pageNode.clientWidth,
        stageHeight: pageNode.clientHeight,
      } as const;
      const blob = await exportAsPdf(elements, ctx);
      downloadBlob(blob, `${currentDocument.name.replace(/\.[^.]+$/, '')}-page${currentPage}-signed.pdf`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportPng = async () => {
    if (!stageRef.current || !currentDocument) return;
    try {
      setExporting('Exporting PNG…');
      const blob = await exportAsImage(stageRef.current, { format: 'png', dpi: 144 });
      downloadBlob(blob, `${currentDocument.name.replace(/\.[^.]+$/, '')}-page${currentPage}.png`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportFullPdf = async () => {
    if (!currentDocument) return;
    try {
      setExporting('Exporting full PDF…');
      const node = stageRef.current?.querySelector('canvas, img') as HTMLElement | null;
      const fallback = node ? { width: node.clientWidth / zoom, height: node.clientHeight / zoom } : null;
      const blob = await exportFullPdf(currentDocument, pages, elements, fallback);
      downloadBlob(blob, `${currentDocument.name.replace(/\.[^.]+$/, '')}-signed.pdf`);
    } finally {
      setExporting(null);
    }
  };

  // Optional: to export all PNGs individually, loop and download each.
  // Keeping disabled to avoid multiple popups; full-PDF export is preferred.

  if (!currentDocument) {
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <div>
          <div className="text-lg font-medium">No document loaded</div>
          <a href="/" className="text-brand-600 underline">Go back to upload</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex min-h-[calc(100vh-var(--header-height))]">
        <Sidebar>
          <div className="grid gap-6">
            <ToolPalette />
            <PageThumbnails />
          </div>
        </Sidebar>
        <main className="flex-1 grid grid-rows-[auto_1fr_auto]">
          <div className="flex items-center justify-between p-3 border-b bg-white">
            <div className="flex items-center gap-2 text-sm">
              <button className="px-2 py-1 border rounded" onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} aria-label="Zoom out">-</button>
              <div className="w-14 text-center tabular-nums">{Math.round(zoom * 100)}%</div>
              <button className="px-2 py-1 border rounded" onClick={() => setZoom(Math.min(3, zoom + 0.1))} aria-label="Zoom in">+</button>
            </div>
            <PageNavigation />
            <div className="flex items-center gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={!!snapToGrid} onChange={(e) => setSnapToGrid(e.target.checked)} />
                Snap
              </label>
              <label className="inline-flex items-center gap-1">
                Grid
                <input type="number" className="w-16 px-2 py-1 border rounded" min={2} max={64} step={1} value={gridSize ?? 8} onChange={(e) => setGridSize(Number(e.target.value))} />
              </label>
              <div className="h-5 w-px bg-slate-300" />
              <button className="px-2 py-1 border rounded" onClick={handleExportPdf}>Export PDF (page)</button>
              <button className="px-2 py-1 border rounded" onClick={handleExportFullPdf}>Export PDF (all)</button>
              <button className="px-2 py-1 border rounded" onClick={handleExportPng}>Export PNG (page)</button>
            </div>
          </div>
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <section ref={scrollRef} className="relative overflow-auto bg-slate-50 touch-none" onWheel={onWheel}
              onTouchStart={(e) => { if (e.touches.length === 2) e.preventDefault(); }}
              onTouchMove={(e) => {
                if (e.touches.length === 2) {
                  e.preventDefault();
                  const [a, b] = [e.touches[0], e.touches[1]];
                  const dx = a.clientX - b.clientX;
                  const dy = a.clientY - b.clientY;
                  const dist = Math.hypot(dx, dy);
                  const el = e.currentTarget as HTMLElement;
                  const last = Number(el.dataset.lastDist || '0');
                  const lastZoom = Number(el.dataset.lastZoom || String(zoom));
                  if (!last) {
                    el.dataset.lastDist = String(dist);
                    el.dataset.lastZoom = String(zoom);
                  } else {
                    const delta = (dist - last) / 300;
                    const next = Math.min(3, Math.max(0.5, lastZoom + delta));
                    useDocumentStore.getState().setZoom(next);
                    el.dataset.lastDist = String(dist);
                  }
                } else if (e.touches.length === 1) {
                  const container = scrollRef.current;
                  if (!container) return;
                  const t = e.touches[0];
                  const lastX = Number(container.dataset.lastX || '');
                  const lastY = Number(container.dataset.lastY || '');
                  if (Number.isNaN(lastX) || Number.isNaN(lastY)) {
                    container.dataset.lastX = String(t.clientX);
                    container.dataset.lastY = String(t.clientY);
                    container.dataset.startLeft = String(container.scrollLeft);
                    container.dataset.startTop = String(container.scrollTop);
                  } else {
                    const dx = t.clientX - lastX;
                    const dy = t.clientY - lastY;
                    container.scrollLeft = Number(container.dataset.startLeft) - dx;
                    container.scrollTop = Number(container.dataset.startTop) - dy;
                  }
                }
              }}
              onTouchEnd={(e) => {
                const el = e.currentTarget as HTMLElement;
                delete el.dataset.lastDist;
                delete el.dataset.lastZoom;
                if (scrollRef.current) {
                  delete scrollRef.current.dataset.lastX;
                  delete scrollRef.current.dataset.lastY;
                  delete scrollRef.current.dataset.startLeft;
                  delete scrollRef.current.dataset.startTop;
                }
              }}
            >
              <div className="mx-auto py-6 px-4 min-h-[60vh]">
                <div ref={measureRef} className="w-full" />
                <DocumentDropArea>
                  {/* Stage wrapper aligns overlay with rendered page */}
                  <div
                    ref={stageRef}
                    className="relative block mx-auto"
                    style={snapToGrid ? {
                      backgroundImage: `linear-gradient(to right, rgba(148,163,184,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.2) 1px, transparent 1px)`,
                      backgroundSize: `${(gridSize ?? 8) * zoom}px ${(gridSize ?? 8) * zoom}px`,
                    } : undefined}
                    onClick={handleStageClick}
                  >
                    {/** Compute page width from baseWidth and zoom; set explicit width on stage */}
                    <div style={{ width: Math.round(baseWidth * zoom) }}>
                      <DocumentViewer className="relative" width={Math.round(baseWidth * zoom)} />
                    </div>
                    {/* Elements overlay */}
                    <div className="absolute inset-0">
                      {elements.filter(el => el.page === currentPage).map(el => (
                        <ToolWrapper key={el.id} element={el} />
                      ))}
                    </div>
                  </div>
                </DocumentDropArea>
              </div>
              {exporting && (
                <div className="absolute bottom-4 right-4 px-3 py-2 rounded bg-white border shadow text-sm">{exporting}</div>
              )}
            </section>
          </DndContext>
          <div className="lg:hidden">
            <MobileMenu>
              <ToolPalette />
            </MobileMenu>
          </div>
        </main>
        <Rightbar>
          <PropertiesPanel />
        </Rightbar>
      </div>
    </div>
  );
}
