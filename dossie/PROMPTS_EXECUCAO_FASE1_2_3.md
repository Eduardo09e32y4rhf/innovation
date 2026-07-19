# 🔧 PROMPTS EXECUTÁVEIS - FECHAR DOSSIÊ

Copie e cole cada prompt abaixo na conversa Claude para implementação direta.

---

## 🟢 FASE 1: SEMANA 1 (CRÍTICA)

### TASK 1.1 - TIMEZONE FIX

```
TAREFA: Implementar Timezone Service para Innovation RH

Contexto:
- App: Innovation RH Connect (monorepo)
- Problema: Date.UTC() hardcoded, sem conversão BRT/UTC
- Afeta: time-track reports (dados espelhados em viradas de mês)
- Stack: NestJS, TypeScript, date-fns

Passos:

1. Adicione ao package.json (/apps/api):
   "date-fns": "^3.0.0",
   "date-fns-tz": "^2.0.0"

2. Crie /apps/api/src/common/services/timezone.service.ts:
   
   Import:
   - startOfMonth, endOfMonth, startOfDay, format from 'date-fns'
   - fromZonedTime, toZonedTime from 'date-fns-tz'
   
   Exports:
   - parseFromBRT(dateString: string | Date): Date
     Input: "2024-02-15" ou Date object
     Output: Date em UTC (mas interpretado como BRT)
     
   - formatToBRT(date: Date, fmt: string = 'dd/MM/yyyy'): string
     Input: any Date (UTC or local)
     Output: string formatado em BRT (ex: "15/02/2024")
     
   - startOfMonthBRT(reference: Date | string): Date
     Input: "2024-02" ou Date
     Output: 1º do mês às 00:00 BRT em UTC
     
   - endOfMonthBRT(reference: Date | string): Date
     Output: Último dia do mês às 23:59:59 BRT em UTC
     
   - getTimezoneOffset(): number
     Return: sempre -3 (BRT, sem considerar daylight saving)

3. Refatore /apps/api/src/modules/time-track/time-track.service.ts:
   
   Linha 646-647 (atual):
   const start = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
   const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 1));
   
   Nova (use TimeZoneService):
   const start = this.tzService.startOfMonthBRT(month);
   const end = this.tzService.endOfMonthBRT(month);
   
   Linha 654 (atual):
   return new Date(`${val}T00:00:00.000Z`);
   
   Nova:
   return this.tzService.parseFromBRT(val);
   
   Linha 99 (atual):
   const entryTime = new Date(dto.entry);
   
   Nova:
   const entryTime = this.tzService.parseFromBRT(dto.entry);

4. Unit Tests (/apps/api/src/common/services/__tests__/timezone.service.spec.ts):
   
   Test 1: parseFromBRT("2024-02-15") retorna ISO string com Z
   Test 2: formatToBRT(date, "dd/MM/yyyy") retorna "15/02/2024"
   Test 3: startOfMonthBRT("2024-02") = 1º fevereiro 00:00 BRT (em UTC)
   Test 4: Virada de mês (28/02 + 1 dia = 29/02, sem pular pro dia 1º)

5. E2E Validation:
   - Crie time-track em 2024-02-29 via API
   - GET /time-tracks?month=2024-02
   - Verificar resposta mostra data 29/02, não 28 ou 01/03

Entrega: 
- Service criado + testes passando
- 3 Controllers refatorados (time-track.service linhas críticas)
- No regression em queries existentes (verify com SELECT COUNT)
```

---

### TASK 1.2 - MULTI-TENANCY ISOLATION

