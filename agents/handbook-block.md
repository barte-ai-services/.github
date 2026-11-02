<!-- barte:handbook:start -->
## Handbook de engenharia da Barte

Este repositório segue o [handbook de engenharia da Barte](https://barte-ai-services.github.io/.github/), cuja fonte é o repositório [`barte-ai-services/.github`](https://github.com/barte-ai-services/.github). Toda IA que trabalha aqui o segue e o consulta antes de trabalho de engenharia: pelo site, ou pelo MCP do handbook (`barte-handbook`) quando ele estiver registrado no repositório. Em conflito, o handbook vence, exceto onde um ADR deste repositório, em `docs/architecture/decisions/`, diz o contrário.

- **Plano primeiro.** Trabalho que pede mais de um PR começa num plano, aprovado numa issue de plano, antes de construir.
- **Issue primeiro.** Toda mudança nasce numa issue com critérios `AC-n`, e cada critério tem um teste que nomeia `#<issue>/AC-<n>`.
- **A agência do Ahrena constrói.** O trabalho passa pela Athena, e o quality gate passa antes de pedir review.
- **O Loom é o único orquestrador.** Nada de Step Functions, cron em Lambda ou GitHub Actions como orquestrador.
- **Dados passam pelo Data Operator; processos duráveis e de alta carga, e todo workflow, pelo Workflow Manager; Airflow só para paralelismo dentro de um pipeline de dados.**
- **O Identity Manager é o único login.** Toda API e todo MCP valida o token dele.
- **O `ci` é o único check obrigatório.** Ligue o auto-merge ao abrir o PR (`gh pr merge <n> --auto --squash --delete-branch`); se o `ci` ficar vermelho, conserte.
- **A review é automática.** O Argos revisa; um PR com `argos:hold` espera uma pessoa.
- **A documentação vai no PR**, escrita por um subagent de documentação.
- **Segurança antes de meta.** Nenhuma porta pública, integrações só de saída, executores efêmeros, escopo mínimo; mais acesso pede um ADR.
- **«Organização», nunca «cliente»**, para a empresa que a Barte atende.
- **O Backstage é a fonte dos nomes** de organização, projeto e repositório.
- **Bastidores em inglês, pt-BR na tela.** Commits em Conventional Commits, em inglês.
- **APIs e erros seguem as especificações do handbook.**
<!-- barte:handbook:end -->
