# Deployment do Painel IA na Vercel

Siga os passos abaixo para subir **apenas o painel da IA** na Vercel:

1. Acesse sua conta na [Vercel](https://vercel.com/).
2. Clique em **Add New...** > **Project**.
3. Importe o repositório do seu projeto.
4. Na tela de configuração (Configure Project):
   - **Framework Preset**: Selecione `Next.js`
   - **Root Directory**: Clique em `Edit` e selecione a pasta `frontend`
   - **Build and Output Settings**: Pode deixar os padrões que já estarão configurados (`pnpm run build`).
5. Variáveis de Ambiente (Environment Variables):
   - Adicione `NEXT_PUBLIC_API_URL` apontando para o seu servidor backend (ex: `https://meu-backend.onrender.com`).
6. Clique em **Deploy**.

Após o deploy, a IA de pesquisa pública estará disponível na rota `/ia-pesquisa`. Exemplo: `https://meu-projeto.vercel.app/ia-pesquisa`.
Esta página é completamente simplificada e focada em responder usando buscas em tempo real do Google para assuntos como INSS, FGTS e impostos.
