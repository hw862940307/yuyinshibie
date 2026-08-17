import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Mic,
  Square,
  Star,
  Sparkles,
  Volume2,
  Trash2,
  Copy,
  Check,
  Zap,
  Play,
  Pause,
  RotateCcw,
  Headphones,
} from 'lucide-react';
import { SubtitleSentence, FavoriteSentence } from '../types';
import { FILLER_WORDS, HEDGE_WORDS, TIERED_MAP, VAGUE_TO_PRECISE } from '../lib/lexicon';
import { AudioComparisonPlayer } from './AudioComparisonPlayer';
import { VoiceWaveform } from './VoiceWaveform';

interface SubtitleStreamProps {
  sentences: SubtitleSentence[];
  currentInterim: string;
  isRecording: boolean;
  isPaused: boolean;
  audioVolume: number;
  onToggleRecording: () => void;
  onPauseRecording?: () => void;
  onResumeRecording?: () => void;
  onOpenPasteModal: () => void;
  onWordClick: (word: string) => void;
  onToggleFavorite: (sentence: SubtitleSentence) => void;
  favorites: FavoriteSentence[];
  onOpenFavorites?: () => void;
  onSimulateSample?: (text: string) => void;
  onLoadSampleDemo?: () => void;
  onClearSession?: () => void;
  onManualSpeechSubmit?: (text: string) => void;
  onManualInterimChange?: (text: string) => void;
}

// Helper for rendering highlighted tokens with yellow dotted underline for vague/hedges and red wavy underline for fillers
const sortedFillers = [...FILLER_WORDS].sort((a, b) => b.length - a.length);
const sortedHedges = [...HEDGE_WORDS].sort((a, b) => b.length - a.length);
const sortedVague = Object.keys(VAGUE_TO_PRECISE).concat(Object.keys(TIERED_MAP)).sort((a, b) => b.length - a.length);

