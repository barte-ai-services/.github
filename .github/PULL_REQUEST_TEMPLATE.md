## O que muda
<!-- Resumo objetivo. O título segue Conventional Commits: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert(scope): ... -->

## Rastreabilidade
Closes #

## Checklist
<!-- O handbook: https://barte-ai-services.github.io/.github/how-we-work/pull-requests/ -->
- [ ] Título em Conventional Commits
- [ ] Cada critério de aceite tem um teste que nomeia `#<issue>/AC-<n>`
- [ ] A documentação da mudança vai neste PR (`docs-site/`, e um ADR em `docs/adr/` se houve decisão)
- [ ] Sem segredo/credencial no código, e sem acesso novo fora do que um ADR permite
- [ ] Contrato (API/schema/env) sem quebra, ou documentado e versionado
- [ ] Auto-merge ligado (`gh pr merge <n> --auto --squash --delete-branch`)
