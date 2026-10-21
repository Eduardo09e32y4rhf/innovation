# Proteção da branch `main` (passo a passo)

> **Quem aplica: o dono do repositório.** Estas regras ficam nas configurações do GitHub e exigem permissão de administrador. O token usado pelos agentes de IA é somente leitura, então **ninguém além de você consegue ativar**. Tudo abaixo já está pronto para copiar ou importar.

## O que a regra garante

| Regra | Efeito |
|---|---|
| PR obrigatório com 1 aprovação | Nada entra na `main` por push direto |
| Revisão do dono do código (`.github/CODEOWNERS`) | Finanças, folha, auth, privacidade, Prisma, infra e CI sempre passam por revisão |
| Check obrigatório **`ci-ok`** | O merge só libera com o CI inteiro verde (validate, secrets-scan, unit, migrations em banco vazio, integração, build, E2E) |
| Branch atualizada antes do merge | O CI roda no estado final, não numa base velha |
| Conversas resolvidas | Comentário de revisão aberto bloqueia o merge |
| Histórico linear | Só *squash* ou *rebase*, sem commits de merge |
| Bloqueio de force-push e de exclusão | A `main` não pode ser reescrita nem apagada |

O job `ci-ok` está definido em `.github/workflows/ci.yml` e depende de todos os outros jobs, por isso é o único que precisa ser exigido.

## Caminho A (recomendado): importar o ruleset pronto

1. No GitHub, abra o repositório e vá em **Settings → Rules → Rulesets**.
2. Clique em **New ruleset → Import a ruleset**.
3. Escolha o arquivo **`.github/ruleset-main.json`** deste repositório.
4. Confira o resumo (nome "main protegida", *Enforcement status: Active*, alvo: branch padrão) e clique em **Create**.

> **Pré-requisito do check `ci-ok`:** o GitHub só aceita um check obrigatório que já tenha rodado no repositório. Abra um PR qualquer, espere o CI terminar e **só depois** importe o ruleset (ou edite o ruleset e adicione `ci-ok` em *Require status checks to pass*).

### Se você é a única pessoa no projeto

Ninguém consegue aprovar o próprio PR. O arquivo já traz uma saída: o papel **Repository admin** pode ignorar a regra de PR (`bypass_mode: pull_request`), o que significa que você faz o merge do seu PR com o CI verde, e o GitHub registra o uso da exceção. Alternativas:

- Adicionar um segundo revisor (pessoa de confiança ou conta de revisão) e trocar o dono no `CODEOWNERS`.
- Trocar `required_approving_review_count` para `0` e `require_code_owner_review` para `false` (perde a revisão obrigatória, mantém PR e CI).

## Caminho B: Branch protection clássica (sem importar)

1. **Settings → Branches → Add branch protection rule**.
2. *Branch name pattern*: `main`.
3. Marque:
   - **Require a pull request before merging** → *Require approvals*: `1`, *Dismiss stale pull request approvals when new commits are pushed*, **Require review from Code Owners**.
   - **Require status checks to pass before merging** → **Require branches to be up to date before merging** → busque e adicione **`ci-ok`**.
   - **Require conversation resolution before merging**.
   - **Require linear history**.
   - **Do not allow bypassing the above settings** (se quiser valer também para o administrador).
4. Deixe **desmarcados** *Allow force pushes* e *Allow deletions*.
5. **Create**.

## Configurações complementares

1. **Settings → General → Pull Requests**: deixe só *Allow squash merging* (e/ou rebase) e marque **Automatically delete head branches**.
2. **Settings → Code security** (ou *Security*): ative **Dependency graph**, **Dependabot alerts**, **Dependabot security updates**, **Secret scanning** e **Push protection**. O CodeQL já roda por `.github/workflows/codeql.yml`.
3. **Settings → Actions → General → Workflow permissions**: *Read repository contents permission* (os workflows pedem só o que precisam).
4. **Settings → Environments**: o ambiente **`production`** deve exigir aprovação manual (o `deploy.yml` já espera isso).
5. (Opcional) Adicionar **`Título do PR`** (job do `pr-title.yml`) aos checks obrigatórios para barrar títulos fora do padrão.

## Como conferir que funcionou

1. Tente `git push origin main` direto: deve ser recusado.
2. Abra um PR com um teste quebrando de propósito: o botão de merge fica bloqueado com `ci-ok` vermelho.
3. Abra um PR que mexa em `apps/api/src/modules/finance/`: o GitHub pede a revisão do dono do código.

## Rótulos e modelos

- Rótulos P0/P1/P2, `area:*` e `status:*`: edite `.github/labels.yml` e rode **Actions → Labels sync → Run workflow** (uma vez).
- Convenção de commits e de título de PR: `docs/CONTRIBUINDO.md`.
