"use client";
import { useState } from 'react';

export default function TextTool({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const [text, setText] = useState(value ?? 'Text');
  return (
    <div className="grid gap-2">
      <input className="px-3 py-2 border rounded" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="px-3 py-1 border rounded" onClick={() => onChange?.(text)}>Apply</button>
    </div>
  );
}

