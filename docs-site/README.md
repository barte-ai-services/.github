# O site do handbook de engenharia

O handbook de engenharia da Barte, publicado em <https://barte-ai-services.github.io/.github/>. É a casca [docs-template](https://github.com/barte-ai-services/docs-template) da Barte: Fumadocs estático, com três abas (Como trabalhamos, Especificações e Comunidade) e a marca padrão.

```bash
npm ci
npm run dev                          # http://localhost:3000
BASE_PATH=/.github npm run build     # out/, como no GitHub Pages, e confere os links
```

O conteúdo fica em `content/docs/`, uma pasta por aba. Os nomes de arquivo e de pasta são em inglês, porque viram URL; o texto é em pt-BR.

## Publicação

O workflow `docs-site` faz o build em todo pull request e publica no GitHub Pages a cada merge na `main`. O site é público, como o repositório: nada interno entra aqui.

## Licença

As abas Especificações e Comunidade são adaptadas do Guardia Developer Hub, sob Apache-2.0. Veja o `NOTICE` na raiz.
