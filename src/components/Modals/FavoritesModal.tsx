import React, { useState } from 'react';
import {
  X,
  Star,
  Copy,
  Trash2,
  Download,
  Search,
  Check,
  Quote,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { FavoriteSentence } from '../../types';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteSentence[];
  onRemoveFavorite: (id: string) => void;
  onClearFavorites: () => void;
}

export const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onRemoveFavorite,
  onClearFavorites,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!isOpen) return null;

  const filtered = favorites.filter((f) =>
    f.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopySingle = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyAll = () => {
    if (favorites.length === 0) return;
    const content = favorites
      .map(
        (f, idx) =>
          `### ${idx + 1}. 金句（${new Date(f.timestamp).toLocaleDateString()}）\n> "${f.text}"\n`
      )
      .join('\n');
    navigator.clipboard.writeText(content);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const handleDownloadMarkdown = () => {
    if (favorites.length === 0) return;
    const content = `# 🌟 Expression Trainer - 我的金句收藏库\n\n生成时间: ${new Date().toLocaleString()}\n总收藏条数: ${
      favorites.length
    }\n\n---\n\n` +
      favorites
        .map(
          (f, idx) =>
            `### ${idx + 1}. 金句摘录\n- **时间**: ${new Date(f.timestamp).toLocaleString()}\n- **评分**: ${
              f.score || 95
            } 分\n\n> "${f.text}"\n\n`
        )
        .join('\n---\n\n');

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ExpressionTrainer-金句库-${new Date().toISOString().slice(0, 10)}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] bg-[#0F172A] border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Star size={18} className="fill-amber-400/20" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>高光金句收藏库</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-semibold">
                  {favorites.length} 条
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                记录在日常训练中涌现出的精彩表达、严谨论述与灵感金句
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索金句内容..."
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-indigo-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 outline-hidden font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            {favorites.length > 0 && (
              <>
                <button
                  onClick={handleCopyAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                  title="复制全部金句为 Markdown"
                >
                  {copiedAll ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copiedAll ? '已复制' : '复制全部'}</span>
                </button>
                <button
                  onClick={handleDownloadMarkdown}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/40 transition-colors cursor-pointer"
                  title="导出为 Markdown 文件"
                >
                  <Download size={13} />
                  <span>导出 .md</span>
                </button>
                <button
                  onClick={onClearFavorites}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-700 transition-colors cursor-pointer"
                  title="清空所有收藏"
                >
                  <Trash2 size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3.5">
          {filtered.length > 0 ? (
            filtered.map((item, idx) => (
              <div
                key={item.id}
                className="bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 rounded-2xl p-4.5 transition-all shadow-sm flex flex-col gap-2.5 group relative"
              >
                {/* Card Top */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold flex items-center justify-center border border-amber-500/20">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(item.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-90">
                    <span className="px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-800/60 text-[10px] font-mono font-bold">
                      ⭐ 评分: {item.score || 95}
                    </span>

                    <button
                      onClick={() => handleCopySingle(item.id, item.text)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="复制单句"
                    >
                      {copiedId === item.id ? (
                        <Check size={13} className="text-emerald-400" />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                    <button
                      onClick={() => onRemoveFavorite(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                      title="取消收藏"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Sentence Quote Body */}
                <div className="flex items-start gap-2.5 text-slate-100 font-sans leading-relaxed text-sm md:text-base">
                  <Quote size={16} className="text-amber-400/60 shrink-0 mt-1 rotate-180" />
                  <p className="flex-1 select-text">{item.text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                <Star size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-400">暂无收藏的金句</p>
                <p className="text-xs text-slate-500">
                  在录音或字幕流中点击每句话旁边的 ⭐ 星标按钮，即可将灵感表达收藏至此
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            金句数据已持久化保存在本地浏览器中
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
