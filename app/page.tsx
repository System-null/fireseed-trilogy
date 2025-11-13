export default function Home() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-3">Fireseed Lab / 安全与火种实验室</h1>
      <p className="text-sm text-gray-600 mb-4">
        这里是 Fireseed Trilogy 的工程侧实验室入口。大部分功能都还是“面向内行”的实验工具，
        但现在你已经有了一个适合普通人的火种胶囊生成器。
      </p>

      <section className="border rounded-lg p-4 mb-4 bg-white/90">
        <h2 className="font-medium mb-2">给普通人的入口</h2>
        <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
          <li>
            <a href="/capsule/create" className="text-blue-600 hover:underline">
              /capsule/create —— 火种胶囊生成器（阶段一）
            </a>
            <div className="text-xs text-gray-600">
              填一个表单，一键生成结构化的火种胶囊 JSON，以及 Fireseed 指数和“如何保存”的说明。
            </div>
          </li>
        </ul>
      </section>

      <section className="border rounded-lg p-4 mb-4 bg-white/80">
        <h2 className="font-medium mb-2">安全与密钥实验区（面向内行 / 开发者）</h2>
        <ul className="list-disc list-inside text-sm text-gray-800 space-y-1">
          <li>
            <a href="/keystore" className="text-blue-600 hover:underline">
              /keystore —— WebAuthn + IndexedDB keystore 实验
            </a>
            <div className="text-xs text-gray-600">
              在浏览器本地生成“不可导出”的密钥，用 Passkey 辅助签名，验证 CSP / Web 安全基线。
            </div>
          </li>
          <li>
            <a href="/sign-lab" className="text-blue-600 hover:underline">
              /sign-lab —— 签名实验室
            </a>
            <div className="text-xs text-gray-600">
              针对任意消息做 Passkey 签名与兜底 ECDSA 签名，用于验证签名格式与兼容性。
            </div>
          </li>
          <li>
            <a href="/diagnostics" className="text-blue-600 hover:underline">
              /diagnostics —— 安全诊断
            </a>
            <div className="text-xs text-gray-600">
              查看当前部署环境的安全响应头、CSP、生效能力等，辅助你和内行讨论安全基线。
            </div>
          </li>
        </ul>
      </section>

      <section className="border rounded-lg p-4 bg-white/70 text-xs text-gray-600">
        <h2 className="font-medium mb-1">后续路线提示</h2>
        <p className="mb-1">
          当前阶段的目标非常克制：让普通人可以在本地完成一次完整的“火种封装仪式”，
          而不强迫他们学习密钥管理、CAR 文件、分布式存储等概念。
        </p>
        <p>
          下一步可以在不破坏现有安全基线的前提下，逐步把 /
          capsule/create 生成的结构接入 keystore 签名、CAR 打包和可选的 IPFS /
          Vault 托管服务。
        </p>
      </section>
    </main>
  );
}
