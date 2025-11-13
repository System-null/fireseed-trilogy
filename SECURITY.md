# Security Policy
- Please report vulnerabilities via GitHub Security Advisories.
- Do not open public issues for undisclosed bugs.
- Keys: rotate immediately on suspicion; re-sign affected artifacts.
- Private keys must never enter the repository history; sample fixtures use generated placeholders only.
- Capsule 签名仅支持读取文件或 `FIRESEED_PRIVKEY` 环境变量，禁止硬编码密钥。
- GitHub secret scanning is enabled across all branches—treat alerts as blocking until resolved.
