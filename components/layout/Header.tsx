"use client";
import Link from 'next/link';

export default function Header() {
  return (
    <header className="h-[var(--header-height)] border-b bg-white sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 h-full flex items-center justify-between">
        <Link href="/" className="font-semibold">Signing</Link>
        <div className="text-sm text-slate-500">Secure, modern document signing</div>
      </div>
    </header>
  );
}

