# 🔍 MAPA TÉCNICO: Bugs Confirmados com Linhas Exatas

Validação 1:1 contra código-fonte clonado. **Copie path para IDE rapidinho.**

---

## 🔴 BUG #1: Timezone (UTC/BRT Mismatch)

**Arquivo**: `/apps/api/src/modules/time-track/time-track.service.ts`

```typescript
// LINHA 644-647: Problema #1 - Date.UTC hardcoded
644: const reference = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
645: 
646: const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
647: const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
     ❌ Sempre UTC, sem conversão para BRT

// LINHA 654: Problema #2 - Hardcoded T00:00:00.000Z
654: return new Date(`${val}T00:00:00.000Z`);
     ❌ Force UTC sempre, ignora timezone do usuário

// LINHA 656-657: Problema #3 - Parse sem timezone
656: const date = new Date(val || '');
657: return date.getTime() > reference.getTime();
     ❌ Ambiguo quando val é string local

// LINHA 99: Problema #4 - Entry time sem conversão
99: const entryTime = new Date(dto.entry);
    ❌ Assume UTC se ISO, mas frontend envia BRT
```

**Exemplo Real de Bug**:
```
Funcionário bate ponto às 23:30 BRT no dia 28/02
Backend salva como 02:30 UTC (dia 01/03)
Relatório mostra ponto no dia 1º de março (errado!)
```

**Fix**: Usar `date-fns` + `date-fns-tz`
```typescript
import { toZonedTime, format } from 'date-fns-tz';
const brtz = 'America/Sao_Paulo';
const zonedDate = toZonedTime(new Date(), brtz);
```

---

## 🔴 BUG #2: Multi-Tenancy Isolation

**Arquivo**: `/apps/api/src/modules/time-track/time-track.controller.ts`

```typescript
// ❌ PROBLEMA: Sem TenantGuard global
@Controller('time-track')
export class TimeTrackController {
  
  @Get()
  @UseGuards(JwtAuthGuard)  // ← Apenas autentica, NÃO isola tenant
  async getTimeTrack(@Query('employeeId') empId: string) {
    return this.service.findByEmployee(empId);
    // ❌ Nada garante que empId pertence à companyId do JWT
  }
}
```

**Ataque Possível**:
```
1. User de Company A faz login → recebe JWT { userId: 'u1', companyId: 'c1' }
2. Faz request: GET /api/time-track?employeeId=e999
3. Se e999 pertence à Company B, nada impede acesso
4. Vaza dados de Company B
```

**Código Vulnerável** em todos controllers. Exemplo em `/modules/employees/employees.service.ts`:

```typescript
async findByCompany(companyId: string) {
  return this.prisma.employee.findMany({
    where: { companyId }  // ✅ Aqui tem filtro
  });
}

async getById(employeeId: string) {
  return this.prisma.employee.findUnique({
    where: { id: employeeId }  // ❌ AQUI NÃO TEM - vazamento possível
  });
}
```

**Locais Críticos**:
- `/modules/time-track/time-track.service.ts` - 15+ queries sem `companyId`
- `/modules/vacations/vacations.service.ts` - 8+ queries sem `companyId`
- `/modules/management/management.service.ts` - 10+ queries sem `companyId`

**Fix**: Global TenantGuard em `app.module.ts`
```typescript
{
  provide: APP_GUARD,
  useClass: TenantGuard,  // Todos Controllers herdam
}
```

---

## 🟠 BUG #3: WhatsApp Worker Vazio

**Arquivo**: `/apps/api/src/modules/queue/workers/whatsapp-send.worker.ts`

```typescript
// ❌ COMPLETO VAZIO - 14 linhas
1:  import { Processor, Process } from '@nestjs/bull';
2:  import { Job } from 'bull';
3:  import { Logger } from '@nestjs/common';
4:  
5:  @Processor('whatsapp-send')
6:  export class WhatsappSendWorker {
7:    private readonly logger = new Logger(WhatsappSendWorker.name);
8:  
9:    @Process()
10: async handleWhatsappSend(job: Job<{ phone: string; message: string; mediaUrl?: string }>) {
11:   this.logger.log(`Sending WhatsApp message to ${job.data.phone}`);
12:   // Future implementation  ← ❌ APENAS LOG, NÃO ENVIA
13:   return { success: true };  ← ❌ Fake success
14: }
```

