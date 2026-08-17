import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  Sparkles,
  Share2,
  Award,
  Volume2,
  Mic,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { ReferenceReadingItem } from '../types';
import { ExtractedAudioMetrics } from '../utils/speech';

interface ReviewPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  reading: ReferenceReadingItem;
  scores: {
    intonationScore: number;
    cadenceScore: number;
    paceDelta: number;
    userWpm?: number;
  };
  referenceMetrics: ExtractedAudioMetrics | null;
  userMetrics: ExtractedAudioMetrics | null;
  userTranscript?: string;
}

export const ReviewPosterModal: React.FC<ReviewPosterModalProps> = ({
  isOpen,
  onClose,
  reading,
  scores,
  referenceMetrics,
  userMetrics,
  userTranscript,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const overallScore = Math.round((scores.intonationScore * 0.55 + scores.cadenceScore * 0.45));
  const grade =
    overallScore >= 93 ? 'S+ 卓越大师' : overallScore >= 86 ? 'S 优秀示范' : overallScore >= 78 ? 'A 熟练流畅' : 'B 尚需加强';
  const gradeColor =
    overallScore >= 86 ? '#10b981' : overallScore >= 78 ? '#6366f1' : '#f59e0b';

  const generatePoster = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGenerating(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina 2x high resolution
    const width = 1080;
    const height = 1520;
    canvas.width = width;
    canvas.height = height;

    // 1. Background Luxury Dark Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#090d16');
    bgGrad.addColorStop(0.4, '#0f172a');
    bgGrad.addColorStop(1, '#080c14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Ambient radial glow effects
    const glow1 = ctx.createRadialGradient(width * 0.2, 200, 10, width * 0.2, 200, 450);
    glow1.addColorStop(0, 'rgba(16, 185, 129, 0.18)');
    glow1.addColorStop(1, 'rgba(16, 185, 129, 0)');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, width, 500);

    const glow2 = ctx.createRadialGradient(width * 0.85, 800, 10, width * 0.85, 800, 500);
    glow2.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
    glow2.addColorStop(1, 'rgba(99, 102, 241, 0)');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 500, width, 600);

    // Subtle Grid pattern overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 1;
    for (let x = 40; x < width; x += 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 40; y < height; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 2. Diagonal Anti-Counterfeit Security Watermark
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate((-22 * Math.PI) / 180);
    ctx.textAlign = 'center';
    ctx.font = '700 32px "SF Pro Display", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    for (let wy = -600; wy <= 600; wy += 140) {
      for (let wx = -600; wx <= 600; wx += 420) {
        ctx.fillText('AI SPEECH COACH · 声学校准认证', wx, wy);
      }
    }
    ctx.restore();

    // 3. Top Header Bar
    ctx.fillStyle = '#1e293b';
    roundRect(ctx, 48, 48, width - 96, 104, 20, true, false);

    // App Branding Badge
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    roundRect(ctx, 68, 64, 72, 72, 16, true, false);
    ctx.font = '36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎙️', 104, 114);

    ctx.textAlign = 'left';
    ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('宇宙无敌口语表达教练', 158, 98);

    ctx.font = '19px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('声学语调拟合与范读对比复盘报告', 158, 128);

    // Date stamp pill on right
    const dateStr = new Date().toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    roundRect(ctx, width - 240, 76, 170, 48, 24, true, false);
    ctx.font = '600 18px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.textAlign = 'center';
    ctx.fillText(dateStr, width - 155, 106);

    // 4. Topic Title Card
    const topicBoxY = 175;
    ctx.fillStyle = '#111827';
    roundRect(ctx, 48, topicBoxY, width - 96, 140, 20, true, false);
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.3)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 48, topicBoxY, width - 96, 140, 20, false, true);

    // Category Chip
    ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
    roundRect(ctx, 74, topicBoxY + 24, 160, 36, 12, true, false);
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'center';
    ctx.fillText(reading.categoryLabel || '标准示范', 154, topicBoxY + 48);

    // Reading Title
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(reading.title, 250, topicBoxY + 50);

    // Reading Text Snippet (truncate if long)
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    let textPreview = `“${reading.text}”`;
    if (textPreview.length > 46) textPreview = textPreview.slice(0, 44) + '...”';
    ctx.fillText(textPreview, 74, topicBoxY + 104);

    // 5. Score Highlights Card (4 Key Metrics)
    const metricsY = 338;
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, 48, metricsY, width - 96, 190, 20, true, false);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    roundRect(ctx, 48, metricsY, width - 96, 190, 20, false, true);

    // Metric 1: Overall Grade Box
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    roundRect(ctx, 72, metricsY + 24, 210, 142, 16, true, false);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'center';
    ctx.fillText('综合评级', 177, metricsY + 58);

    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillStyle = gradeColor;
    ctx.fillText(`${overallScore}`, 177, metricsY + 108);

    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(grade, 177, metricsY + 144);

    // Metric 2: Intonation Alignment
    ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
    roundRect(ctx, 302, metricsY + 24, 210, 142, 16, true, false);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('语调拟合度', 407, metricsY + 58);
    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${scores.intonationScore}%`, 407, metricsY + 110);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('起伏与重音对齐', 407, metricsY + 144);

    // Metric 3: Cadence & Pauses
    ctx.fillStyle = 'rgba(129, 140, 248, 0.08)';
    roundRect(ctx, 532, metricsY + 24, 210, 142, 16, true, false);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('节奏停顿吻合', 637, metricsY + 58);
    ctx.font = 'bold 42px monospace';
    ctx.fillStyle = '#818cf8';
    ctx.fillText(`${scores.cadenceScore}%`, 637, metricsY + 110);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('断句留白标准度', 637, metricsY + 144);

    // Metric 4: Speech Rate (WPM)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.08)';
    roundRect(ctx, 762, metricsY + 24, 246, 142, 16, true, false);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('实测语速 vs 目标', 885, metricsY + 58);
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#f59e0b';
    ctx.fillText(`${scores.userWpm || 210}`, 885, metricsY + 108);
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`目标: ${reading.targetWpm} WPM`, 885, metricsY + 144);

    // 6. Waveform Dual Track Visual Comparison
    const waveCardY = 550;
    const waveCardH = 430;
    ctx.fillStyle = '#0b1120';
    roundRect(ctx, 48, waveCardY, width - 96, waveCardH, 20, true, false);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1;
    roundRect(ctx, 48, waveCardY, width - 96, waveCardH, 20, false, true);

    // Track 1 Header: Standard Reference Audio
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#34d399';
    ctx.fillText('● 标准范读声学波形 (Standard Audio Track)', 76, waveCardY + 40);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText('Target WPM: ' + reading.targetWpm, width - 80, waveCardY + 40);

    // Waveform Track 1 Bars & Pitch
    const t1BoxX = 74;
    const t1BoxY = waveCardY + 60;
    const t1BoxW = width - 148;
    const t1BoxH = 120;
    ctx.fillStyle = '#020617';
    roundRect(ctx, t1BoxX, t1BoxY, t1BoxW, t1BoxH, 12, true, false);

    const refWave = referenceMetrics?.waveformData || Array.from({ length: 64 }, () => 0.45);
    const barW = (t1BoxW - 64 * 4) / 64;

    for (let i = 0; i < 64; i++) {
      const h = Math.max(12, (refWave[i] || 0.3) * (t1BoxH - 24));
      const x = t1BoxX + 16 + i * (barW + 4);
      const y = t1BoxY + t1BoxH - 12 - h;
      const isPause = referenceMetrics?.pausePoints?.includes(i);
      ctx.fillStyle = isPause ? '#334155' : '#059669';
      roundRect(ctx, x, y, barW, h, 2, true, false);
    }

    // Pitch Curve 1 (Emerald dotted/solid)
    if (referenceMetrics?.pitchCurve) {
      ctx.beginPath();
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 64; i++) {
        const x = t1BoxX + 16 + i * (barW + 4) + barW / 2;
        const p = referenceMetrics.pitchCurve[i] || 50;
        const y = t1BoxY + t1BoxH - 12 - (p / 100) * (t1BoxH - 24);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Track 2 Header: User Recording Audio
    const t2StartY = waveCardY + 210;
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillStyle = '#818cf8';
    ctx.fillText('● 我的录音跟读波形 (User Recorded Audio)', 76, t2StartY + 35);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.fillText(`Pace Delta: ${scores.paceDelta >= 0 ? '+' : ''}${scores.paceDelta} WPM`, width - 80, t2StartY + 35);

    // Waveform Track 2 Bars & Pitch
    const t2BoxX = 74;
    const t2BoxY = t2StartY + 55;
    const t2BoxW = width - 148;
    const t2BoxH = 120;
    ctx.fillStyle = '#020617';
    roundRect(ctx, t2BoxX, t2BoxY, t2BoxW, t2BoxH, 12, true, false);

    const userWave = userMetrics?.waveformData || Array.from({ length: 64 }, () => 0.35);

    for (let i = 0; i < 64; i++) {
      const h = Math.max(12, (userWave[i] || 0.25) * (t2BoxH - 24));
      const x = t2BoxX + 16 + i * (barW + 4);
      const y = t2BoxY + t2BoxH - 12 - h;
      ctx.fillStyle = '#4f46e5';
      roundRect(ctx, x, y, barW, h, 2, true, false);
    }

    // Pitch Curve 2 (Indigo)
    if (userMetrics?.pitchCurve) {
      ctx.beginPath();
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 64; i++) {
        const x = t2BoxX + 16 + i * (barW + 4) + barW / 2;
        const p = userMetrics.pitchCurve[i] || 45;
        const y = t2BoxY + t2BoxH - 12 - (p / 100) * (t2BoxH - 24);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 7. Expert Coach Review & Cadence Tips Card
    const tipsY = 1000;
    ctx.fillStyle = '#111827';
    roundRect(ctx, 48, tipsY, width - 96, 320, 20, true, false);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.25)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 48, tipsY, width - 96, 320, 20, false, true);

    ctx.textAlign = 'left';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('✨ 名师语调与节奏纠偏锦囊 (Coach Advice)', 76, tipsY + 44);

    // Tips items
    const tipsList = reading.cadenceTips?.slice(0, 3) || [
      '保持逻辑重音落在关键动词与论点词上，避免语尾过度拖长。',
      '注意标点处的微停顿，让听众有消化与共鸣的呼吸空间。',
      '根据情境适度调整起伏，川渝方言注意保持舌尖音清晰度。',
    ];

    tipsList.forEach((tip, idx) => {
      const itemY = tipsY + 80 + idx * 72;

      // Number badge
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      roundRect(ctx, 76, itemY, 32, 32, 16, true, false);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}`, 92, itemY + 22);

      // Tip Text
      ctx.textAlign = 'left';
      ctx.font = '18px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      let cleanTip = tip;
      if (cleanTip.length > 40) cleanTip = cleanTip.slice(0, 39) + '...';
      ctx.fillText(cleanTip, 122, itemY + 23);
    });

    // 8. Footer Authenticity Bar with Verification Signature
    const footerY = 1340;
    ctx.fillStyle = '#090d16';
    roundRect(ctx, 48, footerY, width - 96, 130, 20, true, false);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    roundRect(ctx, 48, footerY, width - 96, 130, 20, false, true);

    // Left info
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.fillText('宇宙无敌口语表达教练 · 权威声学认证', 76, footerY + 48);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#64748b';
    ctx.fillText(
      `VERIFIED RECORD: EXP-REF-${Date.now().toString(36).toUpperCase()} · Web Audio DSP Engine`,
      76,
      footerY + 80
    );
    ctx.fillText('Powered by Gemini 3.1 Flash-Lite & Sherpa-ONNX', 76, footerY + 104);

    // Right Verification QR/Shield Graphic
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    roundRect(ctx, width - 156, footerY + 25, 80, 80, 16, true, false);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    roundRect(ctx, width - 156, footerY + 25, 80, 80, 16, false, true);

    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡️', width - 116, footerY + 77);

    // Export to Data URL
    try {
      const url = canvas.toDataURL('image/png', 0.95);
      setPosterUrl(url);
    } catch (e) {
      console.error('Failed to generate poster data URL:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        generatePoster();
      }, 100);
    }
  }, [isOpen, reading, scores]);

  const handleDownload = () => {
    if (!posterUrl) return;
    const link = document.createElement('a');
    link.download = `voice-coach-replay-${reading.title.replace(/\s+/g, '_')}-${Date.now()}.png`;
    link.href = posterUrl;
    link.click();
  };

  const handleCopy = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob && navigator.clipboard && (window as any).ClipboardItem) {
          await navigator.clipboard.write([
            new (window as any).ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      });
    } catch (err) {
      console.warn('Clipboard write image not supported in current context:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              <Share2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>导出复盘分享海报</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  高清水印海报
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                将波形对比、语调拟合分与名师锦囊生成精美长图，便于朋友圈与社交分享
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hidden Canvas used for high-res drawing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Modal Body / Poster Live Preview */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col items-center bg-slate-950/70">
          {isGenerating ? (
            <div className="py-24 flex flex-col items-center gap-3 text-slate-400">
              <RefreshCw className="animate-spin text-emerald-400" size={32} />
              <span className="text-xs font-medium">正在实时渲染高清复盘海报...</span>
            </div>
          ) : posterUrl ? (
            <div className="w-full max-w-md rounded-xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900 group relative">
              <img
                src={posterUrl}
                alt="Voice Coaching Replay Poster"
                className="w-full h-auto object-contain rounded-xl"
              />
              <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-mono text-emerald-400 border border-emerald-500/30">
                1080 × 1520 HD
              </div>
            </div>
          ) : (
            <div className="py-16 text-xs text-slate-400">海报准备中...</div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>自动附带防伪水印与声学算法验证章</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer shadow-xs"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? '已复制图片' : '复制海报'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
            >
              <Download size={14} />
              <span>下载高清海报 (PNG)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Canvas Helper to Draw Rounded Rectangles
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: boolean = true,
  stroke: boolean = false
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
