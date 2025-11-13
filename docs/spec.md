# Fireseed Capsule v0.3 规范

## 版本概览
- **格式标识**：`fireseed-capsule-v0.3`
- **序列化**：JSON / YAML（UTF-8，无 BOM）
- **签名算法**：Ed25519，对 canonical JSON（移除 `signature` 字段后）进行签名
- **兼容性**：字段向后兼容 v0.2.9；新增边界与可选元字段

## 顶层字段
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `version` | `string` | 固定为 `capsule_v0.3` |
| `capsule_id` | `string` | 全局唯一 ID，建议 `namespace_slug_xxxx` 格式 |
| `author_pubkey` | `string` | Base64 编码的 Ed25519 公钥（32 字节） |
| `signature` | `string` | Base64 编码的 Ed25519 签名（64 字节） |
| `payload` | `object` | 核心内容，遵循下方结构 |
| `metadata` | `object` (可选) | 额外上下文，如 tags、locale |

## `payload` 结构
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | `string` | Capsule 标题，1-160 字符 |
| `summary` | `string` | Capsule 摘要，1-400 字符 |
| `language` | `string` | IETF BCP 47 语言码，如 `zh-Hans` |
| `proofs` | `object` | 证据清单，至少包含 `hash` |
| `assets` | `array` | 关联资源列表（URL 或 CID） |
| `timeline` | `array` | 重要事件（时间戳 + 描述） |

### `proofs`
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `hash` | `string` | SHA-256 十六进制摘要（64 个十六进制字符） |
| `signature_type` | `string` (可选) | 证据签名类型，如 `gpg-clearsign` |
| `attachments` | `array` (可选) | 附件 CID 列表 |

### `assets` 条目
```
{
  "type": "image" | "audio" | "document" | "other",
  "uri": "ipfs://..." | "https://...",
  "title": "可选的说明文本"
}
```

### `timeline` 条目
```
{
  "at": "ISO-8601 时间戳",
  "event": "事件描述"
}
```

## 边界约束
- Capsule 总大小（JSON 序列化）不超过 **200 KiB**。
- `assets` 与 `timeline` 各自的元素数量上限为 **64**。
- 任何字符串字段禁止含有控制字符（U+0000-U+001F）。
- `capsule_id` 应只包含 `[a-z0-9_\-]`，长度 8-64。
- `metadata` 可包含任意键，但推荐使用小写加连字符。

## 成功示例
```json
{
  "version": "capsule_v0.3",
  "capsule_id": "fireseed_lab_2024",
  "author_pubkey": "o5mF0zK0+Q9mC8Ul3kYL4M6uCa2bhA+ZLZnJwHUPNls=",
  "payload": {
    "title": "Fireseed Knowledge Capsule",
    "summary": "Community maintained capsule with reproducible proofs.",
    "language": "en",
    "proofs": {
      "hash": "2d711642b726b04401627ca9fbac32f5da7e5c3c75c3b9d0a032f8cf30272c25"
    },
    "assets": [
      {
        "type": "document",
        "uri": "ipfs://bafybeigdyrztk7example",
        "title": "Signed transcript"
      }
    ],
    "timeline": [
      {
        "at": "2024-06-30T12:00:00Z",
        "event": "Initial publication"
      }
    ]
  },
  "signature": "dWWco1XnQ3vTb5b9L4lDCgYohG2x6BFb3Tu7U+Q0vBxWmDWvR8pG0ykscUqLxFmq18TkQ0gUuN6gB3d4r3NfAw=="
}
```

## 失败样例
```json
{
  "version": "capsule_v0.3",
  "capsule_id": "FireSeed#Bad",
  "author_pubkey": "not-base64",
  "payload": {
    "title": "",
    "summary": "too short",
    "language": "zh-Hans",
    "proofs": {
      "hash": "1234"
    },
    "assets": [],
    "timeline": []
  },
  "signature": "invalid"
}
```

- `capsule_id` 含非法字符与长度。
- `author_pubkey` 与 `signature` 不是合法的 base64。
- `title` 为空字符串。
- `proofs.hash` 不是 64 个十六进制字符。
