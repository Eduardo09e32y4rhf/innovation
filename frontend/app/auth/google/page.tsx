"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AuthService } from "@/services/api"
import { Loader2 } from "lucide-react"

export default function GoogleCallbackPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [status, setStatus] = useState("Processando login com Google...")

    useEffect(() => {
        const code = searchParams.get("code")
        if (!code) {
            setStatus("Código de autorização não encontrado.")
            setTimeout(() => router.push("/login"), 3000)
            return
        }

        AuthService.googleCallback(code)
            .then((data) => {
                if (data.access_token) {
                    localStorage.setItem("token", data.access_token)

                    // Se for novo usuário ou papel candidato, enviamos para onboarding
                    // para completar o cadastro da empresa (Nome, CNPJ, etc)
                    if (data.is_new_user || data.role === "candidate") {
                        router.push("/onboarding")
                    } else {
                        router.push("/dashboard")
                    }
                } else {
                    setStatus("Falha ao obter token.")
                    setTimeout(() => router.push("/login"), 3000)
                }
            })
            .catch((err) => {
                console.error(err)
                setStatus("Erro na comunicação com o servidor.")
                setTimeout(() => router.push("/login"), 3000)
            })
    }, [searchParams, router])

    return (
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
                <p className="text-zinc-400">{status}</p>
            </div>
        </div>
    )
}
