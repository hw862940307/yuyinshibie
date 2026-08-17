import React, { useState } from 'react';
import {
  X,
  Settings,
  Check,
  Sparkles,
  Activity,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Zap,
  Server,
  Key,
  FolderDown,
} from 'lucide-react';
import { AppSettings, LLMProvider } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onOpenModelDownload?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  onOpenModelDownload,
}) => {
  const [current, setCurrent] = useState<AppSettings>({ ...settings });
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleProviderChange = (p: LLMProvider) => {
    setCurrent({ ...current, provider: p });
    setTestResult(null);
  };

  const handleGeminiChange = (key: string, val: string) => {
    setCurrent({
      ...current,
      providers: {
        ...current.providers,
        gemini: { ...current.providers.gemini, [key]: val },
      },
    });
  };

  const handleDeepseekChange = (key: string, val: string) => {
    setCurrent({
      ...current,
      providers: {
        ...current.providers,
        deepseek: { ...current.providers.deepseek, [key]: val },
      },
    });
  };

  const handleOpenAIChange = (key: string, val: string) => {
    setCurrent({
      ...current,
      providers: {
        ...current.providers,
        openai: { ...current.providers.openai, [key]: val },
      },
    });
  };

  const handleOllamaChange = (key: string, val: string) => {
    setCurrent({
      ...current,
      providers: {
        ...current.providers,
        ollama: { ...current.providers.ollama, [key]: val },
      },
    });
  };

  const handleCustomChange = (key: string, val: string) => {
    setCurrent({
      ...current,
      providers: {
        ...current.providers,
        custom: { ...current.providers.custom, [key]: val },
      },
    });
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test-llm-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: current }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({ success: true, message: data.message || '连接成功！' });
      } else {
        setTestResult({ success: false, message: data.error || '连接失败' });
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || '请求超时或网络异常' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    onSave(current);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[90vh] bg-[#0F172A] border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Settings size={18} />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-100">4. 配置 AI 后端</h2>
              <p className="text-xs text-slate-400">选择用于实时智能教练与多维深度复盘的大模型后端</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Direct Link to Speech Recognition Models (Figure 1 Sherpa-ONNX) */}
          {onOpenModelDownload && (
            <div className="bg-gradient-to-r from-pink-950/40 via-purple-950/30 to-indigo-950/40 border border-pink-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 shrink-0">
                  <FolderDown size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-zinc-100 text-xs sm:text-sm">2. 语音识别大模型管理</h3>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 font-mono">图1 Sherpa-ONNX</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    一键自动获取并下载 Sherpa-ONNX streaming paraformer 中英双语大模型
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenModelDownload();
                }}
                className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
              >
                前往模型下载中心 →
              </button>
            </div>
          )}

          {/* Reference Table (Figure 2 exact replica) */}
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Zap size={13} className="text-amber-400" />
                <span>推荐配置参考表（点击可快速切换）：</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">expression-trainer core</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                    <th className="py-2 px-3">后端</th>
                    <th className="py-2 px-3">费用</th>
                    <th className="py-2 px-3">速度</th>
                    <th className="py-2 px-3">获取方式</th>
                    <th className="py-2 px-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {/* Google AI */}
                  <tr className={`hover:bg-slate-800/40 transition-colors ${current.provider === 'gemini' ? 'bg-indigo-950/30' : ''}`}>
                    <td className="py-2.5 px-3 font-semibold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles size={12} />
                      Google AI
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-medium">免费 / 极低</td>
                    <td className="py-2.5 px-3 text-cyan-400 font-medium">极快</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      <a href="https://aistudio.google.com" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline inline-flex items-center gap-1">
                        aistudio.google.com <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleProviderChange('gemini')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          current.provider === 'gemini' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {current.provider === 'gemini' ? '当前选用' : '选用'}
                      </button>
                    </td>
                  </tr>

                  {/* DeepSeek */}
                  <tr className={`hover:bg-slate-800/40 transition-colors ${current.provider === 'deepseek' ? 'bg-indigo-950/30' : ''}`}>
                    <td className="py-2.5 px-3 font-semibold text-sky-300">DeepSeek</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-medium">极低</td>
                    <td className="py-2.5 px-3 text-sky-400 font-medium">快</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">
                        platform.deepseek.com <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleProviderChange('deepseek')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          current.provider === 'deepseek' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {current.provider === 'deepseek' ? '当前选用' : '选用'}
                      </button>
                    </td>
                  </tr>

                  {/* OpenAI */}
                  <tr className={`hover:bg-slate-800/40 transition-colors ${current.provider === 'openai' ? 'bg-indigo-950/30' : ''}`}>
                    <td className="py-2.5 px-3 font-semibold text-emerald-300">OpenAI</td>
                    <td className="py-2.5 px-3 text-amber-400 font-medium">中等</td>
                    <td className="py-2.5 px-3 text-sky-400 font-medium">快</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      <a href="https://platform.openai.com" target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">
                        platform.openai.com <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleProviderChange('openai')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          current.provider === 'openai' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {current.provider === 'openai' ? '当前选用' : '选用'}
                      </button>
                    </td>
                  </tr>

                  {/* Ollama */}
                  <tr className={`hover:bg-slate-800/40 transition-colors ${current.provider === 'ollama' ? 'bg-indigo-950/30' : ''}`}>
                    <td className="py-2.5 px-3 font-semibold text-amber-300">Ollama</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-medium">免费</td>
                    <td className="py-2.5 px-3 text-slate-400 font-medium">取决于硬件</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                      <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline inline-flex items-center gap-1">
                        ollama.com 本地运行 <ExternalLink size={10} />
                      </a>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleProviderChange('ollama')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          current.provider === 'ollama' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {current.provider === 'ollama' ? '当前选用' : '选用'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Provider Selection Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300">切换当前生效的提供商</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => handleProviderChange('gemini')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  current.provider === 'gemini'
                    ? 'border-indigo-500 bg-indigo-950/50 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs text-indigo-400">Google AI</div>
                <div className="text-[10px] opacity-70 mt-0.5">Gemini 3.7 / 2.5</div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('deepseek')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  current.provider === 'deepseek'
                    ? 'border-indigo-500 bg-indigo-950/50 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs text-sky-400">DeepSeek</div>
                <div className="text-[10px] opacity-70 mt-0.5">deepseek-chat</div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('openai')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  current.provider === 'openai'
                    ? 'border-indigo-500 bg-indigo-950/50 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs text-emerald-400">OpenAI</div>
                <div className="text-[10px] opacity-70 mt-0.5">GPT-4o / mini</div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('ollama')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  current.provider === 'ollama'
                    ? 'border-indigo-500 bg-indigo-950/50 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs text-amber-400">Ollama 本地</div>
                <div className="text-[10px] opacity-70 mt-0.5">Qwen2.5 / Llama</div>
              </button>

              <button
                type="button"
                onClick={() => handleProviderChange('custom')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  current.provider === 'custom'
                    ? 'border-indigo-500 bg-indigo-950/50 text-white shadow-sm'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="font-bold text-xs text-purple-400">自定义接口</div>
                <div className="text-[10px] opacity-70 mt-0.5">OneAPI / 兼容</div>
              </button>
            </div>
          </div>

          {/* Provider Specific Settings */}
          <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
            {/* Google Gemini Config */}
            {current.provider === 'gemini' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
                    <Sparkles size={14} />
                    <span>Google AI (Gemini) 设置</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                    已内置环境变量，亦可填入专属 API Key
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">
                    Google AI Studio API Key (选填，留空将默认使用服务端配置)
                  </label>
                  <input
                    type="password"
                    value={current.providers.gemini?.apiKey || ''}
                    onChange={(e) => handleGeminiChange('apiKey', e.target.value)}
                    placeholder="AIzaSy... (若留空则自动使用内置配置)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    可在 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google AI Studio</a> 免费获取专属 Key。
                  </p>
                </div>

                <div>
                  <label className="text-xs text-slate-400 block mb-1">模型选择</label>
                  <select
                    value={current.providers.gemini?.model || 'gemini-3.7-flash'}
                    onChange={(e) => handleGeminiChange('model', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  >
                    <option value="gemini-3.7-flash">gemini-3.7-flash (极速毫秒级·推荐)</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash (稳定轻量)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (深度多维推理)</option>
                  </select>
                </div>
              </div>
            )}

            {/* DeepSeek Config */}
            {current.provider === 'deepseek' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300">DeepSeek 配置</span>
                  <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" className="text-[11px] text-sky-400 hover:underline flex items-center gap-1">
                    获取 API Key <ExternalLink size={10} />
                  </a>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">DeepSeek API Key (必填)</label>
                  <input
                    type="password"
                    value={current.providers.deepseek?.apiKey || ''}
                    onChange={(e) => handleDeepseekChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">模型名称</label>
                  <select
                    value={current.providers.deepseek?.model || 'deepseek-chat'}
                    onChange={(e) => handleDeepseekChange('model', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  >
                    <option value="deepseek-chat">deepseek-chat (V3 - 推荐)</option>
                    <option value="deepseek-reasoner">deepseek-reasoner (R1 深度思考)</option>
                  </select>
                </div>
              </div>
            )}

            {/* OpenAI Config */}
            {current.provider === 'openai' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300">OpenAI 配置</span>
                  <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1">
                    获取 API Key <ExternalLink size={10} />
                  </a>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">OpenAI API Key (必填)</label>
                  <input
                    type="password"
                    value={current.providers.openai?.apiKey || ''}
                    onChange={(e) => handleOpenAIChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">模型名称</label>
                  <select
                    value={current.providers.openai?.model || 'gpt-4o-mini'}
                    onChange={(e) => handleOpenAIChange('model', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (极快高性价比)</option>
                    <option value="gpt-4o">gpt-4o (高智能全能)</option>
                    <option value="o3-mini">o3-mini (推理模型)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Ollama Local Config */}
            {current.provider === 'ollama' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300">Ollama 本地大模型服务</span>
                  <a href="https://ollama.com" target="_blank" rel="noreferrer" className="text-[11px] text-amber-400 hover:underline flex items-center gap-1">
                    官网下载 Ollama <ExternalLink size={10} />
                  </a>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Ollama 服务地址</label>
                  <input
                    type="text"
                    value={current.providers.ollama?.ollamaUrl || 'http://localhost:11434'}
                    onChange={(e) => handleOllamaChange('ollamaUrl', e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">已安装的本地模型名称</label>
                  <input
                    type="text"
                    value={current.providers.ollama?.model || 'qwen2.5:7b'}
                    onChange={(e) => handleOllamaChange('model', e.target.value)}
                    placeholder="例如: qwen2.5:7b, llama3:8b, deepseek-r1:7b"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  />
                </div>
              </div>
            )}

            {/* Custom OpenAI-compatible Config */}
            {current.provider === 'custom' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300">自定义兼容接口 (OneAPI / 硅基流动 / 代理转发)</span>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Base URL (兼容 /v1 标准)</label>
                  <input
                    type="text"
                    value={current.providers.custom?.baseUrl || ''}
                    onChange={(e) => handleCustomChange('baseUrl', e.target.value)}
                    placeholder="https://api.siliconflow.cn/v1 或 https://api.example.com/v1"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">API Key</label>
                  <input
                    type="password"
                    value={current.providers.custom?.apiKey || ''}
                    onChange={(e) => handleCustomChange('apiKey', e.target.value)}
                    placeholder="sk-..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">模型名称 (Model Identifier)</label>
                  <input
                    type="text"
                    value={current.providers.custom?.customModel || ''}
                    onChange={(e) => handleCustomChange('customModel', e.target.value)}
                    placeholder="例如: Qwen/Qwen2.5-72B-Instruct, claude-3-5-sonnet"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-mono"
                  />
                </div>
              </div>
            )}

            {/* Test Connection Button & Result */}
            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isTesting ? <RefreshCw size={13} className="animate-spin text-indigo-400" /> : <Activity size={13} className="text-indigo-400" />}
                <span>{isTesting ? '正在测试连接...' : '测试当前连接'}</span>
              </button>

              {testResult && (
                <div
                  className={`text-xs flex items-center gap-1.5 font-bold ${
                    testResult.success ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {testResult.success ? <Check size={14} /> : <AlertCircle size={14} />}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Speech & Audio Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <label className="text-xs font-bold text-slate-200">
                🎙️ 语音识别、VAD 静音检测与方言前置增益
              </label>
              <span className="text-[10px] text-indigo-400 font-medium">
                Web Audio DSP 实时声学管线
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">语音识别语言与方言</label>
                <select
                  value={current.speechLanguage}
                  onChange={(e) => setCurrent({ ...current, speechLanguage: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 outline-hidden font-medium focus:border-indigo-500"
                >
                  <option value="zh-CN">普通话 (中国大陆) - zh-CN</option>
                  <option value="zh-SC">四川话/重庆话 (西南官话) - zh-SC</option>
                  <option value="zh-TW">繁体中文 (台湾) - zh-TW</option>
                  <option value="zh-HK">粤语 (香港) - zh-HK</option>
                  <option value="en-US">English (US) - en-US</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  选择四川话/重庆话时，系统将自动启用西南官话专精识别与方言语气词保留规则。
                </p>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  实时 AI 反馈触发字数阈值 (当前: {current.realtimeFeedbackIntervalWords}字)
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  step="5"
                  value={current.realtimeFeedbackIntervalWords}
                  onChange={(e) =>
                    setCurrent({ ...current, realtimeFeedbackIntervalWords: parseInt(e.target.value) || 40 })
                  }
                  className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer mt-2"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  每说满 {current.realtimeFeedbackIntervalWords} 字触发一次 AI 结构与语调深度点评。
                </p>
              </div>
            </div>

            {/* Audio Pre-processing Gain & Dialect Enhancement Controls */}
            <div className="bg-slate-900/60 border border-slate-800/90 rounded-xl p-3.5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">
                  ⚡ 方言声学前置增益 & 嘈杂环境抗噪
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-mono">
                  Gain: {(current.audioSettings?.audioGain || 1.6).toFixed(1)}x
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Pre-Gain Slider */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>音频前置硬件级增益放大 (Audio Gain)</span>
                    <span className="font-mono text-indigo-400 font-bold">
                      {((current.audioSettings?.audioGain || 1.6) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="3.0"
                    step="0.1"
                    value={current.audioSettings?.audioGain || 1.6}
                    onChange={(e) =>
                      setCurrent({
                        ...current,
                        audioSettings: {
                          ...(current.audioSettings || {
                            audioGain: 1.6,
                            vadSensitivity: 'normal',
                            vadThreshold: 8,
                            silenceHangoverMs: 700,
                            dialectAudioBoost: true,
                            noiseSuppressionMode: 'speech_clarity',
                            highPassFilterEnabled: true,
                          }),
                          audioGain: parseFloat(e.target.value) || 1.6,
                        },
                      })
                    }
                    className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    提升麦克风微弱发音与远距离拾音，极大改善嘈杂环境下方言吞音现象。
                  </p>
                </div>

                {/* VAD Sensitivity */}
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>VAD 语音活动检测灵敏度 (阈值: {current.audioSettings?.vadThreshold || 8})</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {current.audioSettings?.vadSensitivity === 'ultra'
                        ? '极高 (安静)'
                        : current.audioSettings?.vadSensitivity === 'high'
                        ? '高灵敏'
                        : current.audioSettings?.vadSensitivity === 'low'
                        ? '低 (抗噪)'
                        : '标准平衡'}
                    </span>
                  </div>
                  <select
                    value={current.audioSettings?.vadSensitivity || 'normal'}
                    onChange={(e) => {
                      const val = e.target.value as 'low' | 'normal' | 'high' | 'ultra';
                      const thresholdMap = { low: 14, normal: 8, high: 5, ultra: 3 };
                      setCurrent({
                        ...current,
                        audioSettings: {
                          ...(current.audioSettings || {
                            audioGain: 1.6,
                            vadSensitivity: 'normal',
                            vadThreshold: 8,
                            silenceHangoverMs: 700,
                            dialectAudioBoost: true,
                            noiseSuppressionMode: 'speech_clarity',
                            highPassFilterEnabled: true,
                          }),
                          vadSensitivity: val,
                          vadThreshold: thresholdMap[val] || 8,
                        },
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-hidden font-medium"
                  >
                    <option value="normal">标准平衡模式 (推荐办公室/室内) - 阈值 8</option>
                    <option value="high">高灵敏度模式 (轻声细语/居家) - 阈值 5</option>
                    <option value="ultra">超高灵敏度 (专业录音棚/安静环境) - 阈值 3</option>
                    <option value="low">强抗噪模式 (咖啡厅/嘈杂户外) - 阈值 14</option>
                  </select>
                </div>
              </div>

              {/* Toggles for Sichuan/Chongqing Boost & High-Pass Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.audioSettings?.dialectAudioBoost !== false}
                    onChange={(e) =>
                      setCurrent({
                        ...current,
                        audioSettings: {
                          ...(current.audioSettings || {
                            audioGain: 1.6,
                            vadSensitivity: 'normal',
                            vadThreshold: 8,
                            silenceHangoverMs: 700,
                            dialectAudioBoost: true,
                            noiseSuppressionMode: 'speech_clarity',
                            highPassFilterEnabled: true,
                          }),
                          dialectAudioBoost: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      四川话/重庆话高频辅音均衡增强 (+5dB EQ)
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      专门针对西南官话中特色的舌尖齿音 [s, z, ts] 与语调滑移进行声学频段增强。
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={current.audioSettings?.highPassFilterEnabled !== false}
                    onChange={(e) =>
                      setCurrent({
                        ...current,
                        audioSettings: {
                          ...(current.audioSettings || {
                            audioGain: 1.6,
                            vadSensitivity: 'normal',
                            vadThreshold: 8,
                            silenceHangoverMs: 700,
                            dialectAudioBoost: true,
                            noiseSuppressionMode: 'speech_clarity',
                            highPassFilterEnabled: true,
                          }),
                          highPassFilterEnabled: e.target.checked,
                        },
                      })
                    }
                    className="mt-0.5 rounded text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <div className="text-xs font-semibold text-slate-200">
                      85Hz 高通低频滤波抗噪 (High-Pass Filter)
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                      滤除空调低频嗡鸣、桌面敲击震动与呼吸喷麦杂音，确保输入语音纯净度。
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-mono">所有配置将保存在本地存储中，随时随地可用</div>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-emerald-400 font-bold">✓ 已保存设置</span>}
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors cursor-pointer tracking-wide"
            >
              <Check size={14} />
              <span>保存配置</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
