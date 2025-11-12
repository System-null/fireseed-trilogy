export default function Home() {
  return (
    <main className="p-6">
      <h1>Fireseed Security Demo</h1>
      <p>前往 <a href="/keystore">/keystore</a> 体验 WebAuthn 与 IndexedDB 兜底。</p>
      <p>探索 <a href="/diagnostics">/diagnostics</a> 查看安全响应头与能力探测。</p>
      <p>前往 <a href="/sign-lab">/sign-lab</a> 实验 Passkey 与兜底签名。</p>
      <p style={{ marginTop: 16, color: '#666' }}>
        提示：WebAuthn 仅在 HTTPS 或 localhost 生效。
      </p>
    </main>
  );
}
