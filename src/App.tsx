import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Header } from './components/Header';
import { LeftPanel } from './components/LeftPanel';
import { SubtitleStream } from './components/SubtitleStream';
import { RightPanel } from './components/RightPanel';
import { WordPopup } from './components/WordPopup';
import { TrainingCalendar } from './components/TrainingCalendar';
import { ReportModal } from './components/Modals/ReportModal';
import { PromptEditorModal } from './components/Modals/PromptEditorModal';
import { LexiconModal } from './components/Modals/LexiconModal';
import { SettingsModal } from './components/Modals/SettingsModal';
import { PasteModal } from './components/Modals/PasteModal';
import { FavoritesModal } from './components/Modals/FavoritesModal';
import { AchievementsModal } from './components/Modals/AchievementsModal';
import { ModelDownloadModal } from './components/Modals/ModelDownloadModal';
import { StandardReferencePlayer } from './components/StandardReferencePlayer';
import { calculateAchievements } from './utils/achievements';

import {
  AppSettings,
  CustomPromptConfig,
  FeedbackItem,
  SubtitleSentence,
  TrainerStats,
  Suggestion,
  FavoriteSentence,
  TrainingDailyLog,
  FluencyMetricPoint,
  SUPPORTED_LANGUAGES,
} from './types';
import { analyzeText } from './lib/lexicon';
import {
  loadStoredSettings,
  saveStoredSettings,
  loadStoredCustomPrompt,
  saveStoredCustomPrompt,
  loadStoredFavorites,
  saveStoredFavorites,
  loadStoredDailyLogs,
  saveStoredDailyLogs,
} from './utils/storage';
import { speechManager } from './utils/speech';

// Helper to extract instant fine-grained feedback items matching image.png and exprtrain.online
function extractInstantFeedbacks(text: string, customWords = ''): FeedbackItem[] {
  const analysis = analyzeText(text, customWords);
  if (!analysis) return [];

  const items: FeedbackItem[] = [];

  // 1. Fillers (e.g. 填充词: 嗯——试试停顿, 填充词: 这个——试试停顿, 填充词: 就是——试试停顿)
  if (analysis.fillers && analysis.fillers.length > 0) {
    const seenFillers = new Set<string>();
    analysis.fillers.forEach((f) => {
      if (!seenFillers.has(f.word)) {
        seenFillers.add(f.word);
        items.push({
          id: 'fb-f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          text: `填充词: ${f.word}——试试停顿`,
          type: 'filler',
          timestamp: Date.now(),
        });
      }
    });
  }

  // 2. Hedges (e.g. 「我觉得」→ 直接说, 「觉得」→ 认为 / 判断 / 确信)
  if (text.includes('我觉得')) {
    items.push({
      id: 'fb-h-wjd-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      text: '「我觉得」→ 直接说',
      type: 'hedge',
      timestamp: Date.now(),
    });
  }
  if (analysis.hedges && analysis.hedges.length > 0) {
    const seenHedges = new Set<string>();
    analysis.hedges.forEach((h) => {
      if (h.word === '我觉得') return;
      if (!seenHedges.has(h.word)) {
        seenHedges.add(h.word);
        if (h.word === '觉得') {
          items.push({
            id: 'fb-h-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            text: '「觉得」→ 认为 / 判断 / 确信',
            type: 'hedge',
            timestamp: Date.now(),
          });
        } else if (h.word === '应该') {
          items.push({
            id: 'fb-h-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            text: '「应该」→ 评估 / 确信 / 务必',
            type: 'hedge',
            timestamp: Date.now(),
          });
        } else if (h.word === '可能') {
          items.push({
            id: 'fb-h-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            text: '「可能」→ 预计 / 推测 / 确认',
            type: 'hedge',
            timestamp: Date.now(),
          });
        } else {
          items.push({
            id: 'fb-h-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            text: `「${h.word}」→ 尝试用确信动词陈述`,
            type: 'hedge',
            timestamp: Date.now(),
          });
        }
      }
    });
  }

  // 3. Vague words (e.g. 「说」→ 表达 / 阐述 / 强调, 「做」→ 执行 / 落实 / 推进)
  if (analysis.vagueWords && analysis.vagueWords.length > 0) {
    const seenVague = new Set<string>();
    analysis.vagueWords.forEach((vw) => {
      if (!seenVague.has(vw.word)) {
        seenVague.add(vw.word);
        const alts = vw.alternatives && vw.alternatives.length > 0
          ? vw.alternatives.slice(0, 3).join(' / ')
          : '表达 / 阐述 / 强调';
        items.push({
          id: 'fb-v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          text: `「${vw.word}」→ ${alts}`,
          type: 'vague',
          timestamp: Date.now(),
        });
      }
    });
  }

  return items;
}

