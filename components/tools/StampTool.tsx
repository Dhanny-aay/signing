"use client";
export default function StampTool({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const presets = ['SIGNED', 'APPROVED', 'REVIEWED'];
  return (
    <div className="grid gap-2">
      <select className="px-3 py-2 border rounded" value={value} onChange={(e) => onChange?.(e.target.value)}>
        {presets.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
    </div>
  );
}

