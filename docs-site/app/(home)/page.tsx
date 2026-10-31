import Link from 'next/link';
import type { Folder, Node } from 'fumadocs-core/page-tree';
import config from '@/docs.config';
import { StatusBadge } from '@/components/docs/status-badge';
import { dataLonga } from '@/lib/formato';
import { MARCA } from '@/lib/marca';
import { numeroFormatado } from '@/lib/report-core';
import { textosDaCadencia, ultimoReport } from '@/lib/reports';
import { source } from '@/lib/source';

/**
 * A entrada: um cartão por público. Os cartões são as pastas raiz do conteúdo
 * (title, description e icon do meta.json), e o último report logo abaixo.
 */
export default function HomePage() {
  const abas = source
    .getPageTree()
    .children.filter((n): n is Folder => n.type === 'folder' && Boolean(n.root))
    .map((aba) => ({ aba, url: primeiraUrl(aba) }))
    .filter((a): a is { aba: Folder; url: string } => a.url !== undefined);
  const report = ultimoReport();
  const { adjetivo } = textosDaCadencia();

  return (
    <main className="bd-inicio">
      <header className="bd-inicio-cabecalho">
        <p className="bd-sobretitulo">{MARCA.name}</p>
        <h1>{config.projeto}</h1>
      </header>

      {abas.length === 0 && <p className="bd-inicio-vazio">A documentação está em construção.</p>}

      <nav className="bd-inicio-abas" aria-label="Públicos">
        {abas.map(({ aba, url }) => (
          <Link key={url} href={url} className="bd-inicio-aba">
            {aba.icon && <span className="bd-inicio-icone">{aba.icon}</span>}
            <span className="bd-inicio-aba-nome">{aba.name}</span>
            {aba.description && <span className="bd-inicio-aba-descricao">{aba.description}</span>}
          </Link>
        ))}
      </nav>

      {report && (
        <Link href={report.url} className="bd-inicio-report">
          <span className="bd-report-linha">
            <span className="bd-sobretitulo">
              Último status report {adjetivo}, nº {numeroFormatado(report.numero)}, {dataLonga(report.data)}
            </span>
            <StatusBadge status={report.status} />
          </span>
          <span className="bd-inicio-report-manchete">{report.manchete}</span>
        </Link>
      )}
    </main>
  );
}

/** A página de entrada de uma aba: o índice da pasta, ou a primeira página dela. */
function primeiraUrl(no: Folder): string | undefined {
  if (no.index) return no.index.url;
  for (const filho of no.children as Node[]) {
    if (filho.type === 'page') return filho.url;
    if (filho.type === 'folder') {
      const url = primeiraUrl(filho);
      if (url) return url;
    }
  }
}
