import React, { useState } from 'react';
import { X, Lock, Sparkles, Check, RotateCcw, HelpCircle } from 'lucide-react';
import { CustomPromptConfig } from '../../types';

interface PromptEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CustomPromptConfig;
  onSave: (config: CustomPromptConfig) => void;
}

export const PromptEditorModal: React.FC<PromptEditorModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [goals, setGoals] = useState(config.goals);
  const [customRules, setCustomRules] = useState(config.customRules);
  const [styleRef, setStyleRef] = useState(config.styleRef);
  const [customWords, setCustomWords] = useState(config.customWords);
  const [showGoalsExample, setShowGoalsExample] = useState(false);
  const [showRulesExample, setShowRulesExample] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ goals, customRules, styleRef, customWords });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    if (window.confirm('确定要清空并重置所有自定义规则吗？')) {
      setGoals('');
      setCustomRules('');
      setStyleRef('');
      setCustomWords('');
      onSave({ goals: '', customRules: '', styleRef: '', customWords: '' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[90vh] bg-[#0F172A] border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">训练规则与目标定制</h2>
              <p className="text-xs text-slate-400">底层词库与基础规则始终生效，可叠加个人专属训练目标与触发器</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Section 1: Locked base rules */}
          <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock size={13} className="text-slate-500" />
                底层系统规则（内置生效）
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-mono font-bold uppercase">锁定</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              包含 14 条核心实时反馈规则（重复检测、结论缺失、自问自答、听众视角、前后矛盾、时间感知、金句捕捉、抽象转具象等）+ 650+ 情感与分级词库。
            </p>
          </div>

          {/* Section 2: Goals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">我的训练目标</label>
              <button
                type="button"
                onClick={() => setShowGoalsExample(!showGoalsExample)}
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <HelpCircle size={12} />
                <span>{showGoalsExample ? '收起示例' : '💡 看示例'}</span>
              </button>
            </div>
            <textarea
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
              placeholder="例如：&#10;- 我想减少说「然后」「就是」的频率&#10;- 我想练习每段话都有一个明确结论&#10;- 我想让表达更有画面感，多用具体数字"
              className="w-full h-24 bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-slate-100 placeholder-slate-500 text-xs leading-relaxed outline-hidden transition-colors resize-none font-sans"
            />
            {showGoalsExample && (
              <div className="p-3 bg-slate-900 border border-dashed border-slate-700 rounded-xl text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-200">目标示例：</p>
                <p>1. 说话太散，经常跑题，一段话说完别人不知道我想表达什么</p>
                <p>2. 口癖「然后」「就是」太多，听起来不够干练专业</p>
                <p>3. 描述事情总是用笼统词汇（如「很好」「挺不错的」），缺少具体画面</p>
              </div>
            )}
          </div>

          {/* Section 3: Custom Rules */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300">自定义触发规则</label>
              <button
                type="button"
                onClick={() => setShowRulesExample(!showRulesExample)}
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer font-medium"
              >
                <HelpCircle size={12} />
                <span>{showRulesExample ? '收起示例' : '💡 看示例'}</span>
              </button>
            </div>
            <textarea
              value={customRules}
              onChange={(e) => setCustomRules(e.target.value)}
              placeholder="格式：触发条件 → 输出什么提示&#10;- 连续3句以「我」开头 → 「换个主语」&#10;- 出现「其实吧」「说实话」 → 「直接说」&#10;- 超过30秒没举例子 → 「来个例子」"
              className="w-full h-24 bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-slate-100 placeholder-slate-500 text-xs leading-relaxed outline-hidden transition-colors resize-none font-sans"
            />
            {showRulesExample && (
              <div className="p-3 bg-slate-900 border border-dashed border-slate-700 rounded-xl text-xs text-slate-400 space-y-1">
                <p className="font-semibold text-slate-200">规则示例：</p>
                <p>- 连续说了两个「非常」 → 「换个程度词」</p>
                <p>- 出现「怎么说呢」 → 「别绕，直说」</p>
                <p>- 讲了一个观点但没给原因 → 「为什么？」</p>
              </div>
            )}
          </div>

          {/* Section 4: Style Reference */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">我想要的表达风格</label>
            <textarea
              value={styleRef}
              onChange={(e) => setStyleRef(e.target.value)}
              placeholder="例如：&#10;- 像跟朋友聊天一样自然直接，不要播音腔&#10;- 多用第二人称「你」直接对听众说话&#10;- 先说结论再展开，不搞漫长铺垫"
              className="w-full h-20 bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-slate-100 placeholder-slate-500 text-xs leading-relaxed outline-hidden transition-colors resize-none font-sans"
            />
          </div>

          {/* Section 5: Custom Habit Words */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">我的专属口癖词补充</label>
            <input
              type="text"
              value={customWords}
              onChange={(e) => setCustomWords(e.target.value)}
              placeholder="例如：对吧、你知道吗、怎么说呢、确实、属于是"
              className="w-full bg-slate-900/80 border border-slate-700 focus:border-indigo-500 rounded-xl p-3 text-slate-100 placeholder-slate-500 text-xs outline-hidden transition-colors font-sans"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            <RotateCcw size={13} />
            <span>恢复默认</span>
          </button>

          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-emerald-400 font-bold animate-in fade-in">✓ 已保存并生效</span>}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer tracking-wide"
            >
              <Check size={14} />
              <span>保存规则</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
