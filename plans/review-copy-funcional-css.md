# 🚀 INNOVATION — ESCOPO FINAL AJUSTADO (V1 REAL + WEB SERVICES OPCIONAL)

==================================================
🎯 REGRA MESTRA DO PRODUTO
==================================================

❌ Nenhum ambiente mistura públicos  
❌ Nenhuma rota é acessível sem permissão explícita  
❌ Nenhum serviço extra é liberado sem contratação  

✅ Cada público tem UM ambiente próprio  
✅ Serviços adicionais são controlados por PLANO  
✅ Backend é a única fonte de autorização  

==================================================
🏗️ ARQUITETURA FINAL DA INNOVATION
==================================================

1️⃣ WEB EMPRESA (CLIENTE — EMPRESA)
2️⃣ WEB SERVICES (SERVIÇOS OPCIONAIS — OPERAÇÃO)
3️⃣ WEB SAC (SUPORTE — N1 / N2)
4️⃣ WEB ADM (PLATAFORMA — DEVS)
5️⃣ APP MOBILE (CLIENTE — COLABORADOR)

==================================================
🏢 1. WEB EMPRESA (CLIENTE — EMPRESA)
==================================================

🎯 OBJETIVO:
Gestão de recrutamento da EMPRESA cliente.

🌐 AMBIENTE:
- Web exclusiva
- URL própria (ex: empresa.innovation.ai)

👤 QUEM ACESSA:
- Usuários da empresa (RH / gestor)

🔐 LOGIN:
- Login de empresa
- JWT
- Empresa associada obrigatória

📋 FUNCIONALIDADES PADRÃO (SEM WEB SERVICES):
- Criar / editar / encerrar vagas
- Visualizar candidatos por vaga
- Visualizar status da candidatura
- Visualizar documentos ENVIADOS pelo candidato
- Histórico de candidatura
- Configurações da empresa
- Plano / assinatura

📌 REGRA IMPORTANTE:
Se a empresa NÃO contratar Web Services:
- Ela vê os documentos diretamente
- Ela é responsável por validar e decidir

❌ NÃO EXISTE:
- Acesso a SAC
- Acesso a ADM
- Acesso a Services sem contratação

==================================================
🧑‍💼 2. WEB SERVICES (SERVIÇO OPCIONAL — OPERAÇÃO)
==================================================

🎯 OBJETIVO:
Prestar SERVIÇOS OPERACIONAIS adicionais às empresas
que optarem por esse módulo no plano.

🌐 AMBIENTE:
- Web exclusiva
- URL própria (ex: services.innovation.ai)

👤 QUEM ACESSA:
- Equipe contratada pela Innovation

🔐 LOGIN:
- Login Services
- 2FA obrigatório (OBS: desativado para testes, pronto para habilitar quando necessário)
- Controle por role interno

--------------------------------------------------
📦 MODALIDADES DE SERVIÇO
--------------------------------------------------

🟡 SERVIÇO 1 — VALIDAÇÃO DE DOCUMENTOS
(opcional por plano)

FUNCIONALIDADES:
- Visualizar documentos enviados pelos candidatos
- Aprovar documento
- Reprovar documento
- Campo OBRIGATÓRIO para motivo da reprovação
- Histórico de validações

REGRAS:
- Documento aprovado → liberado para Web Empresa
- Documento reprovado → retorna ao App com motivo
- Empresa NÃO vê documentos pendentes/reprovados

--------------------------------------------------

🔵 SERVIÇO 2 — RECRUTAMENTO COMPLETO (FULL SERVICE)
(opcional por plano / contrato)

FUNCIONALIDADES:
- Buscar candidatos para a vaga
- Triagem inicial
- Contato com candidatos
- Organização do processo seletivo
- Agendamento de entrevista
- Coordenação entre empresa e candidato
- Apoio na decisão final

📌 IMPORTANTE:
- Innovation NÃO contrata o candidato
- Innovation NÃO gera vínculo empregatício
- Innovation apenas ORGANIZA o processo

--------------------------------------------------

📋 FUNCIONALIDADES GERAIS DO WEB SERVICES:
- Visualizar empresas que contrataram o serviço
- Visualizar vagas vinculadas ao serviço
- Histórico de ações por empresa
- Comunicação registrada com empresa

❌ NÃO EXISTE:
- Gestão de planos
- Deploy
- Configuração de plataforma
- Acesso ADM

==================================================
🧑‍💼 3. WEB SAC (SUPORTE — N1 / N2)
==================================================

🎯 OBJETIVO:
Suporte aos usuários e empresas.

🌐 AMBIENTE:
- Web exclusiva
- URL própria (ex: sac.innovation.ai)

👤 QUEM ACESSA:
- Equipe interna de suporte

🔐 LOGIN:
- Login SAC
- 2FA obrigatório (OBS: desativado para testes, pronto para habilitar quando necessário)

📋 FUNCIONALIDADES:
- Ajudar empresas e candidatos
- Visualizar dados (somente leitura)
- Escalonar problemas para Services ou ADM

==================================================
🛠️ 4. WEB ADM (PLATAFORMA — DEVS)
==================================================

🎯 OBJETIVO:
Gestão da PLATAFORMA Innovation.

🌐 AMBIENTE:
- Web isolada
- URL própria (ex: adm.innovation.ai)

👤 QUEM ACESSA:
- Apenas DEVs / Admins

🔐 LOGIN:
- Login exclusivo
- 2FA obrigatório (OBS: desativado para testes, pronto para habilitar quando necessário)

📋 FUNCIONALIDADES:
- Gestão de empresas
- Gestão de planos
- Habilitar/desabilitar Web Services por empresa
- Gestão de usuários internos (SAC / Services)
- Auditoria e logs
- Monitoramento da plataforma

==================================================
📱 5. APP MOBILE (CLIENTE — COLABORADOR)
==================================================

🎯 OBJETIVO:
Experiência EXCLUSIVA do colaborador/candidato.

🌐 AMBIENTE:
- App Flutter (Android / iOS)

📋 FUNCIONALIDADES:
- Cadastro / login
- Candidatura
- Upload de documentos
- Visualizar status
- Visualizar motivo de reprovação
- Receber contato para entrevista (quando aplicável)
- Orientação via IA

==================================================
🔐 REGRAS CRÍTICAS DE SERVIÇOS
==================================================

- Web Services só é acessível se contratado
- Backend valida plano antes de liberar rotas
- Empresa escolhe:
  - Sem serviço → vê documentos
  - Com validação → Innovation valida
  - Full service → Innovation organiza recrutamento
- Tudo auditável

==================================================
📌 DEFINIÇÃO FINAL DO PRODUTO
==================================================

A Innovation é:

✔ Plataforma de recrutamento
✔ Com serviços opcionais premium
✔ Sem risco jurídico
✔ Escalável
✔ Diferenciada no mercado

==================================================
🎯 STATUS
==================================================

✔ Escopo fechado
✔ Produto profissional
✔ Modelo de receita expandido
✔ Pronto para implementação sem retrabalho

OBS: 2FA permanece desativado para testes, com ativação pronta quando necessário.
