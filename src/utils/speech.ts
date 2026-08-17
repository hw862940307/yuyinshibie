// Web Speech API, Web Audio VAD, and Server-Side High-Precision Audio ASR Pipeline
// Dual-engine real-time Chinese speech recognition with Web Audio DSP, Dialect Pre-processing & VAD

import { AudioProcessingSettings } from '../types';

export type SpeechCallback = (data: { text: string; isFinal: boolean }) => void;
export type SpeechStateCallback = (isListening: boolean, error?: string) => void;
export type VadStateCallback = (isSpeaking: boolean, energy: number, noiseFloor: number) => void;

export interface ExtractedAudioMetrics {
  waveformData: number[]; // 0.0 - 1.0 normalized amplitudes
  pitchCurve: number[]; // relative pitch contour (0 - 100)
  energyCurve: number[]; // energy envelope
  pausePoints: number[]; // indices where pause occurred
  durationSeconds: number;
}

class SpeechManager {
  private recognition: any = null;
  private isListening = false;
  private shouldKeepListening = false;
  private onResultCallback: SpeechCallback | null = null;
  private onStateCallback: SpeechStateCallback | null = null;
  private onVadStateCallback: VadStateCallback | null = null;
  private lang = 'zh-CN';

  // Audio Context & DSP Pre-processing Nodes
  private audioContext: AudioContext | null = null;
  private rawStream: MediaStream | null = null;
  private processedStream: MediaStream | null = null;
  private streamSourceNode: MediaStreamAudioSourceNode | null = null;
  private highPassFilter: BiquadFilterNode | null = null;
  private dialectPeakingFilter: BiquadFilterNode | null = null;
  private gainNode: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private analyser: AnalyserNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  // Recorders
  private mainRecorder: MediaRecorder | null = null;
  private vadRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private lastAudioUrl: string | null = null;
  private lastRecordedBlob: Blob | null = null;
  private restartTimeout: any = null;

  // Real-time Voice Activity Detection (VAD) & Live Audio Streaming ASR
  private vadInterval: any = null;
  private vadChunks: Blob[] = [];
  private isSpeaking = false;
  private silenceTimer: any = null;
  private speechStartTime: number = 0;
  private isTranscribing = false;
  private recentTranscripts: Array<{ text: string; time: number }> = [];

  // VAD & Pre-processing Settings (configurable)
  private audioGain: number = 1.6; // Pre-processing gain multiplier
  private vadThreshold: number = 8; // Dynamic energy threshold (3-35)
  private silenceHangoverMs: number = 700; // Silence duration before slicing phrase
  private dialectAudioBoost: boolean = true; // High-frequency formants & sibilants boost for Sichuan/Chongqing
  private highPassFilterEnabled: boolean = true; // 85Hz rumble filter
  private noiseSuppressionMode: 'standard' | 'high_noise' | 'speech_clarity' = 'speech_clarity';
  private adaptiveNoiseFloor: number = 3; // Dynamically updated ambient room noise floor

  constructor() {
    this.initRecognition();
  }

  public updateAudioSettings(settings?: Partial<AudioProcessingSettings>) {
    if (!settings) return;
    if (typeof settings.audioGain === 'number') {
      this.audioGain = Math.max(0.5, Math.min(3.5, settings.audioGain));
      if (this.gainNode) {
        this.gainNode.gain.setTargetAtTime(this.audioGain, this.audioContext?.currentTime || 0, 0.05);
      }
    }
    if (typeof settings.vadThreshold === 'number') {
      this.vadThreshold = Math.max(2, Math.min(40, settings.vadThreshold));
    }
    if (typeof settings.silenceHangoverMs === 'number') {
      this.silenceHangoverMs = Math.max(250, Math.min(2000, settings.silenceHangoverMs));
    }
    if (typeof settings.dialectAudioBoost === 'boolean') {
      this.dialectAudioBoost = settings.dialectAudioBoost;
      this.applyFilterSettings();
    }
    if (typeof settings.highPassFilterEnabled === 'boolean') {
      this.highPassFilterEnabled = settings.highPassFilterEnabled;
      this.applyFilterSettings();
    }
    if (settings.noiseSuppressionMode) {
      this.noiseSuppressionMode = settings.noiseSuppressionMode;
      this.applyFilterSettings();
    }
  }