```
TAREFA: Implementar TenantGuard e auditar isolamento

Contexto:
- Risco: JWT válido de Company A pode acessar dados de Company B
- Solução: Global Guard que valida req.user.companyId em TODA request
- Stack: NestJS, TypeScript, Prisma

Passos:

1. Crie /apps/api/src/common/guards/tenant.guard.ts:

   @Injectable()
   export class TenantGuard implements CanActivate {
     canActivate(context: ExecutionContext): boolean {
       const request = context.switchToHttp().getRequest();
       const user = request.user;  // Vem do JwtAuthGuard
       
       if (!user?.companyId) {
         throw new UnauthorizedException('No company context');
       }
       
       // Store no request context
       request.companyId = user.companyId;
       return true;
     }
   }

2. Registre no app.module.ts (APP_GUARD provider):
   
   {
     provide: APP_GUARD,
     useClass: TenantGuard,
   }

3. Audit todos os Services (grep todas as queries):
   
   grep -rn "findMany\|findUnique\|findFirst" apps/api/src/modules \
     | grep -v "companyId" | head -50
   
   Para cada resultado, adicione:
   where: { companyId: request.companyId }
   
   Exemplo refator:
   
   OLD:
   const tracks = await this.prisma.timeTrack.findMany({
     where: { employeeId: empId }
   });
   
   NEW:
   const tracks = await this.prisma.timeTrack.findMany({
     where: { 
       employeeId: empId,
       employee: { company: { id: req.user.companyId } }  // nested where
     }
   });

4. Services afetados (mínimo):
   - TimeTrackService
   - EmployeeService
   - VacationService
   - ManagementService
   - CommunicationService

5. Unit Test:
   
   describe('TenantGuard', () => {
     it('should reject request without companyId', () => {
       const mockContext = { switchToHttp: () => ({ getRequest: () => ({ user: { userId: 'x' } }) }) };
       expect(() => guard.canActivate(mockContext)).toThrow('No company context');
     });
     
     it('should allow request with valid companyId', () => {
       const mockContext = { switchToHttp: () => ({ getRequest: () => ({ user: { userId: 'x', companyId: 'c1' } }) }) };
       expect(guard.canActivate(mockContext)).toBe(true);
     });
   });

6. E2E Test (isolamento):
   
   Test Scenario:
   - User A (Company 1) obtém JWT token
   - Tries: GET /api/employees (deve retornar apenas Company 1)
   - Tries: GET /api/employees?companyId=Company2 (deve retornar 400 ou ignore param)
   - Expect: Apenas dados de Company 1
   
   Test SQL injection attempt:
   - Tries: GET /api/employees?companyId=' OR 1=1--
   - Expect: 400 Bad Request, sem vazamento

Entrega:
- TenantGuard criado e ativo globalmente
- 5+ Services refatorados com where: { companyId: req.user.companyId }
- Testes de isolamento passando
- Relatório de audit: "20 Prisma queries verificadas, 18 já safe, 2 refatoradas"
```

---

### TASK 1.3 - WEBSOCKET RATE LIMITING

```
TAREFA: Implementar rate limiting no WebSocket

Contexto:
- Risco: Atacante pode enviar 10K msgs/seg, trava Node.js
- Solução: Implementar throttle em Redis (global, por socket, por company)
- Stack: Socket.io, Redis, NestJS

Passos:

1. Crie /apps/api/src/common/middleware/websocket-rate-limit.middleware.ts:

   @Injectable()
   export class WebSocketRateLimitMiddleware {
     constructor(private readonly redis: RedisService) {}
     
     async checkLimit(socketId: string, companyId: string): Promise<boolean> {
       const key = `ws:ratelimit:${companyId}:${socketId}`;
       const count = await this.redis.get(key);
       
       if (!count) {
         await this.redis.set(key, '1', 'EX', 60);  // TTL 60s
         return true;
       }
       
       const numCount = parseInt(count, 10);
       if (numCount > 100) {  // Max 100 msgs/min per socket
         return false;
       }
       
       await this.redis.incr(key);
       return true;
     }
   }

2. Integre no CommunicationGateway:
   
   @WebSocketGateway({ namespace: 'communication' })
   export class CommunicationGateway {
     constructor(
       private readonly limiter: WebSocketRateLimitMiddleware,
       private readonly logger: Logger,
     ) {}
     
     async handleConnection(socket: Socket, next: (err?: Error) => void) {
       socket.on('message', async (data) => {
         const allowed = await this.limiter.checkLimit(socket.id, data.companyId);
         
         if (!allowed) {
           this.logger.warn(`Rate limit exceeded: socket=${socket.id}`);
           socket.emit('error', 'Too many messages');
           return;
         }
         
         // Process message normally
       });
       
       next();
     }
   }

3. Test com Artillery (carga):
   
   npm install --save-dev artillery
   
   Criar /tests/websocket-load.yml:
   config:
     target: http://localhost:3001
     phases:
       - duration: 30
         arrivalRate: 100  # 100 connections/sec
   
   scenarios:
     - name: WebSocket flood
       flow:
         - ws.connect
         - ws.send:
             payload: '{"type": "message", "data": "test"}'
         - think: 100
         - ws.send
   
   Rodar: artillery run tests/websocket-load.yml

4. Validação de sucesso:
   - Node.js memory stays < 500MB durante teste
   - P95 latency < 100ms
   - Conexões legítimas continuam funcionando

Entrega:
- Rate limit middleware criado
- Socket.io integrado com throttle
- Artillery test passando (flood resistance)
- Logs mostrando "Rate limit exceeded" em violações
```

---

