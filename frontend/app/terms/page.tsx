import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
    return (
        <div className="flex min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Link href="/register" className="flex items-center text-purple-400 hover:text-purple-300 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Link>

                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    Termos de Uso - Innovation.ia
                </h1>

                <div className="prose prose-invert max-w-none text-gray-300 space-y-4">
                    <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                    <h2 className="text-2xl font-semibold text-purple-300">1. Aceitação dos Termos</h2>
                    <p>
                        Ao acessar e usar a plataforma Innovation.ia ("Serviço"), você concorda em cumprir estes Termos de Uso.
                        Se você não concordar com algum destes termos, não deverá utilizar o Serviço.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">2. Descrição do Serviço</h2>
                    <p>
                        A Innovation.ia é uma plataforma de gestão de Recursos Humanos impulsionada por Inteligência Artificial,
                        oferecendo serviços de recrutamento, seleção (match de candidatos), gestão financeira básica e integrações
                        com Google Workspace.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">3. Assinatura e Pagamentos</h2>
                    <p>
                        O Serviço é oferecido no modelo de assinatura mensal (SaaS). O pagamento é processado via Mercado Pago
                        (Sistema de Assinatura Recorrente). Ao assinar, você autoriza a cobrança automática mensal no cartão de crédito cadastrado.
                    </p>
                    <p>
                        O acesso ao Serviço será liberado após a confirmação do pagamento inicial e mantido enquanto a assinatura estiver ativa.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">4. Uso Aceitável</h2>
                    <p>
                        Você concorda em não usar o Serviço para qualquer finalidade ilegal ou proibida por estes termos.
                        É proibido tentar violar a segurança do Serviço ou acessar dados de outros usuários.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">5. Privacidade e Dados</h2>
                    <p>
                        Nós respeitamos a sua privacidade e seguimos as diretrizes da Lei Geral de Proteção de Dados (LGPD).
                        Seus dados são armazenados de forma segura e utilizados apenas para a prestação do Serviço.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">6. Sede Virtual</h2>
                    <p>
                        A Innovation.ia opera em modelo digital com sede virtual registrada em Osasco, SP.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">7. Contato</h2>
                    <p>
                        Para suporte ou dúvidas sobre estes termos, entre em contato através do nosso canal de Suporte na plataforma.
                    </p>
                </div>

                <footer className="border-t border-zinc-800 pt-8 mt-12 text-center text-zinc-500 text-sm">
                    <p>&copy; {new Date().getFullYear()} Innovation.ia Enterprise. Todos os direitos reservados.</p>
                    <p className="mt-2">Sede: Osasco (Virtual)</p>
                </footer>
            </div>
        </div>
    )
}
