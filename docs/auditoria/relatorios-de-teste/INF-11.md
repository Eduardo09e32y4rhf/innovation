# INF-11 e DEP-05: GitHub Actions por SHA, permissions, images.yml, audit

## Problema
`tests/contract/workflows.spec.ts`: 23 de 24 falhavam (tags moveis, jobs sem permissions, sem npm-audit/dependency-review).

## Documentacao
https://docs.github.com/actions/security-guides/security-hardening-for-github-actions: NAO VERIFICADO (bloqueado). SHAs obtidos de `git ls-remote --tags` (VERIFICADO; tags anotadas resolvidas pelo commit `^{}`). `npm audit`: VERIFICADO apenas por `npm audit --help` local nao executado; flags conforme catalogo.

## Correcao
Versoes (maiores estaveis em ls-remote): checkout v7.0.1, setup-node v7.1.0, upload-artifact v7.0.2, download-artifact v8.0.2, build-push v7.4.0, login v4.7.0, setup-buildx v4.4.1, codeql-action v4.39.1, action-gh-release v3.0.3, ssh-action v1.2.5, scp-action v1.0.0, dependency-review v5.0.0; todas "uses: owner/repo@<40 hex> # vX.Y.Z". `permissions` minimas em cada job (workflow so com contents: read; escrita apenas em codeql security-events, images packages, labels issues, release contents). images.yml: so branches claude/**, tags SHA e `branch-<nome>` (nunca latest), risco documentado. DEP-05: job `npm-audit` (continue-on-error, fora do ci-ok) e `dependency-review` (so PR).

## Testes
workflows.spec.ts: 24 passam; YAML valida (PyYAML). Workflows NAO executados no GitHub: **NAO VERIFICADO** (majors novos de checkout/upload/download podem exigir ajuste; testar numa branch). Dependabot ja cobre github-actions (weekly).

## Conferir
Abrir PR de teste e ver o ci verde, npm-audit (amarelo/ok) e Dependency Review; `grep -rn "uses:" .github/workflows`.
