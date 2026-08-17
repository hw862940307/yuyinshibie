import React, { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Pause,
  Play,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sparkles,
  Radio,
} from 'lucide-react';

interface VoiceOrbVisualizerProps {
  isRecording: boolean;
  isPaused: boolean;
  audioVolume: number; // 0 - 100
  duration: number; // seconds
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  interimText?: string;
  isCompact?: boolean;
}

export const VoiceOrbVisualizer: React.FC<VoiceOrbVisualizerProps> = ({
  isRecording,
  isPaused,
  audioVolume,
  duration,
  onStart,
  onPause,
  onResume,
  onStop,
  interimText = '',
  isCompact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Format timer MM:SS
  const formatTime = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Canvas fluid glowing orb rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let phase = 0;

    const render = () => {
      const width = (canvas.width = canvas.parentElement?.clientWidth || 400);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 400);
      const centerX = width / 2;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      // Dynamic reactive radius based on volume and recording state
      const baseRadius = Math.min(centerX, centerY) * 0.46;
      const volFactor = isRecording && !isPaused ? Math.min(1, audioVolume / 60) : 0;
      const pulse = isRecording && !isPaused ? Math.sin(phase * 2) * 6 : 0;
      const currentRadius = baseRadius + volFactor * 22 + pulse;

      phase += isRecording && !isPaused ? 0.04 : 0.015;

      // 1. Ambient Outer Halo (Cosmic glow)
      const outerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        currentRadius * 0.5,
        centerX,
        centerY,
        currentRadius * 2.2
      );
      if (isRecording && !isPaused) {
        outerGlow.addColorStop(0, 'rgba(168, 85, 247, 0.35)'); // Purple
        outerGlow.addColorStop(0.35, 'rgba(59, 130, 246, 0.22)'); // Blue
        outerGlow.addColorStop(0.7, 'rgba(6, 182, 212, 0.12)'); // Cyan
        outerGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      } else {
        outerGlow.addColorStop(0, 'rgba(99, 102, 241, 0.15)');
        outerGlow.addColorStop(0.5, 'rgba(147, 51, 234, 0.08)');
        outerGlow.addColorStop(1, 'rgba(15, 23, 42, 0)');
      }
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, currentRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Multicolored Aurora Glowing Ring (Figure 1 accurate gradient wave)
      const numPoints = 64;
      ctx.save();
      ctx.translate(centerX, centerY);

      // Draw multi-layered glowing organic ring
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        const layerRadius = currentRadius - layer * 4;
        const alpha = isRecording && !isPaused ? 0.8 - layer * 0.2 : 0.4 - layer * 0.1;

        for (let i = 0; i <= numPoints; i++) {
          const angle = (i / numPoints) * Math.PI * 2;
          // Organic fluid wave offset
          const wave =
            isRecording && !isPaused
              ? Math.sin(angle * 4 + phase + layer) * (6 + volFactor * 14) +
                Math.cos(angle * 6 - phase * 1.5) * (4 + volFactor * 8)
              : Math.sin(angle * 3 + phase) * 3;

          const r = layerRadius + wave;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();

        // Conic-like or linear color shifts
        const ringGradient = ctx.createLinearGradient(
          -currentRadius,
          -currentRadius,
          currentRadius,
          currentRadius
        );
        ringGradient.addColorStop(0, `rgba(192, 132, 252, ${alpha})`); // Violet / Magenta
        ringGradient.addColorStop(0.3, `rgba(168, 85, 247, ${alpha * 0.9})`); // Purple
        ringGradient.addColorStop(0.65, `rgba(59, 130, 246, ${alpha})`); // Royal Blue
        ringGradient.addColorStop(1, `rgba(34, 211, 238, ${alpha})`); // Bright Cyan / Neon Teal

        ctx.strokeStyle = ringGradient;
        ctx.lineWidth = isRecording && !isPaused ? 16 - layer * 3 : 8;
        ctx.lineJoin = 'round';
        ctx.shadowColor = isRecording ? '#a855f7' : '#6366f1';
        ctx.shadowBlur = isRecording && !isPaused ? 25 : 12;
        ctx.stroke();
      }

      ctx.restore();

      // 3. Inner Frosted Circle Dark Canvas (Microphone backing)
      const innerRadius = baseRadius * 0.72;
      const innerGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        innerRadius
      );
      innerGrad.addColorStop(0, 'rgba(30, 41, 59, 0.85)');
      innerGrad.addColorStop(0.85, 'rgba(15, 23, 42, 0.95)');
      innerGrad.addColorStop(1, 'rgba(2, 6, 23, 0.98)');

      ctx.save();
      ctx.fillStyle = innerGrad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
      ctx.fill();

      // Subtle inner border ring
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isRecording, isPaused, audioVolume]);

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col items-center justify-between rounded-3xl overflow-hidden select-none transition-all ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#0B0F19] p-8'
          : isCompact
          ? 'w-full h-72 bg-gradient-to-b from-slate-900/90 via-slate-950/95 to-slate-900/90 border border-slate-800/80 shadow-2xl p-4'
          : 'w-full h-80 md:h-96 bg-gradient-to-b from-[#0F172A]/90 via-[#0B0F19] to-[#020617] border border-slate-800 shadow-2xl p-6'
      }`}
    >
      {/* Top Meta Header: RTX VSR / Audio Engine Indicator */}
      <div className="w-full flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700/80 text-[10px] font-mono font-bold text-slate-300">
            <Radio
              size={12}
              className={isRecording && !isPaused ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}
            />
            <span>{isRecording && !isPaused ? 'LIVE AUDIO CAPTURE' : 'STANDBY'}</span>
          </div>
          {audioVolume > 5 && isRecording && (
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/50 animate-in fade-in">
              {Math.round(audioVolume)} dB
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-slate-800/90 border border-slate-700 text-[10px] font-mono font-bold text-slate-400">
            RTX VSR
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-colors cursor-pointer"
            title={isFullscreen ? '退出全屏' : '全屏沉浸练说'}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Center Voice Orb Canvas & Interactive Microphone Button (Figure 1 Exact Design) */}
      <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Central interactive Mic trigger */}
        <button
          type="button"
          onClick={() => {
            if (!isRecording) {
              onStart();
            } else if (isPaused) {
              onResume();
            } else {
              onPause();
            }
          }}
          className={`relative z-10 w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center transition-transform active:scale-95 cursor-pointer group focus:outline-hidden ${
            isRecording && !isPaused
              ? 'scale-105'
              : 'hover:scale-105'
          }`}
          title={isRecording ? (isPaused ? '点击继续' : '点击暂停') : '点击开始录音'}
        >
          {/* Inner Mic Icon */}
          <div
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center transition-all ${
              isRecording && !isPaused
                ? 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 text-white shadow-[0_0_25px_rgba(168,85,247,0.6)]'
                : isPaused
                ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300'
                : 'bg-slate-800/90 hover:bg-slate-700/90 border border-slate-600/80 text-slate-100 group-hover:text-white'
            }`}
          >
            {isRecording && !isPaused ? (
              <Mic size={34} className="animate-pulse" />
            ) : isPaused ? (
              <Play size={30} className="ml-1" />
            ) : (
              <Mic size={34} />
            )}
          </div>
        </button>
      </div>

      {/* Interim Text / Realtime Floating Subtitle Feedback */}
      {interimText && (
        <div className="w-full max-w-xl text-center px-4 py-1.5 z-10">
          <p className="text-sm font-light text-slate-300 bg-slate-900/80 backdrop-blur border border-slate-700/60 rounded-full px-4 py-1.5 inline-block shadow-md truncate max-w-full">
            🎙️ {interimText}
          </p>
        </div>
      )}

      {/* Bottom Timeline Control Bar (Figure 1: Play/Pause, 0:03/0:04, slider, volume, expand) */}
      <div className="w-full flex items-center justify-between gap-4 z-10 pt-2 shrink-0">
        {/* Play/Pause icon button */}
        <button
          type="button"
          onClick={() => {
            if (!isRecording) onStart();
            else if (isPaused) onResume();
            else onPause();
          }}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {isRecording && !isPaused ? <Pause size={18} /> : <Play size={18} />}
        </button>

        {/* Time Code 0:03 / 0:04 */}
        <div className="text-xs font-mono font-bold text-slate-300 whitespace-nowrap">
          {formatTime(duration)} <span className="text-slate-500">/ {formatTime(duration + 1)}</span>
        </div>

        {/* Dynamic Progress / Wave Slider Track */}
        <div className="flex-1 relative flex items-center">
          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 transition-all duration-300"
              style={{
                width: isRecording ? `${Math.min(100, (duration % 60) * 1.66 + 10)}%` : '0%',
              }}
            />
          </div>
          {/* Slider knob */}
          <div
            className="absolute w-3 h-3 bg-slate-300 rounded-full shadow-md -translate-x-1/2 pointer-events-none"
            style={{
              left: isRecording ? `${Math.min(100, (duration % 60) * 1.66 + 10)}%` : '0%',
            }}
          />
        </div>

        {/* Audio Volume toggle */}
        <button
          type="button"
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title={isMuted ? '取消静音' : '静音'}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>

        {/* Fullscreen Expand button (Bottom Right as in Figure 1) */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="全屏模式"
        >
          {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
    </div>
  );
};
