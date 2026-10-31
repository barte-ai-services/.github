<!-- barte:handbook:start -->
## Handbook de engenharia da Barte

Este repositório segue o [handbook de engenharia da Barte](https://barte-ai-services.github.io/.github/), cuja fonte é o repositório [`barte-ai-services/.github`](https://github.com/barte-ai-services/.github). Toda IA que trabalha aqui o segue. Em conflito, o handbook vence, exceto onde um ADR deste repositório, em `docs/adr/`, diz o contrário.

- **Issue primeiro.** Toda mudança nasce numa issue com critérios `AC-n`, e cada critério tem um teste que nomeia `#<issue>/AC-<n>`.
- **A agência do Ahrena constrói.** O trabalho passa pela Athena, e o quality gate passa antes de pedir review.
- **O `ci` é o único check obrigatório.** Ligue o auto-merge ao abrir o PR (`gh pr merge <n> --auto --squash --delete-branch`). Se o `ci` ficar vermelho, conserte; não peça a ninguém para mesclar.
- **A review é automática.** O Argos revisa; um PR com `argos:hold` espera uma pessoa.
- **A documentação vai no PR.** Quem coordena abre um subagent de documentação; o site fica em `docs-site/` e os ADRs em `docs/adr/`.
- **Segurança antes de meta.** Nenhuma porta pública, integrações só de saída, executores efêmeros, escopo mínimo em produção; mais acesso pede um ADR.
- **Bastidores em inglês, pt-BR na tela.**
- **APIs seguem as especificações do handbook**: RESTful, erros, auth, idempotência, CloudEvents e entidades.
<!-- barte:handbook:end -->
