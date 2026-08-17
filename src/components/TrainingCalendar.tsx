import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Flame,
  Clock,
  Type,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { TrainingDailyLog } from '../types';

interface TrainingCalendarProps {
  logs: Record<string, TrainingDailyLog>;
  onAddSampleHistory?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  unlockedAchievementsCount?: number;
  totalAchievementsCount?: number;
  onOpenAchievements?: () => void;
}

export const TrainingCalendar: React.FC<TrainingCalendarProps> = ({
  logs,
  onAddSampleHistory,
  isOpen,
  onToggle,
  unlockedAchievementsCount = 0,
  totalAchievementsCount = 11,
  onOpenAchievements,
}) => {
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Generate date list for the last 60 days for heatmap
  const getPastDays = (count: number) => {
    const days: string[] = [];
    const today = new Date();
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  };

  const past60Days = getPastDays(70);

  // Calculate streak & aggregate stats
  const totalDays = Object.keys(logs).length;
  let totalSeconds = 0;
  let totalWords = 0;

  Object.values(logs).forEach((log) => {
    totalSeconds += log.durationSeconds || 0;
    totalWords += log.wordCount || 0;
  });

  // Calculate current streak
  let currentStreak = 0;
  const checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().slice(0, 10);
    if (logs[dateStr] && (logs[dateStr].durationSeconds > 0 || logs[dateStr].wordCount > 0)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      // If today is empty, check if yesterday was trained
      if (currentStreak === 0) {
        checkDate.setDate(checkDate.getDate() - 1);
        const yesterdayStr = checkDate.toISOString().slice(0, 10);
        if (logs[yesterdayStr]) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
      }
      break;
    }
  }

  // Heatmap intensity level (0 - 4)
  const getIntensity = (dateStr: string) => {
    const log = logs[dateStr];
    if (!log || (log.durationSeconds === 0 && log.wordCount === 0)) return 0;
    const minutes = log.durationSeconds / 60;
    if (minutes > 20 || log.wordCount > 1500) return 4;
    if (minutes > 10 || log.wordCount > 800) return 3;
    if (minutes > 3 || log.wordCount > 200) return 2;
    return 1;
  };

  const getCellColor = (level: number) => {
    switch (level) {
      case 4:
        return 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
      case 3:
        return 'bg-emerald-500 border-emerald-400';
      case 2:
        return 'bg-emerald-700/80 border-emerald-600/60';
      case 1:
        return 'bg-emerald-950 border-emerald-800/80 text-emerald-300';
      default:
        return 'bg-slate-900 border-slate-800/80 hover:border-slate-700';
    }
  };

  const selectedLog = selectedDay ? logs[selectedDay] : null;

  return (
    <footer className="w-full bg-[#0A0E17] border-t border-slate-800 shrink-0 transition-all select-none z-20">
      {/* Collapsed Header Bar */}
      <div
        onClick={onToggle}
        className="px-6 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition-colors"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CalendarIcon size={14} />
            </span>
            <span className="text-xs font-bold text-slate-200">
              训练日历与频次热力图
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1 text-amber-300">
              <Flame size={13} className="fill-amber-400 text-amber-400" />
              <span>连续练说 <strong>{currentStreak}</strong> 天</span>
            </div>
            {onOpenAchievements && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAchievements();
                }}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:text-purple-100 hover:border-purple-400 transition-colors cursor-pointer"
                title="查看已解锁成就"
              >
                <Award size={12} className="text-purple-400" />
                <span>成就 {unlockedAchievementsCount}/{totalAchievementsCount}</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1 text-slate-400">
              <Clock size={12} className="text-indigo-400" />
              <span>累计 {Math.round(totalSeconds / 60)} 分钟</span>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-slate-400">
              <Type size={12} className="text-sky-400" />
              <span>累计 {totalWords} 字</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-sans text-slate-400 hidden md:inline">
            {isOpen ? '收起日历' : '展开日历与频次热力图'}
          </span>
          <button
            type="button"
            className="p-1 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 transition-colors"
          >
            {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Heatmap & Calendar View */}
      {isOpen && (
        <div className="px-6 pb-5 pt-2 border-t border-slate-800/60 bg-slate-950/90 space-y-4 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* Heatmap Grid */}
            <div className="flex-1 w-full overflow-x-auto pb-2">
              <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center justify-between">
                <span>近 10 周训练频率热力图：</span>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                  <span>少</span>
                  <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 border border-slate-800" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-950 border border-emerald-800" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-700/80" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                  <span className="w-2.5 h-2.5 rounded-xs bg-emerald-400" />
                  <span>多</span>
                </div>
              </div>

              <div className="flex gap-1.5 min-w-max items-center">
                {past60Days.map((dateStr) => {
                  const level = getIntensity(dateStr);
                  const isSelected = selectedDay === dateStr;
                  const log = logs[dateStr];

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDay(dateStr)}
                      title={`${dateStr}: ${
                        log
                          ? `${Math.round(log.durationSeconds / 60)} 分钟 · ${log.wordCount} 字`
                          : '未进行练说'
                      }`}
                      className={`w-3.5 h-3.5 rounded-xs border cursor-pointer transition-all transform hover:scale-125 ${getCellColor(
                        level
                      )} ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-slate-950' : ''}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Selected Day Info or Quick Actions */}
            <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
              {selectedDay && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs flex items-center gap-3 shadow-sm">
                  <div className="font-mono font-bold text-slate-200">{selectedDay}</div>
                  <div className="text-slate-400">
                    {selectedLog ? (
                      <span>
                        ⏱️ <strong className="text-emerald-400">{Math.round(selectedLog.durationSeconds / 60)}</strong> 分钟 · ✍️ <strong className="text-sky-400">{selectedLog.wordCount}</strong> 字
                      </span>
                    ) : (
                      <span className="text-slate-500">该日无记录</span>
                    )}
                  </div>
                </div>
              )}

              {onAddSampleHistory && (
                <button
                  type="button"
                  onClick={onAddSampleHistory}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  title="生成模拟历史记录便于查看热力图效果"
                >
                  <Sparkles size={12} className="text-amber-400" />
                  <span>生成打卡范例</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  );
};
