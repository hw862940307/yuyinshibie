import React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  Mic,
  Play,
  Pause,
  Upload,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sliders,
  ChevronRight,
  RotateCcw,
  BookOpen,
  ArrowRightLeft,
  X,
  Repeat,
  Share2,
  Flag,
  Scissors,
} from 'lucide-react';
import { ReferenceReadingItem } from '../types';
import { BUILTIN_REFERENCE_READINGS } from '../data/referenceReadings';
import { speechManager, ExtractedAudioMetrics } from '../utils/speech';
import { ReviewPosterModal } from './ReviewPosterModal';

interface StandardReferencePlayerProps {
  userAudioBlob?: Blob | null;
  userAudioUrl?: string | null;
  userTranscript?: string;
  isRecording: boolean;
  onStartRecording?: () => void;
  onStopRecording?: () => void;
  onClose?: () => void;
}

export const StandardReferencePlayer: React.FC<StandardReferencePlayerProps> = ({
  userAudioBlob,
  userAudioUrl,
  userTranscript,
  isRecording,
  onStartRecording,
  onStopRecording,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(BUILTIN_REFERENCE_READINGS[0].id);
  const [customReadings, setCustomReadings] = useState<ReferenceReadingItem[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const [customAudioFile, setCustomAudioFile] = useState<File | null>(null);

  // Playback states
  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const [referenceProgress, setReferenceProgress] = useState(0); // 0 - 100
  const [userProgress, setUserProgress] = useState(0); // 0 - 100
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'compare' | 'tips' | 'custom'>('compare');

  // A-B Loop state
  const [isAbLoopEnabled, setIsAbLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState<number>(15); // Percentage 0 - 100
  const [loopEnd, setLoopEnd] = useState<number>(65); // Percentage 0 - 100

  // Review Poster Modal State
  const [isPosterOpen, setIsPosterOpen] = useState(false);

  // Waveform data
  const [referenceMetrics, setReferenceMetrics] = useState<ExtractedAudioMetrics | null>(null);
  const [userMetrics, setUserMetrics] = useState<ExtractedAudioMetrics | null>(null);

  const referenceAudioRef = useRef<HTMLAudioElement | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const playTimerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // All available readings
  const allReadings = [...BUILTIN_REFERENCE_READINGS, ...customReadings];
  const activeReading = allReadings.find((r) => r.id === selectedId) || BUILTIN_REFERENCE_READINGS[0];

  // Stop playback when recording starts
  useEffect(() => {
    if (isRecording) {
      handleStopAll();
    }
  }, [isRecording]);

  // Decode User Audio whenever it updates
  useEffect(() => {
    let isCancelled = false;
    const processUserAudio = async () => {
      const blob = userAudioBlob || (userAudioUrl ? await fetch(userAudioUrl).then(r => r.blob()).catch(() => null) : null);
      if (blob) {
        const audioBuffer = await speechManager.decodeAudioBuffer(blob);
        if (audioBuffer && !isCancelled) {
          const metrics = speechManager.extractAudioMetrics(audioBuffer, 64);
          setUserMetrics(metrics);
          return;
        }
      }

      // Generate synthetic metrics based on user transcript or duration if raw audio buffer is not yet decoded
      if (!isCancelled) {
        const words = userTranscript || '';
        const len = Math.max(1, words.length);
        const synthPoints: number[] = [];
        const pitchPoints: number[] = [];
        for (let i = 0; i < 64; i++) {
          const val = Math.abs(Math.sin((i / 64) * Math.PI * 4) * 0.7 + (Math.random() * 0.3));
          synthPoints.push(Math.min(1.0, val));
          pitchPoints.push(30 + Math.round(Math.sin(i * 0.2) * 20 + Math.random() * 15));
        }
        setUserMetrics({
          waveformData: synthPoints,
          pitchCurve: pitchPoints,
          energyCurve: synthPoints,
          pausePoints: [12, 28, 45],
          durationSeconds: Math.max(3, len * 0.3),
        });
      }
    };

    processUserAudio();
    return () => {
      isCancelled = true;
    };
  }, [userAudioBlob, userAudioUrl, userTranscript]);

  // Generate / Load Reference Audio Metrics whenever active reading changes
  useEffect(() => {
    let isCancelled = false;
    const processReference = async () => {
      if (activeReading.audioUrl) {
        try {
          const res = await fetch(activeReading.audioUrl);
          const buf = await res.arrayBuffer();
          const audioBuffer = await speechManager.decodeAudioBuffer(buf);
          if (audioBuffer && !isCancelled) {
            const metrics = speechManager.extractAudioMetrics(audioBuffer, 64);
            setReferenceMetrics(metrics);
            return;
          }
        } catch (e) {
          // fallback to synthetic
        }
      }

      // Synthetic reference waveform matching standard rhythm
      const textLen = activeReading.text.length;
      const targetDuration = (textLen / activeReading.targetWpm) * 60;
      const synthWave: number[] = [];
      const synthPitch: number[] = [];
      const pauses: number[] = [];

      for (let i = 0; i < 64; i++) {
        // Create clean cadence wave with periodic pauses
        const isPause = (i > 18 && i < 22) || (i > 40 && i < 44);
        if (isPause) {
          synthWave.push(0.04);
          synthPitch.push(15);
          pauses.push(i);
        } else {
          const shape = Math.sin((i / 64) * Math.PI * 3.5);
          const amp = Math.min(1.0, Math.max(0.2, Math.abs(shape) * 0.85 + 0.15));
          synthWave.push(amp);
          // Ideal speech intonation curve (rising on emphasis, dipping on commas, flat on statement endings)
          const pitch = 45 + Math.sin(i * 0.25) * 22;
          synthPitch.push(Math.round(pitch));
        }
      }

      if (!isCancelled) {
        setReferenceMetrics({
          waveformData: synthWave,
          pitchCurve: synthPitch,
          energyCurve: synthWave,
          pausePoints: pauses,
          durationSeconds: targetDuration,
        });
      }
    };

    processReference();
    return () => {
      isCancelled = true;
    };
  }, [activeReading]);

  const handleStopAll = () => {
    if (referenceAudioRef.current) {
      referenceAudioRef.current.pause();
      referenceAudioRef.current.currentTime = 0;
    }
    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
    }
    clearInterval(playTimerRef.current);
    speechManager.stopTTS();
    setIsPlayingReference(false);
    setIsPlayingUser(false);
    setReferenceProgress(0);
    setUserProgress(0);
  };

  // Play Reference Audio or Neural TTS Demo with A-B Loop Support
  const handlePlayReference = () => {
    if (isPlayingReference) {
      handleStopAll();
      return;
    }

    handleStopAll();
    setIsPlayingReference(true);

    if (activeReading.audioUrl) {
      if (!referenceAudioRef.current) {
        referenceAudioRef.current = new Audio(activeReading.audioUrl);
      } else {
        referenceAudioRef.current.src = activeReading.audioUrl;
      }
      referenceAudioRef.current.playbackRate = playbackSpeed;

      const duration = referenceAudioRef.current.duration || 6;
      const startPct = isAbLoopEnabled ? Math.min(loopStart, loopEnd) : 0;
      const endPct = isAbLoopEnabled ? Math.max(loopStart, loopEnd) : 100;
      const startSec = (startPct / 100) * duration;
      const endSec = (endPct / 100) * duration;

      referenceAudioRef.current.currentTime = startSec;
      setReferenceProgress(startPct);

      referenceAudioRef.current.onended = () => {
        if (isAbLoopEnabled) {
          if (referenceAudioRef.current) {
            referenceAudioRef.current.currentTime = startSec;
            referenceAudioRef.current.play().catch(() => {});
          }
        } else {
          setIsPlayingReference(false);
          setReferenceProgress(0);
          clearInterval(playTimerRef.current);
        }
      };

      referenceAudioRef.current.play().then(() => {
        playTimerRef.current = setInterval(() => {
          if (referenceAudioRef.current && referenceAudioRef.current.duration) {
            const curTime = referenceAudioRef.current.currentTime;
            const curProgress = (curTime / referenceAudioRef.current.duration) * 100;
            setReferenceProgress(curProgress);

            // Check A-B Loop Boundary
            if (isAbLoopEnabled && curTime >= endSec) {
              referenceAudioRef.current.currentTime = startSec;
              setReferenceProgress(startPct);
            }
          }
        }, 60);
      }).catch(() => {
        playTtsReference();
      });
    } else {
      playTtsReference();
    }
  };

  const playTtsReference = () => {
    setIsPlayingReference(true);
    const startPct = isAbLoopEnabled ? Math.min(loopStart, loopEnd) : 0;
    const endPct = isAbLoopEnabled ? Math.max(loopStart, loopEnd) : 100;

    let progressVal = startPct;
    setReferenceProgress(progressVal);

    const estDurationMs = Math.max(3000, (activeReading.text.length / (activeReading.targetWpm * playbackSpeed)) * 60000);
    const intervalMs = 80;
    const stepIncrement = ((100 / (estDurationMs / intervalMs)));

    clearInterval(playTimerRef.current);
    playTimerRef.current = setInterval(() => {
      progressVal += stepIncrement;
      if (progressVal >= endPct) {
        if (isAbLoopEnabled) {
          progressVal = startPct;
          setReferenceProgress(startPct);
        } else {
          clearInterval(playTimerRef.current);
          setIsPlayingReference(false);
          setReferenceProgress(0);
        }
      } else {
        setReferenceProgress(Math.min(100, progressVal));
      }
    }, intervalMs);

    speechManager.speakDemo(
      activeReading.text,
      playbackSpeed,
      () => setIsPlayingReference(true),
      () => {
        if (!isAbLoopEnabled) {
          setIsPlayingReference(false);
          setReferenceProgress(0);
          clearInterval(playTimerRef.current);
        }
      }
    );
  };

  // Play User Recording
  const handlePlayUser = () => {
    if (isPlayingUser) {
      handleStopAll();
      return;
    }

    handleStopAll();
    const liveUrl = userAudioUrl || speechManager.getLastAudioUrl();

    if (liveUrl) {
      if (!userAudioRef.current) {
        userAudioRef.current = new Audio(liveUrl);
      } else {
        userAudioRef.current.src = liveUrl;
      }
      userAudioRef.current.playbackRate = playbackSpeed;
      userAudioRef.current.onended = () => {
        setIsPlayingUser(false);
        setUserProgress(0);
        clearInterval(playTimerRef.current);
      };
      userAudioRef.current.play().then(() => {
        setIsPlayingUser(true);
        playTimerRef.current = setInterval(() => {
          if (userAudioRef.current && userAudioRef.current.duration) {
            setUserProgress((userAudioRef.current.currentTime / userAudioRef.current.duration) * 100);
          }
        }, 80);
      }).catch(() => {
        simulateUserPlay();
      });
    } else {
      simulateUserPlay();
    }
  };

  const simulateUserPlay = () => {
    setIsPlayingUser(true);
    let step = 0;
    const totalSteps = 40;
    clearInterval(playTimerRef.current);
    playTimerRef.current = setInterval(() => {
      step += 1;
      setUserProgress(Math.min(100, Math.round((step / totalSteps) * 100)));
      if (step >= totalSteps) {
        clearInterval(playTimerRef.current);
        setIsPlayingUser(false);
        setUserProgress(0);
      }
    }, 100);
  };

  // Handle Custom File Upload
  const handleCustomFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCustomAudioFile(file);

    // Auto-transcribe audio file to text if user hasn't typed text yet
    if (!customText.trim()) {
      const text = await speechManager.transcribeAudioFile(file);
      if (text) {
        setCustomText(text);
      }
    }

    if (!customTitle.trim()) {
      setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleSaveCustomReading = () => {
    if (!customText.trim() && !customAudioFile) return;

    const newItem: ReferenceReadingItem = {
      id: `custom-${Date.now()}`,
      title: customTitle.trim() || '自定义示范文本',
      category: 'business_pitch',
      categoryLabel: '我的自定义示范',
      authorOrSource: '用户上传',
      description: '用户自定义范读音频与练习文本',
      text: customText.trim() || '自定义录音示范',
      targetWpm: 210,
      keyEmphases: ['重点突出', '从容表达'],
      cadenceTips: [
        '关注前后句音调高低，保持逻辑重音在关键名词上。',
        '注意逗号与句号处的呼吸留白，避免一口气过长导致后劲不足。',
      ],
      audioUrl: customAudioFile ? URL.createObjectURL(customAudioFile) : undefined,
      isCustom: true,
    };

    setCustomReadings((prev) => [newItem, ...prev]);
    setSelectedId(newItem.id);
    setIsCustomMode(false);
    setActiveTab('compare');
  };

  // Calculate Intonation & Rhythm Match Scores
  const calculateMatchScore = () => {
    if (!userMetrics || !referenceMetrics) return { intonationScore: 86, cadenceScore: 88, paceDelta: 0, userWpm: 210 };

    // Compare average pitch alignment
    let pitchDiffSum = 0;
    const len = Math.min(userMetrics.pitchCurve.length, referenceMetrics.pitchCurve.length);
    for (let i = 0; i < len; i++) {
      pitchDiffSum += Math.abs(userMetrics.pitchCurve[i] - referenceMetrics.pitchCurve[i]);
    }
    const avgDiff = pitchDiffSum / (len || 1);
    const intonationScore = Math.max(65, Math.min(98, Math.round(100 - avgDiff * 0.8)));

    // Compare speech rate & pause alignment
    const userWpm = userMetrics.durationSeconds > 0 ? Math.round((activeReading.text.length / userMetrics.durationSeconds) * 60) : activeReading.targetWpm;
    const paceDelta = userWpm - activeReading.targetWpm;
    const cadenceScore = Math.max(60, Math.min(99, Math.round(100 - Math.abs(paceDelta) * 0.35)));

    return { intonationScore, cadenceScore, paceDelta, userWpm };
  };

  const scores = calculateMatchScore();

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 md:p-5 shadow-2xl flex flex-col gap-4 text-zinc-200">
      {/* Top Header & Presets Selector */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
            <BookOpen size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-zinc-100 tracking-wide">
                标准范读与语调波形对比
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-medium">
                {activeReading.categoryLabel}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate max-w-[280px] sm:max-w-md">
              {activeReading.title}
            </p>
          </div>
        </div>

        {/* Tab, Export Poster & Upload Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export Review Poster Button */}
          <button
            type="button"
            onClick={() => setIsPosterOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-xs transition-all cursor-pointer"
            title="生成带水印的声学对比复盘海报"
          >
            <Share2 size={13} className="text-emerald-400" />
            <span>导出复盘海报</span>
          </button>

          <div className="flex items-center bg-zinc-900 rounded-xl p-0.5 border border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab('compare')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'compare'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              波形对比
            </button>
            <button
              onClick={() => setActiveTab('tips')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                activeTab === 'tips'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              语调锦囊
            </button>
            <button
              onClick={() => {
                setActiveTab('custom');
                setIsCustomMode(true);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'custom'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Upload size={12} />
              <span>上传范读</span>
            </button>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Preset Library Quick Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
        {allReadings.map((reading) => {
          const isSelected = reading.id === selectedId;
          return (
            <button
              key={reading.id}
              onClick={() => {
                setSelectedId(reading.id);
                handleStopAll();
              }}
              className={`px-3 py-1.5 rounded-xl border shrink-0 text-left transition-all cursor-pointer flex items-center gap-2 ${
                isSelected
                  ? 'bg-zinc-900 text-emerald-300 border-emerald-500/50 shadow-xs'
                  : 'bg-zinc-950/60 hover:bg-zinc-900 text-zinc-400 border-zinc-850 hover:text-zinc-200'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
              <span className="font-medium truncate max-w-[160px]">{reading.title}</span>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      {activeTab === 'custom' ? (
        /* Custom Upload / Reading Input View */
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-200">上传自定义范读音频或文本</span>
            <span className="text-[11px] text-zinc-400">支持 MP3 / WAV / M4A / WebM</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">示范标题</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="例如：西南官话茶馆对白、商业提案开场白"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">选择本地范读音频 (可选)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleCustomFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full bg-zinc-950 border border-dashed border-zinc-700 hover:border-emerald-500/60 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:text-emerald-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Upload size={13} />
                <span>{customAudioFile ? customAudioFile.name : '点击选取本地音频文件'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">范读示范文本 (支持自动转写或手动输入)</label>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="在此粘贴或输入需要跟读的标准朗读文本..."
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => setActiveTab('compare')}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleSaveCustomReading}
              disabled={!customText.trim() && !customAudioFile}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition-colors cursor-pointer"
            >
              保存并开始对比训练
            </button>
          </div>
        </div>
      ) : activeTab === 'tips' ? (
        /* Detailed Intonation & Cadence Tips */
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-amber-300 font-semibold text-xs">
            <Sparkles size={14} className="text-amber-400" />
            <span>【{activeReading.title}】语调与停顿名师精讲</span>
          </div>

          <div className="space-y-2 text-xs leading-relaxed text-zinc-300">
            {activeReading.cadenceTips.map((tip, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-850">
                <span className="w-5 h-5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                <p className="flex-1">{tip}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-semibold">推荐目标语速：</span>
              <span className="font-mono font-bold text-emerald-300">{activeReading.targetWpm} 字/分钟</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span>核心重音词：</span>
              {activeReading.keyEmphases.map((w, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-200 font-mono text-[10px]">
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Waveform Dual Track Comparison Display */
        <div className="flex flex-col gap-3">
          {/* Target Text Script Card */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3.5 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1 font-medium text-emerald-400">
                <FileText size={12} />
                范读朗诵台本
              </span>
              <span className="font-mono text-[11px] text-zinc-500">
                共 {activeReading.text.length} 字 · 建议语速 {activeReading.targetWpm} WPM
              </span>
            </div>
            <p className="text-sm font-medium text-zinc-100 leading-relaxed tracking-wide selection:bg-emerald-500/30">
              {activeReading.text}
            </p>
          </div>

          {/* DUAL-TRACK WAVEFORM COMPARISON CANVAS */}
          <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3.5 flex flex-col gap-3">
            {/* TRACK 1: Standard Reference Audio Waveform with A-B Loop Highlights */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    标准范读音频 (示范起伏 & 语调线)
                  </span>
                  {isAbLoopEnabled && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 flex items-center gap-1">
                      <Repeat size={10} />
                      A-B 循环区间 [{loopStart}% ~ {loopEnd}%]
                    </span>
                  )}
                </div>
                <span className="text-zinc-500 font-mono text-[10px]">
                  {isPlayingReference ? (isAbLoopEnabled ? 'A-B 片段循环中...' : '正在示范播放...') : '标准声学模板'}
                </span>
              </div>

              {/* Waveform Bar Track 1 */}
              <div className="h-16 bg-zinc-900/90 rounded-xl p-1.5 relative overflow-hidden flex items-end justify-between gap-0.5 border border-zinc-800/80 group">
                {/* A-B Loop Shaded Selection Box */}
                {isAbLoopEnabled && (
                  <div
                    className="absolute top-0 bottom-0 bg-emerald-500/15 border-l-2 border-r-2 border-emerald-400/80 pointer-events-none z-10 transition-all duration-75"
                    style={{
                      left: `${Math.min(loopStart, loopEnd)}%`,
                      width: `${Math.abs(loopEnd - loopStart)}%`,
                    }}
                  >
                    {/* Point A Flag */}
                    <span className="absolute top-1 left-1 px-1.5 py-0.2 rounded bg-emerald-500 text-zinc-950 text-[9px] font-bold font-mono shadow-xs">
                      A 起点
                    </span>
                    {/* Point B Flag */}
                    <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded bg-amber-400 text-zinc-950 text-[9px] font-bold font-mono shadow-xs">
                      B 终点
                    </span>
                  </div>
                )}

                {/* Real-time playhead scrubber line */}
                {isPlayingReference && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-emerald-400 shadow-[0_0_10px_#34d399] z-20 transition-all duration-75"
                    style={{ left: `${referenceProgress}%` }}
                  />
                )}

                {/* Pitch line overlay SVG */}
                {referenceMetrics && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40 z-5">
                    <polyline
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      points={referenceMetrics.pitchCurve
                        .map((p, idx) => `${(idx / 64) * 100}%,${100 - p}%`)
                        .join(' ')}
                    />
                  </svg>
                )}

                {/* Amplitude Bars */}
                {(referenceMetrics?.waveformData || Array.from({ length: 64 }, () => 0.4)).map((val, idx) => {
                  const pct = (idx / 64) * 100;
                  const isActive = isPlayingReference && pct <= referenceProgress;
                  const isInAbRange = isAbLoopEnabled && pct >= Math.min(loopStart, loopEnd) && pct <= Math.max(loopStart, loopEnd);
                  const isPause = referenceMetrics?.pausePoints.includes(idx);
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-xs transition-all duration-100"
                      style={{
                        height: isPause ? '4px' : `${Math.max(6, Math.min(100, val * 100))}%`,
                        backgroundColor: isPause
                          ? '#27272a'
                          : isActive
                          ? '#10b981'
                          : isInAbRange
                          ? '#059669'
                          : '#047857',
                        opacity: isActive ? 1.0 : isInAbRange ? 0.9 : 0.45,
                      }}
                    />
                  );
                })}
              </div>

              {/* A-B LOOP CONTROLS & RANGE SLIDERS BAR */}
              <div className="bg-zinc-900/90 border border-zinc-800/90 rounded-xl p-2.5 flex flex-col gap-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAbLoopEnabled(!isAbLoopEnabled);
                      if (isPlayingReference) handleStopAll();
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isAbLoopEnabled
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                        : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border-zinc-800'
                    }`}
                  >
                    <Repeat size={12} className={isAbLoopEnabled ? 'animate-spin' : ''} />
                    <span>{isAbLoopEnabled ? 'A-B 循环已启用' : '开启 A-B 片段循环'}</span>
                  </button>

                  {/* Preset Range Slices */}
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-zinc-500">快捷片段:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAbLoopEnabled(true);
                        setLoopStart(0);
                        setLoopEnd(35);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
                    >
                      前段 (0-35%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAbLoopEnabled(true);
                        setLoopStart(30);
                        setLoopEnd(70);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
                    >
                      核心中段 (30-70%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAbLoopEnabled(true);
                        setLoopStart(65);
                        setLoopEnd(100);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
                    >
                      句末难点 (65-100%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAbLoopEnabled(true);
                        setLoopStart(0);
                        setLoopEnd(100);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 cursor-pointer"
                    >
                      全篇 (0-100%)
                    </button>
                  </div>
                </div>

                {/* Sliders for Point A and Point B */}
                {isAbLoopEnabled && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-800/60">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span className="flex items-center gap-1 font-semibold text-emerald-400">
                          <Flag size={10} />
                          起点 A ({loopStart}%)
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {((loopStart / 100) * (referenceMetrics?.durationSeconds || 6)).toFixed(1)} 秒
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="95"
                        value={loopStart}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setLoopStart(val);
                          if (val >= loopEnd) setLoopEnd(Math.min(100, val + 5));
                        }}
                        className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                        <span className="flex items-center gap-1 font-semibold text-amber-400">
                          <Flag size={10} />
                          终点 B ({loopEnd}%)
                        </span>
                        <span className="font-mono text-[10px] text-zinc-500">
                          {((loopEnd / 100) * (referenceMetrics?.durationSeconds || 6)).toFixed(1)} 秒
                        </span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={loopEnd}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setLoopEnd(val);
                          if (val <= loopStart) setLoopStart(Math.max(0, val - 5));
                        }}
                        className="w-full accent-amber-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TRACK 2: User Recording Waveform */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-1.5 font-semibold text-indigo-400">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  我的录音音频 (实际起伏 & 语调线)
                </span>
                <span className="text-zinc-500 font-mono text-[10px]">
                  {isPlayingUser ? '回放中...' : userAudioUrl || userAudioBlob ? '已捕获录音' : '待跟读录音'}
                </span>
              </div>

              {/* Waveform Bar Track 2 */}
              <div className="h-16 bg-zinc-900/90 rounded-xl p-1.5 relative overflow-hidden flex items-end justify-between gap-0.5 border border-zinc-800/80">
                {/* Real-time playhead scrubber line */}
                {isPlayingUser && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-indigo-400 shadow-[0_0_10px_#818cf8] z-10 transition-all duration-75"
                    style={{ left: `${userProgress}%` }}
                  />
                )}

                {/* Pitch line overlay SVG */}
                {userMetrics && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40">
                    <polyline
                      fill="none"
                      stroke="#818cf8"
                      strokeWidth="1.5"
                      points={userMetrics.pitchCurve
                        .map((p, idx) => `${(idx / 64) * 100}%,${100 - p}%`)
                        .join(' ')}
                    />
                  </svg>
                )}

                {/* User Amplitude Bars */}
                {(userMetrics?.waveformData || Array.from({ length: 64 }, () => 0.25)).map((val, idx) => {
                  const isActive = isPlayingUser && (idx / 64) * 100 <= userProgress;
                  return (
                    <div
                      key={idx}
                      className="flex-1 rounded-xs transition-all duration-100"
                      style={{
                        height: `${Math.max(6, Math.min(100, val * 100))}%`,
                        backgroundColor: isActive ? '#6366f1' : '#4338ca',
                        opacity: isActive ? 1.0 : 0.6,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Score & Diagnosis Overview Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-zinc-900 text-xs">
              <div className="bg-zinc-900/90 rounded-lg p-2 flex flex-col">
                <span className="text-[10px] text-zinc-500">语调拟合度</span>
                <span className="font-mono font-bold text-sm text-emerald-400">
                  {scores.intonationScore}%
                </span>
              </div>
              <div className="bg-zinc-900/90 rounded-lg p-2 flex flex-col">
                <span className="text-[10px] text-zinc-500">节奏与停顿吻合</span>
                <span className="font-mono font-bold text-sm text-teal-400">
                  {scores.cadenceScore}%
                </span>
              </div>
              <div className="bg-zinc-900/90 rounded-lg p-2 flex flex-col">
                <span className="text-[10px] text-zinc-500">我的语速 vs 目标</span>
                <span className="font-mono font-bold text-sm text-indigo-300">
                  {scores.userWpm || 210} / {activeReading.targetWpm} <span className="text-[10px] font-normal">WPM</span>
                </span>
              </div>
              <div className="bg-zinc-900/90 rounded-lg p-2 flex flex-col">
                <span className="text-[10px] text-zinc-500">语调调整建议</span>
                <span className="text-[11px] font-medium text-amber-300 truncate">
                  {activeReading.cadenceTips[0] || '保持句末平稳落地'}
                </span>
              </div>
            </div>
          </div>

          {/* PLAYBACK & RECORDING CONTROL BAR */}
          <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
            {/* Playback Buttons */}
            <div className="flex items-center gap-2">
              {/* Play Reference */}
              <button
                onClick={handlePlayReference}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isPlayingReference
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-emerald-300 border-emerald-500/40'
                }`}
              >
                {isPlayingReference ? <Pause size={13} /> : <Volume2 size={13} />}
                <span>
                  {isPlayingReference
                    ? isAbLoopEnabled
                      ? '暂停循环'
                      : '暂停范读'
                    : isAbLoopEnabled
                    ? '播放 A-B 片段循环'
                    : '播放范读示范'}
                </span>
              </button>

              {/* Play My Voice */}
              <button
                onClick={handlePlayUser}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isPlayingUser
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-indigo-300 border-indigo-500/40'
                }`}
              >
                {isPlayingUser ? <Pause size={13} /> : <Play size={13} />}
                <span>{isPlayingUser ? '暂停录音' : '回放我的录音'}</span>
              </button>

              {/* Speed Selector */}
              <div className="flex items-center bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 text-[11px] font-mono">
                {[0.75, 1.0, 1.25].map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setPlaybackSpeed(s);
                      if (isPlayingReference) handlePlayReference();
                    }}
                    className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                      playbackSpeed === s
                        ? 'bg-emerald-600 text-white font-bold'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Follow-along Practice Recording Button */}
            <div className="flex items-center gap-2">
              {isRecording ? (
                <button
                  onClick={onStopRecording}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 animate-pulse transition-all cursor-pointer"
                >
                  <Pause size={13} />
                  <span>停止跟读</span>
                </button>
              ) : (
                <button
                  onClick={onStartRecording}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white shadow-md transition-all cursor-pointer"
                >
                  <Mic size={13} />
                  <span>对照示范开始跟读</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review Poster Export Modal */}
      <ReviewPosterModal
        isOpen={isPosterOpen}
        onClose={() => setIsPosterOpen(false)}
        reading={activeReading}
        scores={scores}
        referenceMetrics={referenceMetrics}
        userMetrics={userMetrics}
        userTranscript={userTranscript}
      />
    </div>
  );
};

