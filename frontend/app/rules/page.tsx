import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function RulesPage() {
    return (
        <div className="flex min-h-screen bg-black text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <Link href="/register" className="flex items-center text-purple-400 hover:text-purple-300 transition-colors mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                </Link>

                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    Regras e Diretrizes - Innovation.ia
                </h1>

                <div className="prose prose-invert max-w-none text-gray-300 space-y-4">
                    <p>Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                    <h2 className="text-2xl font-semibold text-purple-300">1. Conduta do Usuário</h2>
                    <p>
                        Todos os usuários da plataforma Innovation.ia devem se comportar de maneira profissional e respeitosa.
                        Qualquer forma de assédio, discriminação ou discurso de ódio não será tolerada e resultará no cancelamento imediato da conta.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">2. Uso da Inteligência Artificial</h2>
                    <p>
                        A IA da Innovation.ia deve ser usada como ferramenta auxiliar na tomada de decisão.
                        A responsabilidade final pela contratação, promoção ou demissão de colaboradores é sempre da empresa usuária,
                        e não da plataforma.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">3. Dados de Candidatos</h2>
                    <p>
                        Ao utilizar a plataforma para acessar dados de candidatos, você se compromete a:
                    </p>
                    <ul className="list-disc pl-5">
                        <li>Usar os dados apenas para fins de recrutamento e seleção.</li>
                        <li>Não compartilhar dados pessoais com terceiros sem consentimento.</li>
                        <li>Respeitar as solicitações de exclusão de dados (Direito ao Esquecimento).</li>
                    </ul>

                    <h2 className="text-2xl font-semibold text-purple-300">4. Pagamentos e Cobranças</h2>
                    <p>
                        O não pagamento da assinatura mensal resultará na suspensão temporária do acesso à plataforma.
                        O acesso será restabelecido após a regularização do pagamento.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">5. Segurança da Conta</h2>
                    <p>
                        Você é responsável por manter a confidencialidade de suas credenciais de acesso.
                        Qualquer atividade realizada através da sua conta será de sua responsabilidade.
                    </p>

                    <h2 className="text-2xl font-semibold text-purple-300">6. Atualizações das Regras</h2>
                    <p>
                        A Innovation.ia reserva-se o direito de atualizar estas regras a qualquer momento, notificando os usuários sobre mudanças significativas.
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
