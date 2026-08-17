import React from 'react';
import {
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Bot,
  Zap,
} from 'lucide-react';
import { FeedbackItem, FluencyMetricPoint, TrainerStats, TrainingDailyLog } from '../types';
import { FluencyChart } from './FluencyChart';

interface RightPanelProps {
  feedbacks: FeedbackItem[];
  provider: string;
  onSelectFeedback?: (feedback: FeedbackItem) => void;
  onWordClick?: (word: string) => void;
  fluencyData: FluencyMetricPoint[];
  stats: TrainerStats;
  isRecording: boolean;
  dailyLogs?: Record<string, TrainingDailyLog>;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  feedbacks,
  provider,
  onSelectFeedback,
  onWordClick,
  fluencyData,
  stats,
  isRecording,
  dailyLogs,
}) => {
  const getIcon = (type: FeedbackItem['type']) => {
    switch (type) {
      case 'warning':
      case 'filler':
        return <AlertCircle size={13} className="text-[#f43f5e] shrink-0" />;
      case 'hedge':
        return <AlertCircle size={13} className="text-[#fbbf24] shrink-0" />;
      case 'good':
        return <CheckCircle size={13} className="text-emerald-400 shrink-0" />;
      case 'vague':
        return <Sparkles size={13} className="text-pink-400 shrink-0" />;
      case 'ai':
      default:
        return <Bot size={13} className="text-purple-400 shrink-0" />;
    }
  };

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <aside className="w-64 md:w-72 bg-black/90 border-l border-zinc-900 flex flex-col justify-between p-4 shrink-0 select-none text-zinc-300 relative h-full">
      {/* Top Header: 💡 实时反馈 matching image.png */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <span className="text-sm">💡</span>
            <h2 className="text-xs font-semibold text-zinc-200 tracking-wide">
              实时反馈
            </h2>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">
            {feedbacks.length} 条建议
          </span>
        </div>

        {/* AI Live Feedback Cards Feed matching image.png exactly */}
        <div className="space-y-1.5 max-h-[42vh] overflow-y-auto pr-1">
          {feedbacks.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-850 text-center text-xs text-zinc-600 space-y-1">
              <p>开始说话后，AI 口语教练将在此给出结构、语调与精准度实时点评。</p>
            </div>
          ) : (
            feedbacks.map((item) => (
              <div
                key={item.id}
                onClick={() => onSelectFeedback?.(item)}
                className="py-1 px-1.5 rounded-md hover:bg-zinc-900/70 transition-colors cursor-pointer group flex items-center justify-between gap-2"
              >
                <p
                  className={`text-xs font-normal tracking-wide leading-relaxed ${
                    item.text.startsWith('「')
                      ? 'text-[#facc15]'
                      : item.text.startsWith('填充词')
                      ? 'text-zinc-300'
                      : 'text-zinc-200'
                  }`}
                >
                  {item.text}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Middle/Bottom: Realtime Fluency & Logic Density Chart with Comparison Mode */}
      <div className="my-2">
        <FluencyChart
          data={fluencyData}
          stats={stats}
          isRecording={isRecording}
          dailyLogs={dailyLogs}
        />
      </div>

      {/* Bottom Footer Watermark with Headphone Mascot (exact match to image.png) */}
      <div className="pt-3 border-t border-zinc-900 flex flex-col items-center justify-center gap-1 text-center shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-600/20 border border-pink-500/40 flex items-center justify-center text-pink-400">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
            <path d="M9 10a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1" />
          </svg>
        </div>
        <span className="text-[10px] text-pink-500/70 font-mono tracking-wide">
          宇宙无敌表达系统 by sisi
        </span>
      </div>
    </aside>
  );
};
