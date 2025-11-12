'use client';
import { useEffect, useState } from 'react';

type Row = { k: string; v: string };
export default function Diagnostics() {
  const [rows, setRows] = useState<Row[]>([]);
  useEffect(() => {
    (async () => {
      const r = await fetch('/', { method: 'GET' });
      const csp = r.headers.get('content-security-policy') || '';
      const pp = r.headers.get('permissions-policy') || '';
      const xcto = r.headers.get('x-content-type-options') || '';
      const xfo = r.headers.get('x-frame-options') || '';
      const tt = csp.includes('require-trusted-types-for');
      setRows([
        { k: 'CSP', v: csp || '—' },
        { k: 'Permissions-Policy', v: pp || '—' },
        { k: 'X-Content-Type-Options', v: xcto || '—' },
        { k: 'X-Frame-Options', v: xfo || '—' },
        { k: 'Trusted Types?', v: tt ? 'YES' : 'NO' },
        { k: 'WebAuthn supported?', v: ('credentials' in navigator) ? 'YES' : 'NO' },
        { k: 'IndexedDB supported?', v: ('indexedDB' in window) ? 'YES' : 'NO' },
        { k: 'User-Agent', v: navigator.userAgent },
      ]);
    })();
  }, []);
  return (
    <main className="p-6">
      <h2>Diagnostics</h2>
      <p className="text-sm text-gray-600">实时展示安全响应头与能力探测</p>
      <table style={{marginTop:12, width:'100%', borderCollapse:'collapse'}}>
        <tbody>
          {rows.map(({k,v}) => (
            <tr key={k}>
              <td style={{padding:'6px 8px', borderBottom:'1px solid #eee', width:220, fontWeight:600}}>{k}</td>
              <td style={{padding:'6px 8px', borderBottom:'1px solid #eee', wordBreak:'break-all'}}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