## 🟡 FASE 2: SEMANA 2-3 (ALTA PRIORIDADE)

### TASK 2.1 - PDF GERAÇÃO BACKEND

```
TAREFA: Mover PDF generation para servidor (Puppeteer)

Contexto:
- Problema: Frontend gera 300 PDFs em memória → OOM no Chrome
- Solução: Servidor usa Puppeteer headless + BullMQ worker
- Stack: Puppeteer, NestJS, BullMQ, Express

Passos:

1. npm install puppeteer nodemailer (apps/api)

2. Crie /apps/api/src/modules/queue/workers/pdf-export.worker.ts:

   @Processor('pdf-export')
   export class PdfExportWorker {
     constructor(
       private readonly timeTrackService: TimeTrackService,
       private readonly employeeService: EmployeeService,
     ) {}
     
     @Process()
     async handlePdfExport(job: Job<{
       companyId: string;
       month: string;
       employeeIds?: string[];
       format: 'individual' | 'consolidated';
     }>) {
       const { companyId, month, employeeIds, format } = job.data;
       
       // 1. Fetch data
       const tracks = await this.timeTrackService.getMonthlyTracks(companyId, month);
       const employees = await this.employeeService.findByCompany(companyId);
       
       // 2. Generate HTML
       const html = this.generateTemplate({ tracks, employees, month, format });
       
       // 3. Use Puppeteer
       const browser = await puppeteer.launch();
       const page = await browser.newPage();
       await page.setContent(html, { waitUntil: 'networkidle0' });
       
       const pdf = await page.pdf({ format: 'A4', printBackground: true });
       await browser.close();
       
       // 4. Save
       const filename = `folha-ponto-${companyId}-${month}-${Date.now()}.pdf`;
       const filepath = `/tmp/exports/${filename}`;
       fs.writeFileSync(filepath, pdf);
       
       // 5. Cleanup (24h TTL)
       setTimeout(() => fs.unlinkSync(filepath), 24 * 60 * 60 * 1000);
       
       return { filename, downloadUrl: `/api/exports/download/${filename}` };
     }
   }

3. Crie template HTML: /apps/api/resources/time-track-sheet.html:
   
   <!DOCTYPE html>
   <html>
   <head>
     <style>
       body { font-family: Arial, sans-serif; margin: 20px; }
       table { width: 100%; border-collapse: collapse; }
       th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
       .header { text-align: center; margin-bottom: 20px; font-size: 18px; font-weight: bold; }
       .page-break { page-break-after: always; }
     </style>
   </head>
   <body>
     {{ blocks }}  <!-- Rendered per employee -->
   </body>
   </html>

4. Crie controller: POST /api/time-tracks/export-pdf:
   
   @Post('export-pdf')
   async exportPdf(
     @Body() dto: ExportPdfDto,
     @Request() req,
   ) {
     const job = await this.pdfQueue.add({
       companyId: req.user.companyId,
       month: dto.month,
       employeeIds: dto.employeeIds,
       format: dto.format || 'individual',
     });
     
     return { jobId: job.id };
   }

5. Crie polling endpoint: GET /api/jobs/:jobId:
   
   @Get('jobs/:jobId')
   async getJobStatus(@Param('jobId') jobId: string) {
     const job = await this.pdfQueue.getJob(jobId);
     
     if (!job) return { status: 'not_found' };
     if (job.progress()) return { status: 'processing', progress: job.progress() };
     
     const result = job.returnvalue;
     return { status: 'completed', downloadUrl: result.downloadUrl };
   }

6. Refatore /apps/web/time-track/page.tsx:
   
   OLD (1054 linhas):
   <button onClick={() => downloadCollectiveSheet(...)} />
   
   NEW (50 linhas):
   const [exportJobId, setExportJobId] = useState<string | null>(null);
   
   const handleExportPdf = async () => {
     const res = await fetch(`/api/time-tracks/export-pdf`, {
       method: 'POST',
       body: JSON.stringify({ month, format: 'individual' }),
     });
     const { jobId } = await res.json();
     setExportJobId(jobId);
   };
   
   // Poll job status
   useEffect(() => {
     if (!exportJobId) return;
     const interval = setInterval(async () => {
       const res = await fetch(`/api/jobs/${exportJobId}`);
       const job = await res.json();
       if (job.status === 'completed') {
         window.location.href = job.downloadUrl;
         clearInterval(interval);
       }
     }, 500);
   }, [exportJobId]);

7. Test:
   - 50 employees, 30 dias
   - POST /export-pdf
   - Poll até concluir
   - Expect: <15s, PDF valid

Entrega:
- pdf-export.worker.ts implementado
- POST /api/time-tracks/export-pdf funcional
- Frontend refatorado (remover 1000 linhas)
- Teste de carga: 300 funcionários em <15s
```

