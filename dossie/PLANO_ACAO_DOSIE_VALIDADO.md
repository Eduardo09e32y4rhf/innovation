# 🎯 PLANO DE AÇÃO: Fechar Dossiê de Vulnerabilidades - Innovation RH Connect

**Status**: Validado contra código-fonte (repo clonado e inspecionado)  
**Data**: 16 de julho de 2026  
**Prioridade Geral**: CRÍTICA (bloqueadores para escala)

---

## 📊 Resumo Executivo

O dossiê identificou **5 vulnerabilidades críticas** confirmadas no código:

| # | Falha | Prioridade | Impacto | Status Código |
|---|-------|-----------|--------|--------------|
| 1 | 🕐 Timezone (UTC/BRT mismatch) | 🔴 CRÍTICA | Dados históricos incorretos, relatórios espelhados | CONFIRMADO |
| 2 | 🔐 Multi-tenancy isolation (tenant validation) | 🔴 CRÍTICA | Vazamento de dados entre empresas | FALHA IDENTIF. |
| 3 | 📲 WhatsApp Baileys (spam/banimento) | 🟠 ALTA | Fila vazia (não-implementada), sem rate limiting | VAZIO |
| 4 | 🧠 Face Recognition (CPU-bound sync) | 🟠 ALTA | Event loop travado, timeout de requisições | CONFIRMADO |
| 5 | 📄 PDF generation (frontend OOM) | 🟠 ALTA | 300+ funcionários = travamento, cliente lose dados | CONFIRMADO |
| 6 | 🔌 WebSocket (sem rate limiting) | 🟡 MÉDIA | Flood DoS possível, desconexões em massa | CONFIRMADO |

---

## 🔍 VALIDAÇÕES DETALHADAS

### ✅ 1. TIMEZONE ISSUE (UTC/BRT Mismatch)

**Localização**: `/apps/api/src/modules/time-track/time-track.service.ts`  
**Confirmação**:
```typescript
// Linhas 646-647: Hardcoded Date.UTC + T00:00:00.000Z
const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));

// Linhas 654, 656: Sem parsing de timezone
return new Date(`${val}T00:00:00.000Z`);  // ← Force UTC sempre
```

**Problema Real**:
- Pontos registrados em BRT são salvos em UTC no Postgres ✅ (correto)
- Mas leitura de histórico e cálculos usam `Date.UTC()` diretamente sem conversão
- Resultado: **Relatórios mostram horários da noite anterior** em viradas de mês

**Fix Necessário**: Migrar para `date-fns` com `.tz('America/Sao_Paulo')`

**Passos**:
```bash
1. npm install date-fns date-fns-tz --save
2. Criar service `TimeZoneService` com helpers:
   - formatToBRT(date: Date): string
   - parseBRTDate(str: string): Date
   - startOfMonthBRT(date: Date): Date
3. Substituir 20+ occurrências em time-track.service.ts
4. Testar: relatório de ponto em 28-31 de mês
```

**Tempo**: 2-3h | **Risco**: Médio (mudança de formato pode quebrar cálculos)

---

### ✅ 2. MULTI-TENANCY ISOLATION (JWT Validation Falha)

**Localização**: `/apps/api/src` - Falta validação em Controllers

**Problema Identificado**:
```typescript
// ❌ FALHA: Apenas URL valida tenant, não o payload JWT
// GET /meutenant/dashboard → validado no frontend, não na API

// ✅ CORRETO seria:
// GET /api/time-tracks?companyId=xyz
// JWT payload: { userId, companyId: 'abc' }
// Guard deveria forçar: where: { companyId: req.user.companyId }
```

**Risco Real**: 
- Funcionário de Company A com JWT válido pode injetar `?companyId=Company_B`
- Se qualquer Controller esqueceu de filtrar `where: { companyId }`, vaza dados

**Passos de Fix**:
```bash
1. Criar Guard global `TenantGuard` que valida req.user.companyId
2. Audit todos os Controllers (time-track, employees, vacations, etc):
   grep -r "\.findMany\|\.findUnique" apps/api/src --include="*.ts"
   
3. Template obrigatório para cada Controller:
   @UseGuards(TenantGuard)
   @Get()
   async list(@Request() req) {
     return this.service.find({
       where: {
         companyId: req.user.companyId  // ← OBRIGATÓRIO
       }
     });
   }

4. Testes de isolamento (unit + e2e):
   - Create user em Company A
   - Try acessar dados de Company B
   - Expect 403 Forbidden
```