  private applyFilterSettings() {
    if (!this.audioContext) return;
    const now = this.audioContext.currentTime;

    // Apply high pass filter
    if (this.highPassFilter) {
      const freq = this.highPassFilterEnabled ? 85 : 20;
      this.highPassFilter.frequency.setTargetAtTime(freq, now, 0.05);
    }

    // Apply Dialect / High-Sibilance Equalization Filter
    // In Sichuan/Chongqing dialects, tone glides, aspirated affricates [ts, tsʰ, s, z] and sentence-final particles (噻, 嘛, 嘞)
    // are centered between 2.2 kHz - 3.8 kHz.
    if (this.dialectPeakingFilter) {
      const isDialectLang =
        this.lang === 'zh-SC' ||
        this.lang === 'sichuan' ||
        this.lang === 'zh-HK' ||
        this.dialectAudioBoost;

      const boostGain = isDialectLang ? 5.0 : 1.5; // +5dB boost for dialect clarity
      const centerFreq = this.lang === 'zh-SC' ? 2600 : 2400;
      this.dialectPeakingFilter.frequency.setTargetAtTime(centerFreq, now, 0.05);
      this.dialectPeakingFilter.gain.setTargetAtTime(boostGain, now, 0.05);
    }

    if (this.gainNode) {
      this.gainNode.gain.setTargetAtTime(this.audioGain, now, 0.05);
    }
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition ||
      (window as any).mozSpeechRecognition ||
      (window as any).msSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Browser SpeechRecognition API not available; Server Audio ASR is enabled as primary engine.');
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang = this.getBrowserRecognitionLang(this.lang);

      this.recognition.onstart = () => {
        this.isListening = true;
        if (this.onStateCallback) this.onStateCallback(true);
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (!res || !res[0]) continue;
          const transcript = res[0].transcript;
          if (res.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript.trim() && this.onResultCallback) {
          const trimmed = finalTranscript.trim();
          this.recordRecentTranscript(trimmed);
          this.onResultCallback({ text: trimmed, isFinal: true });
        }

        // Pass interim update
        if (this.onResultCallback && (interimTranscript.trim() || !finalTranscript)) {
          this.onResultCallback({ text: interimTranscript.trim(), isFinal: false });
        }
      };

      this.recognition.onerror = (event: any) => {
        console.warn('[Speech Recognition Warning]:', event.error);
        if (event.error === 'not-allowed') {
          if (this.onStateCallback) {
            this.onStateCallback(false, '麦克风权限未开启，请在浏览器中允许麦克风访问');
          }
        }
      };

      this.recognition.onend = () => {
        if (this.shouldKeepListening) {
          if (this.restartTimeout) clearTimeout(this.restartTimeout);
          this.restartTimeout = setTimeout(() => {
            if (this.shouldKeepListening && this.recognition) {
              try {
                this.recognition.lang = this.getBrowserRecognitionLang(this.lang);
                this.recognition.start();
              } catch (e) {
                // Ignore start collision
              }
            }
          }, 150);
        }
      };
    } catch (e) {
      console.error('Failed to create SpeechRecognition instance:', e);
    }
  }

  private getBrowserRecognitionLang(lang: string): string {
    if (lang === 'zh-SC' || lang === 'sichuan') return 'zh-CN';
    if (lang === 'zh-HK' || lang === 'yue') return 'zh-HK';
    if (lang === 'zh-TW') return 'zh-TW';
    if (lang === 'en-US' || lang === 'en') return 'en-US';
    return 'zh-CN';
  }

  private recordRecentTranscript(text: string) {
    const now = Date.now();
    const clean = text.replace(/[\s\p{P}]/gu, '');
    this.recentTranscripts.push({ text: clean, time: now });
    this.recentTranscripts = this.recentTranscripts.filter((item) => now - item.time < 10000);
  }

  private isDuplicateTranscript(text: string): boolean {
    const now = Date.now();
    const clean = text.replace(/[\s\p{P}]/gu, '');
    if (!clean) return true;
    for (const item of this.recentTranscripts) {
      if (now - item.time < 6000) {
        if (item.text === clean || item.text.includes(clean) || clean.includes(item.text)) {
          return true;
        }
      }
    }
    return false;
  }

  public isSupported(): boolean {
    return true;
  }

  public setLanguage(lang: string) {
    this.lang = lang || 'zh-CN';
    if (this.recognition) {
      this.recognition.lang = this.getBrowserRecognitionLang(this.lang);
    }
    this.applyFilterSettings();
  }

  public setVadStateListener(callback: VadStateCallback | null) {
    this.onVadStateCallback = callback;
  }

  public setOnResult(callback: SpeechCallback) {
    this.onResultCallback = callback;
  }

  // Convert Blob to Base64
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        const base64 = res.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Submit audio chunk to Server Gemini ASR
  private async processSpeechChunk(blob: Blob, mimeType: string) {
    if (!blob || blob.size < 2500 || this.isTranscribing) return;

    try {
      this.isTranscribing = true;
      const base64 = await this.blobToBase64(blob);

      const response = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType: mimeType || 'audio/webm',
          lang: this.lang || 'zh-CN',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.text && data.text.trim()) {
          const text = data.text.trim();
          if (!this.isDuplicateTranscript(text)) {
            this.recordRecentTranscript(text);
            if (this.onResultCallback) {
              this.onResultCallback({ text, isFinal: true });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[Server ASR Transcription Exception]:', err);
    } finally {
      this.isTranscribing = false;
      if (this.onResultCallback) {
        this.onResultCallback({ text: '', isFinal: false });
      }
    }
  }

  public async start(onResult: SpeechCallback, onState?: SpeechStateCallback): Promise<boolean> {
    this.onResultCallback = onResult;
    this.onStateCallback = onState || null;
    this.shouldKeepListening = true;
    this.isListening = true;
    this.vadChunks = [];

    // 1. Initialize Microphone Audio Stream and DSP Audio Pipeline
    try {
      if (!this.rawStream) {
        this.rawStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          },
        });
      }

      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Build Web Audio DSP Pipeline:
      // Raw Stream -> Source -> HighPass (85Hz) -> Dialect Peaking EQ (2.6kHz +5dB) -> Gain Node -> Dynamics Compressor -> Destination + Analyser
      this.streamSourceNode = this.audioContext.createMediaStreamSource(this.rawStream);

      // High-Pass Filter (removes table rumbles, breath wind, AC sub-bass)
      this.highPassFilter = this.audioContext.createBiquadFilter();
      this.highPassFilter.type = 'highpass';
      this.highPassFilter.frequency.value = this.highPassFilterEnabled ? 85 : 20;
      this.highPassFilter.Q.value = 0.7;

      // Dialect Presence / Sibilant Equalizer Filter
      this.dialectPeakingFilter = this.audioContext.createBiquadFilter();
      this.dialectPeakingFilter.type = 'peaking';
      this.dialectPeakingFilter.frequency.value = this.lang === 'zh-SC' ? 2600 : 2400;
      this.dialectPeakingFilter.Q.value = 1.1;
      this.dialectPeakingFilter.gain.value =
        this.lang === 'zh-SC' || this.lang === 'sichuan' || this.dialectAudioBoost ? 5.0 : 1.5;

      // Audio Pre-processing Gain Node (Preamplifier)
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.audioGain;

      // Dynamics Compressor (anti-clipping, levels whisper syllables and prevents distortion)
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-24, this.audioContext.currentTime);
      this.compressor.knee.setValueAtTime(30, this.audioContext.currentTime);
      this.compressor.ratio.setValueAtTime(8, this.audioContext.currentTime);
      this.compressor.attack.setValueAtTime(0.003, this.audioContext.currentTime);
      this.compressor.release.setValueAtTime(0.25, this.audioContext.currentTime);

      // Analyser Node for VAD & Frequency Visualizers
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;

      // Audio Destination to feed clean, boosted stream into MediaRecorder
      this.streamDestination = this.audioContext.createMediaStreamDestination();

      // Connect DSP chain
      this.streamSourceNode
        .connect(this.highPassFilter)
        .connect(this.dialectPeakingFilter)
        .connect(this.gainNode)
        .connect(this.compressor);

      this.compressor.connect(this.analyser);
      this.compressor.connect(this.streamDestination);

      this.processedStream = this.streamDestination.stream;

      // 2. Initialize MediaRecorders using the Clean Processed Stream
      const activeStream = this.processedStream || this.rawStream;
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
        'audio/wav',
      ].find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';

      if (typeof MediaRecorder !== 'undefined' && activeStream) {
        try {
          // Main Recorder (for complete session playback)
          this.mainRecorder = mimeType
            ? new MediaRecorder(activeStream, { mimeType })
            : new MediaRecorder(activeStream);

          this.mainRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              this.recordedChunks.push(e.data);
            }
          };

          this.mainRecorder.onstop = () => {
            if (this.recordedChunks.length > 0) {
              const fullBlob = new Blob(this.recordedChunks, { type: mimeType || 'audio/webm' });
              this.lastRecordedBlob = fullBlob;
              if (this.lastAudioUrl) URL.revokeObjectURL(this.lastAudioUrl);
              this.lastAudioUrl = URL.createObjectURL(fullBlob);
            }
          };
          this.mainRecorder.start(200);

          // Function to start a new VAD recorder chunk
          const startVadRecorder = () => {
            if (this.vadRecorder && this.vadRecorder.state !== 'inactive') {
              this.vadRecorder.stop();
            }
            this.vadChunks = [];
            this.vadRecorder = mimeType
              ? new MediaRecorder(activeStream, { mimeType })
              : new MediaRecorder(activeStream);

            this.vadRecorder.ondataavailable = (e) => {
              if (e.data && e.data.size > 0) {
                this.vadChunks.push(e.data);
              }
            };
            this.vadRecorder.onstop = () => {
              if (this.vadChunks.length > 0) {
                const chunkBlob = new Blob(this.vadChunks, { type: mimeType || 'audio/webm' });
                this.processSpeechChunk(chunkBlob, mimeType || 'audio/webm');
              }
            };
            this.vadRecorder.start(150);
          };

          // 3. Real-time Voice Activity Detection (VAD) Engine
          if (this.vadInterval) clearInterval(this.vadInterval);
          this.vadInterval = setInterval(() => {
            if (!this.shouldKeepListening) return;

            const energy = this.getAudioVolume();
            const now = Date.now();

            // Dynamic Adaptive Noise Floor Tracker (updates slowly during silence)
            if (!this.isSpeaking) {
              this.adaptiveNoiseFloor = this.adaptiveNoiseFloor * 0.95 + energy * 0.05;
            }

            const dynamicThreshold = Math.max(this.vadThreshold, this.adaptiveNoiseFloor + 3);
            const isVoiceDetected = energy > dynamicThreshold;

            if (this.onVadStateCallback) {
              this.onVadStateCallback(this.isSpeaking || isVoiceDetected, energy, Math.round(this.adaptiveNoiseFloor));
            }

            if (isVoiceDetected) {
              // User is currently vocalizing
              if (!this.isSpeaking) {
                this.isSpeaking = true;
                this.speechStartTime = now;
                startVadRecorder();
              }

              if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
              }

              // Auto-slice if continuous speech exceeds 4.5 seconds to ensure low latency
              if (now - this.speechStartTime > 4500) {
                if (this.vadRecorder && this.vadRecorder.state !== 'inactive') {
                  this.vadRecorder.stop();
                }
                this.speechStartTime = now;
                startVadRecorder();
              }
            } else if (this.isSpeaking) {
              // Silence detected, wait for silence hangover duration before closing phrase
              if (!this.silenceTimer) {
                this.silenceTimer = setTimeout(() => {
                  this.isSpeaking = false;
                  this.silenceTimer = null;
                  if (this.vadRecorder && this.vadRecorder.state !== 'inactive') {
                    this.vadRecorder.stop();
                  }
                }, this.silenceHangoverMs);
              }
            }
          }, 80);
        } catch (recErr) {
          console.warn('[MediaRecorder Error]:', recErr);
        }
      }

      if (this.onStateCallback) {
        this.onStateCallback(true);
      }
    } catch (err: any) {
      console.error('[Microphone Audio Init Failed]:', err);
      if (this.onStateCallback) {
        this.onStateCallback(false, err.message || '无法访问麦克风');
      }
    }

    // 4. Start Web Speech Recognition as fast local engine if supported
    if (!this.recognition) {
      this.initRecognition();
    }
    if (this.recognition) {
      try {
        this.recognition.lang = this.getBrowserRecognitionLang(this.lang);
        this.recognition.start();
      } catch (e) {
        // Safe to ignore start collision
      }
    }

    return true;
  }

  public stop(): void {
    this.shouldKeepListening = false;
    this.isListening = false;

    if (this.vadInterval) {
      clearInterval(this.vadInterval);
      this.vadInterval = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout);
      this.restartTimeout = null;
    }

    if (this.vadRecorder && this.vadRecorder.state !== 'inactive') {
      try {
        this.vadRecorder.stop();
      } catch (e) {}
    }

    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }

    if (this.mainRecorder && this.mainRecorder.state !== 'inactive') {
      try {
        this.mainRecorder.stop();
      } catch (e) {
        console.warn('Error stopping mainRecorder:', e);
      }
    }

    if (this.rawStream) {
      this.rawStream.getTracks().forEach((track) => track.stop());
      this.rawStream = null;
    }
    this.processedStream = null;

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
      this.analyser = null;
      this.streamSourceNode = null;
      this.highPassFilter = null;
      this.dialectPeakingFilter = null;
      this.gainNode = null;
      this.compressor = null;
      this.streamDestination = null;
    }

    if (this.onStateCallback) this.onStateCallback(false);
  }

  public clearSession(): void {
    this.recordedChunks = [];
    this.lastRecordedBlob = null;
    if (this.lastAudioUrl) {
      URL.revokeObjectURL(this.lastAudioUrl);
      this.lastAudioUrl = null;
    }
    this.recentTranscripts = [];
  }

  public getLastRecordedBlob(): Blob | null {
    return this.lastRecordedBlob;
  }

  public getLastAudioUrl(): string | null {
    return this.lastAudioUrl;
  }

  public emitManualSpeech(text: string, isFinal: boolean = true) {
    if (this.onResultCallback) {
      this.onResultCallback({ text, isFinal });
    }
  }

  // Transcribe any provided audio Blob directly (e.g. from file upload or recorded sample)
  public async transcribeAudioFile(file: Blob): Promise<string> {
    try {
      const base64 = await this.blobToBase64(file);
      const mimeType = file.type || 'audio/webm';
      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioBase64: base64,
          mimeType,
          lang: this.lang || 'zh-CN',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.text || '';
      }
    } catch (e) {
      console.error('[Transcribe Audio File Error]:', e);
    }
    return '';
  }

  // Decode audio Blob or ArrayBuffer to AudioBuffer
  public async decodeAudioBuffer(data: Blob | ArrayBuffer): Promise<AudioBuffer | null> {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
      ctx.close().catch(() => {});
      return audioBuffer;
    } catch (e) {
      console.warn('[Decode Audio Buffer Failed]:', e);
      return null;
    }
  }

  // Extract high precision waveform and pitch/cadence contour points from AudioBuffer
  public extractAudioMetrics(audioBuffer: AudioBuffer, numPoints: number = 70): ExtractedAudioMetrics {
    const channelData = audioBuffer.getChannelData(0);
    const totalSamples = channelData.length;
    const durationSeconds = audioBuffer.duration;
    const step = Math.floor(totalSamples / numPoints);

    const waveformData: number[] = [];
    const energyCurve: number[] = [];
    const pitchCurve: number[] = [];
    const pausePoints: number[] = [];

    let maxAmp = 0.001;

    for (let i = 0; i < numPoints; i++) {
      const start = i * step;
      const end = Math.min(start + step, totalSamples);
      let sumSquares = 0;
      let zeroCrossings = 0;

      for (let j = start; j < end; j++) {
        const sample = channelData[j];
        sumSquares += sample * sample;
        if (j > start && ((channelData[j] >= 0 && channelData[j - 1] < 0) || (channelData[j] < 0 && channelData[j - 1] >= 0))) {
          zeroCrossings++;
        }
      }

      const rms = Math.sqrt(sumSquares / (end - start || 1));
      if (rms > maxAmp) maxAmp = rms;

      waveformData.push(rms);
      energyCurve.push(rms);

      // Approximate pitch variation via zero-crossing density & energy
      const estimatedPitch = Math.min(100, Math.max(10, Math.round((zeroCrossings / (end - start || 1)) * 3000)));
      pitchCurve.push(estimatedPitch);

      if (rms < 0.015) {
        pausePoints.push(i);
      }
    }

    // Normalize waveform amplitudes to 0.0 - 1.0
    const normalizedWaveform = waveformData.map((v) => Math.min(1.0, Number((v / maxAmp).toFixed(3))));

    return {
      waveformData: normalizedWaveform,
      pitchCurve,
      energyCurve,
      pausePoints,
      durationSeconds,
    };
  }

  public speakDemo(
    text: string,
    rate: number = 1.0,
    onStart?: () => void,
    onEnd?: () => void
  ): boolean {
    if (!('speechSynthesis' in window)) {
      console.warn('SpeechSynthesis not supported');
      return false;
    }

    window.speechSynthesis.cancel();

    // Clean up text
    const cleanText = text.replace(/[\*\#\_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = this.getBrowserRecognitionLang(this.lang);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    // Pick a high-quality voice
    const voices = window.speechSynthesis.getVoices();
    const zhVoice =
      voices.find(
        (v) =>
          (v.lang.includes('zh') || v.lang.includes('cmn')) &&
          (v.name.includes('Neural') ||
            v.name.includes('Premium') ||
            v.name.includes('Natural') ||
            v.name.includes('Google') ||
            v.name.includes('Tingting') ||
            v.name.includes('Xiaoxiao'))
      ) || voices.find((v) => v.lang.includes('zh') || v.lang.includes('CN'));

    if (zhVoice) {
      utterance.voice = zhVoice;
    }

    if (onStart) utterance.onstart = onStart;
    if (onEnd) {
      utterance.onend = onEnd;
      utterance.onerror = onEnd;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  }

  public stopTTS(): void {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public isEngineActive(): boolean {
    return this.isListening || this.isSpeaking;
  }

  public hasAudioInput(): boolean {
    return this.rawStream !== null && this.audioContext !== null;
  }

  public restartRecognition(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      try {
        this.recognition.start();
      } catch (e) {}
    }
  }

  public getAudioVolume(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    return Math.min(100, Math.round((avg / 255) * 100));
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }
}

export const speechManager = new SpeechManager();
