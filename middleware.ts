import { NextResponse, type NextRequest } from 'next/server';

function b64Random(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  // Edge runtime 提供 btoa
  return btoa(s);
}

export function middleware(req: NextRequest) {
  const nonce = b64Random(16);
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-nonce', nonce); // 传给布局使用

  const res = NextResponse.next({ request: { headers: reqHeaders } });

  const csp = [
    "default-src 'self'",
    // strict-dynamic 让带 nonce 的脚本动态加载的子脚本继续获准
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https://api.web3.storage https://api.pinata.cloud",
    "object-src 'none'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
    "require-trusted-types-for 'script'",
    "trusted-types fireseed-policy"
  ].join('; ');

  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