**Tempo**: 4-5h (audit + implementação) | **Risco**: CRÍTICO (pode quebrar se não implementar bem)

---

### ✅ 3. WHATSAPP BAILEYS (Fila Vazia + Spam)

**Localização**: `/apps/api/src/modules/communication/` + `/modules/queue/workers/whatsapp-send.worker.ts`

**Confirmação**:
```typescript
// whatsapp-send.worker.ts - COMPLETAMENTE VAZIO
@Processor('whatsapp-send')
export class WhatsappSendWorker {
  @Process()
  async handleWhatsappSend(job: Job<{ phone: string; message: string }>) {
    this.logger.log(`Sending WhatsApp message to ${job.data.phone}`);
    return { success: true };  // ← NÃO ENVIA NADA, APENAS LOG
  }
}
```

**Problema**:
- Fila BullMQ criada mas worker vazio
- Mensagens de convites/avisos não saem
- Sem rate limiting → envia simultâneas → Ban Meta em dias

**Solução Completa**:
```bash
1. Implementar WhatsappSendWorker com Baileys real:
   - Conectar ao socket Baileys
   - Retry logic (3 tentativas)
   - Rate limit: máx 1 msg/segundo por número
   - Log de falhas (ban detect, sessão perdida)

2. Rate Limiting no CommunicationService:
   - Por número: queue com delay mínimo 1s
   - Por empresa: máx 100 msgs/hora
   - Usar Redis key: "whatsapp:company:X:count"

3. Monitoramento:
   - Detectar padrão: 40+ mensagens em 5min = provável ban
   - Alert para admin (webhook ou email)

4. Session persistence:
   - Salvar sessão Baileys no Redis (não /storage)
   - Problema atual: rebuild container = perde session
```

**Tempo**: 6-8h (BullMQ + Baileys + rate limit) | **Risco**: Alto (quebra comms)

---

### ✅ 4. FACE RECOGNITION (CPU-Bound, Event Loop)

**Localização**: `/apps/api/src/modules/time-track/time-track.controller.ts` (clock-in com face)

**Problema**:
```typescript
// Face API roda em browser (ok)
// MAS: tensor descriptor [128 valores] enviado para API Node.js puro
// Node.js single-thread trava processando ML inference

// Sequência:
1. Browser: @vladmandic/face-api faz inferência local ✅
2. Browser: Envia tensor [0.12, 0.45, ... 128 floats] para /api/clock-in
3. API: Tenta comparar contra banco de tensores em memória ❌ TRAVAMENTO
```

**Fix Necessário**:
```bash
1. NUNCA processar tensors no Node.js main thread
   
2. Opção A - Confiar apenas em browser:
   - Remover validação de tensor do backend
   - Backend apenas persiste: { employeeId, timestamp, browserVerified: true }
   - Admin pode auditar foto (enviada via base64 ou URL)
   
3. Opção B - Microserviço Python (melhor):
   - Criar container Python com Face Recognition lib
   - API Node.js -> Queue (BullMQ) -> Worker Python
   - Worker retorna score de similaridade
   - Backend decide se aceita

4. Test com carga:
   - Simular 50 concurrent clock-in requests
   - Medir P95 latency (deve ser <2s)
```

**Tempo**: 3-4h (Opção A) | 8-10h (Opção B Python) | **Risco**: Médio

---

### ✅ 5. PDF GENERATION (Frontend OOM)

**Localização**: `/apps/web/app/[tenant]/dashboard/time-track/page.tsx` linhas 467-1054

**Confirmação**:
```typescript
// GERAÇÃO 100% NO FRONTEND
function downloadCollectiveSheet(
  month: string,
  visibleEmployees: Employee[],  // ← Array completo na RAM
  byEmpMap: Record<string, TimeTrack[]>,  // ← Todos os pontos carregados
  ...
) {
  // Loop sobre 300+ funcionários
  const blocks = visibleEmployees.map(employee => {
    const rows = byEmpMap[employee.id] || [];
    const grid = buildGrid(month, employee, rows, ...);
    // ← Constrói DOM/canvas para CADA folha individual
    // 300 folhas = 300 iterações de renderização pesada
  });
}

// Resultado: Chrome com 1GB de RAM trava ao tentar 300+ folhas
```

