## O que muda
<!-- Resumo objetivo. O título é o commit do squash: Conventional Commits, em inglês, até 100 caracteres, sem ponto final. Tipos: feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert. -->

## Rastreabilidade
Refs #
<!-- Refs #<plano>: a sub-issue `plan` que este PR executa. O último PR do plano fecha o plano (Closes #<plano>), e o último PR do último plano fecha também a issue mãe (Closes #<mãe>). -->

## Checklist
<!-- O handbook: https://bookish-adventure-9ek13w4.pages.github.io/how-we-work/pull-requests/ -->
- [ ] Plano aprovado numa sub-issue `plan`, quando a mudança pede mais de um PR
- [ ] Título em Conventional Commits, em inglês
- [ ] Cada critério de aceite tem um teste que nomeia `#<issue>/AC-<n>`
- [ ] Documentação pelo subagent, neste PR (em `docs/`, e um ADR em `docs/architecture/decisions/` se houve decisão); uma regra que vale para a org vai num PR do handbook (`barte-ai-services/ai-services-handbook`), citado aqui
- [ ] Sem segredo/credencial no código, e sem acesso novo fora do que um ADR permite
- [ ] Contrato (API/schema/env) sem quebra, ou documentado e versionado
- [ ] Auto-merge ligado (`gh pr merge <n> --auto --squash --delete-branch`)
