'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { Loader2, Building, CheckCircle } from 'lucide-react';

export default function CompanyOnboardingPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        razao_social: '',
        cnpj: '',
        cidade: '',
        uf: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const baseURL = process.env.NEXT_PUBLIC_API_URL || '/api';
            const token = localStorage.getItem('token');

            await axios.post(`${baseURL}/companies`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // Refresh token logic or re-login might be needed to update role in token if backend issues new token,
            // but for now we assume backend updates user in DB and next requests will be fine or we just redirect.
            // If the frontend relies on role in token, we might need to refresh user profile.

            router.push('/dashboard');
        } catch (error) {
            console.error('Error creating company:', error);
            alert('Erro ao cadastrar empresa. Verifique os dados.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8">
                <div className="flex flex-col items-center mb-6">
                    <div className="w-12 h-12 bg-teal-500/10 rounded-full flex items-center justify-center mb-4">
                        <Building className="w-6 h-6 text-teal-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-center">Cadastro da Empresa</h1>
                    <p className="text-zinc-400 text-center text-sm mt-1">
                        Complete os dados da sua organização para continuar.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Razão Social</label>
                        <input
                            required
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:border-teal-500 focus:outline-none transition"
                            placeholder="Ex: Innovation Tech Ltda"
                            value={formData.razao_social}
                            onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">CNPJ</label>
                        <input
                            required
                            className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:border-teal-500 focus:outline-none transition"
                            placeholder="00.000.000/0001-00"
                            value={formData.cnpj}
                            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-zinc-400 mb-1">Cidade</label>
                            <input
                                required
                                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:border-teal-500 focus:outline-none transition"
                                placeholder="Ex: São Paulo"
                                value={formData.cidade}
                                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1">UF</label>
                            <input
                                required
                                maxLength={2}
                                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-2 text-sm focus:border-teal-500 focus:outline-none transition uppercase"
                                placeholder="SP"
                                value={formData.uf}
                                onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 rounded-lg font-medium text-sm transition flex items-center justify-center gap-2 mt-2"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        Concluir Cadastro
                    </button>
                </form>
            </div>
        </div>
    );
}
