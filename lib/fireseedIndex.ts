// lib/fireseedIndex.ts
//
// Fireseed Index 计算工具（玩具级算法，用于给用户一个“被认真对待”的仪式感）。
// 不依赖任何外部库，方便在前端和后端复用。

export interface FireseedDiagnostics {
  length: number;             // 字数
  wordCount: number;          // 粗略词数（按空格/换行拆分）
  uniqueWordCount: number;    // 粗略去重后的词数
  entropyScore: number;       // 信息熵评分（词汇丰富度）
  structureScore: number;     // 结构度评分（段落、小标题、列表）
  emotionScore: number;       // 情绪/价值相关词评分
  timeSpanScore: number;      // 时间跨度评分（覆盖人生不同阶段）
  decisionScore: number;      // 决策模式评分（“当…时，我选择…”）
}

export interface FireseedIndexResult {
  index: number;              // 0 ~ 100 的火种指数
  diagnostics: FireseedDiagnostics;
  discoveryProbability: string; // 模拟发现概率的文案
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// 粗略计算文本的“词熵”：这里只是玩具级实现，够用即可。
function estimateEntropy(tokens: string[]): number {
  if (!tokens.length) return 0;
  const freq = new Map<string, number>();
  for (const t of tokens) {
    if (!t) continue;
    freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  const total = tokens.length;
  let h = 0;
  for (const count of freq.values()) {
    const p = count / total;
    h -= p * Math.log2(p);
  }
  return h;
}

export function calculateFireseedIndex(text: string): FireseedIndexResult {
  const normalized = (text || '').trim();
  if (!normalized) {
    return {
      index: 0,
      diagnostics: {
        length: 0,
        wordCount: 0,
        uniqueWordCount: 0,
        entropyScore: 0,
        structureScore: 0,
        emotionScore: 0,
        timeSpanScore: 0,
        decisionScore: 0,
      },
      discoveryProbability: '文本为空：请先写点什么，再生成火种胶囊。',
    };
  }

  const length = normalized.length;
  const roughTokens = normalized
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(t => t.trim())
    .filter(Boolean);

  const wordCount = roughTokens.length;
  const uniqueWordCount = new Set(roughTokens).size;

  // 1. 信息熵评分：大致范围 [0, ~8]，我们映射到 [0, 35]
  const entropy = estimateEntropy(roughTokens);
  let entropyScore = 0;
  if (entropy > 1) {
    entropyScore = clamp((entropy - 1) * 7, 0, 35);
  }

  // 2. 结构度评分：统计小标题/列表/段落特征
  const headingMatches = normalized.match(/^#{1,6}\s+/gm) || [];
  const listMatches = normalized.match(/^(\*|-|\d+\.)\s+/gm) || [];
  const paragraphSplits = normalized.split(/\n{2,}/g);
  const paragraphCount = paragraphSplits.length;
  const structureScore = clamp(
    headingMatches.length * 5 + listMatches.length * 2 + Math.max(0, paragraphCount - 1) * 2,
    0,
    25
  );

  // 3. 情绪/价值相关词
  const emotionWords = ['恐惧', '悔恨', '选择', '失去', '爱', '死亡', '意义', '后悔', '希望', '绝望'];
  let emotionHits = 0;
  for (const w of emotionWords) {
    if (normalized.includes(w)) emotionHits++;
  }
  const emotionScore = clamp(emotionHits * 4, 0, 20);

  // 4. 时间跨度
  const timeMarkers = ['小时候', '童年', '初中', '高中', '大学', '工作', '结婚', '现在', '此刻', '未来', '老了', '临终'];
  let timeHits = 0;
  for (const m of timeMarkers) {
    if (normalized.includes(m)) timeHits++;
  }
  const timeSpanScore = clamp(timeHits * 3, 0, 15);

  // 5. 决策模式
  const decisionMatches = normalized.match(/当.*?时.*?(选择|决定|应该)/g) || [];
  const decisionScore = clamp(decisionMatches.length * 6, 0, 20);

  // 初始基准分 40，再叠加各维度
  let indexRaw =
    40 +
    entropyScore * 0.7 +
    structureScore * 0.6 +
    emotionScore * 0.8 +
    timeSpanScore * 0.7 +
    decisionScore;

  // 文本太短则整体打折
  if (length < 200) {
    indexRaw *= 0.6;
  } else if (length < 600) {
    indexRaw *= 0.8;
  }

  const index = clamp(Math.round(indexRaw), 0, 100);

  // 模拟“发现概率”和“百分位”
  const base = 0.01; // 基准 1%
  const multiplier = index > 85 ? 10 : index > 70 ? 4 : index > 55 ? 2 : 1;
  const prob = base * multiplier;
  const percentile = clamp(Math.round((index / 100) * 90 + 5), 1, 99); // 让绝大多数人落在 5~95 之间

  const discoveryProbability = `模拟发现概率：${(prob * 100).toFixed(2)}%（信息密度与结构度超过约 ${percentile}% 的普通节点）`;

  return {
    index,
    diagnostics: {
      length,
      wordCount,
      uniqueWordCount,
      entropyScore,
      structureScore,
      emotionScore,
      timeSpanScore,
      decisionScore,
    },
    discoveryProbability,
  };
}
