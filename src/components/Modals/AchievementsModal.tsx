import React, { useState } from 'react';
import {
  X,
  Award,
  Flame,
  Star,
  Zap,
  TrendingUp,
  Type,
  Clock,
  Crown,
  Sparkles,
  Mic,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { Achievement } from '../../types';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  isOpen,
  onClose,
  achievements,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'locked'>('all');

  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const percentComplete = Math.round((unlockedCount / totalCount) * 100);

  const filtered = achievements.filter((a) => {
    if (activeTab === 'unlocked') return a.unlocked;
    if (activeTab === 'locked') return !a.unlocked;
    return true;
  });

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'Mic':
        return <Mic size={20} />;
      case 'Flame':
        return <Flame size={20} />;
      case 'Crown':
        return <Crown size={20} />;
      case 'Type':
        return <Type size={20} />;
      case 'Award':
        return <Award size={20} />;
      case 'TrendingUp':
        return <TrendingUp size={20} />;
      case 'Zap':
        return <Zap size={20} />;
      case 'Star':
        return <Star size={20} />;
      case 'Sparkles':
        return <Sparkles size={20} />;
      case 'Clock':
        return <Clock size={20} />;
      default:
        return <Award size={20} />;
    }
  };

  const getBadgeGradient = (color: string, unlocked: boolean) => {
    if (!unlocked) return 'bg-slate-900 border-slate-800 text-slate-600';
    switch (color) {
      case 'amber':
      case 'orange':
        return 'bg-gradient-to-br from-amber-500/20 to-orange-600/30 border-amber-500/50 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]';
      case 'rose':
        return 'bg-gradient-to-br from-rose-500/20 to-pink-600/30 border-rose-500/50 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]';
      case 'emerald':
        return 'bg-gradient-to-br from-emerald-500/20 to-teal-600/30 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]';
      case 'cyan':
        return 'bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]';
      case 'purple':
        return 'bg-gradient-to-br from-purple-500/20 to-indigo-600/30 border-purple-500/50 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.25)]';
      default:
        return 'bg-gradient-to-br from-indigo-500/20 to-blue-600/30 border-indigo-500/50 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.25)]';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-[#0F172A] border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="relative px-6 pt-6 pb-5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/70 border-b border-slate-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-md">
                <Crown size={24} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span>口语表达成长成就殿堂</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold">
                    Lv.{Math.floor(unlockedCount / 2) + 1} 演说家
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  解锁各项口语习惯打卡与流利度里程碑，激励每日刻意练习
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-4 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400 font-medium">总达成进度</span>
              <span className="font-mono font-bold text-indigo-300">
                {unlockedCount} / {totalCount} ({percentComplete}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            全部成就 ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab('unlocked')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'unlocked'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            已解锁 ({unlockedCount})
          </button>
          <button
            onClick={() => setActiveTab('locked')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'locked'
                ? 'bg-slate-800 text-slate-200 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            未解锁 ({totalCount - unlockedCount})
          </button>
        </div>

        {/* Achievements Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {filtered.map((ach) => (
            <div
              key={ach.id}
              className={`p-4 rounded-2xl border transition-all flex items-start gap-3.5 relative overflow-hidden ${
                ach.unlocked
                  ? 'bg-slate-900/90 border-slate-700/80 hover:border-indigo-500/50'
                  : 'bg-slate-950/60 border-slate-800/60 opacity-65'
              }`}
            >
              {/* Badge Icon */}
              <div
                className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${getBadgeGradient(
                  ach.color,
                  ach.unlocked
                )}`}
              >
                {ach.unlocked ? getIconComponent(ach.icon) : <Lock size={18} className="text-slate-600" />}
              </div>

              {/* Text Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h3
                    className={`text-xs font-bold truncate ${
                      ach.unlocked ? 'text-slate-100' : 'text-slate-400'
                    }`}
                  >
                    {ach.title}
                  </h3>
                  {ach.unlocked && (
                    <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {ach.description}
                </p>

                {/* Progress bar for locked */}
                {!ach.unlocked && (
                  <div className="pt-1.5 space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>进度</span>
                      <span>
                        {ach.currentValue} / {ach.targetValue} {ach.unit}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: `${ach.progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            每天持续练说 5-10 分钟，快速积累勋章
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
