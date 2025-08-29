"use client";
import { PropsWithChildren, useState } from 'react';

export default function MobileMenu({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <div className="fixed bottom-4 inset-x-0 px-4 z-40">
        <div className="mx-auto max-w-md rounded-xl border bg-white shadow-lg">
          <button aria-label="Toggle tools" className="w-full py-3 text-sm font-medium" onClick={() => setOpen(v => !v)}>
            {open ? 'Hide Tools' : 'Show Tools'}
          </button>
          {open && <div className="p-3 border-t">{children}</div>}
        </div>
      </div>
    </div>
  );
}

