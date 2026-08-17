import React, { useState } from 'react';
import {
  BarChart2,
  Sparkles,
  Zap,
  Clock,
  Github,
  Info,
  Twitter,
  User,
  Menu,
  ChevronRight,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { TrainerStats, Suggestion } from '../types';

interface LeftPanelProps {
  stats: TrainerStats;
  suggestions: Suggestion[];
  onWordClick: (word: string) => void;
  onOpenInfo?: () => void;
  onToggleLexiconModal?: () => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  stats,
  suggestions,
  onWordClick,
  onOpenInfo,
  onToggleLexiconModal,
}) => {
  const [showVocabUpgrade, setShowVocabUpgrade] = useState(true);

  const density =
    stats.totalWords > 0
      ? Math.max(0, Math.round(((stats.totalWords - stats.fillers - stats.hedges) / stats.totalWords) * 100))
      : 0;

  const wpm = stats.duration > 0 ? Math.round((stats.totalWords / stats.duration) * 60) : 0;

  return (
    <aside className="w-60 md:w-64 bg-black/90 border-r border-zinc-900 flex flex-col justify-between p-4 shrink-0 select-none text-zinc-300 relative h-full">
      {/* Top Section: Expression Analytics */}
      <div className="flex flex-col gap-4">
        {/* Header Title as in image.png */}
        <div className="flex items-center gap-2 pb-2.5 border-b border-zinc-800/80">
          <div className="w-3.5 h-3.5 rounded-xs bg-gradient-to-tr from-pink-500 via-rose-400 to-amber-300 flex items-center justify-center p-0.5">
            <div className="w-full h-full bg-black/60 rounded-[1px]" />
          </div>
          <h2 className="text-xs font-semibold text-zinc-200 tracking-wide">
            表达分析
          </h2>
        </div>

        {/* 4 Core Metrics List directly matching image.png */}
        <div className="flex flex-col gap-3.5 pt-1 text-xs">
          {/* 笼统词 */}
          <div className="flex items-center justify-between group">
            <span className="text-zinc-400 font-normal group-hover:text-zinc-200 transition-colors">
              笼统词
            </span>
            <span className="font-mono text-sm font-bold text-[#f43f5e] tracking-tight">
              {stats.vagueWords}
            </span>
          </div>

          {/* 填充词 */}
          <div className="flex items-center justify-between group">
            <span className="text-zinc-400 font-normal group-hover:text-zinc-200 transition-colors">
              填充词
            </span>
            <span className="font-mono text-sm font-bold text-[#f43f5e] tracking-tight">
              {stats.fillers}
            </span>
          </div>

          {/* 犹豫词 */}
          <div className="flex items-center justify-between group">
            <span className="text-zinc-400 font-normal group-hover:text-zinc-200 transition-colors">
              犹豫词
            </span>
            <span className="font-mono text-sm font-bold text-[#fbbf24] tracking-tight">
              {stats.hedges}
            </span>
          </div>

          {/* 表达密度 */}
          <div className="flex items-center justify-between group">
            <span className="text-zinc-400 font-normal group-hover:text-zinc-200 transition-colors">
              表达密度
            </span>
            <span className={`font-mono text-xs font-bold ${stats.totalWords > 0 ? 'text-emerald-400' : 'text-emerald-500/70'}`}>
              {stats.totalWords > 0 ? `${density}%` : '——'}
            </span>
          </div>
        </div>

        {/* Secondary Meta Stats */}
        <div className="mt-2 py-2 px-2.5 rounded-lg bg-zinc-950/80 border border-zinc-900 flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">字数:</span>
            <span className="text-zinc-200 font-bold">{stats.totalWords}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-zinc-500">语速:</span>
            <span className="text-zinc-200 font-bold">{wpm > 0 ? `${wpm}w/m` : '--'}</span>
          </div>
        </div>

        {/* Expandable Vocabulary Upgrades Recommendations */}
        <div className="flex flex-col gap-1.5 mt-2">
          <button
            onClick={() => setShowVocabUpgrade((v) => !v)}
            className="flex items-center justify-between py-1 text-[11px] font-medium text-zinc-400 hover:text-pink-400 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sparkles size={11} className="text-pink-500" />
              精准词升级推荐
            </span>
            {showVocabUpgrade ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>

          {showVocabUpgrade && (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
              {suggestions.length > 0 ? (
                suggestions.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-zinc-950/90 border border-zinc-800/80 text-[11px] space-y-1"
                  >
                    {s.type === 'vague' && s.original ? (
                      <div>
                        <div className="text-zinc-400">
                          说 <span className="text-pink-400 font-medium">「{s.original}」</span> 建议替换：
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {s.alternatives?.map((alt, aidx) => (
                            <button
                              key={aidx}
                              onClick={() => onWordClick(s.original!)}
                              className="px-1.5 py-0.5 rounded bg-pink-950/40 hover:bg-pink-900/60 text-pink-300 border border-pink-700/40 text-[10px] cursor-pointer"
                            >
                              {alt}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-zinc-300 leading-snug">{s.message}</p>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-2 px-1 text-[10px] text-zinc-600 italic">
                  实时捕捉口头禅与笼统词，智能提示高阶替代表达...
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Floating Toolbar pill exactly like image.png */}
      <div className="flex flex-col gap-3 pt-4 border-t border-zinc-900">
        {/* The Black Pill with Icons */}
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-1.5 flex flex-col items-center gap-2.5 shadow-lg shadow-black/50 w-fit">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            title="GitHub 仓库"
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Github size={15} />
          </a>
          <button
            onClick={onOpenInfo}
            title="系统使用说明"
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Info size={15} />
          </button>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noreferrer"
            title="官方动态"
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Twitter size={15} />
          </a>
          <button
            onClick={onOpenInfo}
            title="个人表达档案"
            className="p-1 text-zinc-400 hover:text-pink-400 transition-colors cursor-pointer"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-[10px] text-white font-bold">
              s
            </div>
          </button>
        </div>

        {/* The Magenta Hamburger Menu button at bottom left like in image.png */}
        <button
          onClick={onToggleLexiconModal}
          title="系统功能菜单 / 词库设置"
          className="w-8 h-8 rounded-lg border border-pink-500/40 bg-pink-950/20 hover:bg-pink-900/40 text-pink-400 flex items-center justify-center transition-all cursor-pointer shadow-xs"
        >
          <Menu size={16} />
        </button>
      </div>
    </aside>
  );
};
