"use client";

import { useState } from "react";

const phases = [
  {
    id: 1,
    label: "FASE 1",
    title: "Fundação & Contas",
    duration: "1–2 semanas",
    color: "#00C896",
    icon: "⚙️",
    description: "Configurar contas nas plataformas e estrutura base do projeto.",
    backend: [
      {
        step: "Criar conta na Pluggy (pluggy.ai) — plano sandbox gratuito",
        detail: "Obtenha CLIENT_ID e CLIENT_SECRET para autenticar nas APIs.",
        code: `# .env\nPLUGGY_CLIENT_ID=seu_client_id\nPLUGGY_CLIENT_SECRET=seu_client_secret\nCELCOIN_CLIENT_ID=seu_client_id\nCELCOIN_CLIENT_SECRET=seu_client_secret`,
      },
      {
        step: "Criar conta na Celcoin (celcoin.com.br) — sandbox",
        detail: "Para pagamento de DAS e boletos. Solicite acesso à API de tributos.",
        code: null,
      },
      {
        step: "Instalar dependências Python",
        detail: "FastAPI, httpx para chamadas HTTP assíncronas, python-dotenv.",
        code: `pip install fastapi uvicorn httpx python-dotenv\npip install python-jose[cryptography] passlib`,
      },
      {
        step: "Estrutura de pastas do projeto",
        detail: "Organizar módulos por domínio (auth, pluggy, celcoin).",
        code: `backend/\n├── main.py\n├── .env\n├── routers/\n│   ├── auth.py\n│   ├── pluggy.py\n│   └── celcoin.py\n└── services/\n    ├── pluggy_service.py\n    └── celcoin_service.py`,
      },
    ],
    frontend: [
      {
        step: "Criar projeto React com Vite",
        detail: "Configuração moderna e rápida.",
        code: `npm create vite@latest meu-app -- --template react\ncd meu-app\nnpm install axios react-router-dom`,
      },
      {
        step: "Estrutura de pastas React",
        detail: "Separar páginas, componentes e serviços de API.",
        code: `src/\n├── pages/\n│   ├── Dashboard.jsx\n│   ├── ConectarBanco.jsx\n│   └── PagarDAS.jsx\n├── services/\n│   └── api.js\n└── components/`,
      },
    ],
  },
  {
    id: 2,
    label: "FASE 2",
    title: "Conectar Banco via Pluggy",
    duration: "1–2 semanas",
    color: "#3B82F6",
    icon: "🏦",
    description: "Integrar o Pluggy Widget para o cliente autorizar acesso à conta bancária.",
    backend: [
      {
        step: "Gerar API Key da Pluggy (access_token)",
        detail: "O access_token é de curta duração (2h). Gere um endpoint no FastAPI para isso.",
        code: `# services/pluggy_service.py\nimport httpx, os\n\nasync def get_access_token():\n    async with httpx.AsyncClient() as client:\n        r = await client.post(\n            "https://api.pluggy.ai/auth",\n            json={\n                "clientId": os.getenv("PLUGGY_CLIENT_ID"),\n                "clientSecret": os.getenv("PLUGGY_CLIENT_SECRET"),\n            }\n        )\n        return r.json()["apiKey"]`,
      },
      {
        step: "Endpoint: criar Connect Token para o widget",
        detail: "O React usa esse token para abrir o Pluggy Widget de forma segura.",
        code: `# routers/pluggy.py\nfrom fastapi import APIRouter\nfrom services.pluggy_service import get_access_token\nimport httpx\n\nrouter = APIRouter(prefix="/pluggy")\n\n@router.post("/connect-token")\nasync def create_connect_token():\n    api_key = await get_access_token()\n    async with httpx.AsyncClient() as client:\n        r = await client.post(\n            "https://api.pluggy.ai/connect_token",\n            headers={"X-API-KEY": api_key},\n            json={}\n        )\n        return r.json()  # { "accessToken": "..." }`,
      },
      {
        step: "Endpoint: buscar contas e saldo do item conectado",
        detail: "Após o usuário conectar o banco, salve o item_id e consulte saldo/DDA.",
        code: `@router.get("/accounts/{item_id}")\nasync def get_accounts(item_id: str):\n    api_key = await get_access_token()\n    async with httpx.AsyncClient() as client:\n        r = await client.get(\n            f"https://api.pluggy.ai/accounts?itemId={item_id}",\n            headers={"X-API-KEY": api_key}\n        )\n        return r.json()`,
      },
    ],
    frontend: [
      {
        step: "Instalar Pluggy Connect Widget",
        detail: "SDK oficial da Pluggy para React.",
        code: `npm install @pluggy/react`,
      },
      {
        step: "Página de Conectar Banco",
        detail: "Chame o backend para pegar o connectToken e abra o widget.",
        code: `// pages/ConectarBanco.jsx\nimport { useState } from "react";\nimport { PluggyConnect } from "@pluggy/react";\nimport api from "../services/api";\n\nexport default function ConectarBanco() {\n  const [connectToken, setConnectToken] = useState(null);\n\n  const abrirWidget = async () => {\n    const { data } = await api.post("/pluggy/connect-token");\n    setConnectToken(data.accessToken);\n  };\n\n  return (\n    <div>\n      <button onClick={abrirWidget}>Conectar meu banco</button>\n      {connectToken && (\n        <PluggyConnect\n          connectToken={connectToken}\n          onSuccess={({ item }) => console.log("Item ID:", item.id)}\n          onClose={() => setConnectToken(null)}\n        />\n      )}\n    </div>\n  );\n}`,
      },
    ],
  },
  {
    id: 3,
    label: "FASE 3",
    title: "Acesso ao DDA",
    duration: "3–5 dias",
    color: "#8B5CF6",
    icon: "📄",
    description: "Listar boletos DDA do cliente via Pluggy após conectar o banco.",
    backend: [
      {
        step: "Endpoint: listar boletos DDA",
        detail: "A Pluggy retorna boletos/cobranças registradas no CPF via Open Finance.",
        code: `@router.get("/dda/{item_id}")\nasync def get_dda(item_id: str):\n    api_key = await get_access_token()\n    async with httpx.AsyncClient() as client:\n        # Buscar contas do item\n        accounts = await client.get(\n            f"https://api.pluggy.ai/accounts?itemId={item_id}",\n            headers={"X-API-KEY": api_key}\n        )\n        account_id = accounts.json()["results"][0]["id"]\n\n        # Buscar transações/cobranças\n        boletos = await client.get(\n            f"https://api.pluggy.ai/transactions?accountId={account_id}",\n            headers={"X-API-KEY": api_key}\n        )\n        return boletos.json()`,
      },
    ],
    frontend: [
      {
        step: "Tela de DDA — listar boletos",
        detail: "Exibir tabela com vencimento, valor e botão pagar.",
        code: `// pages/Dashboard.jsx (trecho DDA)\nconst [boletos, setBoletos] = useState([]);\n\nuseEffect(() => {\n  api.get(\`/pluggy/dda/\${itemId}\`)\n     .then(r => setBoletos(r.data.results));\n}, []);\n\nreturn (\n  <table>\n    <thead><tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Ação</th></tr></thead>\n    <tbody>\n      {boletos.map(b => (\n        <tr key={b.id}>\n          <td>{b.description}</td>\n          <td>{b.date}</td>\n          <td>R$ {b.amount}</td>\n          <td><button onClick={() => pagar(b)}>Pagar</button></td>\n        </tr>\n      ))}\n    </tbody>\n  </table>\n);`,
      },
    ],
  },
  {
    id: 4,
    label: "FASE 4",
    title: "Pagamento do DAS",
    duration: "1–2 semanas",
    color: "#F59E0B",
    icon: "💳",
    description: "Integrar Celcoin para geração e pagamento de guias DAS do Simples Nacional.",
    backend: [
      {
        step: "Autenticar na Celcoin",
        detail: "OAuth2 client_credentials para obter o bearer token.",
        code: `# services/celcoin_service.py\nimport httpx, os\n\nasync def get_celcoin_token():\n    async with httpx.AsyncClient() as client:\n        r = await client.post(\n            "https://sandbox.openfinance.celcoin.dev/v5/token",\n            data={\n                "grant_type": "client_credentials",\n                "client_id": os.getenv("CELCOIN_CLIENT_ID"),\n                "client_secret": os.getenv("CELCOIN_CLIENT_SECRET"),\n            }\n        )\n        return r.json()["access_token"]`,
      },
      {
        step: "Endpoint: consultar DAS pelo CNPJ",
        detail: "A Celcoin consulta a guia DAS na Receita via CNPJ + período.",
        code: `# routers/celcoin.py\n@router.get("/das/{cnpj}")\nasync def consultar_das(cnpj: str, periodo: str):\n    # periodo: "2024-01" (ano-mês)\n    token = await get_celcoin_token()\n    async with httpx.AsyncClient() as client:\n        r = await client.get(\n            f"https://sandbox.openfinance.celcoin.dev/das/v1/consulta",\n            headers={"Authorization": f"Bearer {token}"},\n            params={"cnpj": cnpj, "periodo": periodo}\n        )\n        return r.json()`,
      },
      {
        step: "Endpoint: pagar DAS",
        detail: "Envia o pagamento da guia DAS via Celcoin.",
        code: `@router.post("/das/pagar")\nasync def pagar_das(body: dict):\n    token = await get_celcoin_token()\n    async with httpx.AsyncClient() as client:\n        r = await client.post(\n            "https://sandbox.openfinance.celcoin.dev/das/v1/pagamento",\n            headers={"Authorization": f"Bearer {token}"},\n            json={\n                "cnpj": body["cnpj"],\n                "periodo": body["periodo"],\n                "valor": body["valor"],\n                "conta": body["conta"],  # dados bancários do cliente\n            }\n        )\n        return r.json()`,
      },
    ],
    frontend: [
      {
        step: "Página Pagar DAS",
        detail: "Formulário com CNPJ, período e confirmação de pagamento.",
        code: `// pages/PagarDAS.jsx\nconst [das, setDas] = useState(null);\n\nconst consultar = async () => {\n  const { data } = await api.get(\`/celcoin/das/\${cnpj}?periodo=\${periodo}\`);\n  setDas(data);\n};\n\nconst pagar = async () => {\n  await api.post("/celcoin/das/pagar", {\n    cnpj, periodo, valor: das.valor, conta: contaConectada\n  });\n  alert("DAS pago com sucesso!");\n};\n\nreturn (\n  <div>\n    <input placeholder="CNPJ" onChange={e => setCnpj(e.target.value)} />\n    <input placeholder="Período (ex: 2024-01)" onChange={e => setPeriodo(e.target.value)} />\n    <button onClick={consultar}>Consultar DAS</button>\n    {das && (\n      <div>\n        <p>Valor: R$ {das.valor} | Vencimento: {das.vencimento}</p>\n        <button onClick={pagar}>Confirmar Pagamento</button>\n      </div>\n    )}\n  </div>\n);`,
      },
    ],
  },
  {
    id: 5,
    label: "FASE 5",
    title: "Segurança & Produção",
    duration: "1 semana",
    color: "#EF4444",
    icon: "🔒",
    description: "Adicionar autenticação, proteção de dados e subir para produção.",
    backend: [
      {
        step: "Autenticação JWT no FastAPI",
        detail: "Proteger todos os endpoints com token JWT do usuário logado.",
        code: `from fastapi import Depends, HTTPException\nfrom fastapi.security import OAuth2PasswordBearer\nfrom jose import jwt\n\noauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")\n\ndef get_current_user(token: str = Depends(oauth2_scheme)):\n    try:\n        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])\n        return payload\n    except:\n        raise HTTPException(status_code=401)`,
      },
      {
        step: "Salvar item_id e dados no banco",
        detail: "Use PostgreSQL (SQLAlchemy) para persistir item_id por usuário.",
        code: `# Instalar\npip install sqlalchemy asyncpg databases`,
      },
      {
        step: "Subir com Docker + Nginx",
        detail: "Containerizar FastAPI e servir React via Nginx.",
        code: `# docker-compose.yml\nservices:\n  backend:\n    build: ./backend\n    ports: ["8000:8000"]\n    env_file: .env\n  frontend:\n    build: ./frontend\n    ports: ["80:80"]`,
      },
    ],
    frontend: [
      {
        step: "Interceptor Axios com JWT",
        detail: "Adicionar token automaticamente em todas as requisições.",
        code: `// services/api.js\nimport axios from "axios";\n\nconst api = axios.create({ baseURL: "http://localhost:8000" });\n\napi.interceptors.request.use(config => {\n  const token = localStorage.getItem("token");\n  if (token) config.headers.Authorization = \`Bearer \${token}\`;\n  return config;\n});\n\nexport default api;`,
      },
    ],
  },
];

