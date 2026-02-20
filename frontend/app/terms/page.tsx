"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black p-8 text-zinc-300 flex justify-center">
            <Card className="max-w-4xl w-full border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
                <CardHeader>
                    <div className="flex items-center gap-4 mb-4">
                        <Link href="/login">
                            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <CardTitle className="text-2xl text-white">Termos de Uso - Innovation.ia</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">1. Aceitação dos Termos</h2>
                        <p>Ao acessar e usar a plataforma Innovation.ia ("Serviço"), você concorda em cumprir estes Termos de Uso e todas as leis aplicáveis.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">2. Descrição do Serviço</h2>
                        <p>A Innovation.ia é uma plataforma de gestão de RH com inteligência artificial, que oferece análise de candidatos, gestão de vagas, integração com Google Workspace e controle financeiro básico.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">3. Pagamentos e Assinaturas</h2>
                        <p>O acesso ao Serviço é concedido mediante pagamento de assinatura mensal (cobrada via Mercado Pago). O não pagamento pode resultar na suspensão do acesso.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">4. Dados da Empresa e Privacidade</h2>
                        <p>Respeitamos a sua privacidade e protegemos seus dados conforme a LGPD. A Innovation.ia não compartilha dados sensíveis sem autorização.</p>
                    </section>

                    <section className="mt-8 pt-8 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500">
                            <strong>Sede Administrativa (Virtual):</strong><br />
                            Innovation.ia Ltda.<br />
                            Osasco, SP - Brasil<br />
                            CEP: 06000-000 (Sede Virtual conforme legislação vigente)
                        </p>
                    </section>
                </CardContent>
            </Card>
        </div>
    )
}
