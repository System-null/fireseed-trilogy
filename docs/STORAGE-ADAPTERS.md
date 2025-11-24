# Storage Adapters / 存储适配器

Fireseed uses a manifest-driven approach to record every replica of a capsule across multiple media. This document outlines the currently supported and planned adapters, along with the guiding philosophy for storage.

Fireseed 通过清单（Manifest）记录胶囊在不同介质上的副本。本文件说明当前已支持或规划中的适配器，并阐述存储层的基本原则。

## Philosophy / 哲学

- **Protocols and tools only / 只提供协议与工具**：This repository ships schemas, helper utilities, and example client code. It does **not** host any third-party storage for you. 本仓库仅提供协议、工具和调用示例，不托管任何第三方存储。
- **Bring your own infrastructure / 基础设施自理**：Running IPFS/Arweave nodes, burning optical media, or printing QR code cards is fully user-managed. 搭建 IPFS/Arweave 节点、刻录光盘、打印二维码都由用户自行处理。
- **Risk boundaries / 风险边界**: Key custody, node availability, and media durability are your own responsibility. 密钥安全、节点可用性和介质耐久性均由用户自行承担。

## Adapter Catalog / 适配器目录

### Local ZIP (`local-zip`)
- **Description / 描述**: One-click local capsule generation that produces a ZIP bundle stored on the user’s device. 一键本地生成胶囊 ZIP，保存在本地设备。
- **Replica example / 副本示例**:
  ```json
  {
    "adapterId": "local-zip",
    "medium": "local-zip",
    "location": "file:///Users/alice/Fireseed/capsules/abc123.zip",
    "label": "Local ZIP (manual download)",
    "lastUpdatedAt": "2025-11-23T12:34:56Z"
  }
  ```

### IPFS HTTP Gateway (`ipfs-http`)
- **Description / 描述**: Upload the capsule ZIP to a self-hosted IPFS HTTP API or gateway; store the resulting CID in the manifest. 通过自建 IPFS HTTP API / 网关上传胶囊 ZIP，将 CID 记录在 Manifest 中。
- **Replica example / 副本示例**:
  ```json
  {
    "adapterId": "ipfs-http",
    "medium": "ipfs",
    "location": "ipfs://bafybeigdyrndxexample",
    "label": "IPFS via personal gateway",
    "lastUpdatedAt": "2025-11-23T12:34:56Z"
  }
  ```

### Arweave Relay (`arweave-relay`)
- **Description / 描述**: Use a user-operated relay API to submit bundles to Arweave. This repo only provides call examples; keys and relay hosting are out of scope. 通过用户自建 relay API 上传到 Arweave，本仓库仅提供调用示例，不涉及密钥托管或 relay 部署。
- **Replica example / 副本示例**:
  ```json
  {
    "adapterId": "arweave-relay",
    "medium": "arweave",
    "location": "ar://7TxHCJzexample",
    "label": "Arweave relay upload",
    "lastUpdatedAt": "2025-11-23T12:34:56Z"
  }
  ```

### M-Disc Export (`mdisc-export`)
- **Description / 描述**: Export a deterministic directory layout suitable for optical discs or offline drives. Users handle decompression and burning themselves. 导出规范化目录结构，方便刻录光盘或写入离线硬盘，解压与刻录由用户自理。
- **Replica example / 副本示例**:
  ```json
  {
    "adapterId": "mdisc-export",
    "medium": "mdisc",
    "location": "mdisc:/Fireseed/abc123/",
    "label": "M-Disc staged folder",
    "lastUpdatedAt": "2025-11-23T12:34:56Z"
  }
  ```

### QR Clue Card (`qr-card`)
- **Description / 描述**: Extract a minimal clue JSON from the manifest (index + integrity hints) and encode it as a QR code for paper backup. 从 Manifest 提取最小线索 JSON（索引 + 校验信息），编码为二维码，方便纸质介质备份。
- **Replica example / 副本示例**:
  ```json
  {
    "adapterId": "qr-card",
    "medium": "qr-card",
    "location": "qr:fireseed:abc123",
    "label": "Printed clue card",
    "lastUpdatedAt": "2025-11-23T12:34:56Z"
  }
  ```

## Notes / 补充说明
- Adapter IDs and media names are descriptive and can be extended in future versions. 适配器 ID 与介质类型可在未来扩展。
- The manifest keeps replica records only; actual storage lifecycle (pinning, burning, printing) happens outside of this codebase. Manifest 仅记录副本信息，存储生命周期（Pin、刻录、打印）发生在本仓库之外。
