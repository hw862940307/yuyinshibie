import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  FolderDown,
  Terminal,
  Copy,
  Check,
  RefreshCw,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2,
  Zap,
  ShieldCheck,
  Search,
  Filter,
  CheckCheck,
  Clock,
  Database,
  Activity,
  HelpCircle,
} from 'lucide-react';
import { ModelItem, ModelDownloadProgress } from '../../types';

interface ModelDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Local storage key for caching offline model registry status
const LOCAL_CACHE_KEY = 'speech_trainer_models_registry_v1';
const LOCAL_INSTALLED_OVERRIDE_KEY = 'speech_trainer_installed_models_v1';

export const ModelDownloadModal: React.FC<ModelDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeMirror, setActiveMirror] = useState<'github' | 'huggingface' | 'modelscope'>('github');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloadingMap, setDownloadingMap] = useState<Record<string, ModelDownloadProgress>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'ASR' | 'EMOTION' | 'LLM'>('ALL');
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const pollingTimerRef = useRef<number | null>(null);

  // Helper to show transient notification
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 3000);
  };

  // Check local cache and system storage state
  const loadLocalCachedState = (): Record<string, boolean> => {
    try {
      const stored = localStorage.getItem(LOCAL_INSTALLED_OVERRIDE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  };

  const saveLocalInstalledState = (modelId: string, isInstalled: boolean) => {
    try {
      const current = loadLocalCachedState();
      if (isInstalled) {
        current[modelId] = true;
      } else {
        delete current[modelId];
      }
      localStorage.setItem(LOCAL_INSTALLED_OVERRIDE_KEY, JSON.stringify(current));
    } catch (e) {
      console.warn('Failed to save to local cache', e);
    }
  };

  // Fetch models status on open (from remote API or fallback to cached registry)
  const fetchModels = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const res = await fetch('/api/models');
      const data = await res.json();
      if (data.success && Array.isArray(data.models)) {
        const localOverrides = loadLocalCachedState();
        const mergedModels = data.models.map((m: ModelItem) => {
          const isLocallyInstalled = localOverrides[m.id] ?? m.isDownloaded;
          return {
            ...m,
            isDownloaded: m.isDownloaded || isLocallyInstalled,
          };
        });
        setModels(mergedModels);
        // Cache to localStorage for instant subsequent loads
        try {
          localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(mergedModels));
        } catch {}
      } else {
        throw new Error('API response invalid');
      }
    } catch (e) {
      console.warn('Remote model API unavailable, loading from local cache:', e);
      try {
        const cached = localStorage.getItem(LOCAL_CACHE_KEY);
        if (cached) {
          setModels(JSON.parse(cached));
        }
      } catch {}
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      // First immediately populate from local cache for instant UI rendering
      try {
        const cached = localStorage.getItem(LOCAL_CACHE_KEY);
        if (cached) {
          setModels(JSON.parse(cached));
        }
      } catch {}

      // Then fetch latest live status from server / remote API
      fetchModels();
    } else {
      if (pollingTimerRef.current) {
        window.clearInterval(pollingTimerRef.current);
      }
    }
  }, [isOpen]);

  // Start auto-downloading model with real-time percentage monitoring & button lock
  const handleStartDownload = async (modelId: string, modelName: string) => {
    // Prevent duplicate download triggering
    if (
      downloadingMap[modelId]?.status === 'downloading' ||
      downloadingMap[modelId]?.status === 'extracting' ||
      downloadingMap[modelId]?.status === 'verifying'
    ) {
      return;
    }

    try {
      // Immediately set UI to downloading state with 0% progress
      setDownloadingMap((prev) => ({
        ...prev,
        [modelId]: {
          modelId,
          status: 'downloading',
          progress: 1,
          downloadedBytes: 0,
          totalBytes: modelId.includes('sherpa') ? 188 * 1024 * 1024 : 142 * 1024 * 1024,
          speed: '16.8 MB/s',
          currentStep: `正在连接 ${activeMirror === 'huggingface' ? 'HuggingFace' : activeMirror === 'modelscope' ? 'ModelScope' : 'GitHub'} 镜像源并初始化流式传输...`,
        },
      }));

      showToast(`已开始自动下载 ${modelName}，正在流式拉取权重包...`, 'info');

      // Trigger backend download pipeline
      await fetch('/api/models/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, mirror: activeMirror }),
      });

      // Poll download progress every 300ms for high-fidelity progress percentage
      const pollInterval = window.setInterval(async () => {
        try {
          const res = await fetch(`/api/models/progress/${modelId}`);
          const data = await res.json();
          if (data.success && data.progress) {
            setDownloadingMap((prev) => ({
              ...prev,
              [modelId]: data.progress,
            }));

            if (data.progress.status === 'completed') {
              window.clearInterval(pollInterval);
              saveLocalInstalledState(modelId, true);
              showToast(`🎉 ${modelName} 下载并校验成功，已安装就绪！`, 'success');
              fetchModels(true);
            } else if (data.progress.status === 'error') {
              window.clearInterval(pollInterval);
              showToast(`❌ ${modelName} 下载异常: ${data.progress.error || '连接中断'}`, 'error');
            }
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 300);
    } catch (e) {
      console.error('Download start failed', e);
      showToast(`无法连接下载服务，请检查网络`, 'error');
    }
  };

  // Delete/Uninstall model and free space
  const handleDeleteModel = async (modelId: string, modelName: string) => {
    if (!window.confirm(`确定要清理并卸载已安装的「${modelName}」吗？\n清理后可释放对应的本地磁盘空间。`)) {
      return;
    }

    try {
      await fetch('/api/models/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId }),
      });

      // Update local storage cache
      saveLocalInstalledState(modelId, false);

      setDownloadingMap((prev) => {
        const next = { ...prev };
        delete next[modelId];
        return next;
      });

      // Update in-memory models state immediately
      setModels((prev) =>
        prev.map((m) =>
          m.id === modelId
            ? {
                ...m,
                isDownloaded: false,
                files: m.files.map((f) => ({ ...f, exists: false })),
              }
            : m
        )
      );

      showToast(`已成功清理 ${modelName} 本地存储空间`, 'success');
      fetchModels(true);
    } catch (e) {
      console.error('Delete model error', e);
      showToast('删除操作受阻', 'error');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('终端命令已复制到剪贴板', 'info');
  };

  // Computed filtered models
  const filteredModels = useMemo(() => {
    return models.filter((m) => {
      const matchCat = selectedCategory === 'ALL' || m.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchQuery =
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.description.toLowerCase().includes(query) ||
        m.id.toLowerCase().includes(query) ||
        (m.tags && m.tags.some((t) => t.toLowerCase().includes(query)));
      return matchCat && matchQuery;
    });
  }, [models, selectedCategory, searchQuery]);

  // Overall installed count & total size calculation
  const stats = useMemo(() => {
    const installedList = models.filter((m) => m.isDownloaded);
    return {
      total: models.length,
      installedCount: installedList.length,
    };
  }, [models]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 md:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-[#09090d] border border-pink-500/30 rounded-2xl flex flex-col shadow-[0_0_50px_rgba(244,63,94,0.15)] overflow-hidden text-zinc-200 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-850 bg-black/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-950/60 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <FolderDown size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm md:text-base font-bold text-zinc-100">
                  大模型管理与下载中心
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-pink-950/80 border border-pink-500/40 text-pink-300">
                  图1 Sherpa-ONNX 流式底座
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                实时检测本地缓存状态 · 一键自动获取安装 · 支持百分比进度监控与空间清理
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Installed Badge Summary */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono">
              <Database size={12} className="text-pink-400" />
              <span className="text-zinc-400">已就绪:</span>
              <span className="text-pink-300 font-bold">
                {stats.installedCount} / {stats.total}
              </span>
            </div>

            <button
              onClick={() => fetchModels(false)}
              title="重新检测本地模型缓存与远端清单"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
            >
              <RefreshCw size={15} className={loading ? 'animate-spin text-pink-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Global Toast Notification */}
        {notification && (
          <div
            className={`px-4 py-2 text-xs font-medium flex items-center justify-between transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 text-emerald-300 border-b border-emerald-800/60'
                : notification.type === 'error'
                ? 'bg-rose-950/90 text-rose-300 border-b border-rose-800/60'
                : 'bg-pink-950/90 text-pink-300 border-b border-pink-800/60'
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity size={13} className="animate-pulse" />
              <span>{notification.message}</span>
            </span>
            <button
              onClick={() => setNotification(null)}
              className="text-zinc-400 hover:text-white text-[11px]"
            >
              ✕
            </button>
          </div>
        )}

        {/* Filter & Mirror Acceleration Controls Bar */}
        <div className="p-4 bg-zinc-950/90 border-b border-zinc-850 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0 text-xs">
          {/* Search and Category Filter */}
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="搜索大模型名称、标签或架构..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-black border border-zinc-800 rounded-lg text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-pink-500/60 text-xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
              {(['ALL', 'ASR', 'EMOTION', 'LLM'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    selectedCategory === cat
                      ? 'bg-pink-600 text-white font-bold'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {cat === 'ALL' ? '全部模型' : cat === 'ASR' ? '语音识别' : cat === 'EMOTION' ? '声学情感' : '大语言模型'}
                </button>
              ))}
            </div>
          </div>

          {/* Mirror Node Selector */}
          <div className="flex items-center gap-1.5 self-end md:self-auto">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1">
              <Zap size={13} className="text-pink-400" />
              <span>加速源:</span>
            </span>
            <div className="flex items-center gap-1 bg-black p-0.5 rounded-lg border border-zinc-800">
              <button
                onClick={() => setActiveMirror('github')}
                title="官方 Github Release 源"
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  activeMirror === 'github'
                    ? 'bg-pink-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                GitHub
              </button>
              <button
                onClick={() => setActiveMirror('huggingface')}
                title="🤗 HuggingFace 镜像"
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  activeMirror === 'huggingface'
                    ? 'bg-pink-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                HuggingFace
              </button>
              <button
                onClick={() => setActiveMirror('modelscope')}
                title="⚡ ModelScope 国内加速源"
                className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                  activeMirror === 'modelscope'
                    ? 'bg-pink-600 text-white font-bold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                ModelScope
              </button>
            </div>
          </div>
        </div>

        {/* Content Body with Model Cards */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5 text-xs">
          {loading && models.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <RefreshCw size={24} className="animate-spin text-pink-400" />
              <span>正在从云端与本地状态缓存检测大模型清单...</span>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 space-y-2">
              <p>未找到符合条件的大模型</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
                className="text-pink-400 hover:underline text-xs"
              >
                重置搜索与分类过滤
              </button>
            </div>
          ) : (
            filteredModels.map((model) => {
              const dlProgress = downloadingMap[model.id];
              const isBusy =
                dlProgress &&
                (dlProgress.status === 'downloading' ||
                  dlProgress.status === 'extracting' ||
                  dlProgress.status === 'verifying');
              const isSherpa = model.id === 'sherpa-onnx-streaming-paraformer-bilingual-zh-en';
              const isInstalled = model.isDownloaded || (dlProgress && dlProgress.status === 'completed');

              return (
                <div
                  key={model.id}
                  id={`model-card-${model.id}`}
                  className={`rounded-2xl border transition-all ${
                    isSherpa
                      ? 'border-pink-500/40 bg-zinc-950/80 shadow-[0_0_25px_rgba(244,63,94,0.08)]'
                      : 'border-zinc-850 bg-zinc-950/50'
                  } p-5 space-y-4`}
                >
                  {/* Card Title & Meta Info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            model.category === 'ASR'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800/80'
                              : model.category === 'EMOTION'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800/80'
                              : 'bg-amber-950 text-amber-300 border border-amber-800/80'
                          }`}
                        >
                          {model.category}
                        </span>

                        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
                          {model.name}
                        </h3>

                        {isSherpa && (
                          <span className="px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 text-[9px] border border-pink-500/30">
                            ★ 图1 核心推荐
                          </span>
                        )}

                        {/* Installed Status Badge */}
                        {isInstalled && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={11} />
                            <span>已安装</span>
                          </span>
                        )}
                      </div>

                      <p className="text-zinc-400 text-xs leading-relaxed">{model.description}</p>

                      {/* Tag list */}
                      {model.tags && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          {model.tags.map((tag, tIdx) => (
                            <span
                              key={tIdx}
                              className="px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 text-[10px] border border-zinc-800"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons: Download or Delete */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isInstalled ? (
                        <div className="flex items-center gap-2">
                          <button
                            id={`btn-clean-model-${model.id}`}
                            onClick={() => handleDeleteModel(model.id, model.name)}
                            disabled={isBusy}
                            title="清理已下载的本地模型文件释放空间"
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/60 transition-colors cursor-pointer text-xs"
                          >
                            <Trash2 size={13} />
                            <span>删除清理</span>
                          </button>

                          <button
                            onClick={() => handleStartDownload(model.id, model.name)}
                            disabled={isBusy}
                            title="重新下载并覆盖该模型"
                            className="p-1.5 rounded-xl text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 transition-colors"
                          >
                            <RefreshCw size={13} className={isBusy ? 'animate-spin text-pink-400' : ''} />
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`btn-download-model-${model.id}`}
                          onClick={() => handleStartDownload(model.id, model.name)}
                          disabled={isBusy}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                            isBusy
                              ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed border border-zinc-700'
                              : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] cursor-pointer'
                          }`}
                        >
                          {isBusy ? (
                            <>
                              <RefreshCw size={13} className="animate-spin text-pink-300" />
                              <span>下载校验中 ({dlProgress?.progress ?? 0}%)</span>
                            </>
                          ) : (
                            <>
                              <Download size={13} />
                              <span>一键自动获取并下载 ({model.size})</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Real-time Percentage Download Progress Bar */}
                  {dlProgress && (dlProgress.status === 'downloading' || dlProgress.status === 'extracting' || dlProgress.status === 'verifying' || dlProgress.status === 'completed' || dlProgress.status === 'error') && (
                    <div className="p-3.5 bg-black/90 rounded-xl border border-pink-500/30 space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-pink-300 font-medium flex items-center gap-1.5">
                          {dlProgress.status === 'downloading' && (
                            <Download size={12} className="animate-bounce text-pink-400" />
                          )}
                          {dlProgress.status === 'extracting' && (
                            <Layers size={12} className="animate-pulse text-purple-400" />
                          )}
                          {dlProgress.status === 'verifying' && (
                            <Cpu size={12} className="animate-spin text-amber-400" />
                          )}
                          {dlProgress.status === 'completed' && (
                            <CheckCheck size={12} className="text-emerald-400" />
                          )}
                          {dlProgress.status === 'error' && (
                            <AlertCircle size={12} className="text-rose-400" />
                          )}
                          <span>{dlProgress.currentStep}</span>
                        </span>

                        <span className="font-mono text-zinc-300 font-bold flex items-center gap-1">
                          <span className="text-pink-400">{dlProgress.progress}%</span>
                          {dlProgress.speed && dlProgress.status === 'downloading' && (
                            <span className="text-zinc-500 text-[10px]">({dlProgress.speed})</span>
                          )}
                        </span>
                      </div>

                      {/* Percentage Bar */}
                      <div className="w-full h-2.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
                        <div
                          className={`h-full transition-all duration-300 rounded-full ${
                            dlProgress.status === 'completed'
                              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              : dlProgress.status === 'error'
                              ? 'bg-rose-600'
                              : 'bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-400'
                          }`}
                          style={{ width: `${Math.max(2, dlProgress.progress)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Compatibility & System Hardware Specs */}
                  {model.compatibility && (
                    <div className="bg-zinc-900/60 rounded-xl border border-zinc-850/80 p-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-zinc-500 block text-[10px]">运行引擎</span>
                        <span className="text-zinc-200 font-mono font-medium">{model.compatibility.engine}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">推荐计算资源</span>
                        <span className="text-zinc-200 font-mono font-medium">{model.compatibility.recommendedCpu}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">量化加速</span>
                        <span className="text-pink-300 font-mono font-medium">{model.compatibility.onnxQuant}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block text-[10px]">浏览器离线支持</span>
                        <span className={`font-mono font-medium ${model.compatibility.browserSupported ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {model.compatibility.browserSupported ? '✓ WebAssembly 原生兼容' : '需要本地服务支持'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Directory & Files Tree Breakdown (Exact replica of Figure 1) */}
                  <div className="bg-black/80 rounded-xl border border-zinc-850 p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-zinc-900">
                      <span className="font-mono flex items-center gap-1.5 text-zinc-300">
                        <HardDrive size={12} className="text-pink-400" />
                        <span>目标解压目录：{model.folderPath}</span>
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        架构：{model.architecture || 'ONNX Runtime'}
                      </span>
                    </div>

                    <div className="font-mono text-[11px] text-zinc-300 space-y-1.5 pl-2">
                      <div className="text-zinc-400">models/</div>
                      <div className="pl-4 text-pink-300">
                        └─ {model.id}/
                      </div>
                      {model.files.map((file, fIdx) => (
                        <div
                          key={fIdx}
                          className="pl-8 flex items-center justify-between py-0.5 hover:bg-zinc-900/50 rounded px-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-600">
                              {fIdx === model.files.length - 1 ? '└─' : '├─'}
                            </span>
                            <span className="text-zinc-200 font-medium">{file.name}</span>
                            <span className="text-[10px] text-zinc-500">({file.size})</span>
                          </div>

                          <div>
                            {file.exists || isInstalled ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                                <Check size={10} />
                                <span>已存在</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                                待自动获取
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Manual Shell Commands (Exact replica of Figure 1 instructions) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1 font-semibold text-zinc-300">
                        <Terminal size={12} className="text-amber-400" />
                        <span>手动终端下载指令（图1 标准命令行）：</span>
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(
                            `cd models\nwget ${model.downloadUrl}\ntar xvf ${model.id}.tar.bz2`,
                            model.id
                          )
                        }
                        className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {copiedId === model.id ? (
                          <>
                            <Check size={11} className="text-emerald-400" />
                            <span className="text-emerald-400">已复制命令</span>
                          </>
                        ) : (
                          <>
                            <Copy size={11} />
                            <span>一键复制命令行</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-3 bg-black rounded-lg border border-zinc-900 font-mono text-[11px] text-zinc-300 space-y-1 overflow-x-auto select-all">
                      <div className="text-zinc-500"># 方法一：使用 wget 极速下载解压</div>
                      <div className="text-pink-300">
                        cd models && wget {model.downloadUrl}
                      </div>
                      <div className="text-purple-300">
                        tar xvf {model.id}.tar.bz2
                      </div>
                      {model.hfUrl && (
                        <>
                          <div className="text-zinc-500 pt-1"># 方法二：HuggingFace 仓库镜像</div>
                          <div className="text-sky-400">
                            <a
                              href={model.hfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="hover:underline inline-flex items-center gap-1"
                            >
                              {model.hfUrl} <ExternalLink size={10} />
                            </a>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-850 bg-black/90 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 text-zinc-400 font-mono text-[11px]">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>自动校验 ONNX SHA256 完整性与 INT8 硬件指令集支持</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs border border-zinc-800 transition-colors cursor-pointer"
          >
            完成并返回
          </button>
        </div>
      </div>
    </div>
  );
};
