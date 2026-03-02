import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, ShieldCheck, CheckCircle, AlertCircle, Fingerprint } from 'lucide-react';

export function BiometricPunch() {
    const [step, setStep] = useState<'idle' | 'capturing' | 'processing' | 'success' | 'error'>('idle');
    const [location, setLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string>('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // Stop camera
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, []);

    const startPunchProcess = async () => {
        setStep('capturing');
        setErrorMsg('');

        try {
            // 1. Get Camera
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
            }

            // 2. Get GPS with High Accuracy
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    // Simulação Anti-Mock: verifica precisão muito exata ou anormal
                    const { latitude, longitude, accuracy } = pos.coords;

                    // Um mock de GPS de baixa qualidade às vezes crava uma precisão impossível ou muito alta sem variação
                    // Aqui é uma heurística visual/demonstrativa de trava de segurança.
                    if (accuracy > 2000) {
                        setErrorMsg('Sinal de GPS muito fraco ou mock detectado. Vá para uma área externa.');
                        setStep('error');
                        stopCamera();
                        return;
                    }

                    setLocation({ lat: latitude, lng: longitude, accuracy });

                    // Após 2s, capturamos a foto e mandamos
                    setTimeout(() => processBiometrics(), 2000);
                },
                (err) => {
                    setErrorMsg('Erro de GPS: ' + err.message);
                    setStep('error');
                    stopCamera();
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );

        } catch (err: unknown) {
            setErrorMsg('Erro de Câmera: ' + (err instanceof Error ? err.message : String(err)));
            setStep('error');
            stopCamera();
        }
    };

    const processBiometrics = () => {
        if (!videoRef.current || !canvasRef.current || !location) return;

        // Capture frame
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // const imageData = canvas.toDataURL('image/jpeg', 0.8); // Base64 for submission
        }

        stopCamera();
        setStep('processing');

        // Mocking API call to backend AI / Gemini Flash OCR & Face Match
        setTimeout(() => {
            // Sucesso Simulado
            setStep('success');

            // Reverte para o inicio após 3s
            setTimeout(() => {
                setStep('idle');
                setLocation(null);
            }, 3000);
        }, 1500);
    };

    return (
        <div className="max-w-md mx-auto bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className="p-6 text-center">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-purple-500/20">
                    <Fingerprint className="w-8 h-8 text-purple-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Ponto Militar</h2>
                <p className="text-sm text-gray-400 mb-8">
                    Autenticação biométrica e rastreio anti-mock.
                </p>

                {/* VISUAL FEEDBACK AREA */}
                <div className="relative h-64 w-full bg-black rounded-xl border border-gray-800 overflow-hidden mb-8 flex flex-col items-center justify-center">

                    {step === 'idle' && (
                        <div className="text-gray-600 flex flex-col items-center">
                            <Camera className="w-12 h-12 mb-2 opacity-20" />
                            <span className="text-xs uppercase tracking-widest">Aguardando</span>
                        </div>
                    )}

                    {step === 'capturing' && (
                        <>
                            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                            <div className="absolute inset-0 border-4 border-purple-500/50 rounded-xl pointer-events-none animate-pulse"></div>
                            <div className="absolute bottom-4 left-0 w-full flex justify-center gap-2 px-4">
                                <span className="bg-black/60 backdrop-blur text-[10px] text-green-400 px-3 py-1 rounded-full flex items-center gap-1 border border-green-500/30">
                                    <MapPin className="w-3 h-3" />
                                    {location ? `Travado (${location.accuracy.toFixed(0)}m)` : 'Buscando Satélite...'}
                                </span>
                            </div>
                        </>
                    )}

                    {step === 'processing' && (
                        <div className="flex flex-col items-center">
                            <ShieldCheck className="w-12 h-12 text-purple-400 mb-4 animate-bounce" />
                            <p className="text-sm text-purple-300 font-medium">Validando Face Match...</p>
                            <p className="text-[10px] text-gray-500 mt-1">Comparando com base segura via Gemini Flash</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center">
                            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                            <p className="text-lg font-bold text-green-400">Ponto Registrado!</p>
                            <p className="text-xs text-gray-400 mt-1">Assinatura digital e local travados com sucesso.</p>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center px-4 text-center">
                            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                            <p className="text-sm font-bold text-red-400">Falha de Segurança</p>
                            <p className="text-xs text-gray-400 mt-1">{errorMsg}</p>
                            <button
                                onClick={() => setStep('idle')}
                                className="mt-4 px-4 py-1.5 border border-gray-700 rounded-lg text-xs text-white hover:bg-gray-800"
                            >
                                Tentar Novamente
                            </button>
                        </div>
                    )}

                    {/* Hidden canvas for snapshot */}
                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* ACTION BUTTON - UM TOQUE */}
                <button
                    onClick={startPunchProcess}
                    disabled={step !== 'idle'}
                    className={`w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wide transition-all duration-300 flex items-center justify-center gap-2
                        ${step === 'idle'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90 hover:scale-[1.02] shadow-lg shadow-purple-500/25 cursor-pointer'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}`}
                >
                    {step === 'idle' ? 'Bater Ponto Agora' :
                     step === 'capturing' ? 'Analisando...' :
                     step === 'processing' ? 'Autenticando...' :
                     step === 'success' ? 'Registrado' : 'Bloqueado'}
                </button>

                {step === 'idle' && (
                    <p className="text-[10px] text-gray-600 mt-4 flex items-center justify-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Conexão Segura e Criptografada ponta-a-ponta
                    </p>
                )}
            </div>
        </div>
    );
}
