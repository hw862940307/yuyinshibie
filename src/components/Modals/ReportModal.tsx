import React, { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Copy, Download, Check, FileText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { TrainerStats } from '../../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportMarkdown: string;
  isLoading: boolean;
  error: string | null;
  fullText: string;
  stats: TrainerStats;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportMarkdown,
  isLoading,
  error,
  fullText,
  stats,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  useEffect(() => {
    if (isOpen && reportMarkdown && !isLoading) {
      // Trigger subtle celebratory confetti
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F43F5E', '#A855F7', '#38BDF8'],
      });
    }
  }, [isOpen, reportMarkdown, isLoading]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
    const filename = `宇宙无敌表达训练报告-${dateStr}-${timeStr}.md`;

    const fullContent = `# 🚀 宇宙无敌表达训练报告\n\n- **日期**: ${now.toLocaleString()}\n- **时长**: ${stats.duration}秒\n- **总字数**: ${stats.totalWords}字\n- **表达密度**: ${
      stats.totalWords > 0
        ? Math.round(((stats.totalWords - stats.fillers - stats.hedges) / stats.totalWords) * 100)
        : 100
    }%\n\n---\n\n## 🎙️ 录音完整原文\n\n${fullText}\n\n---\n\n${reportMarkdown}`;

    const blob = new Blob([fullContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-[#0A0D14] border border-zinc-800/90 rounded-2xl flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching Image 1: 📄 表达分析报告 | 📄 复制全文 | ✕ | 💾 保存为 Markdown */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800/80 bg-[#07090E] shrink-0 select-none">
          <div className="flex items-center gap-2 text-zinc-100 font-semibold text-sm">
            <FileText size={16} className="text-pink-500" />
            <h2 className="text-sm font-bold tracking-wide text-zinc-100">表达分析报告</h2>
          </div>

          <div className="flex items-center gap-2">
            {reportMarkdown && !isLoading && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700/80 transition-colors cursor-pointer"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                  <span>{copied ? '已复制' : '复制全文'}</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all cursor-pointer"
                >
                  {saved ? <Check size={13} /> : <Download size={13} />}
                  <span>{saved ? '已保存' : '保存为 Markdown'}</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
            >
              <X size={17} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 text-zinc-200 leading-relaxed text-sm">
          {isLoading && (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
              <div className="space-y-1.5">
                <p className="text-sm font-bold text-zinc-100">宇宙无敌 AI 教练正在生成深度分析报告...</p>
                <p className="text-xs text-zinc-400">
                  正在进行：逐句行编辑优化、冲突回避模式识别、情感与分级词库替换及刻意训练重点
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm">
              <p className="font-semibold mb-1">报告生成失败</p>
              <p className="text-xs text-rose-400">{error}</p>
            </div>
          )}

          {!isLoading && !error && reportMarkdown && (
            <div className="space-y-6 font-sans">
              {/* Summary stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/90 text-xs font-mono">
                <div className="text-center">
                  <span className="text-zinc-400 block text-[10px]">时长</span>
                  <span className="text-zinc-100 font-bold">{stats.duration}s</span>
                </div>
                <div className="text-center">
                  <span className="text-zinc-400 block text-[10px]">总字数</span>
                  <span className="text-zinc-100 font-bold">{stats.totalWords}字</span>
                </div>
                <div className="text-center">
                  <span className="text-zinc-400 block text-[10px]">填充词</span>
                  <span className="text-pink-400 font-bold">{stats.fillers}次</span>
                </div>
                <div className="text-center">
                  <span className="text-zinc-400 block text-[10px]">犹豫弱化</span>
                  <span className="text-amber-400 font-bold">{stats.hedges}次</span>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <span className="text-zinc-400 block text-[10px]">笼统词</span>
                  <span className="text-indigo-400 font-bold">{stats.vagueWords}次</span>
                </div>
              </div>

              {/* Styled Report Content matching Image 1 */}
              <div className="report-markdown prose prose-invert max-w-none prose-headings:text-pink-400 prose-headings:font-bold prose-h3:text-pink-400 prose-h3:text-base prose-h3:mt-6 prose-h3:mb-3 prose-h3:border-b prose-h3:border-zinc-800/80 prose-h3:pb-1.5 prose-blockquote:border-l-pink-500 prose-blockquote:bg-zinc-900/60 prose-blockquote:py-1.5 prose-blockquote:px-3 prose-blockquote:rounded-r-lg prose-blockquote:text-zinc-200 prose-table:border prose-table:border-zinc-800 prose-th:bg-zinc-900 prose-th:text-pink-300 prose-th:p-2 prose-td:border-zinc-800 prose-td:p-2">
                <ReactMarkdown>{reportMarkdown}</ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