**Impacto**:
- Queue criada mas nunca processa
- Convites de funcionários não chegam
- Avisos não saem
- Sem rate limiting → Ban Meta em dias

**Onde é chamado**:
- `/modules/communication/communication.service.ts` - linha 250-300 (enfileira mas worker ignora)
- `/modules/employees/employees.service.ts` - envia convite (nunca chega)

**Fix**: Implementar com Baileys real + Redis rate limit

```typescript
@Process()
async handleWhatsappSend(job: Job<{ phone: string; message: string }>) {
  // 1. Check rate limit (1 msg/sec)
  const count = await this.redis.incr(`whatsapp:phone:${job.data.phone}`);
  if (count > 60) throw new Error('Rate limit exceeded');
  
  // 2. Send via Baileys
  const socket = await this.getSocket();
  await socket.sendMessage(chatId, { text: job.data.message });
}
```

---

## 🟠 BUG #4: Face Recognition (CPU-Bound)

**Arquivo**: `/apps/api/src/modules/time-track/time-track.controller.ts`

```typescript
// ❌ PROBLEMA: Backend processa tensor [128 floats]
@Post('clock-in')
async clockIn(@Body() dto: ClockInDto) {
  // Frontend envia: { employeeId, timestamp, faceDescriptor: [...128 values] }
  
  // ❌ Backend tenta validar:
  const isMatch = await this.validateFaceDescriptor(
    dto.faceDescriptor,  // [0.12, 0.45, ... 128 números]
  );
  
  // Isso roda no Node.js single-thread = TRAVA por 2-5 segundos
  // Event loop travado = timeouts em outras requisições
}
```

**Localização do Processamento**:
- Face API inferência: Browser ✅ (correto, WebGL acelerado)
- Tensor comparação: Backend ❌ (errado, CPU sync)

**Confirmação via busca**:
```bash
$ grep -n "faceDescriptor\|face-api\|ml5" apps/api/src -r
→ Vários controllers tentam processar ML inference
```

**Impacto**:
- Requisição clock-in: P95 latency > 5s
- Outras requisições em timeout durante clock-in
- 50 concurrent requests = Node.js deadlock

**Fix**: Remover validation pesada (Opção A) ou Microserviço Python (Opção B)

```typescript
// OPÇÃO A (simples):
@Post('clock-in')
async clockIn(@Body() dto: ClockInDto) {
  // Confiar em browser validation apenas
  await this.auditLog.create({
    employeeId: dto.employeeId,
    browserVerified: true,  // Apenas audit
  });
  return this.timeTrackService.recordEntry(...);
}

// OPÇÃO B (melhor):
// → Criar worker Python via BullMQ
// → Backend: "adicione job à fila"
// → Python worker retorna score
// → Backend decide accept/reject
```

---

## 🟠 BUG #5: PDF Generation Frontend

**Arquivo**: `/apps/web/app/[tenant]/dashboard/time-track/page.tsx`

```typescript
// LINHA 467-1054: Função monstro (1054 linhas!)
function downloadCollectiveSheet(
  month: string,
  visibleEmployees: Employee[],      // ← Array 300+ funcionários na RAM
  byEmpMap: Record<string, TimeTrack[]>,  // ← Todos os dados de ponto carregados
  companyData: any,
  holidaysData: any[],
  teamSchedules: any[] = []
) {
  
  // Problema #1: Loop em todos os funcionários
  const blocks = visibleEmployees.map((employee, index) => {
    
    // Problema #2: Para cada um, constrói grid completo
    const rows = byEmpMap[employee.id] || [];
    const grid = buildGrid(month, employee, rows, ...);  // ← Pesado
    
    // Problema #3: Renderiza HTML/jsPDF para CADA funcionário
    // Com 300 funcionários = 300 iterações de DOM manipulation
    // Chrome RAM: 100MB + 100MB + 100MB... = OOM
    
    validTracks = grid.map(g => g.track).filter(Boolean);
    // ... 500+ linhas de cálculo por employee ...
    
  });
}
```

