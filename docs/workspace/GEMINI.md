# Innovation.ia — Enterprise OS (Contexto de Projeto)

Este arquivo fornece contexto profundo para o Gemini CLI entender a arquitetura, objetivos e padrões de desenvolvimento do ecossistema Innovation.ia.

## 🚀 Visão Geral
A **Innovation.ia** é uma plataforma SaaS Next-Gen baseada em microserviços. Unifica IA, recrutamento (ATS), financeiro e analytics em um único sistema operacional corporativo.

## 🏗️ Arquitetura Modular (Blocos)
O sistema foi reorganizado em 8 blocos principais dentro de `apps/` para facilitar o desenvolvimento isolado:

1. **🤖 1-ia**: Motores de IA (Gemini, NVIDIA, GPT), prompts e modelos.
2. **💬 2-whatsapp**: Bot de atendimento, fluxos, handlers e integração API.
3. **👥 3-rh**: Sistema ATS, testes DISC, processamento de currículos e portal RH.
4. **💳 4-financeiro**: Checkout, Meios de Pagamento (Asaas/MP), assinaturas e faturas.
5. **📊 5-contabilidade**: Dashboard do cliente, Notas Fiscais e Relatórios Contábeis.
6. **🎨 6-media**: Gerador de fotos profissionais para currículos e templates.
7. **⚙️ 7-infra**: Docker, Gateway (Kong), Migrations de DB e CI/CD.
8. **🖥️ 8-frontend**: O App Principal (Next.js) consolidado.

## 🛠️ Padrões de Desenvolvimento
- **Isolamento**: Cada módulo deve ser o mais independente possível.
- **Frontend**: Componentes de UI ficam em `8-frontend`, mas lógicas específicas de módulo podem residir em sua própria pasta `frontend` dentro do bloco.
- **Workspace**: Sempre utilize o arquivo `innovation.ia.code-workspace` para uma visão limpa no VS Code.

## 📋 Comandos Úteis
- `scripts/iniciar_local.ps1`: Inicia todos os containers via PowerShell.
- `scripts/parar_tudo.ps1`: Para e limpa o ambiente.
- `scripts/reparo_total.sh`: Script de auto-cura para dependências e infra.

## 🎯 Objetivo "Nível Fllu"
O nível **Fllu (Full Level)** consiste em maximizar a eficiência operacional através da integração total entre os microserviços e a inteligência contextual. 
Ao interagir com este projeto via Gemini CLI:
1. Priorize soluções que respeitem o isolamento dos microserviços.
2. Utilize o Plan Mode para arquitetar mudanças complexas antes da execução.
3. Foque em UX/UI premium para qualquer alteração no frontend.