---

### TASK 2.2 - WHATSAPP RATE LIMITING + SENDER

```
TAREFA: Implementar WhatsApp sender com rate limiting

Contexto:
- Problema: Worker vazio, sem rate limiting, sem spam detection
- Solução: Implementar Baileys, throttle 1 msg/seg, detect ban patterns
- Stack: BullMQ, Baileys, Redis

Passos:

1. Crie /apps/api/src/modules/communication/whatsapp/whatsapp-sender.service.ts:

   @Injectable()
   export class WhatsappSenderService {
     private sockets: Map<string, any> = new Map();  // company -> socket
     
     constructor(
       private readonly logger: Logger,
       private readonly redis: RedisService,
     ) {}
     
     async sendMessage(
       companyId: string,
       phoneNumber: string,
       message: string,
     ): Promise<{ success: boolean; error?: string }> {
       try {
         // 1. Check rate limit
         const rateLimitKey = `whatsapp:phone:${phoneNumber}`;
         const count = await this.redis.incr(rateLimitKey);
         if (count === 1) {
           await this.redis.expire(rateLimitKey, 60);  // TTL 60s
         }
         
         if (count > 60) {  // Max 1 msg/sec
           return { success: false, error: 'Rate limit exceeded' };
         }
         
         // 2. Get or create Baileys socket
         const socket = await this.getSocket(companyId);
         
         // 3. Send via Baileys
         const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
         await socket.sendMessage(chatId, { text: message });
         
         // 4. Log sucesso
         this.logger.log(`Message sent to ${phoneNumber}`);
         
         return { success: true };
       } catch (error) {
         this.logger.error(`Failed to send: ${error.message}`);
         
         // 5. Detect ban patterns
         const banKey = `whatsapp:ban:${companyId}`;
         if (error.message.includes('banned') || error.message.includes('temporarily')) {
           await this.redis.incr(banKey);
           const banCount = await this.redis.get(banKey);
           if (parseInt(banCount) > 3) {
             this.logger.error(`⚠️ PROBABLE BAN: Company ${companyId}`);
             // Send alert (webhook, email, etc)
           }
         }
         
         return { success: false, error: error.message };
       }
     }
     
     private async getSocket(companyId: string) {
       if (this.sockets.has(companyId)) {
         return this.sockets.get(companyId);
       }
       
       // Load Baileys session from Redis (persistent across rebuilds)
       const sessionKey = `whatsapp:session:${companyId}`;
       const sessionData = await this.redis.get(sessionKey);
       
       // Initialize Baileys socket...
       // [Baileys initialization code here]
       
       this.sockets.set(companyId, socket);
       return socket;
     }
   }

2. Implemente o worker: /apps/api/src/modules/queue/workers/whatsapp-send.worker.ts:

   @Processor('whatsapp-send')
   export class WhatsappSendWorker {
     constructor(private readonly sender: WhatsappSenderService) {}
     
     @Process()
     async handleWhatsappSend(job: Job<{
       companyId: string;
       phone: string;
       message: string;
     }>) {
       const result = await this.sender.sendMessage(
         job.data.companyId,
         job.data.phone,
         job.data.message,
       );
       
       if (!result.success) {
         throw new Error(result.error);
       }
       
       return result;
     }
   }

3. Refatore CommunicationService para usar worker:
   
   OLD (direto):
   await baileysSendMessage(phone, text);
   
   NEW (via queue):
   await this.whatsappQueue.add({
     companyId,
     phone,
     message: text,
   });

4. Adicione monitoring:
   
   GET /api/communication/whatsapp/status/:companyId
   
   Return:
   {
     connected: boolean,
     phone: string,
     messagesSent24h: number,
     lastError: string,
     banRisk: 'low' | 'medium' | 'high'
   }

5. Test:
   - Queue 100 mensagens
   - Verificar 1 msg/seg rate
   - Verificar nenhum ban detectado

Entrega:
- whatsapp-send.worker.ts implementado (não vazio!)
- Rate limiting em Redis (1 msg/sec)
- Ban detection + alerting
- GET status endpoint
```

---

### TASK 2.3 - FACE RECOGNITION (OPÇÃO A SIMPLIFICADA)

