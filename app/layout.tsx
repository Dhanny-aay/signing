import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Signing Platform',
  description: 'Modern, responsive document signing platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased text-slate-900 bg-white">
        {children}
      </body>
    </html>
  )
}