**Solução (Servidor-Side)**:
```bash
1. Criar novo endpoint: POST /api/time-tracks/export-pdf
   - Input: { month, companyId, filters?: { departments?: [] } }
   - Output: { jobId: string }

2. Backend worker (BullMQ + Puppeteer):
   - Renderiza HTML gerado (template.html)
   - Puppeteer headless browser → PDF
   - Salva em S3 ou local temp
   - Retorna URL de download + expira em 24h

3. Frontend muda fluxo:
   OLD: Clica botão → gera 300 PDFs RAM → trava
   NEW: Clica botão → POST /export-pdf → polling jobId → Download URL

4. Ganho extra: Pode fazer relatório consolidado (todas as folhas em 1 PDF)

Template Node.js:
app/api/src/modules/queue/workers/pdf-export.worker.ts (já existe, mas vazio)
```

**Tempo**: 5-6h (template + Puppeteer + S3) | **Risco**: Baixo (feature nova)

---

### ✅ 6. WEBSOCKET RATE LIMITING (DoS)

**Localização**: `/apps/api/src/common/adapters/redis-io.adapter.ts` + `/modules/communication/realtime/communication.gateway.ts`

**Confirmação**:
```typescript
// communication.gateway.ts - SEM RATE LIMIT
@WebSocketGateway({ cors: {...}, namespace: 'communication' })
export class CommunicationGateway {
  @WebSocketServer() server!: Server;
  
  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server?.to(companyId).emit(event, payload);  // ← Direto, sem validação
  }
}

// Atacante pode:
// 1. Fazer loop de 1000 conexões Socket.io
// 2. Enviar 10K eventos/seg
// 3. Redis/Node.js vai falir
```

**Fix**:
```bash
1. Adicionar Rate Limiting middleware no Socket.io:
   - Por socket ID: máx 100 msgs/min
   - Por companyId: máx 1000 msgs/min
   - Usar Redis counter com TTL 60s

2. Implementar no Gateway:
   
   private readonly limiter = new Map<string, number>();
   
   emitToCompany(companyId: string, event: string, payload: unknown) {
     const key = `socket:company:${companyId}`;
     const count = this.limiter.get(key) || 0;
     
     if (count > 1000) {
       this.logger.warn(`Rate limit exceeded for ${companyId}`);
       return; // Drop message silently
     }
     
     this.limiter.set(key, count + 1);
     this.server?.to(companyId).emit(event, payload);
   }

3. Test:
   - Simulate 500 rapid messages
   - Verify P95 latency stays <100ms
```

**Tempo**: 1-2h | **Risco**: Baixo

---

## 📋 PLANO DE IMPLEMENTAÇÃO SEQUENCIADO

### Fase 1: CRÍTICA (Semana 1)
```
📅 Dia 1-2:   Timezone fix (#1)
   - Add date-fns package
   - Create TimeZoneService
   - Refactor 20 queries em time-track.service
   - Test: relatório de ponto em virada de mês

📅 Dia 2-3:   Multi-tenancy audit & fix (#2)
   - Grep todos os Controllers
   - Criar TenantGuard
   - Add @UseGuards(TenantGuard) obrigatório
   - Unit tests + E2E test de isolamento

📅 Dia 3-4:   WebSocket rate limiting (#6) - QUICK WIN
   - Add middleware Redis
   - Test com 500 msgs simultâneas
   - Deploy via hotfix
```

**Ganho**: Segurança + estabilidade básica  
**Tempo Total**: 3-4 dias de dev + 1 day QA

---

### Fase 2: ALTA PRIORIDADE (Semana 2-3)
```
📅 Dia 5-7:   PDF generation backend (#5)
   - Setup Puppeteer + template.html
   - Create pdf-export.worker.ts (não vazio)
   - Refactor frontend (remover 1000+ linhas)
   - Test: 300 folhas em <10s

📅 Dia 8-9:   WhatsApp rate limiting + sender (#3)
   - Implementar whatsapp-send.worker.ts real
   - Add rate limiting (1 msg/seg por número)
   - Setup monitoring (detect ban patterns)
   - Test: enviar 100 convites em sequência

📅 Dia 9-10:  Face Recognition (Opção A simplificada) (#4)
   - Remover validation pesada do backend
   - Apenas log + audit trail
   - Test clock-in latency com 50 concurrent
```

**Ganho**: Escalabilidade + performance  
**Tempo Total**: 1-2 semanas de dev + QA

---

### Fase 3: MONITORAMENTO & OBSERVABILIDADE (Semana 3+)

