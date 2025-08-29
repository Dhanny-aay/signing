"use client";
type Dir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

type Props = {
  dir: Dir;
  onResize: (dx: number, dy: number, dir: Dir) => void;
  onResizeStart?: (dir: Dir) => void;
  onResizeEnd?: (dir: Dir) => void;
};

const cursorByDir: Record<Dir, string> = {
  n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize', nw: 'nwse-resize'
};

export default function ResizeHandle({ dir, onResize, onResizeStart, onResizeEnd }: Props) {
  const posClass = (() => {
    switch (dir) {
      case 'n': return 'top-0 left-1/2 -translate-x-1/2';
      case 's': return 'bottom-0 left-1/2 -translate-x-1/2';
      case 'e': return 'right-0 top-1/2 -translate-y-1/2';
      case 'w': return 'left-0 top-1/2 -translate-y-1/2';
      case 'ne': return 'top-0 right-0';
      case 'nw': return 'top-0 left-0';
      case 'se': return 'bottom-0 right-0';
      case 'sw': return 'bottom-0 left-0';
    }
  })();

  return (
    <div
      role="separator"
      aria-label={`Resize ${dir}`}
      className={`absolute ${posClass} w-3 h-3 bg-brand-500 rounded-sm shadow-md`} style={{ cursor: cursorByDir[dir] }}
      onPointerDown={(e) => {
        e.preventDefault();
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        onResizeStart?.(dir);
        let lastX = e.clientX;
        let lastY = e.clientY;
        const move = (ev: PointerEvent) => {
          const dx = ev.clientX - lastX;
          const dy = ev.clientY - lastY;
          lastX = ev.clientX; lastY = ev.clientY;
          onResize(dx, dy, dir);
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
          onResizeEnd?.(dir);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      }}
    />
  );
}
