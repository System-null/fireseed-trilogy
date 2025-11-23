// lib/fireseedIndex.ts
// Fireseed Index 评分模型（专业版）。纯函数实现，可在前后端复用。

export interface FireseedRawMetrics {
  charCount: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;

  // 词汇相关
  uniqueWordCount: number;
  typeTokenRatio: number; // TTR
  herdansC: number; // log(V)/log(N)
  sentenceLenMean: number;
  sentenceLenStd: number;
  sentenceBurstiness: number; // std / (mean + 1e-6)

  // 结构 / 时间
  headingCount: number;
  listItemCount: number;
  timeStageHits: number;
  yearCount: number;
  timeSpanYears: number;

  // 决策 / 逻辑 / 情绪
  decisionHits: number;
  connectorHits: number;
  emotionHits: number;
}

export interface FireseedIndexDetail {
  lengthScore: number; // 0–15
  lexicalScore: number; // 0–20
  structureScore: number; // 0–15
  timeSpanScore: number; // 0–15
  logicScore: number; // 0–15
  emotionScore: number; // 0–10
  raw: FireseedRawMetrics; // 原始指标
}

export interface FireseedIndexResult {
  score: number; // 0–100 总分
  detail: FireseedIndexDetail;
}

export interface FireseedIndexExplanation {
  summary: string;
  breakdown: {
    key: string;
    labelZh: string;
    labelEn: string;
    score: number;
    maxScore: number;
  }[];
  recommendationsZh: string[];
  recommendationsEn: string[];
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function computeFireseedIndex(text: string): FireseedIndexResult {
  const normalized = (text ?? "").trim();
  const lower = normalized.toLowerCase();
  if (!normalized) {
    return {
      score: 0,
      detail: {
        lengthScore: 0,
        lexicalScore: 0,
        structureScore: 0,
        timeSpanScore: 0,
        logicScore: 0,
        emotionScore: 0,
        raw: {
          charCount: 0,
          wordCount: 0,
          sentenceCount: 0,
          paragraphCount: 0,
          uniqueWordCount: 0,
          typeTokenRatio: 0,
          herdansC: 0,
          sentenceLenMean: 0,
          sentenceLenStd: 0,
          sentenceBurstiness: 0,
          headingCount: 0,
          listItemCount: 0,
          timeStageHits: 0,
          yearCount: 0,
          timeSpanYears: 0,
          decisionHits: 0,
          connectorHits: 0,
          emotionHits: 0,
        },
      },
    };
  }

  const tokens = tokenize(normalized);
  const sentences = normalized
    .split(/[。！？!?\.]+/g)
    .map(s => s.trim())
    .filter(Boolean);
  const paragraphs = normalized
    .split(/\n{2,}/g)
    .map(s => s.trim())
    .filter(Boolean);

  const charCount = normalized.length;
  const wordCount = tokens.length;
  const uniqueWordCount = new Set(tokens).size;
  const sentenceCount = sentences.length;
  const paragraphCount = paragraphs.length;

  const typeTokenRatio = wordCount ? uniqueWordCount / wordCount : 0;
  const herdansC =
    wordCount > 1 && uniqueWordCount > 1 ? Math.log(uniqueWordCount) / Math.log(wordCount) : 0;

  const sentenceLens = sentences
    .map(s => tokenize(s).length)
    .filter(n => n > 0);

  const sentenceLenMean =
    sentenceLens.length > 0 ? sentenceLens.reduce((a, b) => a + b, 0) / sentenceLens.length : 0;

  const sentenceLenStd =
    sentenceLens.length > 1
      ? Math.sqrt(sentenceLens.map(n => (n - sentenceLenMean) ** 2).reduce((a, b) => a + b, 0) /
          sentenceLens.length)
      : 0;

  const sentenceBurstiness = sentenceLenMean > 0 ? sentenceLenStd / (sentenceLenMean + 1e-6) : 0;

  const headingMatches = normalized.match(/^#{1,6}\s+/gm) || [];
  const headingCount = headingMatches.length;
  const listMatches = normalized.match(/^(\*|-|\d+\.)\s+/gm) || [];
  const listItemCount = listMatches.length;

  const timeStages = [
    // 中文
    "小时候",
    "童年",
    "小学",
    "初中",
    "高中",
    "大学",
    "工作",
    "打工",
    "结婚",
    "生子",
    "现在",
    "此刻",
    "中年",
    "老年",
    "临终",
    "未来",
    // 英文
    "childhood",
    "primary school",
    "elementary school",
    "middle school",
    "high school",
    "college",
    "university",
    "work",
    "working",
    "job",
    "career",
    "marriage",
    "wedding",
    "kids",
    "children",
    "now",
    "right now",
    "at this moment",
    "midlife",
    "old age",
    "retirement",
    "near death",
    "before i die",
    "in the future",
  ];
  let timeStageHits = 0;
  for (const w of timeStages) {
    if (/[a-z]/i.test(w)) {
      if (lower.includes(w)) timeStageHits++;
    } else {
      if (normalized.includes(w)) timeStageHits++;
    }
  }

  const yearMatches = normalized.match(/\b(19|20)\d{2}\b/g) || [];
  const yearCount = yearMatches.length;
  let timeSpanYears = 0;
  if (yearMatches.length >= 2) {
    const years = yearMatches.map(y => parseInt(y, 10)).sort((a, b) => a - b);
    timeSpanYears = years[years.length - 1] - years[0];
  }

  const decisionPatterns = [
    /当[^。\n]{0,40}?时[^。\n]{0,20}?(我)?(选择|决定|必须)/g,
    /我(决定|选择|下定决心)/g,
    /(于是|所以)我[^。\n]{0,30}?(改|换|辞职|分手|搬走)/g,
    /when[^\.\!\n]{0,60}?i[^\.\!\n]{0,20}?(decided|chose)/gi,
    /\bi decided to\b/gi,
    /\bi chose to\b/gi,
    /\bso i (quit|left|moved|broke up)\b/gi,
  ];
  let decisionHits = 0;
  for (const re of decisionPatterns) {
    const m = normalized.match(re);
    if (m) decisionHits += m.length;
  }

  const connectors = [
    // 中文
    "因为",
    "所以",
    "但是",
    "然而",
    "如果",
    "否则",
    "因此",
    "结果",
    "于是",
    "不过",
    // 英文
    "because",
    "so",
    "but",
    "however",
    "though",
    "although",
    "if",
    "otherwise",
    "therefore",
    "as a result",
    "as a consequence",
    "thus",
    "hence",
    "then",
    "in the end",
    "eventually",
  ];
  let connectorHits = 0;
  for (const w of connectors) {
    if (/[a-z]/i.test(w)) {
      const parts = lower.split(w);
      if (parts.length > 1) connectorHits += parts.length - 1;
    } else {
      const parts = normalized.split(w);
      if (parts.length > 1) connectorHits += parts.length - 1;
    }
  }

  const emotionLexicon = [
    // 中文
    "恐惧",
    "害怕",
    "崩溃",
    "绝望",
    "愧疚",
    "悔恨",
    "内疚",
    "震撼",
    "痛苦",
    "愤怒",
    "后悔",
    "释然",
    "感激",
    "欣慰",
    "感动",
    "爱",
    "恨",
    "自由",
    "意义",
    "孤独",
    "绝望",
    // 英文
    "afraid",
    "scared",
    "terrified",
    "fear",
    "panic",
    "despair",
    "hopeless",
    "hopelessness",
    "guilt",
    "guilty",
    "remorse",
    "regret",
    "pain",
    "painful",
    "suffer",
    "suffering",
    "anger",
    "angry",
    "furious",
    "relief",
    "grateful",
    "gratitude",
    "touched",
    "moved",
    "love",
    "hate",
    "freedom",
    "meaning",
    "meaningless",
    "lonely",
    "loneliness",
  ];
  let emotionHits = 0;
  for (const w of emotionLexicon) {
    if (/[a-z]/i.test(w)) {
      if (lower.includes(w)) emotionHits++;
    } else {
      if (normalized.includes(w)) emotionHits++;
    }
  }

  const raw: FireseedRawMetrics = {
    charCount,
    wordCount,
    sentenceCount,
    paragraphCount,
    uniqueWordCount,
    typeTokenRatio,
    herdansC,
    sentenceLenMean,
    sentenceLenStd,
    sentenceBurstiness,
    headingCount,
    listItemCount,
    timeStageHits,
    yearCount,
    timeSpanYears,
    decisionHits,
    connectorHits,
    emotionHits,
  };

  let lengthScore = 0;
  if (wordCount < 80) {
    lengthScore = 0;
  } else if (wordCount <= 200) {
    lengthScore = 5 + ((wordCount - 80) / 120) * 5;
  } else if (wordCount <= 800) {
    lengthScore = 10 + ((Math.min(wordCount, 800) - 200) / 600) * 5;
  } else {
    lengthScore = 15;
  }
  lengthScore = clamp(Math.round(lengthScore), 0, 15);

  let ttrScore = 0;
  if (typeTokenRatio > 0.25) {
    ttrScore = ((Math.min(typeTokenRatio, 0.6) - 0.25) / 0.35) * 12;
  }

  let herdansScore = 0;
  if (herdansC > 0.6) {
    herdansScore = ((Math.min(herdansC, 1.0) - 0.6) / 0.4) * 8;
  }

  let lexicalScore = clamp(Math.round(ttrScore + herdansScore), 0, 20);

  let structureScore = 0;

  if (paragraphCount > 1) {
    structureScore += Math.min(paragraphCount - 1, 4) * 2;
  }

  structureScore += Math.min(headingCount, 3) * 2;
  structureScore += Math.min(listItemCount, 5) * 0.5;

  if (sentenceCount >= 3) {
    if (sentenceBurstiness >= 0.3 && sentenceBurstiness <= 1.2) {
      structureScore += 2;
    }
  }

  structureScore = clamp(Math.round(structureScore), 0, 15);

  const stageScore = Math.min(timeStageHits, 5) * 2;
  let spanScore = 0;
  if (timeSpanYears > 0) {
    const capped = Math.min(timeSpanYears, 40);
    spanScore = (capped / 40) * 5;
  }
  let timeSpanScore = clamp(Math.round(stageScore + spanScore), 0, 15);

  const decisionScore = Math.min(decisionHits, 5) * 2;
  const connectorScore = Math.min(connectorHits, 8) * 0.6;

  let logicScore = decisionScore + connectorScore;
  if (decisionHits > 0 && connectorHits > 0) {
    logicScore += 1;
  }
  logicScore = clamp(Math.round(logicScore), 0, 15);

  let emotionScore = Math.min(emotionHits, 5) * 2;
  emotionScore = clamp(Math.round(emotionScore), 0, 10);

  const rawTotal =
    lengthScore + lexicalScore + structureScore + timeSpanScore + logicScore + emotionScore;

  let score = (rawTotal / 90) * 100;

  if (wordCount < 120) {
    score *= 0.6;
  } else if (wordCount < 250) {
    score *= 0.85;
  }

  score = clamp(Math.round(score), 0, 100);

  return {
    score,
    detail: {
      lengthScore,
      lexicalScore,
      structureScore,
      timeSpanScore,
      logicScore,
      emotionScore,
      raw,
    },
  };
}

export function calculateFireseedIndex(body: string): FireseedIndexResult {
  return computeFireseedIndex(body);
}

export function explainFireseedIndex(result: FireseedIndexResult): FireseedIndexExplanation {
  const { detail, score } = result;

  const breakdown = [
    {
      key: 'length',
      labelZh: '信息量',
      labelEn: 'Information density',
      score: detail.lengthScore,
      maxScore: 15,
    },
    {
      key: 'structure',
      labelZh: '段落结构',
      labelEn: 'Structure',
      score: detail.structureScore,
      maxScore: 15,
    },
    {
      key: 'timeline',
      labelZh: '时间线',
      labelEn: 'Timeline',
      score: detail.timeSpanScore,
      maxScore: 15,
    },
    {
      key: 'decision',
      labelZh: '决策痕迹',
      labelEn: 'Decision traces',
      score: detail.logicScore,
      maxScore: 15,
    },
    {
      key: 'lexical',
      labelZh: '词汇多样性',
      labelEn: 'Lexical richness',
      score: detail.lexicalScore,
      maxScore: 20,
    },
    {
      key: 'emotion',
      labelZh: '情绪温度',
      labelEn: 'Emotional resonance',
      score: detail.emotionScore,
      maxScore: 10,
    },
  ];

  const recommendationsZh: string[] = [];
  const recommendationsEn: string[] = [];

  if (detail.timeSpanScore < 8) {
    recommendationsZh.push('补充不同人生阶段的片段，比如童年、求学、工作、亲密关系或未来想象。');
    recommendationsEn.push('Add moments from different life stages—childhood, school, work, relationships, and future hopes.');
  }

  if (detail.logicScore < 8) {
    recommendationsZh.push('写清楚关键选择：当时有哪些选项？你做了什么决定？产生了什么影响？');
    recommendationsEn.push('Spell out the choices you faced, what you decided, and how those decisions changed the path.');
  }

  if (detail.structureScore < 8) {
    recommendationsZh.push('用小标题或分段组织，让每个片段聚焦一个主题或时间点。');
    recommendationsEn.push('Use headings or short paragraphs so each section focuses on one theme or moment.');
  }

  if (detail.lengthScore < 6) {
    recommendationsZh.push('再多写一些细节，例如人物、地点、对话或当时的感受。');
    recommendationsEn.push('Add more detail—people, places, snippets of dialogue, and what you felt in the moment.');
  }

  if (detail.emotionScore < 5) {
    recommendationsZh.push('加入当时真实的情绪波动：害怕、释然、愤怒或感激，让故事更有温度。');
    recommendationsEn.push('Include the real emotions you felt—fear, relief, anger, gratitude—to give the story warmth.');
  }

  if (detail.lexicalScore < 10) {
    recommendationsZh.push('尝试换一些描述词或比喻，避免重复，让语言更有层次。');
    recommendationsEn.push('Vary your wording with fresh descriptions or metaphors to avoid repetition.');
  }

  const summary =
    score >= 80
      ? '故事信息量丰富、结构完整，情绪与决策线索也较充分 / Strong content, solid structure, with emotions and decisions captured.'
      : score >= 60
        ? '基础信息和结构已具备，可再补充时间线细节、关键决策与情绪 / Good base; add more timeline details, key decisions, and emotions.'
        : '目前信息量和结构还较初步，可以从时间线、决策和情绪细节入手补充 / Early draft; enrich timeline, decisions, and emotional details.';

  return {
    summary,
    breakdown,
    recommendationsZh,
    recommendationsEn,
  };
}
