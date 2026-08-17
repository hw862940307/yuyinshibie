import React, { useState } from 'react';
import { X, ClipboardPaste, Sparkles, FileText } from 'lucide-react';

interface PasteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitText: (text: string) => void;
}

const PRESET_SNIPPETS = [
  {
    name: '工作汇报/述职',
    content: `嗯，我今天主要想向大家汇报一下我们上个季度的项目进展。那个，我们团队做了一个很大的系统升级，效果非常不错。我觉得虽然过程中遇到了一些不舒服的阻力，但是大家很快就把问题解决了。接下来我们渴望把核心功能落地，打造出更完美的产品。`,
  },
  {
    name: '即兴表达/观点阐述',
    content: `为什么很多优秀的创新往往出现在跨学科的边缘？因为单一视角的思维往往会陷入盲区。当我们审视历史上的重大突破，会发现无论是相对论还是现代设计，核心都在于打破既有边界。因此，我们不能仅仅停留在觉得还行的舒适区，而是要勇敢地探索未知。`,
  },
  {
    name: '面试自我介绍',
    content: `面试官您好，我叫小明。其实吧，在过去的三年里，我主要在做全栈架构研发。我很多时候会负责高并发模块的攻坚。然后我感觉自己最大的优势就是执行力很强，能够迅速推进复杂任务。`,
  },
];

export const PasteModal: React.FC<PasteModalProps> = ({ isOpen, onClose, onSubmitText }) => {
  const [text, setText] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmitText(text.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-[#0F172A] border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ClipboardPaste size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">粘贴口语逐字稿 / 文本</h2>
              <p className="text-xs text-slate-400">无需麦克风，直接粘贴长文本进行实时词库分析与 AI 复盘</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300">输入或粘贴文本</label>
            <span className="text-xs text-slate-400 font-mono">{text.length} 字</span>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="请在此粘贴您的口语录音逐字稿、会议发言、演讲稿或面试练习文本..."
            rows={8}
            className="w-full bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-xl p-4 text-slate-100 placeholder-slate-500 text-sm leading-relaxed outline-hidden transition-colors resize-none font-sans"
            autoFocus
          />

          <div className="space-y-2">
            <div className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Sparkles size={13} className="text-amber-400" />
              <span>快速填入典型口语范例：</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_SNIPPETS.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setText(item.content)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700/80 font-medium transition-colors cursor-pointer"
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors disabled:opacity-40 cursor-pointer tracking-wide"
            >
              <FileText size={14} />
              <span>开始分析逐字稿</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