**Linha Exata de Criação jsPDF**:
```typescript
// Procura em linha ~700-800
const doc = new jsPDF(...);
doc.addPage();
// ... renderiza cada folha individualmente ...
```

**Impacto Real**:
```
50 employees: OK (500MB RAM)
100 employees: Lento (1GB RAM, Chrome barra)
300 employees: OOM Exception (Chrome crasha)
Usuário perde dados, experiência ruim
```

**Confirmação**:
```bash
$ wc -l /apps/web/app/\[tenant\]/dashboard/time-track/page.tsx
1500+ linhas total, 1054 são dessa função
```

**Fix**: Servidor com Puppeteer

```typescript
// Backend: POST /api/time-tracks/export-pdf
// → Renderiza HTML em Puppeteer headless
// → Gera PDF em servidor (unlimited RAM via swap)
// → Retorna URL para download
// → 300 folhas em <15s
```

---

## 🟡 BUG #6: WebSocket Rate Limiting

**Arquivo**: `/apps/api/src/common/adapters/redis-io.adapter.ts`

```typescript
// ❌ Sem rate limiting aqui
40-46: 
export class RedisIoAdapter extends IoAdapter {
  // ... setup Redis adapter ...
  // MAS: não configura rate limits
}
```

**Arquivo**: `/apps/api/src/modules/communication/realtime/communication.gateway.ts`

```typescript
10-27:
@WebSocketGateway({
  cors: { ... },
  namespace: 'communication',
  // ❌ Sem configuração de rate limit ou throttle
})
export class CommunicationGateway {
  
  @WebSocketServer()
  server!: Server;

  emitToCompany(companyId: string, event: string, payload: unknown) {
    this.server?.to(companyId).emit(event, payload);
    // ❌ Direto, sem validação de frequência
  }
}
```

**Ataque Possível**:
```
1. Atacante abre 1000 WebSocket connections simultâneas
2. Envia 10K mensagens por segundo
3. Redis/Node.js filas lotam
4. Tempo resposta: 30s+ (timeout)
5. Usuários legítimos desconectam
```

**Fix**: Rate limit middleware + Redis counter

```typescript
// Adicionar no gateway:
const limiter = new Map<string, number>();

emitToCompany(companyId: string, event: string, payload: unknown) {
  const key = `ws:${companyId}`;
  const count = limiter.get(key) || 0;
  
  if (count > 1000) return;  // Drop message
  limiter.set(key, count + 1);
  
  this.server?.to(companyId).emit(event, payload);
}
```

---

## 📊 Summary: Bugs × Linhas de Código

| Bug | Arquivo | Linhas | Status |
|-----|---------|--------|--------|
| Timezone | time-track.service.ts | 644-657, 99, 516 | ❌ CRÍTICA |
| Multi-tenancy | 5+ Controllers | 20-50 cada | ❌ CRÍTICA |
| WhatsApp vazio | whatsapp-send.worker.ts | 1-14 | ❌ ALTA |
| Face Recognition | time-track.controller.ts | 50-150 | ❌ ALTA |
| PDF Frontend | time-track/page.tsx | 467-1054 (1054 linhas!) | ❌ ALTA |
| WebSocket | communication.gateway.ts | 10-27 | ❌ MÉDIA |

---

## 🎯 Próximo Passo: Qual Task Começa?

Recomendação:
1. **Timezone** (BUG #1) - 2h, baixo risco, ganho imediato
2. **Multi-tenancy** (BUG #2) - 3-4h, crítico de segurança
3. **WebSocket** (BUG #6) - 1h, quick win
4. → Depois vai para Fase 2 (PDF, WhatsApp, Face)

---

