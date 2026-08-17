import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, Mic, Sparkles, Check, RefreshCw } from 'lucide-react';
import { speechManager } from '../utils/speech';

interface AudioComparisonPlayerProps {
  sentenceText: string;
  sentenceId: string;
  isRecording: boolean;
  audioBlobUrl?: string | null;
}

export const AudioComparisonPlayer: React.FC<AudioComparisonPlayerProps> = ({
  sentenceText,
  sentenceId,
  isRecording,
  audioBlobUrl,
}) => {
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [speed, setSpeed] = useState<number>(1.0);
  const [originalProgress, setOriginalProgress] = useState<number>(0);
  const [showRhythmTips, setShowRhythmTips] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressTimerRef = useRef<any>(null);

  // Stop all playback if recording starts
  useEffect(() => {
    if (isRecording) {
      handleStopAll();
    }
  }, [isRecording]);

  const handleStopAll = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    clearInterval(progressTimerRef.current);
    speechManager.stopTTS();
    setIsPlayingOriginal(false);
    setIsPlayingDemo(false);
    setOriginalProgress(0);
  };

  // Play user's recorded voice
  const handlePlayOriginal = () => {
    if (isPlayingOriginal) {
      handleStopAll();
      return;
    }

    handleStopAll();
    const liveUrl = audioBlobUrl || speechManager.getLastAudioUrl();

    if (liveUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(liveUrl);
      } else {
        audioRef.current.src = liveUrl;
      }

      audioRef.current.onended = () => {
        setIsPlayingOriginal(false);
        setOriginalProgress(0);
        clearInterval(progressTimerRef.current);
      };

      audioRef.current.onerror = () => {
        setIsPlayingOriginal(false);
        setOriginalProgress(0);
        clearInterval(progressTimerRef.current);
      };

      audioRef.current
        .play()
        .then(() => {
          setIsPlayingOriginal(true);
          progressTimerRef.current = setInterval(() => {
            if (audioRef.current && audioRef.current.duration) {
              setOriginalProgress(
                (audioRef.current.currentTime / audioRef.current.duration) * 100
              );
            }
          }, 100);
        })
        .catch((err) => {
          console.warn('Audio play error, falling back to rhythm demo:', err);
          simulateOriginalPlay();
        });
    } else {
      // Simulate playback rhythm with animated progress
      simulateOriginalPlay();
    }
  };

  const simulateOriginalPlay = () => {
    setIsPlayingOriginal(true);
    let curr = 0;
    const stepDuration = Math.max(2000, sentenceText.length * 120);
    const intervalMs = 100;
    const totalSteps = stepDuration / intervalMs;

    clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      curr += 1;
      setOriginalProgress(Math.min(100, Math.round((curr / totalSteps) * 100)));
      if (curr >= totalSteps) {
        clearInterval(progressTimerRef.current);
        setIsPlayingOriginal(false);
        setOriginalProgress(0);
      }
    }, intervalMs);
  };

  // Play standard TTS demonstration
  const handlePlayDemo = () => {
    if (isPlayingDemo) {
      handleStopAll();
      return;
    }

    handleStopAll();
    setIsPlayingDemo(true);

    speechManager.speakDemo(
      sentenceText,
      speed,
      () => {
        setIsPlayingDemo(true);
      },
      () => {
        setIsPlayingDemo(false);
      }
    );
  };

  // Cadence & Intonation heuristic tip
  const getCadenceSuggestion = (text: string) => {
    if (text.includes('但是') || text.includes('然而') || text.includes('不过')) {
      return '在转折词（如“但是/然而”）前建议留白 0.3 秒，重音平稳下落，突显核心转折点。';
    }
    if (text.includes('因为') || text.includes('所以') || text.includes('因此')) {
      return '在因果连词后建议放慢半拍，给听众构建因果逻辑链条的思考缓冲时间。';
    }
    if (text.includes('第一') || text.includes('首先') || text.includes('其次')) {
      return '序号标点词发音需清脆干脆，语调略微上扬以提示听众进入新结构。';
    }
    if (text.length > 30) {
      return '长句注意在从句谓语或分词处主动换气，避免后半句因气流不足导致音量衰减。';
    }
    return '建议句尾语调平稳落地（陈述语气），避免不自觉的疑问上扬语气削弱确定感。';
  };

  if (isRecording) {
    return null;
  }

  return (
    <div className="mt-2 pt-2 pb-1 px-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2 select-none">
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Playback Buttons Group */}
        <div className="flex items-center gap-2">
          {/* My Voice Playback */}
          <button
            onClick={handlePlayOriginal}
            title="回放我的录音原声节奏"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isPlayingOriginal
                ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {isPlayingOriginal ? <Pause size={12} /> : <Mic size={12} className="text-indigo-400" />}
            <span>{isPlayingOriginal ? '暂停原声' : '回放原声'}</span>
          </button>

          {/* Standard TTS Demo */}
          <button
            onClick={handlePlayDemo}
            title="播放系统标准断句与语调范读"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isPlayingDemo
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-emerald-300'
            }`}
          >
            {isPlayingDemo ? <Pause size={12} /> : <Volume2 size={12} className="text-emerald-400" />}
            <span>{isPlayingDemo ? '停止范读' : '标准范读'}</span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-950/80 rounded-lg p-0.5 border border-slate-800 text-[10px]">
            {[0.8, 1.0, 1.2].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSpeed(s);
                  if (isPlayingDemo) {
                    handlePlayDemo();
                  }
                }}
                className={`px-1.5 py-0.5 rounded font-mono transition-colors cursor-pointer ${
                  speed === s
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Rhythm Tips Toggle */}
        <button
          onClick={() => setShowRhythmTips((v) => !v)}
          className={`flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
            showRhythmTips ? 'text-amber-300' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Sparkles size={11} className={showRhythmTips ? 'text-amber-400' : ''} />
          <span>语调与停顿锦囊</span>
        </button>
      </div>

      {/* Progress / Audio Wave Bar */}
      {(isPlayingOriginal || isPlayingDemo) && (
        <div className="flex items-center gap-2 pt-1">
          <div className="flex items-center gap-1 shrink-0">
            <span
              className={`w-1 h-3 rounded-full animate-bounce ${
                isPlayingOriginal ? 'bg-indigo-400' : 'bg-emerald-400'
              }`}
              style={{ animationDelay: '0ms' }}
            />
            <span
              className={`w-1 h-4 rounded-full animate-bounce ${
                isPlayingOriginal ? 'bg-indigo-400' : 'bg-emerald-400'
              }`}
              style={{ animationDelay: '150ms' }}
            />
            <span
              className={`w-1 h-2 rounded-full animate-bounce ${
                isPlayingOriginal ? 'bg-indigo-400' : 'bg-emerald-400'
              }`}
              style={{ animationDelay: '300ms' }}
            />
          </div>

          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                isPlayingOriginal ? 'bg-indigo-500' : 'bg-emerald-500'
              }`}
              style={{
                width: isPlayingOriginal ? `${originalProgress}%` : '100%',
                animation: isPlayingDemo ? 'pulse 1.5s infinite' : 'none',
              }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {isPlayingOriginal ? '原音对比' : 'AI标准示范'}
          </span>
        </div>
      )}

      {/* Cadence Suggestion Box */}
      {showRhythmTips && (
        <div className="bg-amber-950/20 border border-amber-500/20 rounded-lg p-2 text-[11px] text-amber-200/90 leading-relaxed animate-in fade-in duration-150">
          💡 <span className="font-semibold text-amber-300">语调与节奏解析：</span>
          {getCadenceSuggestion(sentenceText)}
        </div>
      )}
    </div>
  );
};
