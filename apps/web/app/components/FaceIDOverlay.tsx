'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface FaceIDOverlayProps {
  onCapture: (photoBase64: string, descriptor?: number[]) => void;
  onCancel: () => void;
  title?: string;
  compareDescriptor?: number[]; // se for para bater ponto e comparar
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

// Cache global dos modelos — carregado apenas UMA vez por sessão
let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

async function ensureModelsLoaded() {
  if (modelsLoaded) return;
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    await (faceapi.tf as any).ready();
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
  })();

  return modelsLoading;
}

// Pré-carrega os modelos assim que o módulo é importado (background)
if (typeof window !== 'undefined') {
  ensureModelsLoaded().catch(() => {});
}

export function FaceIDOverlay({ onCapture, onCancel, title = 'Verificação Facial', compareDescriptor }: FaceIDOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionLoopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [loadingModels, setLoadingModels] = useState(!modelsLoaded);
  const [error, setError] = useState('');
  const [instruction, setInstruction] = useState(modelsLoaded ? 'Carregando câmera...' : 'Carregando modelos de IA...');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [currentDescriptor, setCurrentDescriptor] = useState<Float32Array | null>(null);

  useEffect(() => {
    let active = true;
    let currentStream: MediaStream | null = null;

    async function init() {
      try {
        // Garante modelos carregados (usa cache se já estiver pronto)
        if (!modelsLoaded) {
          setInstruction('Carregando modelos de IA...');
          await ensureModelsLoaded();
        }

        if (!active) return;
        setInstruction('Solicitando acesso à câmera...');

        // Abre câmera com resolução menor para processar mais rápido
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 480 },
            height: { ideal: 360 },
          },
        });

        currentStream = stream;
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }

        setLoadingModels(false);
        setInstruction('Posicione seu rosto no círculo');

        // Monta o stream no vídeo imediatamente
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        if (active) setError(err.message || 'Erro ao carregar câmera/modelos. Verifique as permissões.');
      }
    }

    init();

    return () => {
      active = false;
      if (currentStream) currentStream.getTracks().forEach(t => t.stop());
      if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);
    };
  }, []);

  const handleVideoPlay = () => {
    setInstruction('Posicione seu rosto no círculo');

    // Detecção com throttle a cada 300ms (não 60fps) — muito mais leve
    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || isValidating) return;

      try {
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          const box = detection.detection.box;
          const vw = videoRef.current.videoWidth;

          const isCentered = box.x > vw * 0.1 && (box.x + box.width) < vw * 0.9;
          const isGoodSize = box.width > vw * 0.2;

          if (!isGoodSize) {
            setInstruction('Aproxime o rosto');
            setIsFaceDetected(false);
          } else if (!isCentered) {
            setInstruction('Centralize o rosto');
            setIsFaceDetected(false);
          } else {
            setInstruction(compareDescriptor ? 'Rosto detectado! Verificando...' : 'Rosto detectado! Clique para capturar.');
            setIsFaceDetected(true);
            setCurrentDescriptor(detection.descriptor);

            if (compareDescriptor) {
              setIsValidating(true);
              processCapture(detection.descriptor);
              return; // Para o loop
            }
          }
        } else {
          setIsFaceDetected(false);
          setCurrentDescriptor(null);
          setInstruction('Posicione seu rosto no círculo');
        }
      } catch {
        // ignora erros de detecção em frames transitórios
      }

      // Throttle: próxima detecção em 300ms (não rAF = 60fps)
      detectionLoopRef.current = setTimeout(detectFace, 300);
    };

    detectionLoopRef.current = setTimeout(detectFace, 300);
  };

  const handleManualCapture = () => {
    if (currentDescriptor && !isValidating) {
      setIsValidating(true);
      processCapture(currentDescriptor);
    }
  };

  const processCapture = (descriptor: Float32Array) => {
    if (videoRef.current) videoRef.current.pause();
    if (detectionLoopRef.current) clearTimeout(detectionLoopRef.current);

    // Comparação biométrica
    if (compareDescriptor && compareDescriptor.length > 0) {
      const distance = faceapi.euclideanDistance(descriptor, new Float32Array(compareDescriptor));
      if (distance > 0.55) {
        setError('Rosto não reconhecido. Tente novamente.');
        setIsValidating(false);
        setIsFaceDetected(false);
        if (videoRef.current) videoRef.current.play();
        // Reinicia o loop de detecção
        detectionLoopRef.current = setTimeout(() => handleVideoPlay(), 300);
        return;
      }
    }

    setInstruction('Rosto Validado! ✓');

    // Captura a foto imediatamente (sem delay artificial)
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const MAX_WIDTH = 480;
      const scale = Math.min(MAX_WIDTH / video.videoWidth, 1);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Espelhar a imagem para ficar igual ao vídeo visualizado
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Qualidade 0.5 e resolução menor previne payload muito grande (evita loop de falhas)
        const photoBase64 = canvas.toDataURL('image/jpeg', 0.5);
        onCapture(photoBase64, Array.from(descriptor));
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center">
        <h2 className="mb-8 text-xl font-bold text-white">{title}</h2>

        <div className="relative mb-8 flex h-64 w-64 items-center justify-center overflow-hidden rounded-full border-4 border-slate-700 bg-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {loadingModels && !error ? (
            <div className="flex flex-col items-center gap-2 p-4 text-center text-teal-400">
              <RefreshCw className="animate-spin" size={32} />
              <span className="text-xs font-semibold leading-relaxed">{instruction}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-2 p-4 text-center text-rose-400">
              <AlertCircle size={32} />
              <span className="text-xs font-semibold">{error}</span>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                onPlay={handleVideoPlay}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)]"
              />
              {/* Anel de feedback */}
              <div className={`absolute inset-0 rounded-full border-[6px] transition-colors duration-300 ${
                isValidating ? 'border-teal-400' : isFaceDetected ? 'border-teal-500/60' : 'border-transparent'
              }`} />
              {isValidating && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-teal-500/10">
                  <CheckCircle size={40} className="text-teal-400 drop-shadow-lg" />
                </div>
              )}
            </>
          )}
        </div>

        {!error && !loadingModels && (
          <div className="mb-8 rounded-full bg-slate-800/80 px-6 py-2 text-center backdrop-blur-md">
            <span className={`text-sm font-bold ${isValidating ? 'text-teal-400' : 'text-slate-200'}`}>
              {instruction}
            </span>
          </div>
        )}

        <div className="flex gap-4">
          {!compareDescriptor && isFaceDetected && !isValidating && (
            <button
              onClick={handleManualCapture}
              className="flex items-center gap-2 rounded-full bg-teal-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-teal-700 active:scale-95"
            >
              <Camera size={18} />
              Tirar Foto
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={isValidating}
            className="rounded-full bg-slate-800 px-8 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