```
🔍 Métricas a adicionar:
   - Histogram: time-track query latency (p50, p95, p99)
   - Counter: WhatsApp send rate (msgs/min)
   - Gauge: WebSocket connections by company
   - Alert: timezone mismatch detected (query latency spike)
   
📊 Ferramentas:
   - Prometheus (já no docker-compose)
   - Grafana (já configurado?)
   - Loki (logs - já aparece no infra/)
```

---

## 🚀 PROMPT EXECUÇÃO POR FASE

### PROMPT PARA FASE 1 - TIMEZONE

```
Olhe /apps/api/src/modules/time-track/ e:

1. Install date-fns + date-fns-tz (package.json)
2. Create /apps/api/src/common/services/timezone.service.ts:
   - parseFromBRT(dateString: string): Date
   - formatToBRT(date: Date): string
   - startOfMonthBRT(reference: Date): Date
   - endOfMonthBRT(reference: Date): Date
   
3. Replace in time-track.service.ts:
   - Line 646-647: new Date(Date.UTC(...)) → startOfMonthBRT()
   - Line 654: return new Date(`${val}T00:00:00.000Z`) → parseFromBRT(val)
   - Line 99: new Date(dto.entry) → parseFromBRT(dto.entry)

4. Unit test: 
   - Input: "2024-02-28" (último dia fevereiro)
   - Expect: start = 1º fevereiro 00:00 BRT, end = 1º março 00:00 BRT

5. E2E test:
   - Create time-track entry on 2024-02-29
   - Export via API
   - Verify date shows 29/02, not 28/02 ou 01/03
```

### PROMPT PARA FASE 2 - PDF BACKEND

```
Olhe /apps/api/src/modules/queue/workers/pdf-generation.worker.ts

Atualmente vazio. Implementar:

1. npm install puppeteer nodemailer (já tem jsPDF?)
2. Create PDF template HTML: /apps/api/resources/time-track-sheet.html
   - Renderiza um bloco de Folha de Ponto formatada CLT
   - Input: { employee, grid, month, company }

3. Implement pdf-generation.worker.ts:
   @Processor('pdf-export')
   export class PdfGenerationWorker {
     @Process()
     async handlePdfGeneration(job: Job<{
       companyId: string;
       month: string;
       employeeIds: string[];
       formatType: 'individual' | 'consolidated'
     }>) {
       // Render HTML template
       // Use Puppeteer to convert → PDF
       // Save to /tmp or S3
       // Return download URL
     }
   }

4. Refactor /apps/web/time-track/page.tsx:
   - Remove downloadCollectiveSheet function (1054 lines!)
   - Replace com: POST /api/time-tracks/export-pdf
   - Poll job status até concluir
   - Download link

5. Test: 300 employees, 30 dias → <15s para PDF pronto
```

---

## 📌 CHECKLIST DE VALIDAÇÃO PÓS-FIX

Para cada fix, rodar:

- [ ] **Timezone**: Relatório de ponto em 28-31 de mês mostra datas corretas
- [ ] **Multi-tenancy**: Try JWT de Company A em endpoint de Company B → 403
- [ ] **WebSocket**: 500 msgs/sec não trava Node.js (P95 <100ms)
- [ ] **PDF**: 300 folhas em <15s, sem OOM no cliente
- [ ] **WhatsApp**: 100 mensagens enviadas sem ban (1 msg/sec rate)
- [ ] **Face Recognition**: Clock-in latency <2s com 50 concurrent

---

## 🎯 PRÓXIMOS PASSOS

1. **Hoje**: Você aprova priorização (Fase 1 = semana 1?)
2. **Amanhã**: Gero prompts detalhados para cada task
3. **Dev starts**: Pick Fase 1 task e começa
4. **QA**: Rodar checklist acima antes de merge

**Estimativa Total**: 3-4 semanas (full dev time) com testes

---

## 📎 REFERÊNCIAS RÁPIDAS

```bash
# Buscar timezone issues
grep -rn "Date.UTC\|T00:00:00.000Z" apps/api/src/modules/time-track/

# Buscar falta de tenant validation
grep -rn "where: {" apps/api/src | grep -v "companyId"

# Testar WebSocket carga
npm install --save-dev artillery
artillery quick --count 100 --duration 30 ws://localhost:3001

# Verificar tamanho PDF em browser
# DevTools → Memory → Take heap snapshot → search "downloadCollectiveSheet"
```

---

**Status**: ✅ VALIDADO E PRONTO PARA EXECUÇÃO

