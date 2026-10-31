import { Callout } from 'fumadocs-ui/components/callout';
import { DocsBody, DocsDescription, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/notebook/page';
import { createRelativeLink } from 'fumadocs-ui/mdx';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import { Report, SECOES_DO_REPORT } from '@/components/docs/report';
import { dataDoReport } from '@/lib/report-core';
import { source } from '@/lib/source';

export default async function Page(props: PageProps<'/[...slug]'>) {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const dataReport = page.data.report ? dataDoReport(page.path) : null;

  // O report desenha o próprio cabeçalho; o índice lateral são as seções dele.
  if (dataReport) {
    const toc = SECOES_DO_REPORT.map((s) => ({ title: s.titulo, url: `#${s.id}`, depth: 2 }));
    return (
      <DocsPage toc={toc}>
        <DocsBody>
          <MDX
            components={getMDXComponents({
              a: createRelativeLink(source, page),
              Report: (p: { data?: string }) => <Report data={dataReport} {...p} />,
            })}
          />
        </DocsBody>
      </DocsPage>
    );
  }

  return (
    <DocsPage toc={page.data.toc} full={page.data.full}>
      {page.data.rascunho && (
        <Callout type="warn" title="Rascunho">
          Esta página aparece só no servidor de desenvolvimento. O build a deixa de fora até sair o{' '}
          <code>rascunho: true</code> do frontmatter.
        </Callout>
      )}
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription>{page.data.description}</DocsDescription>
      <DocsBody>
        <MDX components={getMDXComponents({ a: createRelativeLink(source, page) })} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  const params = source.generateParams().filter((p) => p.slug.length > 0);
  // Com todas as páginas em rascunho (o site recém-criado), o export do Next
  // exige ao menos uma rota: esta vira um 404, e a página inicial diz que a
  // documentação está em construção.
  return params.length > 0 ? params : [{ slug: ['em-construcao'] }];
}

export async function generateMetadata(props: PageProps<'/[...slug]'>): Promise<Metadata> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();
  return { title: page.data.title, description: page.data.description };
}
