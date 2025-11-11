import './globals.css';
import type React from 'react';
import { headers } from 'next/headers';
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = headers().get('x-nonce') ?? undefined;

  return (
    <html lang="en">
      <head>
        {/* 在任何脚本前建立 Trusted Types 策略 */}
        <Script
          id="tt-policy"
          nonce={nonce}
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  if (window.trustedTypes && !window.trustedTypes.getPolicy('fireseed-policy')) {
                    window.trustedTypes.createPolicy('fireseed-policy', {
                      createHTML: (s) => s,
                      createScript: (s) => s,
                      createScriptURL: (s) => s
                    });
                  }
                } catch(e) { /* no-op */ }
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
