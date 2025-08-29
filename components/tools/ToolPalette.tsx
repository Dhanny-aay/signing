"use client";
import { useDraggable } from '@dnd-kit/core';
import { useToolStore } from '@/lib/stores/toolStore';
import type { ElementType } from '@/lib/types/document';

const TOOLS: { key: ElementType; label: string }[] = [
  { key: 'signature', label: 'Signature' },
  { key: 'text', label: 'Text' },
  { key: 'date', label: 'Date' },
  { key: 'checkbox', label: 'Checkbox' },
  { key: 'initials', label: 'Initials' },
  { key: 'stamp', label: 'Stamp' },
  { key: 'radio', label: 'Radio' },
];

function DraggableTool({ type, label }: { type: ElementType; label: string }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `tool-${type}`, data: { type } });
  const setActiveTool = useToolStore(s => s.setActiveTool);
  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`w-full text-left px-3 py-2 rounded border hover:bg-slate-50 touch-target ${isDragging ? 'opacity-50' : ''}`}
      aria-label={`Drag ${label}`}
      onClick={() => setActiveTool(type)}
    >
      {label}
    </button>
  );
}

export default function ToolPalette() {
  const { activeTool, setActiveTool } = useToolStore();
  return (
    <div>
      <div className="mb-2">
        <input className="w-full px-3 py-2 border rounded" placeholder="Search tools" aria-label="Search tools" />
      </div>
      <div className="grid gap-2">
        {TOOLS.map(t => (
          <div key={t.key} className="flex items-center gap-2">
            <DraggableTool type={t.key} label={t.label} />
            <input
              type="radio"
              name="activeTool"
              aria-label={`Select ${t.label}`}
              checked={activeTool === t.key}
              onChange={() => setActiveTool(t.key)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
