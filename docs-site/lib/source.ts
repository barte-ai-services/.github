import { loader } from 'fumadocs-core/source';
import { remarkMdxMermaid } from 'fumadocs-core/mdx-plugins';
import { metaSchema } from 'fumadocs-core/source/schema';
import { applyMdxPreset } from 'fumadocs-mdx/config';
import { defineDocs } from 'fumadocs-mdx/macro';
import { icons } from 'lucide-react';
import { createElement } from 'react';
import { pluginReports } from './report-core';
import { paginaSchema } from './report-schema';
import { pluginRascunhos } from './rascunho';
import { pluginVisao } from './visao';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: paginaSchema,
    // O preset do Fumadocs, mais o Mermaid: um bloco ```mermaid vira o componente <Mermaid>.
    mdxOptions: applyMdxPreset({ remarkPlugins: (padrao) => [...padrao, remarkMdxMermaid] }),
  },
  meta: { schema: metaSchema },
});

export const source = loader({
  baseUrl: '/',
  source: docs.toFumadocsSource(),
  plugins: [pluginVisao(), pluginRascunhos(), pluginReports()],
  // O `icon` do meta.json e do frontmatter é um nome do lucide: ChartLine, Workflow.
  icon(nome) {
    if (nome && nome in icons) return createElement(icons[nome as keyof typeof icons]);
  },
});

export type Pagina = ReturnType<typeof source.getPages>[number];
