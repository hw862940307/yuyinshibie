import { AppSettings, CustomPromptConfig, FavoriteSentence, TrainingDailyLog } from '../types';

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  providers: {
    gemini: {
      model: 'gemini-3.7-flash',
    },
    deepseek: {
      apiKey: '',
      model: 'deepseek-chat',
    },
    openai: {
      apiKey: '',
      model: 'gpt-4o-mini',
    },
    ollama: {
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5:7b',
    },
    custom: {
      apiKey: '',
      baseUrl: '',
      customModel: '',
    },
  },
  speechLanguage: 'zh-CN',
  realtimeFeedbackIntervalWords: 40,
  enableLiveAudioEffects: true,
};

export const DEFAULT_CUSTOM_PROMPT: CustomPromptConfig = {
  goals: '',
  customRules: '',
  styleRef: '',
  customWords: '',
};

export const STORAGE_KEYS = {
  SETTINGS: 'expr_trainer_settings_v2',
  CUSTOM_PROMPT: 'expr_trainer_custom_prompt_v2',
  HISTORY: 'expr_trainer_history_v2',
  FAVORITES: 'expr_trainer_favorites_v1',
  DAILY_LOGS: 'expr_trainer_daily_logs_v1',
  METRICS_HISTORY: 'expr_trainer_metrics_history_v1',
};

export function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      providers: {
        ...DEFAULT_SETTINGS.providers,
        ...(parsed.providers || {}),
      },
    };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

export function loadStoredCustomPrompt(): CustomPromptConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_PROMPT);
    if (!raw) return DEFAULT_CUSTOM_PROMPT;
    return { ...DEFAULT_CUSTOM_PROMPT, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Failed to load custom prompt:', e);
    return DEFAULT_CUSTOM_PROMPT;
  }
}

export function saveStoredCustomPrompt(config: CustomPromptConfig): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_PROMPT, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save custom prompt:', e);
  }
}

export function loadStoredFavorites(): FavoriteSentence[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load favorites:', e);
    return [];
  }
}

export function saveStoredFavorites(favorites: FavoriteSentence[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
  } catch (e) {
    console.error('Failed to save favorites:', e);
  }
}

export function loadStoredDailyLogs(): Record<string, TrainingDailyLog> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DAILY_LOGS);
    if (!raw) {
      // Return initial today template
      const today = new Date().toISOString().slice(0, 10);
      return {
        [today]: {
          date: today,
          durationSeconds: 0,
          wordCount: 0,
          sessionsCount: 0,
        },
      };
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load daily logs:', e);
    return {};
  }
}

export function saveStoredDailyLogs(logs: Record<string, TrainingDailyLog>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(logs));
  } catch (e) {
    console.error('Failed to save daily logs:', e);
  }
}

export function loadHistoricalMetrics(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.METRICS_HISTORY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export function saveHistoricalMetrics(history: Record<string, number[]>): void {
  try {
    localStorage.setItem(STORAGE_KEYS.METRICS_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save metrics history:', e);
  }
}
