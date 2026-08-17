import React, { useEffect, useRef, useState } from 'react';
import { Activity, Volume2, Mic, Pause } from 'lucide-react';
import { speechManager } from '../utils/speech';

interface VoiceWaveformProps {
  isRecording: boolean;
  isPaused: boolean;
  audioVolume: number;
}

export const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  isRecording,
  isPaused,
  audioVolume,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const volumeHistoryRef = useRef<number[]>(new Array(64).fill(0));

  // Dynamic assessment of expressiveness (pitch/dynamics variance)
  const [intonationLevel, setIntonationLevel] = useState<'flat' | 'moderate' | 'expressive'>('moderate');
  const [pitchVarianceScore, setPitchVarianceScore] = useState<number>(68);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Fetch latest byte frequency data from speechManager Web Audio analyser
      const analyser = speechManager.getAnalyser();
      let liveVol = audioVolume;

      if (analyser && isRecording && !isPaused) {
        const freqData = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqData);
        let sum = 0;
        for (let i = 0; i < freqData.length; i++) {
          sum += freqData[i];
        }
        liveVol = Math.round((sum / freqData.length / 255) * 100);
      }

      // Update volume history buffer
      if (isRecording && !isPaused) {
        volumeHistoryRef.current.push(liveVol);
        if (volumeHistoryRef.current.length > 64) {
          volumeHistoryRef.current.shift();
        }
      } else if (isPaused) {
        // Flatline dampening when paused
        volumeHistoryRef.current.push(0);
        if (volumeHistoryRef.current.length > 64) {
          volumeHistoryRef.current.shift();
        }
      } else {
        // Idle gentle waveform
        volumeHistoryRef.current.push(Math.sin(phase * 0.1) * 3 + 3);
        if (volumeHistoryRef.current.length > 64) {
          volumeHistoryRef.current.shift();
        }
      }

      // Calculate variance / standard deviation to detect "flat expression"
      const nonZero = volumeHistoryRef.current.filter((v) => v > 5);
      if (nonZero.length > 10) {
        const mean = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
        const variance =
          nonZero.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / nonZero.length;
        const stdDev = Math.sqrt(variance);
        const score = Math.min(99, Math.max(30, Math.round(stdDev * 5 + 30)));
        setPitchVarianceScore(score);

        if (score < 50) {
          setIntonationLevel('flat');
        } else if (score > 75) {
          setIntonationLevel('expressive');
        } else {
          setIntonationLevel('moderate');
        }
      }

      phase += 0.08;

      // Draw background center line
      ctx.strokeStyle = isPaused ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Render Dynamic Multi-Wave Harmonic Ribbons
      const barCount = 48;
      const barSpacing = width / barCount;
      const centerY = height / 2;

      for (let i = 0; i < barCount; i++) {
        const x = i * barSpacing;
        const historyIdx = Math.floor((i / barCount) * volumeHistoryRef.current.length);
        const vol = volumeHistoryRef.current[historyIdx] || 0;

        let amp = (vol / 100) * (centerY * 0.85);
        if (!isRecording && !isPaused) {
          amp = Math.sin(phase + i * 0.2) * 2;
        }

        // Add subtle harmonic modulation
        const wave1 = Math.sin(phase * 1.5 + i * 0.3) * (amp * 0.4);
        const wave2 = Math.cos(phase * 2 + i * 0.2) * (amp * 0.3);
        const totalHeight = Math.max(2, amp + wave1 + wave2);

        // Draw symmetrical vertical sound bar
        const gradient = ctx.createLinearGradient(0, centerY - totalHeight, 0, centerY + totalHeight);

        if (isPaused) {
          gradient.addColorStop(0, 'rgba(56, 189, 248, 0.9)'); // Cyan-blue when paused
          gradient.addColorStop(0.5, 'rgba(147, 197, 253, 0.6)');
          gradient.addColorStop(1, 'rgba(56, 189, 248, 0.9)');
        } else if (isRecording) {
          gradient.addColorStop(0, '#ec4899'); // Neon Pink / Rose
          gradient.addColorStop(0.5, '#f43f5e');
          gradient.addColorStop(1, '#a855f7'); // Purple
        } else {
          gradient.addColorStop(0, 'rgba(113, 113, 122, 0.3)');
          gradient.addColorStop(1, 'rgba(113, 113, 122, 0.1)');
        }

        ctx.fillStyle = gradient;
        const barWidth = Math.max(2, barSpacing * 0.55);
        ctx.beginPath();
        ctx.roundRect(x, centerY - totalHeight, barWidth, totalHeight * 2, [3]);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording, isPaused, audioVolume]);

  return (
    <div className="w-full bg-zinc-950/85 border border-zinc-900 rounded-xl px-3 py-2 flex flex-col gap-1.5 shadow-inner select-none transition-all">
      {/* Top Meta info: Intonation feedback & Audio volume level */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 font-medium text-zinc-400">
            <Activity
              size={12}
              className={
                isPaused
                  ? 'text-sky-400'
                  : isRecording
                  ? 'text-pink-500 animate-pulse'
                  : 'text-zinc-600'
              }
            />
            <span className="text-zinc-300">声纹波形与抑扬顿挫</span>
          </div>

          {/* Intonation Diagnostic Pill */}
          {isRecording && !isPaused && (
            <span
              className={`px-1.5 py-0.2 rounded text-[9px] font-bold border transition-colors ${
                intonationLevel === 'flat'
                  ? 'bg-amber-950/60 border-amber-500/50 text-amber-300'
                  : intonationLevel === 'expressive'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-pink-950/60 border-pink-500/50 text-pink-300'
              }`}
            >
              {intonationLevel === 'flat'
                ? '⚠️ 语调较平淡 (建议增加重音与起伏)'
                : intonationLevel === 'expressive'
                ? '✨ 抑扬顿挫极佳 (富有感染力)'
                : '🌊 语调节奏自然'}
            </span>
          )}

          {isPaused && (
            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-950/60 border border-sky-500/50 text-sky-300">
              ⏸️ 录音已暂停 · 按空格继续
            </span>
          )}
        </div>

        {/* Real-time Dynamics stats */}
        <div className="flex items-center gap-2 font-mono text-[9px] text-zinc-400">
          <span className="flex items-center gap-1">
            <Volume2 size={10} className={audioVolume > 15 ? 'text-pink-400' : 'text-zinc-600'} />
            <span>音量: {audioVolume}%</span>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="flex items-center gap-1 text-purple-300">
            <span>声波动感: {pitchVarianceScore}</span>
          </span>
        </div>
      </div>

      {/* Canvas Waveform Display */}
      <div className="h-9 w-full overflow-hidden rounded bg-black/80 border border-zinc-900 flex items-center justify-center relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={36}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
};
