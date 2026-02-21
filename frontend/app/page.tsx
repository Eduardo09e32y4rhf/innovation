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

      <section className="relative pt-32 pb-20 md:pt-48 md:pb-40 overflow-hidden">
        {/* Background Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-[#8b5cf6]/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
            <span className="text-xs font-semibold tracking-wider text-[#a1a1aa] uppercase">A nova era da produtividade empresarial</span>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight leading-[1.1] mb-8">
            A Revolução da IA Corporativa.<br />
            <span className="text-white/40">Agora ao alcance de todos.</span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg md:text-xl text-[#a1a1aa] leading-relaxed mb-12">
            Aceda aos modelos mais avançados do mundo <span className="text-white font-medium">(Gemini 3, Claude 4.6, GPT)</span> numa plataforma única, segura e desenhada para multiplicar a sua produtividade.
          </p>

          <Link
            href="http://187.77.49.207/register"
            className="group relative inline-flex items-center justify-center gap-3 bg-[#8b5cf6] text-white px-10 py-5 rounded-2xl font-black text-xl shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_60px_rgba(139,92,246,0.5)]"
          >
            Começar agora por R$ 9,99/mês
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </Link>

          {/* 1. Prova Visual: Mockup do Dashboard */}
          <div className="mt-24 relative max-w-5xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#8b5cf6]/50 to-transparent blur-2xl opacity-20 group-hover:opacity-30 transition-opacity" />
            <div className="relative bg-[#09090b] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              {/* Fake UI Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-900/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-900/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-900/50" />
                </div>
                <div className="mx-auto bg-white/5 px-3 py-1 rounded-md text-[10px] text-[#a1a1aa] font-mono">
                  innovation-ia.app/dashboard
                </div>
              </div>
              {/* Fake UI Body */}
              <div className="flex aspect-[16/9]">
                <div className="w-64 border-r border-white/5 p-4 flex flex-col gap-4 hidden md:flex">
                  <div className="h-8 bg-white/5 rounded-lg w-3/4" />
                  <div className="space-y-2 mt-4">
                    <div className="h-10 bg-[#8b5cf6]/10 rounded-lg flex items-center px-3">
                      <MessageSquare className="w-4 h-4 text-[#8b5cf6] mr-2" />
                      <div className="h-3 bg-[#8b5cf6]/20 rounded w-full" />
                    </div>
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-10 bg-white/2 rounded-lg flex items-center px-3 opacity-40">
                        <div className="w-4 h-4 bg-white/10 rounded mr-2" />
                        <div className="h-2 bg-white/10 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex-1 p-8 flex flex-col justify-end">
                  <div className="max-w-lg space-y-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#8b5cf6] shrink-0" />
                      <div className="space-y-2">
                        <div className="h-4 bg-white/5 rounded w-64" />
                        <div className="h-4 bg-white/5 rounded w-48" />
                      </div>
                    </div>
                    <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-[#8b5cf6]" />
                        <span className="text-sm font-medium">Model: Gemini 1.5 Pro</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="h-8 w-8 bg-white/5 rounded-lg" />
                        <div className="h-8 w-24 bg-[#8b5cf6] rounded-lg" />
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
      <section className="py-16 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-medium text-[#a1a1aa] uppercase tracking-[0.2em] mb-10">
            Tecnologia de ponta antes restrita a grandes corporações.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-8 opacity-40 grayscale">
            <div className="text-2xl font-bold italic">OpenAI</div>
            <div className="text-2xl font-bold">Anthropic</div>
            <div className="text-2xl font-bold tracking-tighter">Google Cloud</div>
            <div className="text-2xl font-bold">Mistral</div>
            <div className="text-2xl font-bold">Meta AI</div>
          </div>
        </div>
      </section>

      {/* 3. Benefícios Principais */}
      <section className="py-32 bg-[#000000]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#8b5cf6]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-[#8b5cf6]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Layers className="w-7 h-7 text-[#8b5cf6]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Inteligência Multi-Modelo</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                "Não fique preso a uma só IA. Alterne entre os melhores modelos do mundo com um clique."
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#8b5cf6]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-[#8b5cf6]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock className="w-7 h-7 text-[#8b5cf6]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Privacidade Total</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                "Os seus dados estão num cofre blindado. Não treinamos modelos com a sua informação."
              </p>
            </div>

            <div className="group p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:border-[#8b5cf6]/30 transition-all duration-300">
              <div className="w-14 h-14 bg-[#8b5cf6]/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="w-7 h-7 text-[#8b5cf6]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Acesso Premium Imediato</h3>
              <p className="text-[#a1a1aa] leading-relaxed">
                "Sem taxas escondidas. O poder que a sua rotina precisa, por menos do que um café."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Tabela de Preços (Oferta Única Irresistível) */}
      <section className="py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#8b5cf6]/5 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black mb-4">O Plano Perfeito para Começar</h2>
            <p className="text-[#a1a1aa]">Liberte o seu potencial máximo agora mesmo.</p>
          </div>

          <div className="max-w-md mx-auto">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#8b5cf6] to-[#7c4dff] rounded-[2rem] blur opacity-40 group-hover:opacity-60 transition duration-500" />
              <div className="relative bg-[#09090b] border border-white/10 rounded-[2rem] p-10">
                <div className="mb-8">
                  <h3 className="text-2xl font-black mb-2">Innovation Pro</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black">R$ 9,99</span>
                    <span className="text-[#a1a1aa] text-lg">/mês</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3">
                    <div className="bg-[#8b5cf6]/20 p-1 rounded-full">
                      <CheckCircle className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <span className="text-sm font-medium text-[#a1a1aa]">Acesso ao Chat IA Multi-Modelos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="bg-[#8b5cf6]/20 p-1 rounded-full">
                      <CheckCircle className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <span className="text-sm font-medium text-[#a1a1aa]">Modelos Fast e Thinking liberados</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="bg-[#8b5cf6]/20 p-1 rounded-full">
                      <CheckCircle className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <span className="text-sm font-medium text-[#a1a1aa]">Histórico de conversas salvo na nuvem</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="bg-[#8b5cf6]/20 p-1 rounded-full">
                      <CheckCircle className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <span className="text-sm font-medium text-[#a1a1aa]">Suporte e atualizações contínuas</span>
                  </li>
                </ul>

                <Link
                  href="http://187.77.49.207/register"
                  className="block w-full text-center bg-[#8b5cf6] hover:bg-[#7c4dff] text-white py-4 rounded-xl font-black text-lg shadow-xl shadow-[#8b5cf6]/20 transition-all hover:scale-[1.02]"
                >
                  Assinar Agora
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. O Rodapé (Footer) e CTA Final */}
      <section className="py-32 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-black mb-8">Pronto para elevar o seu nível?<br />Junte-se à revolução hoje.</h2>
          <Link
            href="http://187.77.49.207/register"
            className="inline-flex items-center justify-center gap-3 bg-[#8b5cf6] text-white px-10 py-5 rounded-2xl font-black text-xl shadow-[0_0_40px_rgba(139,92,246,0.2)] transition-all hover:scale-105"
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
