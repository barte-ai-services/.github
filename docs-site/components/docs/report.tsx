import Link from 'next/link';
import { dataLonga, periodo } from '@/lib/formato';
import { numeroFormatado } from '@/lib/report-core';
import { entregaDaData, listarEntregas, listarReports, reportDaData, textosDaCadencia, ultimoReport, type Report as ReportResolvido } from '@/lib/reports';
import { KpiCard } from './kpi-card';
import { StatusBadge } from './status-badge';

export interface ReportProps {
  /**
   * A data do report (AAAA-MM-DD). Numa página de report ela já vem da página:
   * o corpo do arquivo é só `<Report />`.
   */
  data?: string;
}

/** As âncoras do report, para o índice lateral da página. */
export const SECOES_DO_REPORT = [
  { id: 'entregas', titulo: 'Entregas do período' },
  { id: 'proximos-passos', titulo: 'Próximos passos' },
  { id: 'decisoes', titulo: 'Decisões que precisamos de vocês' },
] as const;

function exigir(data: string | undefined): ReportResolvido {
  const report = data ? reportDaData(data) : undefined;
  if (!report) throw new Error(`<Report>: não há report em content/docs/executivo/reports/${data ?? '?'}.mdx`);
  return report;
}

/**
 * O status report periódico, com estrutura fixa: manchete, 3 a 5 KPIs,
 * entregas, próximos passos e decisões. Os dados vêm do frontmatter
 * (`report:`) do arquivo `executivo/reports/AAAA-MM-DD.mdx`.
 *
 * ```mdx
 * <Report />                     numa página de report
 * <Report data="2026-09-25" />   em qualquer outra página
 * ```
 */
export function Report({ data }: ReportProps) {
  const report = exigir(data);
  const { adjetivo, comparacao } = textosDaCadencia();
  const [entregas, proximos, decisoes] = SECOES_DO_REPORT;
  return (
    <div className="bd-report not-prose">
      <header className="bd-report-cabecalho">
        <div className="bd-report-linha">
          <p className="bd-sobretitulo">Status report {adjetivo}</p>
          <StatusBadge status={report.status} />
        </div>
        <h1 className="bd-report-numero">
          <span className="bd-visualmente-oculto">Status report </span>Nº {numeroFormatado(report.numero)}
        </h1>
        <p className="bd-report-periodo">{periodo(report.inicio, report.data)}</p>
        {report.statusMotivo && <p className="bd-report-motivo">{report.statusMotivo}</p>}
      </header>

      <p className="bd-report-manchete">{report.manchete}</p>

      <div className="bd-kpi-grade">
        {report.kpis.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} comparacao={comparacao} />
        ))}
      </div>

      <section className="bd-report-secao">
        <h2 id={entregas.id}>{entregas.titulo}</h2>
        <Itens itens={report.entregas} />
        <LinkDoRegistro data={report.data} />
      </section>

      <section className="bd-report-secao">
        <h2 id={proximos.id}>{proximos.titulo}</h2>
        <Itens itens={report.proximos} />
      </section>

      <section className="bd-report-secao">
        <h2 id={decisoes.id}>{decisoes.titulo}</h2>
        {report.decisoes.length === 0 ? (
          <p className="bd-report-vazio">Nenhuma decisão pendente neste período.</p>
        ) : (
          <ol className="bd-decisoes">
            {report.decisoes.map((d) => (
              <li key={d.decisao} className="bd-decisao">
                <p className="bd-decisao-texto">{d.decisao}</p>
                {d.contexto && <p className="bd-decisao-contexto">{d.contexto}</p>}
                {d.prazo && <p className="bd-decisao-prazo">Até {dataLonga(d.prazo)}</p>}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Itens({ itens }: { itens: { titulo: string; descricao?: string }[] }) {
  return (
    <ul className="bd-report-itens">
      {itens.map((item) => (
        <li key={item.titulo}>
          <span className="bd-report-item-titulo">{item.titulo}</span>
          {item.descricao && <span className="bd-report-item-descricao">{item.descricao}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * O último report em resumo: manchete e KPIs, com o link para ele. É o topo da
 * aba Executivo.
 *
 * ```mdx
 * <UltimoReport />
 * ```
 */
export function UltimoReport() {
  const report = ultimoReport();
  // Antes do primeiro report, a visão geral não fala dele.
  if (!report) return null;
  const { adjetivo, comparacao } = textosDaCadencia();
  return (
    <div className="bd-report bd-report-resumo not-prose">
      <div className="bd-report-linha">
        <p className="bd-sobretitulo">
          Último status report {adjetivo}, nº {numeroFormatado(report.numero)}, {dataLonga(report.data)}
        </p>
        <StatusBadge status={report.status} />
      </div>
      <p className="bd-report-manchete">{report.manchete}</p>
      <div className="bd-kpi-grade">
        {report.kpis.map((kpi) => (
          <KpiCard key={kpi.id} {...kpi} comparacao={comparacao} />
        ))}
      </div>
      <Link className="bd-link-seta" href={report.url}>
        Ler o report completo
      </Link>
    </div>
  );
}

/**
 * Todos os reports, do mais novo ao mais antigo.
 *
 * ```mdx
 * <ListaReports />
 * ```
 */
export function ListaReports() {
  const reports = listarReports().reverse();
  if (reports.length === 0) return <p className="bd-report-vazio not-prose">Ainda não há status report.</p>;
  return (
    <ol className="bd-lista-reports not-prose">
      {reports.map((r) => (
        <li key={r.data}>
          <Link href={r.url} className="bd-lista-report">
            <span className="bd-lista-report-topo">
              <span className="bd-lista-report-numero">Nº {numeroFormatado(r.numero)}</span>
              <span className="bd-lista-report-periodo">{periodo(r.inicio, r.data)}</span>
              <StatusBadge status={r.status} />
            </span>
            <span className="bd-lista-report-manchete">{r.manchete}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** O link para o registro técnico de mesma data, quando ele existe. */
function LinkDoRegistro({ data }: { data: string }) {
  const entrega = entregaDaData(data);
  if (!entrega) return null;
  return (
    <Link className="bd-link-seta bd-report-registro" href={entrega.url}>
      O registro técnico desta entrega
    </Link>
  );
}

/**
 * Os registros técnicos de entrega, do mais novo ao mais antigo.
 *
 * ```mdx
 * <ListaEntregas />
 * ```
 */
export function ListaEntregas() {
  const entregas = listarEntregas();
  if (entregas.length === 0) return <p className="bd-report-vazio not-prose">Ainda não há registro de entrega.</p>;
  return (
    <ol className="bd-lista-reports not-prose">
      {entregas.map((e) => (
        <li key={e.data}>
          <Link href={e.url} className="bd-lista-report">
            <span className="bd-lista-report-topo">
              <span className="bd-lista-report-numero">{dataLonga(e.data)}</span>
            </span>
            {e.descricao && <span className="bd-lista-report-manchete">{e.descricao}</span>}
          </Link>
        </li>
      ))}
    </ol>
  );
}
