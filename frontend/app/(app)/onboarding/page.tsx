'use client';

import AppLayout from '@/components/AppLayout';
import { Upload, CheckCircle, Clock, AlertCircle, FileText, User, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { RHService } from '@/services/api';
import api from '@/services/api';

interface DocStep {
    id: string;
    label: string;
    required: boolean;
    status: 'pending' | 'uploaded' | 'validated' | 'error';
    file?: string;
}

const INITIAL_STEPS: DocStep[] = [
    { id: 'rg', label: 'RG / CNH (frente e verso)', required: true, status: 'pending' },
    { id: 'cpf', label: 'CPF', required: true, status: 'pending' },
    { id: 'address', label: 'Comprovante de Residência', required: true, status: 'pending' },
    { id: 'photo', label: 'Foto 3x4 recente', required: true, status: 'pending' },
    { id: 'pis', label: 'PIS/PASEP', required: false, status: 'pending' },
    { id: 'bank', label: 'Dados Bancários', required: false, status: 'pending' },
    { id: 'education', label: 'Diploma / Certificado de Escolaridade', required: false, status: 'pending' },
];

export default function OnboardingPage() {
    const [steps, setSteps] = useState<DocStep[]>(INITIAL_STEPS);
    const [uploading, setUploading] = useState<string | null>(null);
    const [contract, setContract] = useState<string | null>(null);
    const [loadingContract, setLoadingContract] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const [activeDoc, setActiveDoc] = useState<string | null>(null);

    const completed = steps.filter(s => s.status !== 'pending').length;
    const total = steps.length;
    const progress = Math.round((completed / total) * 100);

    const triggerUpload = (docId: string) => {
        setActiveDoc(docId);
        inputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !activeDoc) return;

        setUploading(activeDoc);
        try {
            const formData = new FormData();
            formData.append('file', file);
            // onboarding_id = 1 (mock, em prod viria do contexto do funcionário)
            await api.post('/rh/onboarding/1/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSteps(prev => prev.map(s =>
                s.id === activeDoc ? { ...s, status: 'uploaded', file: file.name } : s
            ));

            // Simulate IA validation (2s delay)
            setTimeout(() => {
                setSteps(prev => prev.map(s =>
                    s.id === activeDoc ? { ...s, status: 'validated' } : s
                ));
            }, 2000);
        } catch {
            setSteps(prev => prev.map(s =>
                s.id === activeDoc ? { ...s, status: 'error' } : s
            ));
        } finally {
            setUploading(null);
            setActiveDoc(null);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const loadContract = async () => {
        setLoadingContract(true);
        try {
            const res = await api.get('/rh/onboarding/1/contract');
            setContract(res.data.contract);
        } catch { setContract('Erro ao gerar contrato.'); }
        finally { setLoadingContract(false); }
    };

    const statusIcon = (status: DocStep['status']) => {
        if (status === 'validated') return <CheckCircle className="w-5 h-5 text-green-400" />;
        if (status === 'uploaded') return <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />;
        if (status === 'error') return <AlertCircle className="w-5 h-5 text-red-400" />;
        return <Upload className="w-5 h-5 text-zinc-9000" />;
    };

    const statusLabel = (status: DocStep['status']) => ({
        pending: 'Pendente',
        uploaded: 'Validando IA...',
        validated: 'Validado ✓',
        error: 'Erro no upload',
    }[status]);

    return (
        <AppLayout title="Onboarding Digital">
            <div className="text-slate-900">
                <main className="p-8 overflow-y-auto">
                    <div className="max-w-3xl mx-auto">
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-600 mb-2">
                                Onboarding Digital
                            </h1>
                            <p className="text-gray-400">Envie seus documentos para concluir a admissão. Nossa IA valida automaticamente.</p>
                        </div>

                        {/* Progress */}
                        <div className="glass-panel rounded-2xl p-6 mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-zinc-700">Progresso da Admissão</span>
                                <span className="text-sm font-bold text-teal-400">{completed}/{total} documentos</span>
                            </div>
                            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                            <p className="text-xs text-zinc-9000 mt-2">{progress}% completo</p>
                        </div>

                        {/* Checklist de Departamentos */}
                        <div className="glass-panel rounded-2xl p-6 mb-6">
                            <h3 className="font-semibold mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-teal-400" />
                                Kit Boas-Vindas
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { label: 'TI: E-mail corporativo criado', done: completed >= 2 },
                                    { label: 'Financeiro: Conta salário configurada', done: completed >= 4 },
                                    { label: 'Gestor: Reunião de almoço agendada', done: completed >= 6 },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 text-sm">
                                        {item.done ? (
                                            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                                        ) : (
                                            <Clock className="w-4 h-4 text-zinc-600 shrink-0" />
                                        )}
                                        <span className={item.done ? 'text-zinc-700' : 'text-zinc-600'}>{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Document Upload */}
                        <div className="glass-panel rounded-2xl p-6 mb-6">
                            <h3 className="font-semibold mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-teal-400" />
                                Documentos Necessários
                            </h3>
                            <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
                            <div className="space-y-3">
                                {steps.map(step => (
                                    <div key={step.id} className={`flex items-center justify-between p-4 rounded-xl border transition ${step.status === 'validated' ? 'border-green-500/30 bg-green-500/5' :
                                        step.status === 'uploaded' ? 'border-yellow-500/30 bg-yellow-500/5' :
                                            step.status === 'error' ? 'border-red-500/30 bg-red-500/5' :
                                                'border-zinc-800 bg-white/30 hover:border-zinc-600'
                                        }`}>
                                        <div className="flex items-center gap-3">
                                            {statusIcon(step.status)}
                                            <div>
                                                <p className="text-sm font-medium">{step.label}</p>
                                                {step.file && <p className="text-xs text-zinc-9000">{step.file}</p>}
                                                {!step.required && <span className="text-xs text-zinc-600">Opcional</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs ${step.status === 'validated' ? 'text-green-400' :
                                                step.status === 'uploaded' ? 'text-yellow-400' :
                                                    step.status === 'error' ? 'text-red-400' : 'text-zinc-600'
                                                }`}>{statusLabel(step.status)}</span>
                                            {step.status === 'pending' || step.status === 'error' ? (
                                                <button
                                                    onClick={() => triggerUpload(step.id)}
                                                    disabled={uploading === step.id}
                                                    className="px-3 py-1 text-xs bg-teal-600 hover:bg-teal-500 rounded-lg transition disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {uploading === step.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                                    Enviar
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Contract Generation */}
                        <div className="glass-panel rounded-2xl p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-teal-400" />
                                    Contrato de Trabalho (IA)
                                </h3>
                                <button
                                    onClick={loadContract}
                                    disabled={loadingContract || completed < 3}
                                    className="px-4 py-2 text-sm bg-teal-600 hover:bg-teal-500 rounded-lg transition disabled:opacity-50"
                                >
                                    {loadingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Rascunho'}
                                </button>
                            </div>
                            {completed < 3 && <p className="text-xs text-zinc-9000">Envie pelo menos 3 documentos para gerar o contrato.</p>}
                            {contract && (
<<<<<<< HEAD
                                <div className="mt-4 p-4 bg-zinc-900 border-zinc-700 rounded-xl text-sm text-zinc-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
=======
                                <div className="mt-4 p-4 bg-white border border-zinc-700 rounded-xl text-sm text-zinc-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
>>>>>>> 73e3b8acfec7b8c39719e808c5e32ff2dd4f4465
                                    {contract}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </AppLayout>
    );
}
