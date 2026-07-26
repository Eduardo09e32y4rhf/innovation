'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, CheckCircle, AlertCircle, X } from 'lucide-react';

interface FaceIDOverlayProps {
  onCapture: (photoBase64: string, descriptor?: number[]) => void;
  onCancel: () => void;
  title?: string;
  compareDescriptor?: number[]; // se for para bater ponto e comparar
}

export function FaceIDOverlay({ onCapture, onCancel, title = 'Verificação Facial', compareDescriptor }: FaceIDOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [status, setStatus] = useState<'loading' | 'ready' | 'countdown' | 'captured' | 'error'>('loading');
  const [countdown, setCountdown] = useState(3);
  const [errorMsg, setErrorMsg] = useState('');
  const [instruction, setInstruction] = useState('Iniciando câmera...');

  // Inicia câmera automaticamente
  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        });

        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('ready');
        setInstruction('Posicione seu rosto e aguarde...');

        // Auto-capture em 3 segundos após câmera estar pronta
        startCountdown(active);
      } catch (err: any) {
        if (active) {
          setStatus('error');
          setErrorMsg('Permissão de câmera negada. Verifique as configurações do navegador.');
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (captureTimerRef.current) clearTimeout(captureTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCountdown(active: boolean) {
    let count = 3;
    setCountdown(3);
    setStatus('countdown');

    const tick = () => {
      if (!active) return;
      count--;
      setCountdown(count);
      if (count > 0) {
        captureTimerRef.current = setTimeout(tick, 1000);
      } else {
        capturePhoto();
      }
    };

    captureTimerRef.current = setTimeout(tick, 1000);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const MAX_WIDTH = 640;
    const scale = Math.min(MAX_WIDTH / video.videoWidth, 1);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Espelha horizontalmente (igual ao que o usuário vê)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    const photoBase64 = canvas.toDataURL('image/jpeg', 0.8);

    setStatus('captured');
    setInstruction('Foto capturada! ✓');

    // Para o stream após captura
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());

    // Entrega a foto (sem descriptor por enquanto — futura integração de face-api)
    setTimeout(() => onCapture(photoBase64, []), 600);
  }

  function retryCapture() {
    setStatus('loading');
    setErrorMsg('');
    setInstruction('Reiniciando câmera...');

    // Reinicia a câmera
    navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    }).then(stream => {
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStatus('ready');
      setInstruction('Posicione seu rosto e aguarde...');
      let active = true;
      startCountdown(active);
    }).catch(() => {
      setStatus('error');
      setErrorMsg('Não foi possível acessar a câmera.');
    });
  }

  const ringColor =
    status === 'captured' ? 'border-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.4)]' :
    status === 'countdown' ? 'border-violet-400 shadow-[0_0_40px_rgba(167,139,250,0.4)]' :
    status === 'error' ? 'border-rose-500' :
    'border-slate-600';

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md">
      <div className="flex w-full max-w-xs flex-col items-center gap-6 px-4">

        {/* Título */}
        <div className="text-center">
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>

        {/* Câmera circular — sem quadrado interno */}
        <div className={`relative flex h-72 w-72 items-center justify-center overflow-hidden rounded-full border-4 transition-all duration-500 bg-slate-900 ${ringColor}`}>

          {/* Vídeo — sempre renderizado para não perder o stream */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)] transition-opacity duration-300 ${
              status === 'loading' || status === 'error' ? 'opacity-0' : 'opacity-100'
            }`}
          />

          {/* Estado: carregando */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 text-violet-400">
              <RefreshCw className="animate-spin" size={36} />
              <span className="text-xs font-semibold text-slate-300">Iniciando câmera...</span>
            </div>
          )}

          {/* Estado: erro */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-3 p-6 text-center text-rose-400">
              <AlertCircle size={36} />
              <span className="text-xs font-semibold leading-relaxed text-rose-300">{errorMsg}</span>
            </div>
          )}

          {/* Estado: contagem regressiva */}
          {status === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30">
              <span className="text-7xl font-black text-white drop-shadow-2xl" style={{ textShadow: '0 0 30px rgba(167,139,250,0.8)' }}>
                {countdown}
              </span>
            </div>
          )}

          {/* Estado: capturado */}
          {status === 'captured' && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle size={56} className="text-emerald-400 drop-shadow-lg" />
            </div>
          )}
        </div>

        {/* Instrução */}
        <div className="rounded-full bg-white/5 px-6 py-2 text-center backdrop-blur-md border border-white/10">
          <span className={`text-sm font-semibold ${
            status === 'captured' ? 'text-emerald-400' :
            status === 'error' ? 'text-rose-400' :
            status === 'countdown' ? 'text-violet-300' :
            'text-slate-300'
          }`}>
            {status === 'countdown' ? `Capturando em ${countdown}s...` : instruction}
          </span>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          {status === 'error' && (
            <button
              onClick={retryCapture}
              className="flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 active:scale-95"
            >
              <RefreshCw size={16} />
              Tentar Novamente
            </button>
          )}
          {status === 'ready' && (
            <button
              onClick={capturePhoto}
              className="flex items-center gap-2 rounded-full bg-violet-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700 active:scale-95"
            >
              <Camera size={16} />
              Tirar Foto Agora
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={status === 'captured'}
            className="flex items-center gap-2 rounded-full bg-white/10 px-6 py-2.5 text-sm font-bold text-slate-300 transition hover:bg-white/20 hover:text-white disabled:opacity-30 border border-white/10"
          >
            <X size={16} />
            Cancelar
          </button>
        </div>

        {/* Branding */}
        <div className="mt-2 flex flex-col items-center gap-1 opacity-50">
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-slate-500 to-transparent" />
          <span className="text-[10px] font-bold tracking-[0.25em] text-slate-500 uppercase">
            Innovation Facial
          </span>
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
