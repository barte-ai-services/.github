## O que muda
<!-- Resumo objetivo. O título é o commit do squash: Conventional Commits, em inglês, até 100 caracteres, sem ponto final. Tipos: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert. -->

## Rastreabilidade
Closes #
<!-- Plano: #<issue de plano>, quando a mudança faz parte de um. -->

## Checklist
<!-- O handbook: https://barte-ai-services.github.io/.github/how-we-work/pull-requests/ -->
- [ ] Plano aprovado (issue de plano), quando a mudança pede mais de um PR
- [ ] Título em Conventional Commits, em inglês
- [ ] Cada critério de aceite tem um teste que nomeia `#<issue>/AC-<n>`
- [ ] Documentação pelo subagent, neste PR (`docs-site/`, e um ADR em `docs/architecture/decisions/` se houve decisão)
- [ ] Sem segredo/credencial no código, e sem acesso novo fora do que um ADR permite
- [ ] Contrato (API/schema/env) sem quebra, ou documentado e versionado
- [ ] Auto-merge ligado (`gh pr merge <n> --auto --squash --delete-branch`)
