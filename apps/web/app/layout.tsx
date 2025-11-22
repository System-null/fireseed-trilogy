import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fireseed Web',
  description: 'Fireseed Trilogy web console'
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b px-4 py-3">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/">Home</Link>
            <Link href="/capsule">Capsule viewer</Link>
            <Link href="/verify/demo">Verify CID demo</Link>
            <Link href="/lab">火种实验室 / Fireseed Lab</Link>
          </nav>
        </header>
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
