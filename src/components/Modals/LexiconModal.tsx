import React, { useState } from 'react';
import { X, Search, BookOpen, Sparkles, Filter } from 'lucide-react';
import { TIERED_MAP, CATEGORY_NAMES, analyzeText } from '../../lib/lexicon';

interface LexiconModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectWord: (word: string) => void;
}

export const LexiconModal: React.FC<LexiconModalProps> = ({ isOpen, onClose, onSelectWord }) => {
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playgroundText, setPlaygroundText] = useState<string>(
    '今天我很开心，做了一个很大的项目，感觉特别有意思，虽然很累但是大家都很喜欢。'
  );

  if (!isOpen) return null;

  const categories = Object.entries(CATEGORY_NAMES);

  const filteredWords = Object.entries(TIERED_MAP).filter(([word, info]) => {
    const matchesQuery =
      !searchQuery ||
      word.includes(searchQuery) ||
      info.alternatives.some((a) => a.includes(searchQuery)) ||
      info.category.includes(searchQuery);

    const matchesCategory = activeTab === 'all' || info.category === CATEGORY_NAMES[activeTab] || info.category === activeTab;

    return matchesQuery && matchesCategory;
  });

  const analysis = analyzeText(playgroundText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0F172A] border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <BookOpen size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">分级词库浏览与精准词替换演练</h2>
              <p className="text-xs text-slate-400">收录 9 大类万能词与笼统词，提供具象化与高感染力精准替代词</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Top Interactive Playground */}
        <div className="p-5 bg-slate-900/60 border-b border-slate-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              词库实时演练测试框（输入或修改测试词库高亮）
            </span>
            {analysis && (
              <span className="text-[11px] font-mono text-slate-400">
                检测到 <b className="text-amber-400">{analysis.vagueWords.length}</b> 个笼统词 | 表达密度{' '}
                <b className="text-emerald-400">{analysis.density}%</b>
              </span>
            )}
          </div>
          <input
            type="text"
            value={playgroundText}
            onChange={(e) => setPlaygroundText(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-slate-100 text-xs outline-hidden transition-colors font-sans"
            placeholder="输入一句话测试词库高亮与精准词匹配..."
          />
          {analysis && analysis.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {analysis.suggestions.map((s, i) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-medium"
                >
                  {s.message}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-900/40 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索词汇或替代词（例如：开心、很大、做、生气）..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-hidden"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'all'
                  ? 'bg-indigo-600 text-white font-bold'
                  : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              全部 ({Object.keys(TIERED_MAP).length})
            </button>
            {categories.map(([key, name]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === key
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white border border-slate-700/60'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Word Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredWords.length > 0 ? (
            filteredWords.map(([word, info], idx) => (
              <div
                key={idx}
                onClick={() => {
                  onSelectWord(word);
                  onClose();
                }}
                className="bg-slate-800/50 hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-700/80 hover:border-indigo-500/60 transition-all flex flex-col justify-between cursor-pointer group shadow-xs"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm font-bold text-amber-300 group-hover:text-amber-200">
                    「{word}」
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-slate-400 border border-slate-700/80">
                    {info.category}
                  </span>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 mb-1 font-semibold uppercase tracking-wider">精准升级替代：</div>
                  <div className="flex flex-wrap gap-1">
                    {info.alternatives.slice(0, 5).map((alt, aidx) => (
                      <span
                        key={aidx}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900/80 text-slate-200 group-hover:text-indigo-300 font-medium"
                      >
                        {alt}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center text-xs text-slate-500">
              未找到匹配的词汇或类别
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-900/90 text-xs text-slate-400 flex items-center justify-between shrink-0 font-mono">
          <span>收录 {filteredWords.length} 个万能词精准替换条目</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 text-xs font-sans font-semibold transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
