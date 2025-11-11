import { NextResponse, type NextRequest } from 'next/server';

function b64Random(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  // btoa 在 Edge Runtime 可用
  return btoa(s);
}

export function middleware(req: NextRequest) {
  const nonce = b64Random(16);
  const reqHeaders = new Headers(req.headers);
  // 把 nonce 透传到服务端组件
  reqHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: reqHeaders } });

  // 允许必要的自托管资源 + 带 nonce 的内联脚本
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
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
