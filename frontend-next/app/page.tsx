"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Navbar } from "@/components/layout/navbar"
import { motion } from "framer-motion"
import { ArrowRight, Bot, Cpu, Globe, Shield, Zap } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-black selection:bg-purple-500/30">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-32 pb-16 md:pt-48 md:pb-32">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[120px] opacity-30 animate-pulse" />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-pink-600/10 rounded-full blur-[100px] opacity-20" />
          </div>

          <div className="container relative z-10 mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300 mb-8 backdrop-blur-sm">
                <span className="flex h-2 w-2 rounded-full bg-purple-500 mr-2 animate-pulse" />
                Novidade: IA Superintendente v2.0
              </div>

              <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-white md:text-7xl lg:text-8xl">
                O Sistema Operacional <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
                  do Futuro
                </span>
              </h1>

              <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 md:text-xl">
                Gerencie recrutamento, finanças e operações com a primeira IA verdadeiramente autônoma.
                Escalável para 1M+ usuários. Nível Enterprise.
              </p>

              <div className="mt-10 flex flex-col items-center justify-center space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
                <Link href="/register">
                  <Button size="lg" className="h-14 px-8 text-lg">
                    Começar Agora <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="secondary" size="lg" className="h-14 px-8 text-lg">
                    Ver Demo
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-24 bg-zinc-900/50">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">Dominância Tecnológica</h2>
              <p className="mt-4 text-zinc-400">Stack de elite para empresas que não aceitam falhas.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  icon: Bot,
                  title: "IA Superintendente",
                  desc: "Monitoramento e auto-correção 24/7 com agentes autônomos."
                },
                {
                  icon: Zap,
                  title: "Performance Extrema",
                  desc: "Arquitetura distribuída capaz de processar 1M+ requisições/s."
                },
                {
                  icon: Shield,
                  title: "Segurança de Banco",
                  desc: "Criptografia de ponta a ponta e compliance SOC2 nativo."
                },
                {
                  icon: Cpu,
                  title: "Recrutamento Neural",
                  desc: "Análise de 10.000 currículos em segundos com Gemini Pro."
                },
                {
                  icon: Globe,
                  title: "Escala Global",
                  desc: "Infraestrutura multi-região automática via Kubernetes."
                },
                {
                  icon: Bot,
                  title: "Suporte Cognitivo",
                  desc: "Atendimento N1 e N2 resolvido 100% por IA Generativa."
                }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-full border-zinc-800 bg-black/50 hover:bg-zinc-900/50 transition-colors">
                    <CardHeader>
                      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <CardTitle>{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base">{feature.desc}</CardDescription>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 bg-black py-12">
        <div className="container mx-auto px-4 text-center text-zinc-500">
          <p>&copy; 2024 Innovation.ia Enterprise. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
