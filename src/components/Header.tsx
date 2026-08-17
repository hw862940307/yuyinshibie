import React, { useState, useRef, useEffect } from 'react';
import { Target, Settings, Award, Star, Calendar, FolderDown, ChevronDown, Check, Globe, BookOpen } from 'lucide-react';
import { SUPPORTED_LANGUAGES, SpeechLanguageOption } from '../types';

interface HeaderProps {
  timer: string;
  lang: string;
  currentLanguageCode?: string;
  onSelectLanguage?: (code: string) => void;
  onToggleLang?: () => void;
  isRecording: boolean;
  audioVolume: number;
  favoritesCount?: number;
  unlockedAchievementsCount?: number;
  totalAchievementsCount?: number;
  onOpenAchievements: () => void;
  onOpenFavorites: () => void;
  onToggleCalendar: () => void;
  onOpenPromptEditor: () => void;
  onOpenSettings: () => void;
  onOpenModelDownload?: () => void;
  onOpenStandardReference?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  timer,
  lang,
  currentLanguageCode = 'zh-CN',
  onSelectLanguage,
  onToggleLang,
  isRecording,
  audioVolume,
  favoritesCount = 0,
  unlockedAchievementsCount = 0,
  totalAchievementsCount = 11,
  onOpenAchievements,
  onOpenFavorites,
  onToggleCalendar,
  onOpenPromptEditor,
  onOpenSettings,
  onOpenModelDownload,
  onOpenStandardReference,
}) => {
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeLangOption =
    SUPPORTED_LANGUAGES.find((item) => item.code === currentLanguageCode) ||
    SUPPORTED_LANGUAGES.find((item) => item.code === 'zh-CN') ||
    SUPPORTED_LANGUAGES[0];

  const handleLanguagePick = (code: string) => {
    if (onSelectLanguage) {
      onSelectLanguage(code);
    } else if (onToggleLang) {
      onToggleLang();
    }
    setIsLangMenuOpen(false);
  };

  return (
    <header className="h-12 bg-black border-b border-zinc-900 px-4 md:px-6 flex items-center justify-between shrink-0 select-none relative z-50">
      {/* Brand Title: 宇宙无敌表达训练系统 */}
      <div className="flex items-center gap-3">
        <h1 className="text-xs md:text-sm font-medium text-zinc-200 tracking-wide">
          宇宙无敌表达训练系统
        </h1>
        {isRecording && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-pink-950/60 border border-pink-500/40 text-[10px] font-mono text-pink-300">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
            <span>实时录音中</span>
          </div>
        )}
      </div>

      {/* Right Action Icons as in image.png and Image 2 */}
      <div className="flex items-center gap-2 md:gap-3 text-zinc-300">
        {/* Timer Display */}
        <div className="font-mono text-xs text-zinc-400 font-semibold px-2 py-1">
          {timer}
        </div>

        {/* 离线语音识别大模型下载 (Sherpa-ONNX 流式中英双语模型) */}
        {onOpenModelDownload && (
          <button
            onClick={onOpenModelDownload}
            title="下载与管理语音识别大模型 (Sherpa-ONNX 流式中英双语模型)"
            className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-pink-500/40 bg-pink-950/30 hover:bg-pink-900/50 text-pink-300 text-[11px] font-medium transition-all cursor-pointer shadow-xs"
          >
            <FolderDown size={13} className="text-pink-400" />
            <span className="hidden sm:inline">模型下载</span>
          </button>
        )}

        {/* Language Selector Dropdown matching Image 2 */}
        <div className="relative" ref={langMenuRef}>
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            title="选择口语识别方言与语言 (支持四川话/重庆话、普通话、粤语、英文等)"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-pink-500/40 bg-pink-950/25 hover:bg-pink-900/40 text-pink-300 text-xs font-medium transition-all cursor-pointer shadow-xs"
          >
            <Globe size={12} className="text-pink-400" />
            <span className="font-mono text-[11px] font-semibold">{activeLangOption.short}</span>
            <ChevronDown size={12} className={`text-pink-400 transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu (matching Image 2) */}
          {isLangMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#0c101a] border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden py-1.5 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800/80 mb-1 flex items-center justify-between">
                <span>方言与语言模型</span>
                <span className="text-pink-400 font-mono">ASR Dialect</span>
              </div>
              {SUPPORTED_LANGUAGES.map((option) => {
                const isSelected = option.code === currentLanguageCode;
                return (
                  <button
                    key={option.code}
                    onClick={() => handleLanguagePick(option.code)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-700/80 text-white font-medium'
                        : 'text-zinc-300 hover:bg-zinc-800/70 hover:text-zinc-100'
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {isSelected && <Check size={14} className="text-pink-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 标准范读与语调波形对比 */}
        {onOpenStandardReference && (
          <button
            onClick={onOpenStandardReference}
            title="标准范读音频与波形语调对比"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-emerald-500/40 bg-emerald-950/25 hover:bg-emerald-900/40 text-emerald-300 text-xs font-medium transition-all cursor-pointer shadow-xs"
          >
            <BookOpen size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">范读对比</span>
          </button>
        )}

        {/* 成就勋章快速入口 */}
        <button
          onClick={onOpenAchievements}
          title="口语成长成就与勋章殿堂"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-purple-300 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <Award size={15} />
        </button>

        {/* 高光金句 */}
        <button
          onClick={onOpenFavorites}
          title="高光金句收藏库"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-300 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <Star size={15} className={favoritesCount > 0 ? 'fill-amber-400 text-amber-400' : ''} />
        </button>

        {/* 打卡日历 */}
        <button
          onClick={onToggleCalendar}
          title="每日训练打卡热力图"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-300 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <Calendar size={15} />
        </button>

        {/* Target / Prompt Icon 🎯 */}
        <button
          onClick={onOpenPromptEditor}
          title="配置专属口语教练提示词与演练情境"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-pink-400 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <Target size={16} />
        </button>

        {/* Settings Icon ⚙️ */}
        <button
          onClick={onOpenSettings}
          title="模型与API设置"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors cursor-pointer"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
};
