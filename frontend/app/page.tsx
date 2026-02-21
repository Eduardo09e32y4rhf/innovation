'use client';

import Link from 'next/link';
import { Cpu, Shield, Zap, CheckCircle, ArrowRight, Layers, Lock, Sparkles, MessageSquare, Bot, Command } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-white antialiased font-sans selection:bg-[#8b5cf6]/30">
      {/* 1. O "Hero" (A Primeira Impressão) */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-black tracking-tighter">
              INNOV<span className="text-[#8b5cf6]">A</span>TION IA
            </span>
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors">
              Fazer Login
            </Link>
            <Link href="http://187.77.49.207/register" className="bg-[#8b5cf6] hover:bg-[#7c4dff] text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all hover:scale-105 active:scale-95">
              Criar Conta
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative pt-24 pb-16 md:pt-48 md:pb-40 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6 md:mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-[10px] md:text-xs font-semibold tracking-wider text-[#a1a1aa] uppercase text-center">A nova era da produtividade empresarial</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] mb-6 md:mb-8 text-balance">
            A Revolução da IA Corporativa.<br />
            <span className="text-white/40">Agora ao alcance de todos.</span>
          </h1>

          <p className="max-w-3xl mx-auto text-base md:text-xl text-[#a1a1aa] leading-relaxed mb-10 md:mb-12 px-2">
            Aceda aos modelos mais avançados do mundo <span className="text-white font-medium">(Gemini 3, Claude 4.6, GPT)</span> numa plataforma única, segura e desenhada para multiplicar a sua produtividade.
          </p>

          <Link
            href="http://187.77.49.207/register"
            className="group relative inline-flex items-center justify-center gap-3 bg-[#8b5cf6] text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] w-full sm:w-auto"
          >
            Começar agora por R$ 9,99/mês
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* 1. Prova Visual: Mockup do Dashboard */}
          <div className="mt-16 md:mt-24 relative max-w-5xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#8b5cf6]/50 to-transparent blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* Fake UI Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-900/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-900/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-900/50" />
                </div>
                <div className="mx-auto bg-white/5 px-3 py-1 rounded-md text-[10px] text-[#a1a1aa] font-mono truncate max-w-[150px] sm:max-w-none">
                  innovation-ia.app/dashboard
                </div>
              </div>
              {/* Fake UI Body */}
              <div className="flex flex-col md:flex-row min-h-[300px] md:aspect-[16/9]">
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/5 p-4 flex md:flex-col gap-4 overflow-x-auto md:overflow-x-visible">
                  <div className="h-8 bg-white/5 rounded-lg w-32 md:w-3/4 shrink-0" />
                  <div className="flex md:flex-col gap-2 shrink-0 md:shrink">
                    <div className="h-10 bg-[#8b5cf6]/10 rounded-lg flex items-center px-3 w-32 md:w-full">
                      <MessageSquare className="w-4 h-4 text-[#8b5cf6] mr-2" />
                      <div className="h-3 bg-[#8b5cf6]/20 rounded w-full hidden md:block" />
                    </div>
                    {[1, 2].map(i => (
                      <div key={i} className="h-10 bg-white/2 rounded-lg flex items-center px-3 opacity-40 w-32 md:w-full">
                        <div className="w-4 h-4 bg-white/10 rounded mr-2" />
                        <div className="h-2 bg-white/10 rounded w-1/2 hidden md:block" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-6 md:p-8 flex flex-col justify-end overflow-hidden">
                  <div className="max-w-lg space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#8b5cf6] shrink-0" />
                      <div className="space-y-2 w-full">
                        <div className="h-4 bg-white/5 rounded w-full sm:w-64" />
                        <div className="h-4 bg-white/5 rounded w-4/5 sm:w-48" />
                      </div>
                    </div>
                    <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <Bot className="w-5 h-5 text-[#8b5cf6]" />
                        <span className="text-xs md:text-sm font-medium">Model: Gemini 1.5 Pro</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <div className="h-8 w-8 bg-white/5 rounded-lg flex-1 sm:flex-none" />
                        <div className="h-8 w-24 bg-[#8b5cf6] rounded-lg flex-[2] sm:flex-none" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Prova Social (A Confiança) */}
      <section className="py-12 md:py-16 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-[10px] md:text-sm font-medium text-[#a1a1aa] uppercase tracking-[0.2em] mb-8 md:mb-10">
            Tecnologia de ponta antes restrita a grandes corporações.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 md:gap-x-12 gap-y-6 opacity-30 grayscale">
            <div className="text-lg md:text-2xl font-bold italic whitespace-nowrap">OpenAI</div>
            <div className="text-lg md:text-2xl font-bold whitespace-nowrap">Anthropic</div>
            <div className="text-lg md:text-2xl font-bold tracking-tighter whitespace-nowrap">Google Cloud</div>
            <div className="text-lg md:text-2xl font-bold whitespace-nowrap">Mistral</div>
            <div className="text-lg md:text-2xl font-bold whitespace-nowrap">Meta AI</div>
          </div>
        </div>
      </section>

      {/* 3. Benefícios Principais */}
      <section className="py-20 md:py-32 bg-[#000000]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 text-center sm:text-left">
            <div className="group p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#8b5cf6]/30 transition-all duration-300">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#8b5cf6]/10 rounded-2xl flex items-center justify-center mb-6 mx-auto sm:mx-0 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6 md:w-7 md:h-7 text-[#8b5cf6]" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4">Inteligência Multi-Modelo</h3>
              <p className="text-[#a1a1aa] text-sm md:text-base leading-relaxed">
                "Não fique preso a uma só IA. Alterne entre os melhores modelos do mundo com um clique."
              </p>
            </div>

            <div className="group p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#8b5cf6]/30 transition-all duration-300">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#8b5cf6]/10 rounded-2xl flex items-center justify-center mb-6 mx-auto sm:mx-0 group-hover:scale-110 transition-transform">
                <Lock className="w-6 h-6 md:w-7 md:h-7 text-[#8b5cf6]" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4">Privacidade Total</h3>
              <p className="text-[#a1a1aa] text-sm md:text-base leading-relaxed">
                "Os seus dados estão num cofre blindado. Não treinamos modelos com a sua informação."
              </p>
            </div>

            <div className="group p-6 md:p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#8b5cf6]/30 transition-all duration-300 sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 md:w-14 md:h-14 bg-[#8b5cf6]/10 rounded-2xl flex items-center justify-center mb-6 mx-auto sm:mx-0 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 md:w-7 md:h-7 text-[#8b5cf6]" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold mb-4">Acesso Premium Imediato</h3>
              <p className="text-[#a1a1aa] text-sm md:text-base leading-relaxed">
                "Sem taxas escondidas. O poder que a sua rotina precisa, por menos do que um café."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Tabela de Preços (Oferta Única Irresistível) */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8b5cf6]/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="mb-12 md:mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-4">O Plano Perfeito para Começar</h2>
            <p className="text-[#a1a1aa]">Liberte o seu potencial máximo agora mesmo.</p>
          </div>

          <div className="max-w-md mx-auto px-2">
            <div className="relative group text-left">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#8b5cf6] to-[#7c4dff] rounded-[2rem] blur opacity-40 group-hover:opacity-60 transition duration-500" />
              <div className="relative bg-[#09090b] border border-white/10 rounded-[2rem] p-8 md:p-10">
                <div className="mb-8">
                  <h3 className="text-xl md:text-2xl font-black mb-2">Innovation Pro</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-black text-white">R$ 9,99</span>
                    <span className="text-[#a1a1aa] text-base md:text-lg">/mês</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3">
                    <div className="bg-[#8b5cf6]/20 p-1 rounded-full shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-[#a1a1aa]">Acesso ao Chat IA Multi-Modelos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="bg-[#8b5cf6]/20 p-1 rounded-full shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-[#a1a1aa]">Modelos Fast e Thinking liberados</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="bg-[#8b5cf6]/20 p-1 rounded-full shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-[#a1a1aa]">Histórico de conversas salvo na nuvem</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="bg-[#8b5cf6]/20 p-1 rounded-full shrink-0">
                      <CheckCircle className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <span className="text-xs md:text-sm font-medium text-[#a1a1aa]">Suporte e atualizações contínuas</span>
                  </li>
                </ul>

                <Link
                  href="http://187.77.49.207/register"
                  className="block w-full text-center bg-[#8b5cf6] hover:bg-[#7c4dff] text-white py-4 rounded-xl font-black text-base md:text-lg shadow-xl shadow-[#8b5cf6]/20 transition-all hover:scale-[1.02]"
                >
                  Assinar Agora
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. O Rodapé (Footer) e CTA Final */}
      <section className="py-20 md:py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-8 px-2 text-balance leading-tight text-center">
            Pronto para elevar o seu nível?<br className="hidden sm:block" /> Junte-se à revolução hoje.
          </h2>
          <Link
            href="http://187.77.49.207/register"
            className="inline-flex items-center justify-center gap-3 bg-[#8b5cf6] text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black text-lg md:text-xl shadow-[0_0_40px_rgba(139,92,246,0.2)] transition-all hover:scale-105 w-full sm:w-auto"
          >
            Criar Minha Conta
          </Link>
        </div>
      </section>

      <footer className="py-20 bg-black border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-12">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tighter">
                INNOV<span className="text-[#8b5cf6]">A</span>TION IA
              </span>
            </div>

            <div className="flex gap-10">
              <Link href="/terms" className="text-sm text-[#a1a1aa] hover:text-white transition-colors">Termos</Link>
              <Link href="/privacy" className="text-sm text-[#a1a1aa] hover:text-white transition-colors">Privacidade</Link>
              <Link href="/contact" className="text-sm text-[#a1a1aa] hover:text-white transition-colors">Contacto</Link>
            </div>

            <p className="text-sm text-[#a1a1aa]">
              © 2026 Innovation IA. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
