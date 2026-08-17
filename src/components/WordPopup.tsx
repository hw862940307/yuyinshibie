import React from 'react';
import { Sparkles, X, ArrowRight } from 'lucide-react';
import { TIERED_MAP } from '../lib/lexicon';

interface WordPopupProps {
  word: string | null;
  onClose: () => void;
  onSelectAlternative?: (alt: string) => void;
}

export const WordPopup: React.FC<WordPopupProps> = ({ word, onClose, onSelectAlternative }) => {
  if (!word) return null;

  const info = TIERED_MAP[word];
  const alternatives = info?.alternatives || [];
  const category = info?.category || '常用词汇';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-[#0F172A] border border-slate-700 rounded-2xl p-6 shadow-2xl shadow-slate-950/60 animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Sparkles size={16} />
            </span>
            <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">精准词汇升级推荐</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-400">原词:</span>
            <span className="text-xl font-bold text-amber-300">「{word}」</span>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 ml-auto font-medium">
              {category}
            </span>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-2.5 flex items-center gap-1.5">
              <span>可升级替换为更具画面感与说服力的词：</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {alternatives.length > 0 ? (
                alternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (onSelectAlternative) onSelectAlternative(alt);
                      onClose();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-indigo-600 text-slate-200 hover:text-white border border-slate-700/80 hover:border-indigo-500 text-xs font-semibold tracking-wide transition-all group"
                  >
                    <span>{alt}</span>
                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all text-white" />
                  </button>
                ))
              ) : (
                <div className="text-xs text-slate-500 italic">暂无专门扩展，建议使用更具象的场景描述。</div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};
