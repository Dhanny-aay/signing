"use client";
import { useDocumentStore } from '@/lib/stores/documentStore';
import SignatureCanvas from '@/components/tools/SignatureCanvas';
import { useState } from 'react';

export default function PropertiesPanel() {
  const { elements, selectedElementId, updateElement, removeElement, duplicateElement, bringToFront } = useDocumentStore(s => ({
    elements: s.elements,
    selectedElementId: s.selectedElementId,
    updateElement: s.updateElement,
    removeElement: s.removeElement,
    duplicateElement: s.duplicateElement,
    bringToFront: s.bringToFront,
  }));
  const el = elements.find(e => e.id === selectedElementId);
  const [showSig, setShowSig] = useState(false);
  if (!el) return (
    <div className="text-sm text-slate-500">Select an element to edit its properties.</div>
  );
  const p = el.properties || {};
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium capitalize">{el.type}</div>
        <div className="flex gap-2">
          <button className="px-2 py-1 border rounded text-xs" onClick={() => duplicateElement(el.id)}>Duplicate</button>
          <button className="px-2 py-1 border rounded text-xs" onClick={() => bringToFront(el.id)}>Bring Front</button>
          <button className="px-2 py-1 border rounded text-xs text-red-600" onClick={() => removeElement(el.id)}>Delete</button>
        </div>
      </div>
      {el.type === 'text' && (
        <div className="grid gap-2 text-sm">
          <label className="grid gap-1">
            <span>Text</span>
            <textarea className="px-2 py-1 border rounded" rows={3} defaultValue={p.text ?? ''} onChange={(e) => updateElement(el.id, { properties: { ...p, text: e.target.value } })} />
          </label>
          <label className="grid gap-1">
            <span>Font size</span>
            <input type="number" min={8} max={72} className="px-2 py-1 border rounded w-24" defaultValue={p.fontSize ?? 14} onChange={(e) => updateElement(el.id, { properties: { ...p, fontSize: Number(e.target.value) } })} />
          </label>
          <label className="grid gap-1">
            <span>Color</span>
            <input type="color" className="w-12 h-8" defaultValue={p.color ?? '#111827'} onChange={(e) => updateElement(el.id, { properties: { ...p, color: e.target.value } })} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1">
              <span>Font</span>
              <select className="px-2 py-1 border rounded" defaultValue={p.fontFamily ?? 'Helvetica'} onChange={(e) => updateElement(el.id, { properties: { ...p, fontFamily: e.target.value } })}>
                <option value="Helvetica">Helvetica</option>
                <option value="TimesRoman">Times</option>
                <option value="Courier">Courier</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span>Align</span>
              <select className="px-2 py-1 border rounded" defaultValue={p.align ?? 'left'} onChange={(e) => updateElement(el.id, { properties: { ...p, align: e.target.value } })}>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span>Vertical</span>
              <select className="px-2 py-1 border rounded" defaultValue={p.valign ?? 'top'} onChange={(e) => updateElement(el.id, { properties: { ...p, valign: e.target.value } })}>
                <option value="top">Top</option>
                <option value="middle">Middle</option>
                <option value="bottom">Bottom</option>
              </select>
            </label>
          </div>
        </div>
      )}
      {el.type === 'date' && (
        <div className="grid gap-2 text-sm">
          <label className="grid gap-1">
            <span>Date</span>
            <input type="date" className="px-2 py-1 border rounded" defaultValue={p.value ?? new Date().toISOString().slice(0, 10)} onChange={(e) => updateElement(el.id, { properties: { ...p, value: e.target.value } })} />
          </label>
          <label className="grid gap-1">
            <span>Format</span>
            <input className="px-2 py-1 border rounded" placeholder="YYYY-MM-DD" defaultValue={p.format ?? 'YYYY-MM-DD'} onChange={(e) => updateElement(el.id, { properties: { ...p, format: e.target.value } })} />
          </label>
        </div>
      )}
      {(el.type === 'checkbox' || el.type === 'radio') && (
        <div className="grid gap-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type={el.type} checked={!!p.checked || !!p.selected} onChange={(e) => updateElement(el.id, { properties: { ...p, checked: e.target.checked, selected: e.target.checked } })} />
            {el.type === 'checkbox' ? 'Checked' : 'Selected'}
          </label>
          <label className="grid gap-1">
            <span>Label</span>
            <input className="px-2 py-1 border rounded" defaultValue={p.label ?? ''} onChange={(e) => updateElement(el.id, { properties: { ...p, label: e.target.value } })} />
          </label>
          {el.type === 'radio' && (
            <label className="grid gap-1">
              <span>Group name</span>
              <input className="px-2 py-1 border rounded" defaultValue={p.name ?? 'group'} onChange={(e) => updateElement(el.id, { properties: { ...p, name: e.target.value } })} />
            </label>
          )}
        </div>
      )}
      {el.type === 'stamp' && (
        <div className="grid gap-2 text-sm">
          <label className="grid gap-1">
            <span>Text</span>
            <input className="px-2 py-1 border rounded" defaultValue={p.text ?? 'APPROVED'} onChange={(e) => updateElement(el.id, { properties: { ...p, text: e.target.value } })} />
          </label>
        </div>
      )}
      {el.type === 'initials' && (
        <div className="grid gap-2 text-sm">
          <label className="grid gap-1">
            <span>Initials</span>
            <input className="px-2 py-1 border rounded" defaultValue={p.value ?? ''} onChange={(e) => updateElement(el.id, { properties: { ...p, value: e.target.value } })} />
          </label>
        </div>
      )}
      {el.type === 'signature' && (
        <div className="grid gap-2 text-sm">
          {p.dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.dataUrl} alt="Signature preview" className="max-w-full max-h-40 object-contain border rounded" />
          ) : (
            <div className="text-slate-500 text-xs">No signature yet</div>
          )}
          <button className="px-3 py-1 border rounded" onClick={() => setShowSig(true)}>{p.dataUrl ? 'Edit' : 'Add'} Signature</button>
          {showSig && (
            <div className="p-2 border rounded">
              <SignatureCanvas onChange={(dataUrl) => { updateElement(el.id, { properties: { ...p, dataUrl } }); setShowSig(false); }} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
