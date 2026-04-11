# <img src="https://raw.githubusercontent.com/lucide-react/lucide/main/icons/bot.svg" width="32" height="32" /> INNOVATION.IA — Super ERP Cognitivo (V2.0)

[![Microservices](https://img.shields.io/badge/Architecture-Microservices-purple?style=for-the-badge&logo=docker)](https://github.com/Eduardo09e32y4rhf/innovation)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Status](https://img.shields.io/badge/Status-Phase%202%20Complete-success?style=for-the-badge)](#)


## 🔒 Segurança de Nível Bancário (Bank-Grade Security)
A plataforma Innovation.ia foi construída com os mais rigorosos padrões de segurança, garantindo que nenhum dado seja interceptado ou roubado.
- **Criptografia de Ponta-a-Ponta:** Utilizamos protocolos de segurança avançados (HSTS) para forçar conexões sempre criptografadas (HTTPS).
- **Proteção Contra Injeção e Execução de Scripts:** Políticas estritas de CSP (Content-Security-Policy) previnem a execução de códigos maliciosos.
- **Anti-Sniffing e XSS:** Configurações de cabeçalhos nosniff e proteção XSS ativa garantem a integridade dos arquivos (como notas fiscais) e protegem as interfaces.
- **Blindagem do Servidor:** Ocultamento de versões do servidor e frameworks (Nginx, Next.js) para mitigar fingerprinting e evitar ataques direcionados.
---

## 📁 Estrutura do Projeto (Organizada)
O ecossistema está organizado para garantir o isolamento e a escalabilidade dos microserviços:

- **`backend/`**: O coração da plataforma (FastAPI).
- **`frontend/`**: Interface de usuário premium (Next.js).
- **`ai_engine/`**: Processamento pesado e trabalhadores de IA.
- **`gateway/`**: Ponto único de entrada e roteamento.
- **`infrastructure/`**: Configurações de DevOps, Kubernetes e operações de infra.
- **`scripts/`**: Utilitários para inicialização, migração e manutenção do sistema.
- **`docs/`**: Documentação técnica e metadados (`/metadata`).
- **`examples/`**: Projetos de exemplo e laboratório de novos módulos.

---

## 🚀 A Visão: Super ERP Cognitivo
A **Innovation.ia** evoluiu de um Dashboard de IA para o **Sistema Operativo Central (ERP + ATS)** definitivo. Nosso objetivo é substituir ecossistemas legados e fragmentados por uma plataforma única, nativa em IA, onde a empresa opera 100% do seu tempo.

### 💎 O que nos torna Superiores?
- **Pilar 1: ATS de Elite**: Recrutamento autônomo com Ranking via RAG e Kanban de alta performance.
- **Pilar 2: Finanças "Zero Papel"**: OCR avançado com Gemini 2.0 Flash para leitura de notas e recibos sem digitação manual.
- **Pilar 3: Automação n8n & WhatsApp**: Integração profunda com mensageria para processos de RH e suporte.

---

## 🛠 Módulos em Destaque (Fase 1 Atualizada)

### 💻 Terminal Cognitivo (Gemini CLI)
- **Desenvolvimento e Automação**: Interface de linha de comando integrada ao ecossistema para gerenciar interações com a API e validar o AI Key Manager.
- **Eficiência**: Ferramenta projetada para devs executarem automações e testes rápidos de prompts ou rotinas de OCR.


### 📊 ATS Intelligence & Kanban
- **Alta Performance**: Interface inspirada no Trello com animações fluidas (Framer Motion).
- **Match Score IA**: Visualização direta da compatibilidade do candidato no card do Kanban.

### 💰 Finanças Zero Papel
- **Scanner Inteligente**: Upload de PDFs ou Fotos que extrai automaticamente Fornecedor, Valor, Data e Itens.
- **Cash Flow Prediction**: Previsão de fluxo de caixa baseada em comportamento histórico.

### 🤖 AI Key Manager
- **Resiliência Total**: Rotação dinâmica de chaves Gemini/Veo para garantir 100% de disponibilidade.

---

### � Ponto Militar Biométrico
- **Segurança Antifraude**: Reconhecimento Facial integrado e validação rigorosa de GPS com detecção de Mock Location.

### 🏦 Hub Bancário Open Finance
- **Consolidação em Tempo Real**: Visualização de múltiplas contas (Inter, Nubank, Itaú) em uma interface unificada.

---

### 🧠 Innovation IA (Independente e Híbrida)
- **Cérebro na Vercel**: Orquestração Multi-IA (NVIDIA Mistral Large 3, Gemini 2.0 e Claude 3.5) rodando em infraestrutura serverless para alta disponibilidade e escalabilidade.
- **Orquestração Multi-Model**: Uso inteligente da Razão (NVIDIA), Conhecimento Técnico (Gemini) e Aprendizado Evolutivo (Claude).
- **Sincronização VPS**: Aprendizado contínuo onde o cérebro da Vercel alimenta o banco de conhecimento local na VPS, mantendo a IA dentro da VPN sempre atualizada.

---

## 📐 Arquitetura do Ecossistema (Híbrido)

```mermaid
graph TD;
    Vercel[Vercel Brain - Front/IA] ---|Sync Knowledge| VPS[VPS - Core/DB]
    Vercel -->|Reason| NVIDIA[NVIDIA Mistral Large 3]
    Vercel -->|Technical| Gemini[Gemini 2.0 Flash]
    Vercel -->|Evolution| Claude[Claude 3.5 Sonnet]
    
    VPS -->|Auth/Finance| Backend[FastAPI Backend]
    Backend --> DB[(SQLite/PostgreSQL)]
    Backend --> VPN[VPN Internal AI]
```

## 🛠 Módulos em Destaque (V2.1 Atualizada)

### 💻 Terminal Cognitivo & CLI
- **Innovation CLI**: Agora com suporte a `--rh`, permitindo consultar a IA especialista em RH e Contabilidade diretamente do terminal.
- **Independent Sync**: Sincronização automática entre o cérebro serverless e o sistema legacy.

---

## 📈 Roadmap para o Futuro Próximo

- **Fase 3 (Próxima)** : Integração Governamental Direta ( SEFAZ/NF-e ) e Micro-serviço de Auditoria Fiscal IA.
- **Fase 4** : Conciliação Bancária 100% Autônoma e Dashboard de Gestão Híbrida.

---

## 📐 Arquitetura do Ecossistema

```mermaid
graph TD;
    Client((Usuário Super ERP)) -->|PWA / Mobile| Kong[Kong API Gateway]
    Kong -->|/api/auth| Auth[Auth Microservice]
    Kong -->|/api/finance| Finance[Finance Microservice]
    Kong -->|/api/ai| AI[AI Engine - Gemini 2.0]
    AI --> RAG[CV Ranker / OCR Service]
    Finance --> OpenFinance[Belvo/Pluggy Integration]
    Auth --> DB[(PostgreSQL Central)]
```

---

## ⚠️ PROPRIEDADE INTELECTUAL
**SISTEMA PRIVADO E CONFIDENCIAL** — Propriedade exclusiva de **Eduardo Silva / Innovation.ia**.  
Qualquer reprodução ou distribuição sem autorização é estritamente proibida e sujeita a penalidades legais.

---
<p align="center">
  <b>Innovation.ia &copy; 2026 — O Futuro do Enterprise OS</b><br>
  <i>Designed for Dominance.</i>
</p>