export default function PlanoAcao() {
  const [activePhase, setActivePhase] = useState(1);
  const [activeTab, setActiveTab] = useState("backend");

  const phase = phases.find((p) => p.id === activePhase);

  // Added null check for safety
  if (!phase) return null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0B0F1A",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      color: "#E2E8F0",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0F172A 0%, #1E293B 100%)",
        borderBottom: "1px solid #1E293B",
        padding: "32px 40px 24px",
      }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 28 }}>🚀</span>
            <span style={{ fontSize: 11, letterSpacing: 4, color: "#64748B", textTransform: "uppercase" }}>
              Plano de Ação
            </span>
          </div>
          <h1 style={{
            fontSize: 28,
            fontWeight: 700,
            margin: 0,
            background: "linear-gradient(90deg, #00C896, #3B82F6, #8B5CF6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: -1,
          }}>
            Open Finance + DDA + Pagamento DAS
          </h1>
          <p style={{ color: "#64748B", margin: "8px 0 0", fontSize: 13 }}>
            Stack: Python FastAPI + React · Pluggy (Open Finance) · Celcoin (Pagamentos)
          </p>

          {/* Timeline pills */}
          <div style={{ display: "flex", gap: 8, marginTop: 24, flexWrap: "wrap" }}>
            {phases.map((p) => (
              <button
                key={p.id}
                onClick={() => setActivePhase(p.id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 6,
                  border: `1px solid ${activePhase === p.id ? p.color : "#1E293B"}`,
                  background: activePhase === p.id ? `${p.color}18` : "transparent",
                  color: activePhase === p.id ? p.color : "#64748B",
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: "inherit",
                  fontWeight: activePhase === p.id ? 700 : 400,
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
                <span style={{
                  background: activePhase === p.id ? p.color : "#1E293B",
                  color: activePhase === p.id ? "#000" : "#64748B",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 10,
                }}>
                  {p.duration}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "32px 40px" }}>
        {/* Phase Header */}
        <div style={{
          background: "#0F172A",
          border: `1px solid ${phase.color}30`,
          borderLeft: `3px solid ${phase.color}`,
          borderRadius: 8,
          padding: "20px 24px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>{phase.icon}</span>
              <div>
                <span style={{ fontSize: 11, color: phase.color, letterSpacing: 2, textTransform: "uppercase" }}>
                  {phase.label}
                </span>
                <h2 style={{ margin: "2px 0 0", fontSize: 20, color: "#F1F5F9", fontWeight: 700 }}>
                  {phase.title}
                </h2>
              </div>
            </div>
            <p style={{ margin: "8px 0 0", color: "#94A3B8", fontSize: 13, maxWidth: 600 }}>
              {phase.description}
            </p>
          </div>
          <div style={{
            background: `${phase.color}18`,
            border: `1px solid ${phase.color}40`,
            padding: "8px 16px",
            borderRadius: 6,
            textAlign: "center",
          }}>
            <div style={{ fontSize: 11, color: "#64748B" }}>Estimativa</div>
            <div style={{ fontSize: 14, color: phase.color, fontWeight: 700 }}>{phase.duration}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #1E293B", paddingBottom: 0 }}>
          {["backend", "frontend"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "none",
                borderBottom: `2px solid ${activeTab === tab ? phase.color : "transparent"}`,
                color: activeTab === tab ? phase.color : "#64748B",
                cursor: "pointer",
                fontSize: 13,
                fontFamily: "inherit",
                fontWeight: activeTab === tab ? 700 : 400,
                marginBottom: -1,
                transition: "all 0.15s",
              }}
            >
              {tab === "backend" ? "🐍 Backend (FastAPI)" : "⚛️ Frontend (React)"}
            </button>
          ))}
        </div>

        {/* Steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {((phase as any)[activeTab] || []).map((item: any, i: number) => (
            <div key={i} style={{
              background: "#0F172A",
              border: "1px solid #1E293B",
              borderRadius: 8,
              overflow: "hidden",
            }}>
              <div style={{
                padding: "16px 20px",
                borderBottom: item.code ? "1px solid #1E293B" : "none",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}>
                <div style={{
                  minWidth: 26,
                  height: 26,
                  background: `${phase.color}18`,
                  border: `1px solid ${phase.color}40`,
                  borderRadius: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: phase.color,
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 1,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 14, color: "#F1F5F9", fontWeight: 600, marginBottom: 4 }}>
                    {item.step}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6 }}>
                    {item.detail}
                  </div>
                </div>
              </div>
              {item.code && (
                <div style={{
                  background: "#070B14",
                  padding: "16px 20px",
                  overflowX: "auto",
                }}>
                  <pre style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.7,
                    color: "#94A3B8",
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    whiteSpace: "pre",
                  }}>
                    <code>{item.code}</code>
                  </pre>
                </div>
              )}
            </div>
          ))}
          {(!(phase as any)[activeTab] || (phase as any)[activeTab].length === 0) && (
            <div style={{ color: "#64748B", fontSize: 13, padding: "20px 0" }}>
              Sem etapas específicas nessa aba para esta fase.
            </div>
          )}
        </div>

        {/* Nav buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 32 }}>
          <button
            onClick={() => setActivePhase(Math.max(1, activePhase - 1))}
            disabled={activePhase === 1}
            style={{
              padding: "10px 20px",
              background: activePhase === 1 ? "#0F172A" : "#1E293B",
              border: "1px solid #1E293B",
              borderRadius: 6,
              color: activePhase === 1 ? "#374151" : "#94A3B8",
              cursor: activePhase === 1 ? "not-allowed" : "pointer",
              fontSize: 13,
              fontFamily: "inherit",
            }}
          >
            ← Fase anterior
          </button>
          <button
            onClick={() => setActivePhase(Math.min(phases.length, activePhase + 1))}
            disabled={activePhase === phases.length}
            style={{
              padding: "10px 20px",
              background: activePhase === phases.length ? "#0F172A" : phase.color,
              border: "none",
              borderRadius: 6,
              color: activePhase === phases.length ? "#374151" : "#000",
              cursor: activePhase === phases.length ? "not-allowed" : "pointer",
              fontSize: 13,
              fontFamily: "inherit",
              fontWeight: 700,
            }}
          >
            Próxima fase →
          </button>
        </div>
      </div>
    </div>
  );
}
