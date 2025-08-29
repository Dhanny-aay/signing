"use client";
import ResizeHandle from '@/components/ui/ResizeHandle';
import { useDocumentStore } from '@/lib/stores/documentStore';
import type { SigningElement } from '@/lib/types/document';
import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from '@/components/tools/SignatureCanvas';

type Props = {
  element: SigningElement;
};

export default function ToolWrapper({ element }: Props) {
  const { updateElement, removeElement } = useDocumentStore(s => ({
    updateElement: s.updateElement,
    removeElement: s.removeElement
  }));
  const zoom = useDocumentStore(s => s.zoom);
  const { snapToGrid, gridSize, bringToFront, selectedElementId, setSelectedElement } = useDocumentStore(s => ({
    snapToGrid: s.snapToGrid,
    gridSize: s.gridSize,
    bringToFront: s.bringToFront,
    selectedElementId: s.selectedElementId,
    setSelectedElement: s.setSelectedElement,
  }));
  const { id, position, size } = element;
  const [editing, setEditing] = useState(false);
  const props = element.properties || {};
  const textRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);

  // Initial auto-fit for text height after mount/updates
  useEffect(() => {
    if (element.type !== 'text') return;
    const el = textRef.current;
    const root = rootRef.current;
    const header = headerRef.current;
    if (!el || !root) return;
    const styles = getComputedStyle(root);
    const padY = parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');
    const scrollH = el.scrollHeight;
    const headerH = header?.offsetHeight ?? 0;
    const desired = Math.max(24, scrollH + padY + headerH);
    const pageH = desired / zoom;
    if (Math.abs(pageH - size.height) > 0.5) {
      updateElement(id, { size: { ...size, height: pageH } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.text, zoom]);
  return (
    <div
      ref={rootRef}
      data-el
      className={`absolute box-border border ${selectedElementId === id ? 'border-brand-500' : 'border-dashed border-slate-400'} rounded bg-white/60 backdrop-blur px-2 py-1`}
      style={{ left: position.x * zoom, top: position.y * zoom, width: size.width * zoom, height: size.height * zoom }}
      onDoubleClick={() => setEditing(true)}
      onPointerDown={() => setSelectedElement(id)}
    >
      <div
        className="flex items-center justify-between text-[11px] text-slate-600 cursor-move select-none"
        ref={headerRef}
        onPointerDown={(e) => {
          // start drag on header only
          e.preventDefault();
          bringToFront(id);
          const startX = e.clientX;
          const startY = e.clientY;
          const baseX = position.x;
          const baseY = position.y;
          const move = (ev: PointerEvent) => {
            let dx = (ev.clientX - startX) / zoom;
            let dy = (ev.clientY - startY) / zoom;
            if (ev.shiftKey) {
              if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0;
            }
            let nx = baseX + dx; let ny = baseY + dy;
            if (snapToGrid && gridSize) {
              const gs = gridSize;
              nx = Math.round(nx / gs) * gs;
              ny = Math.round(ny / gs) * gs;
            }
            updateElement(id, { position: { x: Math.max(0, nx), y: Math.max(0, ny) } });
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        }}
      >
        <span className="capitalize">{element.type}</span>
        <div className="flex items-center gap-2">
          <button aria-label="Edit" className="text-slate-600" onClick={() => setEditing(v => !v)}>✎</button>
          <button aria-label="Delete" className="text-red-500" onClick={() => removeElement(id)}>×</button>
        </div>
      </div>
      <div className="w-full h-full overflow-hidden">
        {element.type === 'text' && (
          <div ref={wrapRef} className="w-full h-full flex p-1" style={{ alignItems: (props.valign === 'middle' ? 'center' : props.valign === 'bottom' ? 'flex-end' : 'flex-start') }}>
            <div
              contentEditable
              suppressContentEditableWarning
              ref={textRef}
              className="w-full h-full outline-none text-sm whitespace-pre-wrap break-words overflow-y-auto bg-transparent"
              style={{ color: props.color ?? '#111827', fontSize: (props.fontSize ?? 14) * zoom, lineHeight: 1.2, textAlign: props.align ?? 'left' }}
              onInput={() => {
                const el = textRef.current;
                const root = rootRef.current;
                const header = headerRef.current;
                if (!el || !root) return;
                const styles = getComputedStyle(root);
                const padY = parseFloat(styles.paddingTop || '0') + parseFloat(styles.paddingBottom || '0');
                const scrollH = el.scrollHeight; // content height in px
                const headerH = header?.offsetHeight ?? 0;
                const desired = Math.max(24, scrollH + padY + headerH);
                const pageH = desired / zoom;
                if (Math.abs(pageH - size.height) > 0.5) {
                  updateElement(id, { size: { ...size, height: pageH } });
                }
              }}
              onBlur={(e) => updateElement(id, { properties: { ...props, text: e.currentTarget.textContent ?? '' } })}
            >
              {props.text ?? 'Text'}
            </div>
          </div>
        )}
        {element.type === 'date' && (
          <div className="w-full h-full grid place-items-center text-center break-words">
            <span style={{ fontSize: Math.max(10, size.height * zoom * 0.5) }}>
              {props.value ?? new Date().toISOString().slice(0, 10)}
            </span>
          </div>
        )}
        {element.type === 'checkbox' && (
          <label className="flex items-center gap-2 text-sm break-words">
            <input type="checkbox" checked={!!props.checked} onChange={(e) => updateElement(id, { properties: { ...props, checked: e.target.checked } })} />
            {props.label ?? ''}
          </label>
        )}
        {element.type === 'radio' && (
          <label className="flex items-center gap-2 text-sm break-words">
            <input type="radio" checked={!!props.selected} onChange={(e) => updateElement(id, { properties: { ...props, selected: e.target.checked } })} />
            {props.label ?? ''}
          </label>
        )}
        {element.type === 'stamp' && (
          <div className="w-full h-full grid place-items-center text-center p-1">
            <span
              className="inline-block w-full border-2 border-green-600 text-green-700 rounded font-bold uppercase tracking-wide break-words"
              style={{ fontSize: Math.max(10, size.height * zoom * 0.4), lineHeight: 1, padding: `${Math.max(2, 0.1 * size.height * zoom)}px` }}
            >
              {props.text ?? 'APPROVED'}
            </span>
          </div>
        )}
        {element.type === 'signature' && (
          <div className="w-full h-full grid place-items-center">
            {props.dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="Signature" src={props.dataUrl} className="max-w-full max-h-full object-contain" />
            ) : (
              <button className="px-2 py-1 text-xs border rounded" onClick={() => setEditing(true)}>Tap to draw</button>
            )}
          </div>
        )}
        {element.type === 'initials' && (
          <div className="w-full h-full grid place-items-center">
            <span className="font-semibold" style={{ fontSize: Math.max(10, size.height * zoom * 0.6) }}>
              {props.value ?? ''}
            </span>
          </div>
        )}
      </div>
      {editing && (
        <div className="absolute left-0 top-full mt-2 p-3 bg-white border rounded shadow-lg z-20 w-[520px] max-w-[90vw]">
          {element.type === 'signature' && (
            <SignatureCanvas onChange={(dataUrl) => { updateElement(id, { properties: { ...props, dataUrl } }); setEditing(false); }} />
          )}
          {element.type === 'text' && (
            <div className="grid gap-2 text-sm">
              <label className="grid gap-1">
                <span>Text</span>
                <input className="px-2 py-1 border rounded" defaultValue={props.text ?? ''} onChange={(e) => updateElement(id, { properties: { ...props, text: e.target.value } })} />
              </label>
              <label className="grid gap-1">
                <span>Font size</span>
                <input type="number" min={8} max={72} className="px-2 py-1 border rounded w-24" defaultValue={props.fontSize ?? 14} onChange={(e) => updateElement(id, { properties: { ...props, fontSize: Number(e.target.value) } })} />
              </label>
              <label className="grid gap-1">
                <span>Color</span>
                <input type="color" className="w-12 h-8" defaultValue={props.color ?? '#111827'} onChange={(e) => updateElement(id, { properties: { ...props, color: e.target.value } })} />
              </label>
              <div className="flex gap-3">
                <label className="grid gap-1">
                  <span>Align</span>
                  <select className="px-2 py-1 border rounded" defaultValue={props.align ?? 'left'} onChange={(e) => updateElement(id, { properties: { ...props, align: e.target.value } })}>
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <span>Vertical</span>
                  <select className="px-2 py-1 border rounded" defaultValue={props.valign ?? 'top'} onChange={(e) => updateElement(id, { properties: { ...props, valign: e.target.value } })}>
                    <option value="top">Top</option>
                    <option value="middle">Middle</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </label>
              </div>
            </div>
          )}
          {element.type === 'date' && (
            <div className="grid gap-2 text-sm">
              <label className="grid gap-1">
                <span>Date</span>
                <input type="date" className="px-2 py-1 border rounded" defaultValue={props.value ?? new Date().toISOString().slice(0, 10)} onChange={(e) => updateElement(id, { properties: { ...props, value: e.target.value } })} />
              </label>
              <label className="grid gap-1">
                <span>Format</span>
                <input className="px-2 py-1 border rounded" placeholder="YYYY-MM-DD" defaultValue={props.format ?? 'YYYY-MM-DD'} onChange={(e) => updateElement(id, { properties: { ...props, format: e.target.value } })} />
              </label>
            </div>
          )}
          {(element.type === 'checkbox' || element.type === 'radio') && (
            <div className="grid gap-2 text-sm">
              <label className="grid gap-1">
                <span>Label</span>
                <input className="px-2 py-1 border rounded" defaultValue={props.label ?? ''} onChange={(e) => updateElement(id, { properties: { ...props, label: e.target.value } })} />
              </label>
            </div>
          )}
          {element.type === 'stamp' && (
            <div className="grid gap-2 text-sm">
              <label className="grid gap-1">
                <span>Text</span>
                <input className="px-2 py-1 border rounded" defaultValue={props.text ?? 'APPROVED'} onChange={(e) => updateElement(id, { properties: { ...props, text: e.target.value } })} />
              </label>
            </div>
          )}
          {element.type === 'initials' && (
            <div className="grid gap-2 text-sm">
              <label className="grid gap-1">
                <span>Initials</span>
                <input className="px-2 py-1 border rounded" defaultValue={props.value ?? ''} onChange={(e) => updateElement(id, { properties: { ...props, value: e.target.value } })} />
              </label>
            </div>
          )}
          <div className="mt-3 text-right">
            <button className="px-3 py-1 border rounded" onClick={() => setEditing(false)}>Close</button>
          </div>
        </div>
      )}
      {/* Resize handles */}
      {(['nw','n','ne','e','se','s','sw','w'] as const).map((dir) => (
        <ResizeHandle
          key={dir}
          dir={dir}
          onResizeStart={() => setResizing(true)}
          onResizeEnd={() => setResizing(false)}
          onResize={(dx, dy) => {
            const parent = rootRef.current?.parentElement; // overlay is parent
            const parentW = (parent?.clientWidth ?? Infinity) / zoom;
            const parentH = (parent?.clientHeight ?? Infinity) / zoom;
            const minW = 40 / zoom, minH = 24 / zoom;
            let newX = position.x;
            let newY = position.y;
            let newW = size.width;
            let newH = size.height;
            const dxp = dx / zoom;
            const dyp = dy / zoom;
            const rightEdge = newX + newW;
            const bottomEdge = newY + newH;
            switch (dir) {
              case 'se': newW += dxp; newH += dyp; break;
              case 'e': newW += dxp; break;
              case 's': newH += dyp; break;
              case 'ne': newW += dxp; newH -= dyp; newY += dyp; break;
              case 'n': newH -= dyp; newY += dyp; break;
              case 'nw': newW -= dxp; newX += dxp; newH -= dyp; newY += dyp; break;
              case 'w': newW -= dxp; newX += dxp; break;
              case 'sw': newW -= dxp; newX += dxp; newH += dyp; break;
            }
            // Clamp size
            newW = Math.max(minW, newW);
            newH = Math.max(minH, newH);
            // Snap to grid if enabled
            if (snapToGrid && gridSize) {
              const gs = gridSize;
              const snappedW = Math.max(minW, Math.round(newW / gs) * gs);
              const snappedH = Math.max(minH, Math.round(newH / gs) * gs);
              if (dir.includes('w')) newX = Math.max(0, rightEdge - snappedW);
              if (dir.includes('n')) newY = Math.max(0, bottomEdge - snappedH);
              newW = snappedW;
              newH = snappedH;
            }
            // Clamp to parent bounds if available
            if (Number.isFinite(parentW)) {
              newW = Math.min(newW, parentW);
              newX = Math.max(0, Math.min(newX, parentW - newW));
            }
            if (Number.isFinite(parentH)) {
              newH = Math.min(newH, parentH);
              newY = Math.max(0, Math.min(newY, parentH - newH));
            }
            updateElement(id, { position: { x: newX, y: newY }, size: { width: newW, height: newH } });
          }}
        />
      ))}
    </div>
  );
}
