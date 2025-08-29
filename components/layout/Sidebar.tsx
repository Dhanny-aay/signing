"use client";
import { PropsWithChildren } from 'react';

export default function Sidebar({ children }: PropsWithChildren) {
  return (
    <aside className="hidden lg:block w-72 border-r bg-slate-50/60">
      <div className="h-[calc(100vh-var(--header-height))] overflow-y-auto p-4">
        {children}
      </div>
    </aside>
  );
}

