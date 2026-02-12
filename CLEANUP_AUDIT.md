# 🧹 AUDITORIA E LIMPEZA DO PROJETO INNOVATION.IA

## ❌ ARQUIVOS/PASTAS PARA DELETAR (LIXO IDENTIFICADO)

### Na Raiz:
1. **innovation_app/** - Projeto Flutter duplicado (já existe versão dentro de /innovation)
2. **lib/** - Resquícios de ambiente virtual ou libs antigas
3. **plans/** - Roadmaps antigos (mover docs importantes para /innovation/docs)
4. **innovation.db** - Banco de dados na raiz (deve estar em /innovation)
5. **MELHORIAS_ESCALABILIDADE.md** - Mover para /innovation/docs
6. **DEPLOY_TO_RENDER.md** - Mover para /innovation/docs
7. **requirements.txt** - Duplicado (manter apenas o de /innovation)
8. **Dockerfile** - Duplicado (manter apenas o de /innovation)

### Dentro de /innovation:
1. **Lib/** - Pasta de ambiente virtual (não deveria estar no repo)
2. **scripts/** - Binários de pip (ambiente virtual)
3. **.git.bak/** - Backup desnecessário do git
4. **innovation_app/** - Projeto Flutter duplicado
5. **web/** - Templates Tabler pesados (quase 3000 arquivos)
6. **innovation.db** - Deve ser gitignored

## ✅ MANTER

### Backend (innovation/)
- app/ (código do FastAPI)
- alembic/ (migrações do banco)
- tests/ (testes automatizados)
- docs/ (documentação consolidada)
- .env.example
- requirements.txt
- Dockerfile
- alembic.ini

### Frontend (web-test/)
- index.html (landing page)
- company/ (portal da empresa)
- common/ (assets compartilhados)
- candidate/ (se existir)

### Raiz
- .git/, .github/ (controle de versão)
- .venv/ (ambiente virtual local)
- .gitignore, .dockerignore
- README.md (documentação principal)
- vercel.json (config de deploy)
- tools/ (scripts utilitários)

## 📋 ESTRUTURA FINAL ESPERADA

```
innovation.ia/
├── .git/
├── .github/
├── .venv/
├── .gitignore
├── .dockerignore
├── README.md
├── vercel.json
├── innovation/          # BACKEND
│   ├── .env
│   ├── .env.example
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   ├── alembic.ini
│   ├── app/
│   ├── docs/
│   └── tests/
├── web-test/            # FRONTEND
│   ├── index.html
│   ├── company/
│   └── common/
└── tools/               # UTILITÁRIOS
    ├── create_requested_admin.py
    ├── test_db.py
    └── ...
```

## 🚀 PRÓXIMOS PASSOS
1. Executar limpeza dos arquivos marcados
2. Consolidar documentação em /innovation/docs
3. Atualizar .gitignore
4. Testar backend e frontend
5. Preparar para deploy no Vercel
