"use client";
import { useEffect, useRef, useState } from 'react';

type Point = { x: number; y: number };

export default function SignatureCanvas({ onChange }: { onChange?: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }, [points]);

  const getPoint = (clientX: number, clientY: number): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      onChange?.(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-2">
      <canvas
        ref={canvasRef}
        width={480}
        height={160}
        className="border rounded bg-white touch-none"
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setDrawing(true);
          const p = getPoint(e.clientX, e.clientY);
          setPoints([p]);
        }}
        onPointerMove={(e) => {
          if (!drawing) return;
          const p = getPoint(e.clientX, e.clientY);
          setPoints(prev => [...prev, p]);
        }}
        onPointerUp={() => {
          setDrawing(false);
          if (canvasRef.current && onChange) onChange(canvasRef.current.toDataURL());
        }}
        onPointerLeave={() => setDrawing(false)}
      />
      <div className="flex flex-wrap gap-2 items-center">
        <button className="px-3 py-1 border rounded" onClick={() => setPoints([])}>Clear</button>
        <button className="px-3 py-1 border rounded" onClick={() => { if (canvasRef.current && onChange) onChange(canvasRef.current.toDataURL()); }}>Save</button>
        <label className="px-3 py-1 border rounded cursor-pointer">
          Upload
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }} />
        </label>
      </div>
    </div>
  );
}
