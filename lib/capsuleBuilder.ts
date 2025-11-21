import {
  computeFireseedIndex,
  FireseedIndexResult,
} from "./fireseedIndex";

export type EncryptionMode = "none" | "aes-passphrase";

export interface OneClickCapsuleInput {
  title: string;
  scenario: string;
  body: string;
}

export interface OneClickCapsuleOutput {
  capsule: any; // 可以后续细化
  meta: {
    schemaVersion: string; // "0.2.9"
    generatedAt: string; // ISO 时间
    fireseedIndex: FireseedIndexResult;
    encryption: EncryptionMode;
  };
  humanReadable: string; // HUMAN_READABLE.md 内容（中英双语）
  readmeText: string; // README.txt 内容（中英双语）
}

export function buildOneClickCapsule(
  input: OneClickCapsuleInput
): OneClickCapsuleOutput {
  const schemaVersion = "0.2.9";
  const generatedAt = new Date().toISOString();
  const index = computeFireseedIndex(input.body);
  const encryption: EncryptionMode = "none";

  const capsule = {
    schema: "FireseedCapsule",
    version: schemaVersion,
    meta: {
      createdAt: generatedAt,
      scenario: input.scenario,
      fireseedIndexScore: index.score,
      fireseedIndexDetail: {
        lengthScore: index.detail.lengthScore,
        lexicalScore: index.detail.lexicalScore,
        structureScore: index.detail.structureScore,
        timeSpanScore: index.detail.timeSpanScore,
        logicScore: index.detail.logicScore,
        emotionScore: index.detail.emotionScore,
      },
      encryption,
    },
    content: {
      title: input.title,
      raw: input.body,
      structured: input.body,
    },
  };

  const meta = {
    schemaVersion,
    generatedAt,
    fireseedIndex: index,
    encryption,
  };

  const humanReadable = `# Fireseed Capsule · 人类可读视图 / Human-Readable View

标题 / Title: ${input.title}
场景 / Scenario: ${input.scenario}
生成时间 / Generated At: ${generatedAt}
Schema 版本 / Schema Version: FireseedCapsule v${schemaVersion}

---

## Fireseed Index · 火种指数

总分 / Overall Score: ${index.score} / 100

- 篇幅与信息量 / Length & Information: ${index.detail.lengthScore}
- 词汇丰富度 / Lexical Richness: ${index.detail.lexicalScore}
- 结构组织 / Structural Organization: ${index.detail.structureScore}
- 时间跨度 / Time Span Coverage: ${index.detail.timeSpanScore}
- 决策与逻辑 / Decisions & Reasoning: ${index.detail.logicScore}
- 情绪与价值 / Emotion & Values: ${index.detail.emotionScore}

---

## 原文 / Original Text

${input.body}

（注意：中英都写在同一个 Markdown 文本里，方便任何语言的阅读者理解。）
`;

  const readmeText = `Fireseed Capsule – 本地火种胶囊（实验版）
Fireseed Capsule – Local Fireseed Capsule (Experimental)

这是什么：
What this is:

- 你在网页上填写的内容，已经被转成一个“结构化胶囊”。
- The text you filled in on the web page has been converted into a "structured capsule".
- capsule.json：结构化版本（给未来系统或高维智能读取）。
- capsule.json: Structured version for future systems or higher intelligences.
- meta.json：记录版本、生成时间和 Fireseed Index 指标。
- meta.json: Records schema version, generation time, and Fireseed Index metrics.
- HUMAN_READABLE.md：把结构化内容铺平成普通人可读的文本。
- HUMAN_READABLE.md: A human-readable rendering of the structured content.
- README.txt：你正在看的这份说明文件。
- README.txt: This instruction file you are reading.

你该做什么 / What you should do:

1. 请至少在两个物理位置备份整个文件夹（例如：本机 + 移动硬盘）。
   Make at least two physical backups of this folder (e.g. local disk + external drive).
2. 请不要随意公开这一整包内容，它可能包含你的隐私。
   Do not casually publish this entire package; it may contain private information.
3. 如果你有纸质遗嘱，可以写下压缩包的存放位置和生成日期。
   If you have a paper will, you may record the location of this zip file and its generation date.

关于 Fireseed Index / About the Fireseed Index:

- 这是一个启发式评分，范围 0–100。
  It is a heuristic score ranging from 0 to 100.
- 它根据篇幅、词汇丰富度、结构、时间跨度、决策密度和情绪词等维度给出一个大致“描述质量”分。
  It estimates the "description quality" based on length, lexical richness, structure, time span, decision density, and emotional/value words.
- 它不是对“人生价值”的打分，只是方便未来系统快速理解这段文本的结构信息量。
  It is NOT a judgment of your life's value; it only helps future systems quickly understand the structure and information richness of this text.

版本信息 / Version Info:

- 生成时间 / Generated At: ${generatedAt}
- Schema 版本 / Schema Version: FireseedCapsule v${schemaVersion}
- 工具版本 / Tool Version: fireseed-lab (placeholder)

存储与加密 / Storage & Encryption

- 当前版本的胶囊内容以明文形式存储在本地文件中。
  In the current version, capsule content is stored in plaintext files on your local machine.
- 隐私保护主要依赖你的操作系统权限设置和备份策略。
  Privacy protection mainly depends on your OS permissions and your own backup strategy.
- 未来版本可能会加入基于密码的加密选项，一旦加密，忘记密码将无法恢复内容。
  Future versions may add password-based encryption; once encrypted, forgetting the password will make the content unrecoverable.
`;

  return {
    capsule,
    meta,
    humanReadable,
    readmeText,
  };
}
