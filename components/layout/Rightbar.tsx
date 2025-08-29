"use client";
import { PropsWithChildren } from 'react';

export default function Rightbar({ children }: PropsWithChildren) {
  return (
    <aside className="hidden xl:block w-80 border-l bg-slate-50/60">
      <div className="h-[calc(100vh-var(--header-height))] overflow-y-auto p-4">
        {children}
      </div>
    </aside>
  );
}