function renderHighlightedText(text: string, onWordClick: (word: string) => void): React.ReactNode {
  if (!text) return null;

  const tokens: Array<{ text: string; type: 'filler' | 'hedge' | 'vague' | 'normal'; original?: string }> = [];
  let remaining = text;

  while (remaining.length > 0) {
    let matched = false;

    // 1. Check Fillers (e.g. 这个, 就是, 嗯, 然后)
    for (const f of sortedFillers) {
      if (remaining.startsWith(f)) {
        tokens.push({ text: f, type: 'filler' });
        remaining = remaining.slice(f.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 2. Check Hedges (e.g. 我觉得, 觉得, 应该, 可能)
    for (const h of sortedHedges) {
      if (remaining.startsWith(h)) {
        tokens.push({ text: h, type: 'hedge', original: h });
        remaining = remaining.slice(h.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 3. Check Vague Words (e.g. 说, 做, 搞, 看, 东西, 事情)
    for (const v of sortedVague) {
      if (remaining.startsWith(v)) {
        tokens.push({ text: v, type: 'vague', original: v });
        remaining = remaining.slice(v.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // Normal char
    tokens.push({ text: remaining[0], type: 'normal' });
    remaining = remaining.slice(1);
  }

  return tokens.map((token, i) => {
    if (token.type === 'filler') {
      const isMultiChar = token.text.length > 1;
      return (
        <span
          key={i}
          onClick={() => onWordClick(token.text)}
          className={`text-[#f43f5e] font-normal cursor-pointer hover:text-rose-400 transition-colors ${
            isMultiChar
              ? 'underline decoration-wavy decoration-[#f43f5e] underline-offset-4'
              : ''
          }`}
          title="口头填充词 (点击查看建议)"
        >
          {token.text}
        </span>
      );
    }
    if (token.type === 'hedge' || token.type === 'vague') {
      return (
        <span
          key={i}
          onClick={() => onWordClick(token.original || token.text)}
          className="text-[#facc15] font-normal underline decoration-dotted decoration-[#facc15] underline-offset-8 cursor-pointer hover:text-amber-300 transition-colors inline-block"
          title={token.type === 'hedge' ? '犹豫弱化词 (点击查看自信替换)' : '笼统词 (点击查看高阶精准替换)'}
        >
          {token.text}
        </span>
      );
    }
    return <span key={i} className="text-zinc-100">{token.text}</span>;
  });
}

// Memoized Individual Subtitle Sentence Item with smooth fade-in animation
interface SentenceItemProps {
  sentence: SubtitleSentence;
  isFavorited: boolean;
  isRecording: boolean;
  onToggleFavorite: (sentence: SubtitleSentence) => void;
  onWordClick: (word: string) => void;
}

const SentenceItem = React.memo<SentenceItemProps>(
  ({ sentence, isFavorited, isRecording, onToggleFavorite, onWordClick }) => {
    const highlightedContent = useMemo(() => {
      return renderHighlightedText(sentence.text, onWordClick);
    }, [sentence.text, onWordClick]);

    return (
      <div className="group flex flex-col gap-1 transition-all duration-300 relative py-1 subtitle-enter-anim">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onToggleFavorite(sentence)}
            title={isFavorited ? '取消收藏' : '收藏为金句'}
            className={`shrink-0 mt-2 p-1 rounded-lg transition-all cursor-pointer ${
              isFavorited
                ? 'text-amber-400 bg-amber-500/20 opacity-100'
                : 'text-zinc-800 hover:text-amber-300 opacity-0 group-hover:opacity-100 hover:bg-zinc-900'
            }`}
          >
            <Star size={15} className={isFavorited ? 'fill-amber-400' : ''} />
          </button>

          {/* Display Typography matching image.png */}
          <div className="flex-1 text-2xl md:text-3xl font-normal leading-relaxed text-zinc-100 tracking-wide font-sans">
            {highlightedContent}
          </div>
        </div>

        {/* Audio Intonation Player */}
        <div className="pl-8">
          <AudioComparisonPlayer
            sentenceText={sentence.text}
            sentenceId={sentence.id}
            isRecording={isRecording}
          />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.sentence.id === nextProps.sentence.id &&
      prevProps.sentence.text === nextProps.sentence.text &&
      prevProps.isFavorited === nextProps.isFavorited &&
      prevProps.isRecording === nextProps.isRecording
    );
  }
);

SentenceItem.displayName = 'SentenceItem';

export const SubtitleStream: React.FC<SubtitleStreamProps> = ({
  sentences,
  currentInterim,
  isRecording,
  isPaused,
  audioVolume,
  onToggleRecording,
  onPauseRecording,
  onResumeRecording,
  onOpenPasteModal,
  onWordClick,
  onToggleFavorite,
  favorites,
  onOpenFavorites,
  onSimulateSample,
  onLoadSampleDemo,
  onClearSession,
  onManualSpeechSubmit,
  onManualInterimChange,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [liveInput, setLiveInput] = useState('');

  // Auto-scroll when new text arrives or interimText changes
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [sentences, currentInterim]);

  const isSentenceFavorited = useCallback(
    (sentenceId: string, text: string) => {
      return favorites.some((f) => f.id === sentenceId || f.text === text);
    },
    [favorites]
  );

  const handleCopyAll = () => {
    const fullText = sentences.map((s) => s.text).join('\n') + (currentInterim ? '\n' + currentInterim : '');
    if (!fullText.trim()) return;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLiveInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && liveInput.trim()) {
      e.preventDefault();
      if (onManualSpeechSubmit) {
        onManualSpeechSubmit(liveInput.trim());
      }
      setLiveInput('');
      if (onManualInterimChange) {
        onManualInterimChange('');
      }
    }
  };

  const handleLiveInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLiveInput(val);
    if (onManualInterimChange) {
      onManualInterimChange(val);
    }
  };

  const interimHighlighted = useMemo(() => {
    if (!currentInterim) return null;
    return renderHighlightedText(currentInterim, onWordClick);
  }, [currentInterim, onWordClick]);

  const hasContent = sentences.length > 0 || currentInterim.trim().length > 0;

  return (
    <main className="flex-1 flex flex-col items-center justify-between p-3 md:p-6 min-w-0 h-full relative overflow-hidden bg-black">
      {/* The Central Canvas with Neon Glowing Border matching image.png */}
      <div
        className={`w-full max-w-5xl flex-1 flex flex-col justify-between bg-black rounded-2xl p-5 md:p-8 relative overflow-hidden transition-all duration-500 ${
          isPaused
            ? 'border border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
            : isRecording
            ? 'border border-pink-500/80 shadow-[0_0_30px_rgba(244,63,94,0.3)]'
            : 'border border-pink-500/30 shadow-[0_0_20px_rgba(244,63,94,0.12)]'
        }`}
      >
        {/* Top bar inside container: [ 📋 粘贴逐字稿 ] + [ ✨ 载入示例 / 🗑️ 清空 ] + [ Status / Copy ] */}
        <div className="flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenPasteModal}
              title="一键粘贴文稿或演讲稿，快速进行多维表达诊断"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-950/90 hover:bg-zinc-900 border border-pink-500/30 text-pink-300 hover:text-white text-xs font-medium transition-all cursor-pointer shadow-xs"
            >
              <FileText size={13} className="text-pink-400" />
              <span>📋 粘贴逐字稿</span>
            </button>

            {/* Quick Demo Test Samples */}
            {onLoadSampleDemo && (
              <button
                onClick={onLoadSampleDemo}
                title="载入中文口语演练示例库，快速预览多维诊断"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 text-[11px] text-zinc-400 hover:text-amber-300 transition-colors cursor-pointer"
              >
                <Sparkles size={12} className="text-amber-400" />
                <span>✨ 载入示例</span>
              </button>
            )}

            {/* Clear session button */}
            {hasContent && onClearSession && (
              <button
                onClick={onClearSession}
                title="清空当前所有字幕并重置训练会话"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-rose-950/40 border border-zinc-850 hover:border-rose-500/30 text-zinc-400 hover:text-rose-300 text-[11px] transition-colors cursor-pointer"
              >
                <Trash2 size={12} className="text-zinc-500 hover:text-rose-400" />
                <span>清空重置</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isPaused && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2.5 py-1 rounded-full animate-pulse">
                <Pause size={11} className="text-amber-400" />
                <span>录音已暂停</span>
              </span>
            )}

            {isRecording && !isPaused && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>实时录音识别中 (zh-CN)</span>
              </span>
            )}

            {hasContent && (
              <button
                onClick={handleCopyAll}
                title="复制全篇逐字稿"
                className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              </button>
            )}
          </div>
        </div>

        {/* Center Stream Content: Full screen real-time sentences */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto py-6 my-2 flex flex-col justify-start scroll-smooth"
        >
          {!hasContent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-600 select-none">
              <div className="w-16 h-16 rounded-full border border-pink-500/30 bg-pink-950/20 flex items-center justify-center mb-4 text-pink-400 shadow-[0_0_25px_rgba(244,63,94,0.2)]">
                <Mic size={28} />
              </div>
              <h3 className="text-lg font-medium text-zinc-200 mb-1">
                点击下方「开始录制」开启实时口语训练
              </h3>
              <p className="text-sm text-zinc-400 max-w-md mb-3">
                支持中文普通话实时流式识别与毫秒级转写 · 按 <kbd className="px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-xs text-pink-300 font-mono">Space</kbd> 快捷开始/暂停
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-zinc-500">
                <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-rose-300">
                  红色波浪线：口头填充词 (如：嗯/这个/就是)
                </span>
                <span className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-amber-300">
                  黄色虚线：笼统词与弱化词 (如：说/做/我觉得)
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl w-full mx-auto">
              {sentences.map((s) => (
                <SentenceItem
                  key={s.id}
                  sentence={s}
                  isFavorited={isSentenceFavorited(s.id, s.text)}
                  isRecording={isRecording}
                  onToggleFavorite={onToggleFavorite}
                  onWordClick={onWordClick}
                />
              ))}

              {/* Real-time typing interim stream sentence with zero lag and pulsing cursor */}
              {currentInterim && (
                <div className="text-2xl md:text-3xl font-normal leading-relaxed text-pink-300/90 pl-8 flex items-center gap-1 font-sans subtitle-enter-anim">
                  <span>{interimHighlighted}</span>
                  <span className="inline-block w-2.5 h-6 bg-pink-500 animate-pulse ml-1 shrink-0" />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Real-time Voice Input bar when recording */}
        {isRecording && !isPaused && (
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-zinc-950/90 border border-pink-500/40 mb-2 focus-within:border-pink-500 shadow-[0_0_15px_rgba(244,63,94,0.15)] transition-all">
            <Mic size={14} className="text-pink-400 animate-pulse shrink-0" />
            <input
              type="text"
              value={liveInput}
              onChange={handleLiveInputChange}
              onKeyDown={handleLiveInputKeyDown}
              placeholder="麦克风已开启，请说话... (亦可在此实时输入文字按回车同步)"
              className="bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-hidden flex-1 font-sans"
            />
            {liveInput.trim() && (
              <button
                type="button"
                onClick={() => {
                  if (onManualSpeechSubmit && liveInput.trim()) {
                    onManualSpeechSubmit(liveInput.trim());
                  }
                  setLiveInput('');
                  if (onManualInterimChange) {
                    onManualInterimChange('');
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer"
              >
                同步发送 ↵
              </button>
            )}
          </div>
        )}

        {/* Real-time Voice Waveform - audioVolume is tightly bound */}
        <div className="mb-2 shrink-0">
          <VoiceWaveform
            isRecording={isRecording}
            isPaused={isPaused}
            audioVolume={audioVolume}
          />
        </div>

        {/* Bottom watermark inside card: Powered by ExprTrain (matching image.png) */}
        <div className="flex items-center justify-between text-xs text-zinc-600 shrink-0 select-none pt-1 border-t border-zinc-900/80">
          <span className="text-zinc-500">Powered by ExprTrain</span>
          {isPaused ? (
            <span className="text-amber-400/90 font-mono text-[11px]">
              ⏸ 录音已暂停 · 点击暂停/继续按钮继续
            </span>
          ) : isRecording ? (
            <span className="text-pink-500 font-mono text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
              <span>实时语音流式捕获中</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Floating Bottom Primary Recording Capsule Buttons (Exact match to image.png) */}
      <div className="pt-3 pb-1 flex items-center justify-center gap-3 shrink-0 z-20">
        {isRecording ? (
          <div className="flex items-center gap-3">
            {/* Amber Capsule [ ⏸ 暂停 ] Button as in image.png */}
            <button
              onClick={isPaused ? onResumeRecording : onPauseRecording}
              title={isPaused ? '继续录制 (Space)' : '暂停录制 (Space)'}
              className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-xs tracking-wider transition-all duration-200 cursor-pointer shadow-lg ${
                isPaused
                  ? 'bg-sky-400 hover:bg-sky-300 text-black shadow-[0_0_20px_rgba(56,189,248,0.4)]'
                  : 'bg-[#f59e0b] hover:bg-[#d97706] text-black shadow-[0_0_20px_rgba(245,158,11,0.4)]'
              }`}
            >
              {isPaused ? (
                <>
                  <Play size={13} className="fill-black text-black" />
                  <span>继续</span>
                </>
              ) : (
                <>
                  <Pause size={13} className="fill-black text-black" />
                  <span>暂停</span>
                </>
              )}
            </button>

            {/* Red/Pink Capsule [ ⏹ 结束 ] Button as in image.png */}
            <button
              onClick={onToggleRecording}
              title="结束训练并生成复盘报告 (Esc)"
              className="flex items-center gap-2 px-6 py-2 rounded-full font-bold text-xs tracking-wider bg-[#f43f5e] hover:bg-[#e11d48] text-white shadow-[0_0_20px_rgba(244,63,94,0.45)] transition-all duration-200 cursor-pointer"
            >
              <Square size={13} className="fill-white text-white" />
              <span>结束</span>
            </button>
          </div>
        ) : (
          /* Primary Idle [ 🎙️ 开始录制 ] Capsule Button */
          <button
            onClick={onToggleRecording}
            title="开始麦克风录制 (快捷键: Space)"
            className="flex items-center gap-2 px-8 py-2.5 rounded-full font-bold text-xs tracking-wider bg-gradient-to-r from-[#ec4899] to-[#f43f5e] hover:from-[#f43f5e] hover:to-[#e11d48] text-white shadow-[0_0_25px_rgba(244,63,94,0.45)] hover:shadow-[0_0_35px_rgba(244,63,94,0.65)] transform hover:scale-[1.02] transition-all duration-300 cursor-pointer"
          >
            <Mic size={14} className="text-white" />
            <span>开始录制 (Space)</span>
          </button>
        )}
      </div>

      {/* Bottom-right watermark avatar: 宇宙无敌表达系统 by sisi matching image.png */}
      <div className="absolute right-4 bottom-3 hidden md:flex items-center gap-1.5 text-[11px] text-pink-500/80 select-none">
        <Headphones size={15} className="text-pink-500" />
        <span>宇宙无敌表达系统 by sisi</span>
      </div>
    </main>
  );
};

