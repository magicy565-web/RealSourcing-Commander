/**
 * VoiceInput — 语音录入组件（多模态输入）
 *
 * 支持：
 * - 实时波形动画（基于 Web Audio API AnalyserNode）
 * - 语音识别（Web Speech API，降级到提示文字）
 * - 按住说话 / 点击切换两种模式
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '../lib/haptics';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onClose: () => void;
}

const BAR_COUNT = 28;

export function VoiceInput({ onTranscript, onClose }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(4));
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'done'>('idle');

  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    cancelAnimationFrame(rafRef.current);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setBars(Array(BAR_COUNT).fill(4));
    setStatus('processing');
    hapticMedium();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      hapticLight();
      setStatus('recording');
      setIsRecording(true);
      setTranscript('');

      // Audio visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArr = new Uint8Array(analyser.frequencyBinCount);

      const animate = () => {
        analyser.getByteFrequencyData(dataArr);
        const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
          const idx = Math.floor((i / BAR_COUNT) * dataArr.length);
          return Math.max(4, (dataArr[idx] / 255) * 48);
        });
        setBars(newBars);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);

      // Speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.lang = 'zh-CN';
        rec.continuous = true;
        rec.interimResults = true;
        recognitionRef.current = rec;

        rec.onresult = (e: any) => {
          let interim = '';
          let final = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) final += e.results[i][0].transcript;
            else interim += e.results[i][0].transcript;
          }
          setTranscript(final || interim);
        };

        rec.onerror = () => {
          setTranscript('语音识别暂不可用，请手动输入');
          hapticError();
        };

        rec.onend = () => {
          setStatus('done');
          hapticSuccess();
        };

        rec.start();
      } else {
        // Fallback: simulate after 3s
        setTimeout(() => {
          setTranscript('（语音识别需要浏览器支持，请手动输入）');
          setStatus('done');
        }, 3000);
      }
    } catch {
      setStatus('idle');
      hapticError();
    }
  }, []);

  const handleConfirm = useCallback(() => {
    if (transcript) {
      hapticSuccess();
      onTranscript(transcript);
    }
    onClose();
  }, [transcript, onTranscript, onClose]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      audioCtxRef.current?.close();
    };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: 0,
        right: 0,
        marginBottom: 8,
        borderRadius: 24,
        background: 'rgba(10,10,10,0.95)',
        border: '1px solid rgba(124,58,237,0.3)',
        backdropFilter: 'blur(40px)',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(124,58,237,0.15)',
        padding: '20px 20px 16px',
        zIndex: 50,
      }}
    >
      {/* Waveform */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2.5, height: 56, marginBottom: 14 }}>
        {bars.map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: h }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 0.3 }}
            style={{
              width: 3,
              borderRadius: 2,
              background: isRecording
                ? `rgba(167,139,250,${0.4 + (h / 48) * 0.6})`
                : 'rgba(255,255,255,0.12)',
              transformOrigin: 'center',
            }}
          />
        ))}
      </div>

      {/* Transcript */}
      <div style={{
        minHeight: 40, padding: '8px 12px', borderRadius: 12,
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.07)',
        marginBottom: 14,
      }}>
        <p style={{ margin: 0, fontSize: 13.5, color: transcript ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.25)', lineHeight: 1.5, fontWeight: 400 }}>
          {transcript || (isRecording ? '正在聆听…' : '点击麦克风开始录音')}
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px', borderRadius: 50,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          } as React.CSSProperties}
        >
          取消
        </button>

        {/* Record button */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: isRecording
              ? 'linear-gradient(135deg, #F87171, #EF4444)'
              : 'linear-gradient(135deg, #7C3AED, #4338CA)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isRecording
              ? '0 0 0 8px rgba(248,113,113,0.15), 0 4px 20px rgba(239,68,68,0.5)'
              : '0 0 0 4px rgba(124,58,237,0.2), 0 4px 20px rgba(124,58,237,0.4)',
          } as React.CSSProperties}
        >
          {isRecording ? (
            <div style={{ width: 16, height: 16, borderRadius: 3, background: 'white' }}/>
          ) : (
            <svg width="20" height="24" viewBox="0 0 14 18" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round">
              <rect x="4" y="1" width="6" height="10" rx="3"/>
              <path d="M1 8.5C1 12 3.7 14.5 7 14.5C10.3 14.5 13 12 13 8.5"/>
              <line x1="7" y1="14.5" x2="7" y2="17"/>
              <line x1="4.5" y1="17" x2="9.5" y2="17"/>
            </svg>
          )}
        </motion.button>

        <button
          onClick={handleConfirm}
          disabled={!transcript}
          style={{
            padding: '8px 16px', borderRadius: 50,
            background: transcript ? 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(67,56,202,0.2))' : 'rgba(255,255,255,0.04)',
            border: transcript ? '1px solid rgba(124,58,237,0.4)' : '1px solid rgba(255,255,255,0.06)',
            color: transcript ? '#A78BFA' : 'rgba(255,255,255,0.2)',
            fontSize: 13, fontWeight: 700, cursor: transcript ? 'pointer' : 'default',
            transition: 'all 0.2s ease',
          } as React.CSSProperties}
        >
          确认
        </button>
      </div>

      {/* Status indicator */}
      <div style={{ textAlign: 'center', marginTop: 10 }}>
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>
          {status === 'recording' && '🔴 录音中'}
          {status === 'processing' && '⏳ 处理中…'}
          {status === 'done' && '✅ 识别完成'}
          {status === 'idle' && '点击麦克风开始'}
        </span>
      </div>
    </motion.div>
  );
}
