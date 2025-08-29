"use client";
export default function DateTool({ value, onChange }: { value?: string; onChange?: (v: string) => void }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-2">
      <input type="date" className="px-3 py-2 border rounded" value={value ?? today} onChange={(e) => onChange?.(e.target.value)} />
    </div>
  );
}

