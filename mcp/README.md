# O MCP do handbook

O handbook de engenharia da Barte como um servidor MCP, o `barte-handbook`. Só lê: responde com as páginas do site (`../docs-site/content`), o Tech Radar (`../docs-site/data/radar.yaml`) e as regras do bloco do `AGENTS.md` (`../agents/handbook-block.md`), empacotados no build.

| Ferramenta         | O que faz                                                                               |
| ------------------ | --------------------------------------------------------------------------------------- |
| `get_rules`        | As regras do bloco, com a versão (o commit) do handbook                                 |
| `list_sections`    | As seções e as páginas, com o slug de cada uma                                          |
| `read_page`        | Uma página inteira, pelo slug                                                           |
| `search`           | Busca nas páginas, sem diferença de acento                                              |
| `check_technology` | O anel de uma tecnologia no Tech Radar, para que serve, como usar e o que usar no lugar |

```bash
npm ci
npm run dev      # http://127.0.0.1:8788/mcp, com o conteúdo do checkout
npm run check    # formato, lint, tipos e testes
npm run build    # dist/handler.mjs, o pacote da Lambda
```

## Onde roda

Uma Lambda atrás de um HTTP API, na conta da AI Services. A infra é do `barte-ai-services/infra`, raiz `control-plane/handbook-mcp`, e o ADR de lá explica por que o endereço é público.

O workflow `handbook-mcp` confere o servidor em todo pull request e, a cada merge na `main`, troca o código da função e confere que o servidor responde com o commit novo. Ele usa as variáveis `BARTE_HANDBOOK_MCP_DEPLOY_ROLE_ARN` e `BARTE_HANDBOOK_MCP_URL` do repositório; sem elas, o deploy é pulado com um aviso.
