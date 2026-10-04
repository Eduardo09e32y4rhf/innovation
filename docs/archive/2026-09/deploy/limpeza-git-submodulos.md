# Limpeza final de índices e submódulos

Remova todos os arquivos do **índice** (sem apagar os arquivos no disco):

```bash
git rm -r --cached .
```

Isso faz o Git "esquecer" tudo o que está no índice, incluindo entradas que tratam pastas como submódulos.

Adicione tudo de novo (índice limpo):

```bash
git add .
```

O Git reconstrói o índice tratando tudo como arquivos normais (Python, imagens, HTML), sem referências a submódulos externos.

Commit e push forçado:

```bash
git commit -m "Limpeza total de índices e submódulos"
git push origin <sua-branch>:main --force
```

- Troque `<sua-branch>` pelo nome da branch em que você está (ex.: `update-reqs` ou `main`).
- Exemplo: se sua branch é `update-reqs` e você quer atualizar `main` no remoto:  
  `git push origin update-reqs:main --force`
- **Atenção:** `--force` sobrescreve o histórico de `main` no remoto. Use só se tiver certeza.

---

## Por que isso funciona?

O índice do Git (`.git/index`) pode ainda ter entradas marcando pastas (ex.: `tabler`) como submódulo. Com `git rm -r --cached .` você remove todo o índice. Com `git add .` em seguida, o Git recria o índice só com arquivos normais, sem tentar resolver URLs de submódulos.

---

## Dica para o Koyeb

Se o erro continuar depois do push:

1. No painel do Koyeb, vá em **Settings** (Configurações).
2. Procure por **Build Cache**.
3. Desative o cache ou use **Clear Cache** — o Koyeb pode estar reutilizando um clone antigo com o problema de submódulos.
