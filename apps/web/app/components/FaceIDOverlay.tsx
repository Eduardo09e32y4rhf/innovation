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

export function FaceIDOverlay({ onCapture, onCancel, title = 'Verificação Facial', compareDescriptor }: FaceIDOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [loadingModels, setLoadingModels] = useState(true);
  const [error, setError] = useState('');
  const [instruction, setInstruction] = useState('Carregando câmera...');
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [currentDescriptor, setCurrentDescriptor] = useState<Float32Array | null>(null);

  useEffect(() => {
    let active = true;
    let currentStream: MediaStream | null = null;
    async function loadModelsAndCamera() {
      try {
        setInstruction('Carregando modelos de IA...');
        // @ts-ignore
        await faceapi.tf?.ready?.();
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        if (!active) return;
        setInstruction('Solicitando acesso à câmera (clique em Permitir no navegador)...');
        
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        
        currentStream = stream;
        
        if (!active) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setLoadingModels(false);
        setInstruction('Aguardando vídeo...');
        
        // Delay slighty so React can render the <video> element
        setTimeout(() => {
          if (videoRef.current && active) {
            videoRef.current.srcObject = stream;
          }
        }, 50);
      } catch (err: any) {
        if (active) setError(err.message || 'Erro ao carregar câmera/modelos. Verifique as permissões.');
      }
    }
    loadModelsAndCamera();
    
    return () => {
      active = false;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleVideoPlay = () => {
    setInstruction('Posicione seu rosto no círculo');
    const detectFace = async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || isValidating) return;
      
      const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                                     .withFaceLandmarks()
                                     .withFaceDescriptor();
                                     
      if (detection) {
        const box = detection.detection.box;
        const videoWidth = videoRef.current.videoWidth;
        const videoHeight = videoRef.current.videoHeight;
        
        // Verifica se o rosto está razoavelmente centralizado e em bom tamanho
        const isCentered = box.x > videoWidth * 0.1 && (box.x + box.width) < videoWidth * 0.9;
        const isGoodSize = box.width > videoWidth * 0.25;
        
        if (!isGoodSize) {
          setInstruction('Aproxime o rosto');
          setIsFaceDetected(false);
        } else if (!isCentered) {
          setInstruction('Centralize o rosto');
          setIsFaceDetected(false);
        } else {
          setInstruction(compareDescriptor ? 'Rosto detectado! Processando...' : 'Rosto detectado! Clique para capturar.');
          setIsFaceDetected(true);
          setCurrentDescriptor(detection.descriptor);
          
          if (compareDescriptor && !isValidating) {
            setIsValidating(true);
            processCapture(detection.descriptor);
          }
        }
      } else {
        setIsFaceDetected(false);
        setCurrentDescriptor(null);
        setInstruction('Posicione seu rosto no círculo');
      }
      
      if (!isValidating && !(isFaceDetected && !compareDescriptor)) {
        requestAnimationFrame(detectFace);
      }
    };
    
    detectFace();
  };

  const handleManualCapture = () => {
    if (currentDescriptor && !isValidating) {
      setIsValidating(true);
      processCapture(currentDescriptor);
    }
  };
  
  const processCapture = async (descriptor: Float32Array) => {
    // Parar o vídeo
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    // Comparação (Match Biométrico)
    if (compareDescriptor && compareDescriptor.length > 0) {
      const distance = faceapi.euclideanDistance(descriptor, new Float32Array(compareDescriptor));
      // Distance < 0.6 is generally considered a match
      if (distance > 0.55) {
        setError('Rosto não reconhecido. Tente novamente.');
        setIsValidating(false);
        setIsFaceDetected(false);
        if (videoRef.current) videoRef.current.play();
        return;
      }
    }
    
    setInstruction('Rosto Validado!');
    
    // Tirar a foto
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Espelhar a imagem desenhada no canvas para ficar igual ao vídeo visualizado
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        // Desfazer o espelhamento pro caso de desenhar outras coisas
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        const photoBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        setTimeout(() => {
          onCapture(photoBase64, Array.from(descriptor));
        }, 1000);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center">
        <h2 className="mb-8 text-xl font-bold text-white">{title}</h2>
        
        <div className="relative mb-8 flex h-64 w-64 items-center justify-center overflow-hidden rounded-full border-4 border-slate-700 bg-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {loadingModels && !error ? (
            <div className="flex flex-col items-center text-teal-400">
              <RefreshCw className="mb-2 animate-spin" size={32} />
              <span className="text-sm font-semibold">{instruction}</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center p-4 text-center text-rose-400">
              <AlertCircle className="mb-2" size={32} />
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
                className="absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)]" // Espelhar vídeo
              />
              <div className={`absolute inset-0 rounded-full border-[6px] transition-colors duration-300 ${isFaceDetected ? 'border-teal-500/50' : 'border-transparent'}`} />
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
              className="flex items-center gap-2 rounded-full bg-teal-600 px-8 py-3 text-sm font-bold text-white transition hover:bg-teal-700"
            >
              <Camera size={18} />
              Tirar Foto
            </button>
          )}
          <button
            onClick={onCancel}
            className="rounded-full bg-slate-800 px-8 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white"
          >
            Cancelar
          </button>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