```
TAREFA: Simplificar Face Recognition (remover CPU-heavy validation)

Contexto:
- Problema: Backend valida tensores [128 floats], trava Node.js
- Solução: Confiar em browser validation, apenas auditar no backend
- Stack: Frontend, Backend logging

Passos:

1. Frontend (/apps/web): Manter @vladmandic/face-api como está
   - Browser faz inferência local
   - Valida rosto visível
   - Envia apenas: { employeeId, timestamp, similarity: 0.92 }

2. Backend refatore: /apps/api/src/modules/time-track/time-track.controller.ts

   OLD:
   @Post('clock-in')
   async clockIn(@Body() dto: ClockInDto) {
     // Validate tensor [128 floats] - TRAVA AQUI
     const isMatch = await this.validateFaceDescriptor(dto.faceDescriptor);
   }
   
   NEW:
   @Post('clock-in')
   async clockIn(@Body() dto: ClockInDto) {
     // Just audit, don't validate
     await this.auditLog.create({
       employeeId: dto.employeeId,
       type: 'FACE_VERIFIED',
       metadata: {
         similarity: dto.similarity,  // Frontend value only
         browserVerified: true,
         timestamp: new Date(),
       }
     });
     
     // Process clock-in normally
     return this.timeTrackService.recordEntry(dto.employeeId, new Date());
   }

3. Crie audit table:
   
   CREATE TABLE face_auth_audit (
     id UUID PRIMARY KEY,
     employeeId UUID,
     timestamp TIMESTAMP,
     similarity FLOAT,
     browserVerified BOOLEAN,
     adminReviewedAt TIMESTAMP,
     adminDecision ENUM('ACCEPTED', 'FLAGGED')
   );

4. Crie admin page: /dashboard/management/face-audit
   - List recent face logins
   - Similarity < 0.8 = flagged
   - Admin pode reject retroativo

5. Test:
   - Clock-in com face (browser)
   - Latency <1s (sem backend ML)
   - Audit log created

Entrega:
- Face validation removido do backend
- Audit table criada
- Admin review page funcional
- P95 clock-in latency <1s
```

---

## 📊 CHECKLIST DE VALIDAÇÃO

Rodar após implementar cada task:

```
TIMEZONE FIX (#1.1):
☐ npm install date-fns date-fns-tz (verify package.json)
☐ TimeZoneService criado com 4 métodos
☐ time-track.service.ts refatorado (3 linhas críticas)
☐ Unit test passando
☐ E2E test: relatório de ponto em 28-31 correto

MULTI-TENANCY (#1.2):
☐ TenantGuard criado e APP_GUARD registrado
☐ 5+ Services refatorados (grep findMany shows companyId in all)
☐ Unit test: TenantGuard rejeita sem companyId
☐ E2E test: Company A não vê dados de Company B
☐ No regression: SELECT COUNT(*) queries não mudam

WEBSOCKET RATE LIMIT (#1.3):
☐ Rate limit middleware criado
☐ Artillery load test passando (<100ms P95)
☐ Logs mostram "Rate limit exceeded" em violações
☐ Node.js memory < 500MB durante teste

PDF BACKEND (#2.1):
☐ Puppeteer instalado
☐ pdf-export.worker.ts implementado (não vazio)
☐ HTML template criado e renderiza corretamente
☐ POST /api/time-tracks/export-pdf funciona
☐ GET /api/jobs/:jobId polling funciona
☐ Frontend refatorado (downloadCollectiveSheet removido)
☐ Teste: 300 employees, 30 dias → PDF <15s

WHATSAPP SENDER (#2.2):
☐ whatsapp-send.worker.ts implementado
☐ WhatsappSenderService criado com Baileys
☐ Rate limiting: 1 msg/sec verificado em Redis
☐ Ban detection + alerting funcional
☐ GET /api/communication/whatsapp/status retorna info
☐ Teste: queue 100 msgs, nenhuma trava

FACE RECOGNITION (#2.3):
☐ Tensor validation removido do backend
☐ Audit table criada
☐ Admin page /dashboard/management/face-audit funciona
☐ P95 clock-in latency <1s
☐ Audit log criado para cada login
```

---

## 🚀 PRÓXIMOS PASSOS

1. Escolha **qual task começa** (recomendo 1.1 Timezone = quickest win)
2. Copy prompt acima, paste em conversa Claude nova
3. Claude vai entregar código pronto para copiar
4. Você roda checklist antes de fazer PR

**Tempo estimado por task**:
- 1.1 Timezone: 2h
- 1.2 Multi-tenancy: 3-4h
- 1.3 WebSocket: 1h
- 2.1 PDF: 5-6h
- 2.2 WhatsApp: 6-8h
- 2.3 Face: 2-3h

**Total Fase 1+2**: ~3-4 semanas dev

---

**Status**: ✅ Pronto para execução

```
