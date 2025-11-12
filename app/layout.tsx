import './globals.css';
import { headers } from 'next/headers';
import Script from 'next/script';

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
              (function () {
                try {
                  if (window.trustedTypes && !window.trustedTypes.getPolicy('fireseed-policy')) {
                    // 最小白名单：只允许 createHTML
                    window.trustedTypes.createPolicy('fireseed-policy', {
                      createHTML: (s) => s
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
