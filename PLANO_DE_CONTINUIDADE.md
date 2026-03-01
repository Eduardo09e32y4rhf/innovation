# 🚀 Plano de Continuidade: Innovation.ia (Fase 2)

**Data de Início sugerida: Amanhã**

## 🎯 Objetivo da Fase 2
Transformar a Innovation.ia na fonte da verdade para o Departamento Pessoal e Tesouraria, criando dependência diária do cliente.

---

## 🟢 Task 1: Ponto Militar Biométrico (Anti-Fraude)
*O ponto deixa de ser um botão e vira uma auditoria.*

- [ ] **Frontend**: Criar componente `BiometricPunch.tsx` com:
    - Acesso à câmera para Face Match (usando face-api.js ou AWS Rekognition).
    - Captura de Coordenadas GPS.
    - Script de detecção de **Mock Location** (bloquear se o GPS for falso).
- [ ] **Backend**: Expandir modelo `Attendance` para salvar:
    - `photo_url` (prova de vida).
    - `latitude/longitude`.
    - `device_fingerprint`.
- [ ] **Integração**: Endpoint `/api/rh/v2/punch-biometric`.

---

## 🟢 Task 2: Hub Bancário (Open Finance)
*Visualização de todos os bancos em um só lugar.*

- [ ] **Integração Belvo/Pluggy**:
    - Configurar webhooks para receber transações em tempo real.
    - Criar service `BankHubService` para consolidar saldos de múltiplas contas.
- [ ] **Frontend**: Nova aba "Hub Bancário" em `finance/page.tsx`.
- [ ] **Insight de IA**: Categorização automática de gastos bancários cruzando com o OCR da Fase 1.

---

## 📝 Notas de Implementação
- **Segurança**: As fotos da biometria devem ser armazenadas em Bucket privado com expiração rápida.
- **Performance**: Usar Workers para processamento de concilição bancária pesada.

---
**Próximo Passo Amanhã:** Iniciar a criação do componente visual do Ponto Biométrico.
