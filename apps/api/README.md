# Innovation IA API

Backend NestJS modular para RH, CRM WhatsApp, financeiro, dashboard e ponte com IA Python.

## Ambiente

Crie as variaveis:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/innovation"
JWT_SECRET="change-me"
JWT_EXPIRES_IN="1d"
API_PORT=3333
AI_SERVICE_URL="http://localhost:8001"
```

## Comandos

```bash
npm install
npm --prefix apps/api run prisma:generate
npm --prefix apps/api run prisma:migrate
npm --prefix apps/api run build
npm --prefix apps/api run dev
```

Swagger fica em `http://localhost:3333/docs`.

## WhatsApp

O CRM funcional de `innovation-v1` foi mapeado a partir de `WHATSAPP/services/omnius-core`, principalmente:

- conexao e QR Code: `whatsapp/connectWhatsApp.js`
- envio externo: `apiServer.js`
- recebimento: `whatsapp/handleMessagesUpsert.js`
- CRM/contatos: `crmDatabase.js`

No NestJS, a biblioteca real fica encapsulada em `modules/communication/whatsapp/whatsapp.provider.ts`. Controllers, Recruitment e demais modulos chamam apenas `CommunicationService`.
