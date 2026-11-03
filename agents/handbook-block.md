<!-- barte:handbook:start -->
## Handbook de engenharia da Barte

Este repositório segue o [Barte AI Services Handbook](https://bookish-adventure-9ek13w4.pages.github.io/), interno à org, cuja fonte é o repositório [`barte-ai-services/ai-services-handbook`](https://github.com/barte-ai-services/ai-services-handbook). Este bloco mora em `agents/handbook-block.md` do `barte-ai-services/.github`. Toda IA que trabalha aqui o segue e o consulta antes de trabalho de engenharia: pelo site, ou pelo MCP do handbook (`barte-handbook`) quando ele estiver registrado no repositório. Em conflito, o handbook vence, exceto onde um ADR deste repositório, em `docs/architecture/decisions/`, diz o contrário.

- **Plano primeiro.** Trabalho que pede mais de um PR começa num plano, aprovado numa sub-issue `plan` própria, antes de construir. Cada PR leva `Refs #<plano>`; o último PR fecha o plano, e o último PR do último plano fecha a issue mãe.
- **Issue primeiro.** Toda mudança nasce numa issue com critérios `AC-n`, e cada critério tem um teste que nomeia `#<issue>/AC-<n>`.
- **A agência do Ahrena constrói.** O trabalho passa pela Athena, e o quality gate passa antes de pedir review.
- **O Loom é o único orquestrador.** Nada de Step Functions, cron em Lambda ou GitHub Actions como orquestrador.
- **Dados passam pelo Data Operator; processos duráveis e de alta carga, e todo workflow, pelo Workflow Manager; Airflow só para paralelismo dentro de um pipeline de dados.**
- **O Identity Manager é o único login.** Toda API e todo MCP valida o token dele.
- **O `ci` é obrigatório, e o `argos/verdict` passa a ser, em rollout.** Ligue o auto-merge ao abrir o PR (`gh pr merge <n> --auto --squash --delete-branch`); se o `ci` ficar vermelho, conserte.
- **A review é automática.** O Argos revisa; um PR com `argos:hold` espera uma pessoa. Enquanto o repositório não exige o `argos/verdict`, ponha `argos:hold` antes do `gh pr ready`.
- **A documentação vai no PR**, escrita por um subagent de documentação.
- **Segurança antes de meta.** Nada responde sem o login do Identity Manager na frente, integrações só de saída, executores efêmeros, escopo mínimo; mais acesso pede um ADR.
- **«Organização», nunca «cliente»**, para a empresa que a Barte atende.
- **O Backstage é a fonte dos nomes** de organização, projeto e repositório.
- **Bastidores em inglês, pt-BR na tela.** Commits em Conventional Commits, em inglês.
- **APIs e erros seguem as especificações do handbook.**
<!-- barte:handbook:end -->
