# Innovation‑Enterprise (INNOVATION.IA)

> **AVISO: SISTEMA PRIVADO E PROPRIETÁRIO**  
> Este software é de uso restrito. A cópia, distribuição ou reprodução não autorizada é estritamente proibida.

Resumo rápido
Innovation‑Enterprise é uma plataforma SaaS pronta para demonstração que unifica recrutamento inteligente (ATS) com IA, gestão de RH, gestão de projetos e funcionalidades financeiras. Desenvolvida como monorepo com backend em FastAPI e frontend em Next.js, projetada para implantação em container (Docker).

Por que é relevante para recrutadores
- Triagem automática de currículos com parsing e ranking por IA — acelera a seleção inicial.
- Fluxos de contratação e onboarding automatizados — reduz tempo até contratação e esforço operacional.
- Integrações de comunicação e pagamento (ex.: SendGrid, Twilio, Mercado Pago) — pronta para clientes empresariais.
- Arquitetura escalável e segura, com prática de deploy via Docker Compose e Nginx.

O que mostrar na demo (prioridade)
1. Painel de vagas e lista de candidatos (ATS) — filtros e ranking automático.
2. Fluxo de seleção: mudança de status, templates de e‑mail e agendamento.
3. Onboarding digital e status de admissão.
4. Endpoint de health / status e logs básicos (garantia de operação).

Destaques técnicos (resumo)
- Backend: Python, FastAPI, Uvicorn, SQLAlchemy, Alembic
- Frontend: Next.js 16, React, TypeScript, Tailwind CSS
- Infraestrutura: Docker, docker‑compose, Nginx (reverse proxy)
- Bancos: PostgreSQL (relacional), MongoDB (NoSQL), Redis (cache)
- Observabilidade (opcional): Prometheus / Grafana
- Integrações IA: Google Gemini / APIs LLM

Como avaliar rapidamente (para time técnico do recrutador)
- Acessar demo: http://187.77.49.207:3000
- Conferir health endpoint do backend (ex.: /api/health ou /health)
- Fazer upload de 1 currículo e verificar parsing + ranking automático
- Revisar readiness para produção: Dockerfile(s), docker‑compose.prod.yml, nginx.conf, .env.prod
- Executar testes do backend: cd backend && pytest

Como rodar local (resumo para validação técnica)
- Backend:
  - cd backend
  - python -m venv venv && source venv/bin/activate
  - pip install -r requirements.txt
  - uvicorn src.api.main:app --reload
- Frontend:
  - cd frontend
  - npm install
  - npm run dev
- Deploy simplificado (servidor):
  - docker-compose -f docker-compose.prod.yml up -d --build

- Deploy Microserviços (Beta):
  - Copie `.env.microservices.example` para `.env`
  - docker-compose -f docker-compose.microservices.yml up -d --build
  - Acesse via Gateway na porta 8000

Observações para recrutador
- Projeto pronto para demonstração, com foco em automação do processo de recrutamento.
- Arquitetura e código estruturados para escalar e integrar com provedores de IA e ERPs.
- Acesso para avaliação técnica pode ser providenciado mediante solicitação (sem contato público no README).

## Licença

Este sistema é **PROPRIETÁRIO** e **PRIVADO**.
Copyright © 2026 Innovation.ia - Eduardo Silva. Todos os direitos reservados.

A cópia, distribuição ou uso não autorizado deste software é estritamente proibida. O acesso para avaliação técnica deve ser solicitado diretamente ao proprietário.
