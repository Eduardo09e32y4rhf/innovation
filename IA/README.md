# 🧠 MÓDULO 1: IA (GEMINI, NVIDIA, GPT)

**AI Engine para toda a plataforma - Python Workers**

## 📋 Objetivo

Centralizar todos os serviços de IA:
- Resume parsing (OCR com Gemini Vision)
- Copy generation (LinkedIn, emails, landing pages)
- Screening bot (WhatsApp + sentiment analysis)
- Model management e fallback chain

## 🏗️ Estrutura Atual

```
1-ia/
├── backend/              # Python workers (ai_engine movido)
│   ├── worker.py
│   ├── agents/
│   ├── prompts/
│   ├── vector_store/
│   ├── requirements.txt
│   └── Dockerfile
```

## 🚀 Features a Implementar

- [ ] Resume parser (Gemini Vision OCR)
- [ ] Copy generator (headlines, hashtags)
- [ ] Screening bot (WhatsApp + sentiment)
- [ ] Model manager (fallback chain)

## 📊 Status

**Priority:** 🔴 CRÍTICO  
**Timeline:** 2-3 semanas  
**Progress:** 10%

## 🎯 Próximos Passos

1. Setup Gemini API keys
2. Implement resume_parser.py
3. Create sentiment analysis
4. Deploy workers
