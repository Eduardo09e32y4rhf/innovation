"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function RulesPage() {
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
                        <CardTitle className="text-2xl text-white">Regras e Diretrizes - Innovation.ia</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">1. Uso Aceitável</h2>
                        <p>É proibido usar a plataforma para fins ilegais, discriminação em processos seletivos ou envio de spam.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">2. Conduta do Usuário</h2>
                        <p>Os usuários devem manter a veracidade das informações fornecidas (vagas e currículos). A Innovation.ia se reserva o direito de auditar contas suspeitas.</p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-white mb-2">3. Cancelamento</h2>
                        <p>O cancelamento da assinatura pode ser feito a qualquer momento através do painel financeiro ou diretamente no Mercado Pago. O acesso permanece ativo até o fim do ciclo pago.</p>
                    </section>

                    <section className="mt-8 pt-8 border-t border-zinc-800">
                        <p className="text-sm text-zinc-500">
                            <strong>Sede Administrativa (Virtual):</strong><br />
                            Innovation.ia Ltda.<br />
                            Osasco, SP - Brasil
                        </p>
                    </section>
                </CardContent>
            </Card>
        </div>
    )
}
