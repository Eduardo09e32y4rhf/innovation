# Hybrid Migration Plan

## Decisao

Manter o backend atual funcionando e migrar aos poucos para uma arquitetura com Supabase como core de dados, frontend novo e microservicos especializados.

## Arquitetura Alvo

- Frontend: TanStack Start + React 19.
- Dados: Supabase Auth, Postgres, RLS, Storage e Realtime.
- Servicos: WhatsApp, IA e pagamentos fora do frontend.
- WhatsApp: manter Baileys como microservico separado, lendo e gravando no Supabase.

## Ordem Recomendada

1. Proteger segredos e remover `.env` do Git.
2. Validar migrations do Supabase em ambiente limpo.
3. Criar login, cadastro, empresa e membros no frontend novo.
4. Migrar RH e financeiro para Supabase.
5. Migrar CRM, tarefas e notificacoes.
6. Conectar WhatsApp ao Supabase.
7. Remover partes antigas do Nest apenas quando houver substituto validado.

## Nao Apagar Ainda

- `apps/api`: ainda compila e contem regras uteis.
- `WHATSAPP`: base do futuro microservico Baileys.
- `legacy`: manter ate revisar o que sera migrado ou descartado.

## Checklist

- API atual compila.
- Supabase aplica migrations sem erro.
- RLS bloqueia acesso entre empresas.
- Frontend autentica e seleciona empresa.
- RH e financeiro funcionam no Supabase.
- WhatsApp envia, recebe e salva mensagens.
- Nenhum `.env` real esta versionado.
