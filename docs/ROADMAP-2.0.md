# Phase 2.0 Roadmap (Lab, Manifest, Adapters)

This roadmap reflects the current open-source “high-bar” edition. Hosted services, user accounts, and automatic IPFS/Arweave upload are intentionally out of scope.

Status: v0.3.0 implements the first local-only Lab milestone (capsule generation + encryption + local verification + manifest + basic Lab view).

- [x] StorageAdapter interface & LocalZipAdapter
- [x] FireseedManifest v0.1 (web, IndexedDB)
- [x] Basic Lab UI (`/lab`, list + export/import)
- [x] Integrate creation and verification flows with the manifest:
  - write entries after one-click capsule generation,
  - allow `/verify/local` to register capsules into the manifest.
- [x] Fireseed Lab: local manifest viewer with IPFS adapter, M-Disc export bundle, and QR clue cards.
- [x] Local-only encryption + verification loop (`/capsule/create` + `/verify/local`).
- [ ] CLI utilities for manifest management and adapter operations
- [ ] Remote adapters (e.g., S3/IPFS) with health checks
- [ ] Multi-replica sync and recovery policies
- [ ] CID-level CAR inspector (future, not yet implemented in the public repo).

## Multi-Replica / Storage Adapters

- [x] Local ZIP + Manifest + Lab: local generation, verification, and manifest editing are available today.
- [x] Arweave (DIY) adapter: documented self-hosted path for uploading capsule ZIPs and registering `ar://<txId>` replicas in the local manifest (no hosted upload or key handling).
- [ ] IPFS / M-Disc / QR Export: Planned (BYO infra); adapters will write replica records into the manifest without hosting third-party storage.

## 多副本 / 存储适配器

- [x] 本地 ZIP + Manifest + Lab：已完成本地生成、验证与清单管理闭环。
- [x] Arweave（自助型）适配器：提供文档化路径，指导用户用自有工具上传胶囊 ZIP，并在本地 manifest 中登记 `ar://<txId>` 副本（不托管上传，不接触私钥）。
- [ ] IPFS / M-Disc / QR 导出：规划中（用户自备基础设施）；适配器仅写入副本信息，不托管第三方存储。

**Phase 2.1 status:**
The project now provides a closed local loop: **generate → (optionally) encrypt → verify → register in the Lab manifest**, with no server-side storage or user accounts involved.

**Phase 2.1 状态：**  
目前已经完成「本地生成 →（可选加密）→ 本地验证 → 录入实验室清单」的完整闭环，整个流程不依赖服务器存储和账号体系。
