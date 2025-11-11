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
    } catch (e:any) { setLog(`Register failed: ${e.message || e}`); }
  }

  async function doSignWebAuthn() {
    try {
      const sig = await signWithPasskey(msg);
      setLog(`WebAuthn signature (b64url): ${sig.slice(0, 32)}...`);
    } catch (e:any) { setLog(`Sign failed: ${e.message || e}`); }
  }

  async function doFallback() {
    try {
      await fallbackEnsureKey();
      const raw = await fallbackSign(msg);
      const b = new Uint8Array(raw);
      const b64 = btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      setLog(`Fallback ECDSA sig(b64url): ${b64.slice(0, 32)}...`);
    } catch (e:any) { setLog(`Fallback failed: ${e.message || e}`); }
  }

  return (
    <main className="p-6">
      <h2>Keystore Demo</h2>
      <p>优先 WebAuthn（Passkey），失败则使用 IndexedDB + SubtleCrypto（ECDSA P-256）兜底。</p>
      <div style={{display:'flex', gap:12, margin:'16px 0'}}>
        <button onClick={doRegister}>Register Passkey</button>
        <button onClick={doSignWebAuthn}>Sign (WebAuthn)</button>
        <button onClick={doFallback}>Fallback Sign (IndexedDB)</button>
      </div>
      <pre style={{whiteSpace:'pre-wrap'}}>{log}</pre>
      <p style={{marginTop:12, color:'#666'}}>提示：WebAuthn 必须在 HTTPS 或 localhost 运行。</p>
    </main>
  );
}
