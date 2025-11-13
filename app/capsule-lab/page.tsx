'use client';

import { useState } from 'react';
import { registerPasskey, signWithPasskey, fallbackEnsureKey, fallbackSign } from '@/lib/keystore';

export default function CapsuleLab() {
  const [input, setInput] = useState<string>(
`# 在这里粘贴你的 capsule JSON 或任意文本
# Paste your capsule JSON or any text here
{
  "id": "capsule-demo-001",
  "owner": "did:example:alice",
  "content": {
    "type": "note",
    "body": "hello, fireseed"
  }
}`.trim()
  );
  const [log, setLog] = useState<string>('Ready / 就绪');

  const encoder = new TextEncoder();

  async function ensurePasskey() {
    try {
      const id = await registerPasskey();
      setLog(`Passkey registered / 已注册: ${id.slice(0, 16)}...`);
    } catch (e: any) {
      setLog(`Register failed / 注册失败: ${e?.message ?? e}`);
    }
  }

  async function signWithWebAuthn() {
    try {
      const data = encoder.encode(input);
      const sig = await signWithPasskey(data);
      setLog(
        'WebAuthn signature (b64url, first 64 chars):\n' +
        'WebAuthn 签名（b64url，前 64 字符）：\n' +
        sig.slice(0, 64) + '...'
      );
    } catch (e: any) {
      setLog(`Sign failed / 签名失败: ${e?.message ?? e}`);
    }
  }

  async function signWithFallback() {
    try {
      await fallbackEnsureKey();
      const data = encoder.encode(input);
      const raw = await fallbackSign(data);
      const b = new Uint8Array(raw);
      let bin = '';
      for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
      const b64u = btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/,'');
      setLog(
        'Fallback ECDSA (P-256) signature (b64url, first 64 chars):\n' +
        '兜底 ECDSA (P-256) 签名（b64url，前 64 字符）：\n' +
        b64u.slice(0, 64) + '...'
      );
    } catch (e: any) {
      setLog(`Fallback failed / 兜底签名失败: ${e?.message ?? e}`);
    }
  }

  return (
    <main className="p-6" style={{ maxWidth: 900 }}>
      <h2>Capsule Lab</h2>
      <p>
        在这里你可以把任意 capsule JSON 或纯文本作为“消息”，用 keystore 做签名。
        You can treat any capsule JSON or plain text as a message and sign it with the keystore.
      </p>
      <p style={{ color: '#666', marginTop: 4 }}>
        实验用途：仅在本地浏览器中处理内容，不会上传到服务器。<br />
        This is for experiments only; content is processed locally in your browser and not uploaded.
      </p>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={12}
        style={{
          width: '100%',
          marginTop: 16,
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 14,
          padding: 8,
          borderRadius: 8,
          border: '1px solid #ddd',
          boxSizing: 'border-box',
        }}
      />

      <div style={{ display: 'flex', gap: 12, margin: '16px 0' }}>
        <button onClick={ensurePasskey}>Register Passkey / 注册密钥</button>
        <button onClick={signWithWebAuthn}>Sign (WebAuthn) / 使用 WebAuthn 签名</button>
        <button onClick={signWithFallback}>Sign (Fallback ECDSA) / 兜底 ECDSA 签名</button>
      </div>

      <pre
        style={{
          whiteSpace: 'pre-wrap',
          background: '#fafafa',
          padding: 8,
          borderRadius: 8,
          border: '1px solid #eee',
        }}
      >
        {log}
      </pre>

      <p style={{ marginTop: 12, color: '#666' }}>
        提示：WebAuthn 只能在 HTTPS 或 <code>localhost</code> 环境使用；
        Fallback 方案依赖 IndexedDB 存储不可导出密钥。<br />
        Note: WebAuthn only works on HTTPS or <code>localhost</code>. Fallback relies on IndexedDB-stored non-exportable keys.
      </p>
    </main>
  );
}
