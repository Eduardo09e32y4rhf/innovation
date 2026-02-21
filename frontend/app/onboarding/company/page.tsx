'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CompanyService } from '../../../services/api';
import { Building2, MapPin, FileText } from 'lucide-react';

export default function CompanyOnboardingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        razao_social: '',
        cnpj: '',
        cidade: 'Osasco', // Default per request
        uf: 'SP'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await CompanyService.create(form);
            router.push('/dashboard');
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.detail || 'Erro ao cadastrar empresa.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-white">Configurar Empresa</h2>
                    <p className="mt-2 text-sm text-gray-400">Complete o cadastro para acessar o painel Enterprise.</p>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 backdrop-blur-xl">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-300">Razão Social</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building2 className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    required
                                    type="text"
                                    className="block w-full pl-10 rounded-lg border border-zinc-700 bg-zinc-800 text-white p-2.5 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    placeholder="Minha Empresa LTDA"
                                    value={form.razao_social}
                                    onChange={e => setForm({ ...form, razao_social: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300">CNPJ</label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileText className="h-5 w-5 text-gray-500" />
                                </div>
                                <input
                                    required
                                    type="text"
                                    className="block w-full pl-10 rounded-lg border border-zinc-700 bg-zinc-800 text-white p-2.5 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    placeholder="00.000.000/0000-00"
                                    value={form.cnpj}
                                    onChange={e => setForm({ ...form, cnpj: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300">Cidade</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <MapPin className="h-5 w-5 text-gray-500" />
                                    </div>
                                    <input
                                        required
                                        type="text"
                                        className="block w-full pl-10 rounded-lg border border-zinc-700 bg-zinc-800 text-white p-2.5 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                        value={form.cidade}
                                        onChange={e => setForm({ ...form, cidade: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300">UF</label>
                                <input
                                    required
                                    type="text"
                                    className="mt-1 block w-full rounded-lg border border-zinc-700 bg-zinc-800 text-white p-2.5 focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                    maxLength={2}
                                    value={form.uf}
                                    onChange={e => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 transition-colors"
                        >
                            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
