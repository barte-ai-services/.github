# A documentação do Backstage

O site de documentação do Backstage, feito com a casca [docs-template](https://github.com/barte-ai-services/docs-template): Fumadocs estático, com três abas (Executivo, Operação e Técnico) e a marca padrão da Barte. O README da casca explica a marca, os componentes e os rascunhos.

```bash
npm ci
npm run dev     # http://localhost:3000, com os rascunhos
npm run build   # out/, sem os rascunhos, e confere os links
```

## As decisões vêm de docs/adr

O `scripts/decisoes.mjs` roda antes do `dev` e do `build` e gera a seção Técnico › Decisões a partir de `../docs/adr/*.md`. A pasta gerada, `content/docs/tecnico/decisoes/`, fica fora do git: o texto de um ADR mora só em `docs/adr/`. No caminho, os nomes de código dos módulos viram os nomes comerciais, e os links entre ADRs viram links entre as páginas.

## Publicação

O workflow `pages` publica o site no GitHub Pages privado a cada merge na `main`: só quem tem acesso ao repositório o vê. Nas pull requests, o job `docs-site` do check `ci` faz o build e confere os links.

## Rascunhos

Uma página com `rascunho: true` aparece no `npm run dev` e fica fora do build. As páginas do esqueleto que ainda não têm fonte continuam assim.
