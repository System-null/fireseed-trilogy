# Phase 2.0 Roadmap (Lab, Manifest, Adapters)

Status: v0.3.0 implements the first local-only Lab milestone (capsule generation + encryption + local verification + manifest + basic Lab view).

- [x] StorageAdapter interface & LocalZipAdapter
- [x] FireseedManifest v0.1 (web, IndexedDB)
- [x] Basic Lab UI (`/lab`, list + export/import)
- [x] Integrate creation and verification flows with the manifest:
  - write entries after one-click capsule generation,
  - allow `/verify/local` to register capsules into the manifest.
- [ ] CLI utilities for manifest management and adapter operations
- [ ] Remote adapters (e.g., S3/IPFS) with health checks
- [ ] Multi-replica sync and recovery policies

**Phase 2.1 status:**  
The project now provides a closed local loop: **generate → (optionally) encrypt → verify → register in the Lab manifest**, with no server-side storage or user accounts involved.

**Phase 2.1 状态：**  
目前已经完成「本地生成 →（可选加密）→ 本地验证 → 录入实验室清单」的完整闭环，整个流程不依赖服务器存储和账号体系。
