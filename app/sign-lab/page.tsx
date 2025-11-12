'use client';
import { useState } from 'react';
import { registerPasskey, signWithPasskey, fallbackEnsureKey, fallbackSign } from '@/lib/keystore';

const enc = new TextEncoder();
async function verifyFallbackSig(msg: Uint8Array) {
  // 基于 WebCrypto 的 ECDSA(P-256, SHA-256) 验证，仅验证“兜底密钥”的签名闭环
  const { publicJwk } = await fallbackEnsureKey();
  const publicKey = await crypto.subtle.importKey(
    'jwk',
    publicJwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    /* extractable */ false,
    ['verify']
  );
  const raw = await fallbackSign(msg);
  const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, raw, msg);
  const b = new Uint8Array(raw);
  const b64 = btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  return { ok, sig: b64 };
}

export default function SignLab() {
  const [msg, setMsg] = useState('hello-fireseed');
  const [log, setLog] = useState<string>('Ready');

  return (
    <main className="p-6">
      <h2>Sign Lab</h2>
      <p className="text-sm text-gray-600">可视化体验：Passkey 优先，IndexedDB+SubtleCrypto 兜底</p>
      <div style={{display:'flex', gap:8, margin:'12px 0'}}>
        <input value={msg} onChange={e=>setMsg(e.target.value)} style={{flex:1, padding:8, border:'1px solid #ddd', borderRadius:8}} />
      </div>
      <div style={{display:'flex', gap:12, margin:'12px 0'}}>
        <button onClick={async()=>{ try{ const id=await registerPasskey(); setLog(`Passkey registered: ${id}`);} catch(e:any){ setLog(`Register failed: ${e.message||e}`);} }}>Register Passkey</button>
        <button onClick={async()=>{ try{ const sig=await signWithPasskey(enc.encode(msg)); setLog(`WebAuthn signature (b64url) = ${sig.slice(0,40)}...`);} catch(e:any){ setLog(`Sign failed: ${e.message||e}`);} }}>Sign (WebAuthn)</button>
        <button onClick={async()=>{ try{ const {ok,sig}=await verifyFallbackSig(enc.encode(msg)); setLog(`Fallback sign+verify: ${ok?'OK':'FAIL'} | sig=${sig.slice(0,40)}...`);} catch(e:any){ setLog(`Fallback failed: ${e.message||e}`);} }}>Fallback Sign+Verify</button>
      </div>
      <pre style={{whiteSpace:'pre-wrap', background:'#fafafa', border:'1px solid #eee', padding:8, borderRadius:8}}>{log}</pre>
    </main>
  );
}