export function App() {
  // Global Settings & Prompts
  const [settings, setSettings] = useState<AppSettings>(loadStoredSettings);
  const [customPrompt, setCustomPrompt] = useState<CustomPromptConfig>(loadStoredCustomPrompt);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteSentence[]>(loadStoredFavorites);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);

  // Daily training logs for Calendar & Heatmap
  const [dailyLogs, setDailyLogs] = useState<Record<string, TrainingDailyLog>>(loadStoredDailyLogs);
  const [isCalendarOpen, setIsCalendarOpen] = useState(true);

  // Real-time Fluency & Logic Density data points for Recharts
  const [fluencyData, setFluencyData] = useState<FluencyMetricPoint[]>([
    { time: '00:00', second: 0, wpm: 0, fluencyScore: 100, logicDensity: 100, activeEnergy: 0 },
  ]);

  // Recording & Session State
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0);

  // Subtitles & Analysis State
  const [sentences, setSentences] = useState<SubtitleSentence[]>([]);
  const [interimText, setInterimText] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Feedbacks matching real-time coach panel
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(false);

  // Cumulative Stats
  const [stats, setStats] = useState<TrainerStats>({
    fillers: 0,
    hedges: 0,
    vagueWords: 0,
    totalWords: 0,
    duration: 0,
  });

  // Calculate achievements dynamically
  const currentFluency = fluencyData[fluencyData.length - 1]?.fluencyScore ?? 85;
  const currentDensity = fluencyData[fluencyData.length - 1]?.logicDensity ?? 70;
  const achievements = React.useMemo(
    () => calculateAchievements(dailyLogs, favorites, stats, currentFluency, currentDensity),
    [dailyLogs, favorites, stats, currentFluency, currentDensity]
  );
  const unlockedAchievementsCount = achievements.filter((a) => a.unlocked).length;


  // Modals
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [isLexiconOpen, setIsLexiconOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModelDownloadOpen, setIsModelDownloadOpen] = useState(false);
  const [isStandardRefOpen, setIsStandardRefOpen] = useState(false);
  const [isPasteOpen, setIsPasteOpen] = useState(false);
  const [popupWord, setPopupWord] = useState<string | null>(null);

  // Sync Audio DSP and VAD settings on startup
  useEffect(() => {
    if (settings.audioSettings) {
      speechManager.updateAudioSettings(settings.audioSettings);
    }
  }, [settings.audioSettings]);

  // Report generation state
  const [reportMarkdown, setReportMarkdown] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Speech engine health & stall anomaly detection
  const [speechAnomalyWarning, setSpeechAnomalyWarning] = useState<string | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const lastSoundTimeRef = useRef<number>(0);
  const anomalyCheckIntervalRef = useRef<any>(null);
  const isRecordingRef = useRef(false);
  isRecordingRef.current = isRecording;
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  // Ref tracking for realtime feedback interval
  const lastFeedbackWordsRef = useRef<number>(0);
  const fullTextRef = useRef<string>('');
  const isRequestingFeedbackRef = useRef<boolean>(false);
  const audioIntervalRef = useRef<any>(null);
  const timerIntervalRef = useRef<any>(null);
  const lastFluencyTickRef = useRef<number>(0);

  // Sync settings/prompt changes to local storage
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveStoredSettings(newSettings);
    speechManager.setLanguage(newSettings.speechLanguage);
    if (newSettings.audioSettings) {
      speechManager.updateAudioSettings(newSettings.audioSettings);
    }
  };

  const handleSaveCustomPrompt = (newPrompt: CustomPromptConfig) => {
    setCustomPrompt(newPrompt);
    saveStoredCustomPrompt(newPrompt);
  };

  // Sync favorites
  const handleToggleFavorite = (sentence: SubtitleSentence) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === sentence.id);
      let updated: FavoriteSentence[];
      if (exists) {
        updated = prev.filter((f) => f.id !== sentence.id);
      } else {
        // Calculate a smart score for the quote
        const wordCount = sentence.text.length;
        const baseScore = 90 + Math.min(8, Math.floor(wordCount / 5));
        const newFav: FavoriteSentence = {
          id: sentence.id,
          text: sentence.text,
          timestamp: sentence.timestamp || Date.now(),
          score: baseScore,
        };
        updated = [newFav, ...prev];
      }
      saveStoredFavorites(updated);
      return updated;
    });
  };

  const handleRemoveFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      saveStoredFavorites(updated);
      return updated;
    });
  };

  const handleClearFavorites = () => {
    if (window.confirm('确定要清空所有收藏的金句吗？')) {
      setFavorites([]);
      saveStoredFavorites([]);
    }
  };

  // Record daily session to calendar logs
  const logSessionActivity = useCallback((addedSeconds: number, currentTotalWords: number) => {
    const today = new Date().toISOString().slice(0, 10);
    setDailyLogs((prev) => {
      const existing = prev[today] || {
        date: today,
        durationSeconds: 0,
        wordCount: 0,
        sessionsCount: 0,
      };

      const updated = {
        ...prev,
        [today]: {
          ...existing,
          durationSeconds: existing.durationSeconds + addedSeconds,
          wordCount: Math.max(existing.wordCount, currentTotalWords),
          sessionsCount: existing.sessionsCount + (addedSeconds > 5 ? 1 : 0),
        },
      };
      saveStoredDailyLogs(updated);
      return updated;
    });
  }, []);

  // Generate sample history for testing the heatmap
  const handleAddSampleHistory = () => {
    const today = new Date();
    const mockLogs: Record<string, TrainingDailyLog> = { ...dailyLogs };

    for (let i = 0; i < 45; i++) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);

      // Skip a few random days to make it look realistic
      if (i % 5 === 0) continue;

      const durationSec = Math.floor(Math.random() * 1200) + 180; // 3 - 23 minutes
      const wordCount = Math.floor(durationSec * (Math.random() * 2 + 2)); // 300 - 3000 words

      mockLogs[dateStr] = {
        date: dateStr,
        durationSeconds: durationSec,
        wordCount: wordCount,
        sessionsCount: Math.floor(Math.random() * 3) + 1,
      };
    }

    setDailyLogs(mockLogs);
    saveStoredDailyLogs(mockLogs);
  };

  // Format timer (MM:SS)
  const formatTimer = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Full transcript text calculation
  const getFullText = useCallback(() => {
    return sentences.map((s) => s.text).join(' ') + (interimText ? ' ' + interimText : '');
  }, [sentences, interimText]);

  // Keep sentences ref fresh for speech callbacks
  const sentencesRef = useRef(sentences);
  sentencesRef.current = sentences;

  // Recalculate stats & suggestions whenever sentences or interim changes
  const updateAnalysisAndStats = useCallback(
    (allText: string) => {
      fullTextRef.current = allText;
      const res = analyzeText(allText, customPrompt.customWords);
      if (!res) {
        setStats((prev) => ({ ...prev, duration }));
        setSuggestions([]);
        return;
      }

      setStats({
        fillers: res.fillers.length,
        hedges: res.hedges.length,
        vagueWords: res.vagueWords.length,
        totalWords: res.totalWords,
        duration,
      });

      setSuggestions(res.suggestions);
    },
    [customPrompt.customWords, duration]
  );

  // Request Real-time AI Feedback
  const triggerRealtimeFeedback = useCallback(
    async (textChunk: string) => {
      if (isRequestingFeedbackRef.current || !textChunk.trim()) return;
      isRequestingFeedbackRef.current = true;
      setIsLoadingFeedback(true);

      try {
        const fullText = fullTextRef.current;
        const elapsedMin = Math.floor(duration / 60);

        const res = await fetch('/api/realtime-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: textChunk,
            context: {
              elapsedMin,
              topic: sentencesRef.current[0]?.text?.slice(0, 30) || '',
            },
            settings,
            customPrompt,
          }),
        });

        const data = await res.json();
        if (data.success && data.feedback && data.feedback.trim()) {
          const fbText = data.feedback.trim();
          let type: FeedbackItem['type'] = 'ai';

          if (fbText.includes('好') || fbText.includes('✓') || fbText.includes('⭐') || fbText.includes('金句')) {
            type = 'good';
          } else if (
            fbText.includes('结论') ||
            fbText.includes('跑题') ||
            fbText.includes('矛盾') ||
            fbText.includes('停顿') ||
            fbText.includes('重复') ||
            fbText.includes('抽象') ||
            fbText.includes('例子')
          ) {
            type = 'warning';
          } else if (fbText.includes('然后') || fbText.includes('口癖') || fbText.includes('填充')) {
            type = 'filler';
          } else if (fbText.includes('觉得') || fbText.includes('犹豫')) {
            type = 'hedge';
          }

          setFeedbacks((prev) => [
            {
              id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
              text: fbText,
              type,
              timestamp: Date.now(),
            },
            ...prev.slice(0, 30),
          ]);
        }
      } catch (err) {
        console.warn('Realtime feedback fetch failed:', err);
      } finally {
        isRequestingFeedbackRef.current = false;
        setIsLoadingFeedback(false);
      }
    },
    [duration, settings, customPrompt]
  );

  // Check if we should trigger realtime feedback based on word thresholds
  const checkFeedbackTrigger = useCallback(
    (currentTotalWords: number) => {
      const interval = settings.realtimeFeedbackIntervalWords || 40;
      if (currentTotalWords - lastFeedbackWordsRef.current >= interval) {
        lastFeedbackWordsRef.current = currentTotalWords;
        const currentText = fullTextRef.current;
        triggerRealtimeFeedback(currentText.slice(-200));
      }
    },
    [settings.realtimeFeedbackIntervalWords, triggerRealtimeFeedback]
  );

  // Speech Engine Recovery
  const handleRecoverSpeech = useCallback(() => {
    speechManager.restartRecognition();
    lastSpeechTimeRef.current = Date.now();
    setSpeechAnomalyWarning(null);
  }, []);

  // Handle Speech Finalized sentence
  const handleFinalSpeechResult = useCallback(
    (text: string) => {
      if (!text.trim()) return;

      lastSpeechTimeRef.current = Date.now();
      setSpeechAnomalyWarning(null);

      const sentenceAnalysis = analyzeText(text, customPrompt.customWords);
      const newSentence: SubtitleSentence = {
        id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
        text,
        timestamp: Date.now(),
        analysis: sentenceAnalysis,
      };

      setSentences((prev) => {
        const next = [...prev, newSentence];
        const full = next.map((s) => s.text).join(' ');
        updateAnalysisAndStats(full);
        const totalWords = full.length;
        checkFeedbackTrigger(totalWords);
        return next;
      });

      // Extract and prepend instant feedback suggestions for the finalized sentence
      const instantItems = extractInstantFeedbacks(text, customPrompt.customWords);
      if (instantItems.length > 0) {
        setFeedbacks((prev) => {
          const newOnes = instantItems.filter((item) => !prev.slice(0, 5).some((p) => p.text === item.text));
          return [...newOnes, ...prev].slice(0, 30);
        });
      }

      setInterimText('');
    },
    [customPrompt.customWords, updateAnalysisAndStats, checkFeedbackTrigger]
  );

  // Handle Interim Speech Result with zero-delay dispatch and instant problem detection
  const handleInterimSpeechResult = useCallback(
    (text: string) => {
      lastSpeechTimeRef.current = Date.now();
      setSpeechAnomalyWarning(null);
      // Zero-delay immediate state update for streaming subtitle
      setInterimText(text);

      const full = sentencesRef.current.map((s) => s.text).join(' ') + ' ' + text;
      updateAnalysisAndStats(full);

      // Realtime generate feedbacks if interim text contains key phrases
      if (text.trim().length >= 2) {
        const instantItems = extractInstantFeedbacks(text, customPrompt.customWords);
        if (instantItems.length > 0) {
          setFeedbacks((prev) => {
            const newOnes = instantItems.filter((item) => !prev.slice(0, 5).some((p) => p.text === item.text));
            if (newOnes.length === 0) return prev;
            return [...newOnes, ...prev].slice(0, 30);
          });
        }
      }
    },
    [updateAnalysisAndStats, customPrompt.customWords]
  );

  // Attach speech listeners dynamically
  useEffect(() => {
    speechManager.setOnResult((data) => {
      if (data.isFinal) {
        handleFinalSpeechResult(data.text);
      } else {
        handleInterimSpeechResult(data.text);
      }
    });
  }, [handleFinalSpeechResult, handleInterimSpeechResult]);

  // Start Recording
  const handleStartRecording = async () => {
    setIsPaused(false);
    speechManager.setLanguage(settings.speechLanguage);
    lastSpeechTimeRef.current = Date.now();
    lastSoundTimeRef.current = 0;
    setSpeechAnomalyWarning(null);

    const started = await speechManager.start(
      (data) => {
        if (data.isFinal) {
          handleFinalSpeechResult(data.text);
        } else {
          handleInterimSpeechResult(data.text);
        }
      },
      (listening, error) => {
        if (error) {
          alert(error);
        }
        setIsRecording(listening);
      }
    );

    if (started) {
      setIsRecording(true);

      // Start High-Frequency Audio Volume poll (50ms) tightly bound to speechManager & waveform
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = setInterval(() => {
        const vol = speechManager.getAudioVolume();
        setAudioVolume(vol);
        if (vol > 15) {
          lastSoundTimeRef.current = Date.now();
        }
      }, 50);

      // Start Speech Engine Status & Stall Anomaly Check
      if (anomalyCheckIntervalRef.current) clearInterval(anomalyCheckIntervalRef.current);
      anomalyCheckIntervalRef.current = setInterval(() => {
        if (!isRecordingRef.current || isPausedRef.current) {
          setSpeechAnomalyWarning(null);
          return;
        }

        const now = Date.now();
        const userSpokeRecently = now - lastSoundTimeRef.current < 2500;
        const noSpeechEngineData = now - lastSpeechTimeRef.current > 4500;
        const engineDead = !speechManager.isEngineActive() && speechManager.hasAudioInput();

        if ((userSpokeRecently && noSpeechEngineData) || engineDead) {
          setSpeechAnomalyWarning('检测到异常停顿，请检查麦克风输入');
        } else if (now - lastSpeechTimeRef.current < 2500) {
          setSpeechAnomalyWarning(null);
        }
      }, 1000);

      // Start Session Timer
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setDuration((prev) => {
          const next = prev + 1;
          setStats((s) => ({ ...s, duration: next }));

          // Update daily log activity every 5 seconds
          if (next % 5 === 0) {
            logSessionActivity(5, fullTextRef.current.length);
          }

          // Sample real-time Fluency metric point every 3 seconds
          if (next - lastFluencyTickRef.current >= 3) {
            lastFluencyTickRef.current = next;
            const mins = Math.floor(next / 60);
            const secs = next % 60;
            const timeLabel = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            // Calculate live WPM
            const totalChars = fullTextRef.current.length;
            const currentWpm = next > 0 ? Math.round((totalChars / next) * 60) : 0;

            // Score based on fillers penalty and speaking pace
            const fillerCount = analyzeText(fullTextRef.current, '').fillers.length;
            const baseFluency = Math.max(55, Math.min(99, 95 - fillerCount * 3 + (currentWpm > 120 && currentWpm < 260 ? 4 : -2)));
            const logicDensity = Math.max(45, Math.min(98, 70 + Math.min(25, Math.floor(totalChars / 40))));
            const activeEnergy = Math.max(20, Math.min(100, Math.round(speechManager.getAudioVolume() * 1.5) || 45));

            setFluencyData((prevData) => {
              const nextPoints = [
                ...prevData,
                {
                  time: timeLabel,
                  second: next,
                  wpm: currentWpm,
                  fluencyScore: baseFluency,
                  logicDensity,
                  activeEnergy,
                },
              ];
              return nextPoints.slice(-25); // keep latest 25 points
            });
          }

          return next;
        });
      }, 1000);
    }
  };

  // Pause Recording
  const handlePauseRecording = () => {
    speechManager.stop();
    setIsPaused(true);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (anomalyCheckIntervalRef.current) clearInterval(anomalyCheckIntervalRef.current);
    setSpeechAnomalyWarning(null);
  };

  // Resume Recording
  const handleResumeRecording = () => {
    handleStartRecording();
  };

  // Stop Recording and optionally trigger final review modal
  const handleStopRecording = useCallback((openReview: boolean = false) => {
    speechManager.stop();
    setIsRecording(false);
    setIsPaused(false);
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    if (anomalyCheckIntervalRef.current) clearInterval(anomalyCheckIntervalRef.current);
    setSpeechAnomalyWarning(null);
    setAudioVolume(0);

    // If there is lingering interim text, finalize it
    if (interimText.trim()) {
      handleFinalSpeechResult(interimText);
    }

    // Save final session record to calendar logs
    logSessionActivity(duration % 5, fullTextRef.current.length);

    if (openReview) {
      setTimeout(() => {
        handleGenerateReport();
      }, 100);
    }
  }, [duration, interimText, handleFinalSpeechResult, logSessionActivity]);

  // Global Keyboard Shortcuts (Space: Start/Pause/Resume, Esc: Stop & Open Review Modal)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcut if user is currently typing in an input, textarea or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable ||
          target.closest('input') ||
          target.closest('textarea'))
      ) {
        return;
      }

      // Space: toggle recording or pause/resume
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isRecording) {
          handleStartRecording();
        } else if (isPaused) {
          handleResumeRecording();
        } else {
          handlePauseRecording();
        }
      }

      // Esc: stop current training and pop up review modal
      if (e.code === 'Escape') {
        if (isRecording || isPaused) {
          e.preventDefault();
          handleStopRecording(true);
        } else if (!isReportOpen && (sentences.length > 0 || interimText.trim())) {
          e.preventDefault();
          handleGenerateReport();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isRecording,
    isPaused,
    isReportOpen,
    sentences,
    interimText,
    handleStartRecording,
    handlePauseRecording,
    handleResumeRecording,
    handleStopRecording,
  ]);

  // Insert Sample text directly or from Paste
  const handleInsertText = (rawText: string) => {
    if (!rawText.trim()) return;

    // Split by punctuation sentences
    const rawSentences = rawText
      .split(/(?<=[。！？\n!?])/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newItems: SubtitleSentence[] = rawSentences.map((text) => ({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      text,
      timestamp: Date.now(),
      analysis: analyzeText(text, customPrompt.customWords),
    }));

    setSentences(newItems);
    setInterimText('');
    const full = newItems.map((s) => s.text).join(' ');
    updateAnalysisAndStats(full);

    // Trigger initial coach feedback for the sample
    triggerRealtimeFeedback(full.slice(-300));
  };

  // Copy Full Text
  const handleCopyText = () => {
    const full = getFullText();
    navigator.clipboard.writeText(full).then(() => {
      alert('已将完整原文复制到剪贴板！');
    });
  };

  // Save Text as Markdown
  const handleSaveText = () => {
    const full = getFullText();
    const blob = new Blob([full], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `表达训练原文-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clear Session
  const handleClear = () => {
    if (window.confirm('确定要清空当前所有录音内容与统计记录吗？')) {
      handleStopRecording();
      setSentences([]);
      setInterimText('');
      setFeedbacks([]);
      setSuggestions([]);
      setDuration(0);
      lastFeedbackWordsRef.current = 0;
      setStats({
        fillers: 0,
        hedges: 0,
        vagueWords: 0,
        totalWords: 0,
        duration: 0,
      });
    }
  };

  // Generate Deep Final Report
  const handleGenerateReport = async () => {
    const full = getFullText();
    if (!full.trim()) {
      alert('暂无内容，请先说话或粘贴逐字稿后再生成报告。');
      return;
    }

    setIsReportOpen(true);
    setIsGeneratingReport(true);
    setReportError(null);
    setReportMarkdown('');

    try {
      const res = await fetch('/api/final-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullText: full,
          stats: { ...stats, duration },
          settings,
          customPrompt,
        }),
      });

      const data = await res.json();
      if (data.success && data.report) {
        setReportMarkdown(data.report);
      } else {
        setReportError(data.error || '生成报告时发生未知错误');
      }
    } catch (err: any) {
      setReportError(err.message || '请求服务器生成报告失败，请检查网络连接');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      speechManager.stop();
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  // Clear session state
  const handleClearSession = () => {
    speechManager.clearSession();
    setSentences([]);
    setInterimText('');
    setStats({ fillers: 0, hedges: 0, vagueWords: 0, totalWords: 0, duration: 0 });
    setDuration(0);
    setFeedbacks([]);
    setSuggestions([]);
    setFluencyData([{ time: '00:00', second: 0, wpm: 0, fluencyScore: 100, logicDensity: 100, activeEnergy: 0 }]);
    fullTextRef.current = '';
    lastFeedbackWordsRef.current = 0;
  };

  // Load sample demo phrases
  const handleLoadSampleDemo = () => {
    const sampleTexts = [
      '嗯，你好，今天天气怎么样？',
      '我觉得今天的时间是过得非常得快。',
      '对于今天的任务，我觉得你安排得非常合理，但是呢，我觉得你安排得不是非常不到位。',
      '对觉得今天应该怎么。',
      '我觉得今天非常的好只不过我觉得你说的问题非常的大。',
      '对，我觉得你今天的问题出在。',
      '其实我不太会讲话，我也不知道怎么去形容这个事情怎么去做。',
      '对这个事情是非常大。',
      '嗯。',
      '今天的天气确实不错。',
      '像这个药呢，它适用于就是比如说你的皮肤有接触性的一些皮炎呢？神经性的皮炎。',
      '以及说湿疹铁血病扁平贫血单纯的一些品种。',
      '单纯的一些。'
    ];
    const newSentences = sampleTexts.map((txt, index) => ({
      id: `s-${index + 1}`,
      text: txt,
      timestamp: Date.now() - (sampleTexts.length - index) * 6000,
      analysis: analyzeText(txt, customPrompt.customWords),
    }));
    setSentences(newSentences);
    const full = sampleTexts.join(' ');
    updateAnalysisAndStats(full);
    setDuration(140);
    setFeedbacks([
      { id: 'fb-1', text: '「说」→ 表达 / 阐述 / 强调', type: 'vague', timestamp: Date.now() - 5000 },
      { id: 'fb-2', text: '填充词: 嗯——试试停顿', type: 'filler', timestamp: Date.now() - 12000 },
      { id: 'fb-3', text: '填充词: 这个——试试停顿', type: 'filler', timestamp: Date.now() - 25000 },
      { id: 'fb-4', text: '「做」→ 执行 / 落实 / 推进', type: 'vague', timestamp: Date.now() - 35000 },
      { id: 'fb-5', text: '「说」→ 表达 / 阐述 / 强调', type: 'vague', timestamp: Date.now() - 48000 },
      { id: 'fb-6', text: '「觉得」→ 认为 / 判断 / 确信', type: 'hedge', timestamp: Date.now() - 60000 },
      { id: 'fb-7', text: '「我觉得」→ 直接说', type: 'hedge', timestamp: Date.now() - 75000 },
    ]);
  };

  // Precompute set of favorite sentence IDs
  const favoriteIds = new Set(favorites.map((f) => f.id));

  const handleSelectLanguage = (code: string) => {
    handleSaveSettings({ ...settings, speechLanguage: code });
  };

  const toggleLanguage = () => {
    const currentIndex = SUPPORTED_LANGUAGES.findIndex((l) => l.code === settings.speechLanguage);
    const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
    handleSelectLanguage(SUPPORTED_LANGUAGES[nextIndex].code);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#050507] text-zinc-100 overflow-hidden font-sans select-none antialiased">
      {/* Topbar Header matching image.png & Image 2 */}
      <Header
        timer={formatTimer(duration)}
        lang={settings.speechLanguage}
        currentLanguageCode={settings.speechLanguage}
        onSelectLanguage={handleSelectLanguage}
        onToggleLang={toggleLanguage}
        isRecording={isRecording}
        audioVolume={audioVolume}
        favoritesCount={favorites.length}
        unlockedAchievementsCount={unlockedAchievementsCount}
        totalAchievementsCount={achievements.length}
        onOpenAchievements={() => setIsAchievementsOpen(true)}
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        onToggleCalendar={() => setIsCalendarOpen((v) => !v)}
        onOpenPromptEditor={() => setIsPromptOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenModelDownload={() => setIsModelDownloadOpen(true)}
        onOpenStandardReference={() => setIsStandardRefOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex min-h-0 overflow-hidden">
          {/* Left Panel: Analytics & Lexicon Suggestions matching image.png */}
          <LeftPanel
            stats={stats}
            suggestions={suggestions}
            onWordClick={(word) => setPopupWord(word)}
            onOpenInfo={() => setIsReportOpen(true)}
            onToggleLexiconModal={() => setIsLexiconOpen(true)}
          />

          {/* Central Subtitles Stream with Glowing Neon Border & Capsule Record Button */}
          <div className="flex-1 flex flex-col min-w-0 relative">
            {speechAnomalyWarning && isRecording && !isPaused && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 px-4 py-2 rounded-xl bg-amber-950/90 border border-amber-500/80 text-amber-200 text-xs shadow-[0_0_25px_rgba(245,158,11,0.35)] backdrop-blur-md animate-pulse">
                <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                <span className="font-medium tracking-wide">{speechAnomalyWarning}</span>
                <button
                  onClick={handleRecoverSpeech}
                  className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-[11px] transition-colors cursor-pointer"
                >
                  <RefreshCw size={11} />
                  <span>恢复麦克风</span>
                </button>
              </div>
            )}
            <SubtitleStream
              sentences={sentences}
              currentInterim={interimText}
              isRecording={isRecording}
              isPaused={isPaused}
              audioVolume={audioVolume}
              onToggleRecording={isRecording ? () => handleStopRecording(false) : handleStartRecording}
              onPauseRecording={handlePauseRecording}
              onResumeRecording={handleResumeRecording}
              onOpenPasteModal={() => setIsPasteOpen(true)}
              onWordClick={(word) => setPopupWord(word)}
              onToggleFavorite={handleToggleFavorite}
              favorites={favorites}
              onOpenFavorites={() => setIsFavoritesOpen(true)}
              onSimulateSample={handleInsertText}
              onLoadSampleDemo={handleLoadSampleDemo}
              onClearSession={handleClearSession}
              onManualSpeechSubmit={handleFinalSpeechResult}
              onManualInterimChange={handleInterimSpeechResult}
            />
          </div>

          {/* Right Panel: AI Live Coach Feedback with Realtime Fluency Chart & Comparison Mode */}
          <RightPanel
            feedbacks={feedbacks}
            provider={settings.provider}
            onSelectFeedback={() => setIsReportOpen(true)}
            fluencyData={fluencyData}
            stats={stats}
            isRecording={isRecording}
            dailyLogs={dailyLogs}
          />
        </div>

        {/* Bottom Local Storage-driven Training Calendar with Activity Heatmap & Achievements */}
        <TrainingCalendar
          logs={dailyLogs}
          onAddSampleHistory={handleAddSampleHistory}
          isOpen={isCalendarOpen}
          onToggle={() => setIsCalendarOpen((v) => !v)}
          unlockedAchievementsCount={unlockedAchievementsCount}
          totalAchievementsCount={achievements.length}
          onOpenAchievements={() => setIsAchievementsOpen(true)}
        />
      </div>

      {/* Interactive Word Precision Popup */}
      <WordPopup
        word={popupWord}
        onClose={() => setPopupWord(null)}
      />

      {/* Golden Quotes / Favorites Modal */}
      <FavoritesModal
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={favorites}
        onRemoveFavorite={handleRemoveFavorite}
        onClearFavorites={handleClearFavorites}
      />

      {/* Achievement Badges Hall of Fame Modal */}
      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        achievements={achievements}
      />

      {/* Modals */}
      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        reportMarkdown={reportMarkdown}
        isLoading={isGeneratingReport}
        error={reportError}
        fullText={getFullText()}
        stats={{ ...stats, duration }}
      />

      <PromptEditorModal
        isOpen={isPromptOpen}
        onClose={() => setIsPromptOpen(false)}
        config={customPrompt}
        onSave={handleSaveCustomPrompt}
      />

      <LexiconModal
        isOpen={isLexiconOpen}
        onClose={() => setIsLexiconOpen(false)}
        onSelectWord={(word) => setPopupWord(word)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        onOpenModelDownload={() => setIsModelDownloadOpen(true)}
      />

      <ModelDownloadModal
        isOpen={isModelDownloadOpen}
        onClose={() => setIsModelDownloadOpen(false)}
      />

      <PasteModal
        isOpen={isPasteOpen}
        onClose={() => setIsPasteOpen(false)}
        onSubmitText={handleInsertText}
      />

      {/* Standard Reference Audio & Waveform/Pitch Comparison Modal */}
      {isStandardRefOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <StandardReferencePlayer
              userAudioUrl={speechManager.getLastAudioUrl()}
              userTranscript={getFullText()}
              isRecording={isRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={() => handleStopRecording(false)}
              onClose={() => setIsStandardRefOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
