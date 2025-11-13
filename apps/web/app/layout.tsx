import type { Metadata } from 'next';
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
      <body>{children}</body>
    </html>
  );
}
