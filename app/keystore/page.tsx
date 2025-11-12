'use client';

import { useState } from 'react';
import { registerPasskey, signWithPasskey, fallbackEnsureKey, fallbackSign } from '@/lib/keystore';

export default function KeystoreDemo() {
  const [log, setLog] = useState<string>('Ready');
  const msg = new TextEncoder().encode('hello-fireseed');

  async function doRegister() {
    try {
      const id = await registerPasskey();
      setLog(`Passkey registered: ${id}`);
    } catch (e: any) { setLog(`Register failed: ${e?.message ?? e}`); }
  }

  async function doSignWebAuthn() {
    try {
      const sig = await signWithPasskey(msg);
      setLog(`WebAuthn signature (b64url): ${sig.slice(0, 40)}...`);
    } catch (e: any) { setLog(`Sign failed: ${e?.message ?? e}`); }
  }

  async function doFallback() {
    try {
      await fallbackEnsureKey();
      const raw = await fallbackSign(msg);
      const b = new Uint8Array(raw);
      let bin = ''; for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
      const b64u = btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      setLog(`Fallback ECDSA sig (b64url): ${b64u.slice(0, 40)}...`);
    } catch (e: any) { setLog(`Fallback failed: ${e?.message ?? e}`); }
  }

  return (
    <main className="p-6">
      <h2>Keystore Demo</h2>
      <p>优先 WebAuthn（Passkey），失败则使用 IndexedDB + SubtleCrypto（P-256）兜底。</p>
      <div style={{display:'flex', gap:12, margin:'16px 0'}}>
        <button onClick={doRegister}>Register Passkey</button>
        <button onClick={doSignWebAuthn}>Sign (WebAuthn)</button>
        <button onClick={doFallback}>Fallback Sign (IndexedDB)</button>
      </div>
      <pre style={{whiteSpace:'pre-wrap'}}>{log}</pre>
      <p style={{marginTop:12, color:'#666'}}>提示：WebAuthn 必须在 HTTPS 或 localhost 运行。</p>
      <p style={{marginTop:4, color:'#b36b00'}}>注意：演示环境未校验证书 attestation，生产部署前请接入后端验证。</p>
    </main>
  );
}
