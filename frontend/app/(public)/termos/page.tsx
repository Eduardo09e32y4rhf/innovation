'use client';

import React, { useEffect } from 'react';
import { ArrowLeft, ShieldCheck, FileText, Zap } from 'lucide-react';

// ─── Componente Auxiliar ──────────────────────────────────────────────────────
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-10">
        <h2 className="text-2xl font-bold text-zinc-900 mb-4 pb-2 border-b border-zinc-100">{title}</h2>
        <div className="text-zinc-600 leading-relaxed space-y-4">
            {children}
        </div>
    </div>
);

// ─── Página de Termos de Uso ───────────────────────────────────────────────────
export default function TermosDeUso() {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-violet-200 selection:text-violet-900">

            {/* Navbar Simples */}
            <nav className="bg-white border-b border-zinc-200 py-4 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                window.history.back();
                            } else {
                                window.location.href = '/';
                            }
                        }}
                        className="flex items-center gap-2 text-zinc-9000 hover:text-violet-700 transition-colors font-semibold text-sm cursor-pointer bg-transparent border-none p-0"
                    >
                        <ArrowLeft size={18} /> Voltar ao início
                    </button>
                    <div className="flex items-center gap-2">
                        <Zap size={20} className="text-violet-700 fill-violet-700" />
                        <span className="text-lg font-bold text-zinc-900">
                            Innovation<span className="text-violet-700">IA</span>
                        </span>
                    </div>
                </div>
            </nav>

            {/* Cabeçalho do Documento */}
            <header className="pt-20 pb-12 px-6 bg-white border-b border-zinc-100">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 text-violet-700 rounded-2xl mb-6 shadow-sm">
                        <FileText size={32} />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold text-zinc-900 mb-4 tracking-tight">
                        Termos de Uso
                    </h1>
                    <p className="text-lg text-zinc-9000 font-medium">
                        Última atualização: 21 de Fevereiro de 2026
                    </p>
                </div>
            </header>

            {/* Conteúdo dos Termos */}
            <main className="py-16 px-6">
                <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 rounded-[2.5rem] shadow-xl shadow-zinc-200/50 border border-zinc-100">
                    <div className="prose prose-zinc prose-lg max-w-none">

                        <p className="text-xl text-zinc-600 font-medium mb-8">
                            Bem-vindo ao Innovation IA. Estes Termos de Uso regem o acesso e a utilização da nossa
                            plataforma de Inteligência Artificial corporativa. Ao utilizar os nossos serviços, o
                            utilizador concorda com estas condições.
                        </p>

                        <Section title="1. Aceitação dos Termos">
                            <p>
                                Ao criar uma conta ou ao aceder ao <strong>Innovation IA</strong>, o utilizador
                                concorda em ficar vinculado a estes Termos de Uso e à nossa Política de Privacidade.
                                Se não concordar com alguma parte destes termos, não deverá utilizar os nossos
                                serviços.
                            </p>
                        </Section>

                        <Section title="2. Descrição do Serviço">
                            <p>
                                O Innovation IA fornece uma interface unificada para acesso a modelos avançados de
                                Inteligência Artificial (incluindo, mas não limitando a, modelos da família Gemini,
                                Claude e GPT). O serviço foi concebido para aumentar a produtividade corporativa
                                através da geração de texto, análise de dados e assistência virtual.
                            </p>
                        </Section>

                        <Section title="3. Assinatura e Pagamentos">
                            <ul className="list-disc pl-6 space-y-2 text-zinc-700">
                                <li>
                                    O serviço é fornecido através de uma assinatura mensal no valor fixo de{' '}
                                    <strong>R$ 9,99/mês</strong>.
                                </li>
                                <li>Não cobramos taxas de configuração ou fidelidade.</li>
                                <li>
                                    O cancelamento pode ser efetuado a qualquer momento através do painel de controlo
                                    do utilizador, sendo que a assinatura permanecerá ativa até ao final do ciclo de
                                    faturação pago.
                                </li>
                                <li>
                                    Reservamo-nos o direito de alterar os preços, notificando os utilizadores com pelo
                                    menos 30 dias de antecedência.
                                </li>
                            </ul>
                        </Section>

                        <Section title="4. Privacidade e Segurança de Dados (Zero-Trust)">
                            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 my-6 flex gap-4 items-start">
                                <ShieldCheck className="text-violet-700 flex-shrink-0 mt-1" size={24} />
                                <div>
                                    <h4 className="font-bold text-violet-900 mb-2 mt-0">Compromisso Corporativo</h4>
                                    <p className="text-violet-800 text-sm m-0 leading-relaxed">
                                        Nenhum dado, documento, ou conversação inserida no Innovation IA é partilhada com
                                        as empresas fornecedoras das IAs (Google, Anthropic, OpenAI) para efeitos de
                                        treino dos seus modelos públicos. Os seus dados são confidenciais e isolados.
                                    </p>
                                </div>
                            </div>
                            <p>
                                A Innovation Software Company Limitada utiliza infraestrutura na <em>Hostinger</em>{' '}
                                com encriptação avançada. O utilizador é responsável por manter a confidencialidade
                                das suas credenciais de acesso.
                            </p>
                        </Section>

                        <Section title="5. Uso Aceitável e Restrições">
                            <p>O utilizador concorda em não utilizar a plataforma para:</p>
                            <ul className="list-disc pl-6 space-y-2 text-zinc-700">
                                <li>
                                    Gerar conteúdo ilegal, difamatório, discriminatório ou que viole direitos de
                                    terceiros.
                                </li>
                                <li>
                                    Tentar contornar as limitações de segurança ou os limites da API do sistema.
                                </li>
                                <li>
                                    Utilizar métodos automatizados (bots/scrapers) não autorizados para extrair dados
                                    da plataforma.
                                </li>
                                <li>Revender ou distribuir o acesso à sua conta a terceiros.</li>
                            </ul>
                            <p className="mt-4">
                                A violação destas regras pode resultar na suspensão imediata e permanente da conta,
                                sem direito a reembolso.
                            </p>
                        </Section>

                        <Section title="6. Limitação de Responsabilidade">
                            <p>
                                As respostas geradas pela Inteligência Artificial baseiam-se em probabilidades e
                                padrões de dados.{' '}
                                <strong>
                                    O Innovation IA não garante a exatidão, fiabilidade ou correção absoluta das
                                    informações geradas.
                                </strong>
                            </p>
                            <p>
                                O utilizador deve sempre rever códigos, relatórios financeiros ou documentos legais
                                gerados pela IA antes de os aplicar profissionalmente. A Innovation IA não se
                                responsabiliza por perdas, danos diretos ou indiretos resultantes da utilização das
                                respostas do sistema.
                            </p>
                        </Section>

                        <Section title="7. Propriedade Intelectual">
                            <p>
                                O utilizador retém todos os direitos sobre o conteúdo original que inserir (os
                                &quot;Prompts&quot;). Da mesma forma, o utilizador pode utilizar livremente os
                                resultados gerados (&quot;Outputs&quot;) para fins comerciais ou pessoais. O
                                código-fonte, design e interface da plataforma Innovation IA são propriedade
                                exclusiva da Innovation Software Company Limitada.
                            </p>
                        </Section>

                        <Section title="8. Contacto">
                            <p>
                                Para questões legais, suporte ou esclarecimentos sobre estes termos, por favor
                                contacte a nossa equipa através do e-mail:
                                <br />
                                <a
                                    href="mailto:legal@innovationia.com.br"
                                    className="text-violet-700 font-bold hover:underline"
                                >
                                    legal@innovationia.com.br
                                </a>
                            </p>
                        </Section>

                    </div>
                </div>
            </main>

            {/* Footer Simples */}
            <footer className="py-8 bg-white text-center">
                <p className="text-zinc-9000 text-sm font-medium">
                    © 2026 Innovation IA. Todos os direitos reservados.
                </p>
                <p className="text-zinc-600 text-xs mt-2">
                    Innovation Software Company Limitada — CNPJ: Em processamento
                </p>
            </footer>
        </div>
    );
}
