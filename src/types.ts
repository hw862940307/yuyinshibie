export interface SpeechLanguageOption {
  code: string;
  label: string;
  short: string;
}

export const SUPPORTED_LANGUAGES: SpeechLanguageOption[] = [
  { code: 'zh-CN', label: '普通话 (中国大陆) - zh-CN', short: '普通话' },
  { code: 'zh-SC', label: '四川话/重庆话 (西南官话) - zh-SC', short: '四川话' },
  { code: 'zh-TW', label: '繁体中文 (台湾) - zh-TW', short: '繁体' },
  { code: 'zh-HK', label: '粤语 (香港) - zh-HK', short: '粤语' },
  { code: 'en-US', label: 'English (US) - en-US', short: 'EN' },
];

export interface EmotionWordInfo {
  category: string;
  subcategory?: string;
  intensity: number;
  polarity: 'positive' | 'negative' | 'neutral';
}

export interface VagueWordMatch {
  word: string;
  position: number;
  alternatives: string[];
}

export interface WordMatch {
  word: string;
  position: number;
  category?: string;
  intensity?: number;
  polarity?: string;
}

export interface Suggestion {
  type: 'vague' | 'filler' | 'hedge';
  original?: string;
  alternatives?: string[];
  message: string;
}

export interface TextAnalysisResult {
  totalWords: number;
  fillers: WordMatch[];
  hedges: WordMatch[];
  vagueWords: VagueWordMatch[];
  emotionWords: WordMatch[];
  density: number; // 0 - 100 percentage
  suggestions: Suggestion[];
}

export interface TrainerStats {
  fillers: number;
  hedges: number;
  vagueWords: number;
  totalWords: number;
  duration: number; // seconds
}

export interface CustomPromptConfig {
  goals: string;
  customRules: string;
  styleRef: string;
  customWords: string;
}

export type LLMProvider = 'gemini' | 'deepseek' | 'openai' | 'ollama' | 'custom';

export interface ProviderSettings {
  apiKey?: string;
  model?: string;
  ollamaUrl?: string;
  baseUrl?: string;
  customModel?: string;
}

export interface AudioProcessingSettings {
  audioGain: number; // 0.5 - 3.5 (default 1.5)
  vadSensitivity: 'low' | 'normal' | 'high' | 'ultra'; // default 'normal'
  vadThreshold: number; // 3 - 35 (default 8)
  silenceHangoverMs: number; // 300 - 1500 (default 700)
  dialectAudioBoost: boolean; // Pre-processing frequency equalization boost for Sichuan/Chongqing and dialect phonemes
  dialectSemanticMatching?: boolean; // Gemini-based context-aware disambiguation for high-frequency dialect confusion words
  noiseSuppressionMode: 'standard' | 'high_noise' | 'speech_clarity';
  highPassFilterEnabled: boolean; // 85Hz highpass filter to cut out desk vibrations and AC rumbling
}

export interface ReferenceReadingItem {
  id: string;
  title: string;
  category: 'mandarin_standard' | 'sichuan_dialect' | 'business_pitch' | 'public_speaking' | 'emotional_resonance';
  categoryLabel: string;
  description: string;
  authorOrSource?: string;
  text: string;
  targetWpm: number;
  keyEmphases: string[];
  cadenceTips: string[];
  audioUrl?: string;
  isCustom?: boolean;
}

export interface AppSettings {
  provider: LLMProvider;
  providers: {
    gemini: ProviderSettings;
    deepseek: ProviderSettings;
    openai: ProviderSettings;
    ollama: ProviderSettings;
    custom: ProviderSettings;
  };
  speechLanguage: string;
  realtimeFeedbackIntervalWords: number;
  enableLiveAudioEffects: boolean;
  audioSettings?: AudioProcessingSettings;
}

export interface FeedbackItem {
  id: string;
  text: string;
  type: 'good' | 'filler' | 'hedge' | 'vague' | 'ai' | 'warning';
  timestamp: number;
}

export interface SubtitleSentence {
  id: string;
  text: string;
  isInterim?: boolean;
  timestamp: number;
  analysis?: TextAnalysisResult | null;
  score?: number;
}

export interface FavoriteSentence {
  id: string;
  text: string;
  timestamp: number;
  score?: number;
  tags?: string[];
  note?: string;
}

export interface TrainingDailyLog {
  date: string; // YYYY-MM-DD
  durationSeconds: number;
  wordCount: number;
  sessionsCount: number;
  fillersCount?: number;
}

export interface FluencyMetricPoint {
  time: string; // "00:10"
  second: number;
  wpm: number;
  fluencyScore: number; // 0 - 100
  logicDensity: number; // 0 - 100
  activeEnergy: number; // 0 - 100
  compareFluencyScore?: number;
  compareLogicDensity?: number;
}

export interface HistoricalSessionMetrics {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  durationSeconds: number;
  wordCount: number;
  avgFluency: number;
  avgDensity: number;
  metrics: FluencyMetricPoint[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'streak' | 'fluency' | 'volume' | 'quotes' | 'mastery';
  icon: string;
  color: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number; // 0 - 100
  targetValue: number;
  currentValue: number;
  unit: string;
}

export interface ModelFileInfo {
  name: string;
  size: string;
  exists: boolean;
  path: string;
}

export interface ModelItem {
  id: string;
  name: string;
  category: 'ASR' | 'LLM' | 'EMOTION';
  description: string;
  size: string;
  isDownloaded: boolean;
  files: ModelFileInfo[];
  downloadUrl: string;
  hfUrl?: string;
  folderPath: string;
  architecture?: string;
  commandSnippet?: string;
  compatibility?: {
    browserSupported: boolean;
    recommendedCpu: string;
    recommendedRam: string;
    onnxQuant: string;
    engine: string;
  };
  installedAt?: number;
  tags?: string[];
}

export interface ModelDownloadProgress {
  modelId: string;
  status: 'idle' | 'downloading' | 'extracting' | 'verifying' | 'completed' | 'error';
  progress: number; // 0 - 100
  downloadedBytes: number;
  totalBytes: number;
  speed: string;
  currentStep: string;
  error?: string;
}

