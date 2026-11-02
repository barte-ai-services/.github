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

O MCP fica atrás do Identity Manager. Ele não confia em proxy nem em rede: valida ele mesmo o token de cada pedido, conferindo o emissor, a audiência, a assinatura e o domínio da pessoa.

Ele ainda não está no ar (barte-ai-services/.github#21). Até estar, as IAs consultam o handbook pelo site.

O workflow `handbook-mcp` confere o servidor em todo pull request e, a cada merge na `main`, troca o código da função, quando a infraestrutura do `barte-ai-services/infra` estiver pronta; até lá, o deploy é pulado com um aviso.
