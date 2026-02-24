# INNOVATION.IA - Plano de Otimização e "Lightweight"

Para deixar o sistema funcional e o mais leve possível, especialmente para rodar em uma VPS com recursos limitados (como o Ubuntu KVM de 1GB/2GB), propomos as seguintes ações:

## 1. Consolidação da Arquitetura (Monolito Estratégico)
Atualmente existem dois backends: um monolito completo em `backend/` e microserviços em `services/`.
- **Ação**: Utilizar o `backend/` como única fonte de verdade. Ele é mais completo e consome menos recursos de base (RAM) do que manter 3-4 containers Python + Gateway Kong rodando simultaneamente.
- **Resultado**: Economia de ~300MB a 600MB de RAM.

## 2. Otimização de Banco de Dados
- **Ação**: Para ambientes de baixo tráfego ou teste, continuar usando **SQLite** (configurado via `DATABASE_URL=sqlite:///innovation_rh.db`). Para produção leve, o **PostgreSQL** em container Alpine é ideal.
- **Remover**: MongoDB e Kafka (que estão no `docker-compose.enterprise.yml`), pois são extremamente pesados e desnecessários para o estágio atual.

## 3. Limpeza de "Gordura" do Código
- **Deletar**: Pastas `services/`, `gateway/`, `ai_engine/` e `ops/` se não estiverem em uso real. Elas contêm duplicatas simplificadas do código principal.
- **Remover**: Dependências pesadas e não utilizadas (ex: `langchain` se não estiver sendo usado em produção).

## 4. Otimização de Docker e Disco
O uso de 21GB de disco geralmente indica muitas imagens Docker antigas ou builds de Node.js.
- **Ação**: Criar um `docker-compose.light.yml` que contenha apenas:
  - `backend` (FastAPI)
  - `frontend` (Next.js)
  - `postgres` (Opcional, pode ser SQLite)
  - `redis` (Cache leve)
- **Comando de Limpeza**: `docker system prune -a` (Libera GBs de espaço em disco no VPS).

## 5. Próximos Passos Imediatos
1. Fix do ambiente virtual (`.venv`) - **EM ANDAMENTO**
2. Fix de bugs críticos de importação - **CONCLUÍDO**
3. Geração do `docker-compose.light.yml`.
4. Script de limpeza e manutenção.
