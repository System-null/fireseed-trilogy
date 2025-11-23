import type { Scenario } from '@/lib/capsule/oneClick';

export interface FireseedIndexLike {
  index?: number;
  discoveryProbability?: string;
  diagnostics?: Record<string, string | number>;
}

export interface CapsuleExplainStep {
  key: string;
  label: string;
  detail: string;
}

export interface OneClickApiResponse {
  ok?: boolean;
  capsuleId?: string;
  fireseedIndex?: { score: number; detail: Record<string, any> };
  fireseedIndexDetail?: Record<string, any> | null;
  downloadPath?: string | null;
  zipBase64?: string | null;
  capsuleMeta?: Record<string, any>;
  error?: string;
  capsule: {
    id?: string;
    meta?: {
      title?: string;
      audience?: string;
      scenario?: Scenario;
      language?: 'zh' | 'en';
      fireseedIndex?: number;
      fireseedIndexScore?: number;
      aiAssist?: boolean;
      includeTechCapsule?: boolean;
      wordCount?: number;
      createdAt?: string;
      capsuleId?: string;
      primaryLanguage?: string;
    };
    createdAt?: string;
    content?: {
      raw?: string;
      keyMoments?: string;
      nonNegotiables?: string;
      messageToFuture?: string;
      outline?: string[];
      primaryLanguage?: string;
    };
  };
  indexResult?: FireseedIndexLike;
  explain?: {
    summary?: string;
    steps?: CapsuleExplainStep[];
    recommendedActions?: string[];
    aiAssist?: boolean;
  };
  meta?: Record<string, any>;
  humanReadable?: string;
  readmeText?: string;
}
