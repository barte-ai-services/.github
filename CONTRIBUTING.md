# Contribuindo

Todo repositório da `barte-ai-services` segue o [Barte AI Services Handbook](https://bookish-adventure-9ek13w4.pages.github.io/), interno à org (fonte em `barte-ai-services/ai-services-handbook`). Em resumo:

- **Issue primeiro**, com critérios de aceite `AC-n` e um teste para cada um. Trabalho grande começa num plano aprovado numa sub-issue `plan`, e cada PR leva `Refs #<plano>`.
- **Branch** `<type>/<issue>-<slug>`, no próprio repositório, sem fork.
- **Commits pequenos, em Conventional Commits e em inglês** (`feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`), cabeçalho até 100 caracteres, sem ponto final.
- **Só squash: o título do PR é o commit da `main`.** O `conventional-pr` confere o título e os commits do PR; o squash assinado pelo GitHub basta como assinatura.
- **O `ci` é obrigatório, e o `argos/verdict` passa a ser, em rollout**: ligue o auto-merge ao abrir o PR; a review é automática. Até o repositório exigir o `argos/verdict`, ponha `argos:hold` antes do `gh pr ready`.
- **A documentação vai no PR.**
- **Bastidores em inglês, pt-BR na tela.**
- **Labels** vêm de `.github/labels.yml`; não crie label solta.

O guia completo: [contribuindo](https://bookish-adventure-9ek13w4.pages.github.io/community/contributing/). A conduta: [Código de Conduta](https://bookish-adventure-9ek13w4.pages.github.io/community/code-of-conduct/).
