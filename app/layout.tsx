import './globals.css';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import Script from 'next/script';

export default function RootLayout({ children }: { children: ReactNode }) {
  const nonce = headers().get('x-nonce') ?? undefined;

  return (
    <html lang="en">
      <head>
        <Script
          id="tt-policy"
          nonce={nonce}
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (() => {
                try {
                  if (window.trustedTypes && !window.trustedTypes.getPolicy('fireseed-policy')) {
                    window.trustedTypes.createPolicy('fireseed-policy', {
                      createHTML: (s) => s,
                      createScript: (s) => s,
                      createScriptURL: (s) => s
                    });
                  }
                } catch (_) {}
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
