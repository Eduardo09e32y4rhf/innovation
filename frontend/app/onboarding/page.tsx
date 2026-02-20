"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/services/api"

export default function OnboardingPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        razao_social: "",
        cnpj: "",
        cidade: "Osasco",
        uf: "SP"
    })
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError("")

        try {
            await api.post("/companies", formData)
            // Success - company created and role upgraded (by backend logic)
            window.location.href = "/dashboard"
        } catch (err: any) {
            console.error(err)
            setError(err.response?.data?.detail || "Erro ao criar empresa.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-black p-4">
            <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <CardTitle className="text-white">Complete seu cadastro</CardTitle>
                    <CardDescription>Informe os dados da sua empresa para continuar.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-red-500/10 text-red-500 px-4 py-2 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Razão Social / Nome da Empresa</label>
                            <input
                                required
                                value={formData.razao_social}
                                onChange={(e) => setFormData({...formData, razao_social: e.target.value})}
                                className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                placeholder="Innovation.ia Ltda"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">CNPJ</label>
                            <input
                                required
                                value={formData.cnpj}
                                onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
                                className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                placeholder="00.000.000/0001-00"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">Cidade</label>
                                <input
                                    required
                                    value={formData.cidade}
                                    onChange={(e) => setFormData({...formData, cidade: e.target.value})}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-300">UF</label>
                                <input
                                    required
                                    value={formData.uf}
                                    onChange={(e) => setFormData({...formData, uf: e.target.value})}
                                    className="w-full rounded-md border border-zinc-700 bg-zinc-800/50 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all"
                                    maxLength={2}
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <p className="text-xs text-zinc-500 mb-4 text-center">
                                A sede virtual será registrada como Osasco/SP por padrão se não informado outro endereço físico.
                            </p>
                            <Button className="w-full" disabled={loading}>
                                {loading ? "Salvando..." : "Concluir Cadastro"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
