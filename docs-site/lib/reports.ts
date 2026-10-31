import config, { type Cadencia } from '@/docs.config';
import { somarDias } from './formato';
import { dataDaEntrega, dataDoReport } from './report-core';
import type { KpiDados, ReportDados, Status } from './report-schema';
import { source, type Pagina } from './source';

export interface Report {
  numero: number;
  /** A data do report, do nome do arquivo: o último dia do período. */
  data: string;
  inicio: string;
  url: string;
  status: Status;
  statusMotivo?: string;
  manchete: string;
  /** Com `anterior` preenchido pelo report anterior quando o frontmatter não o traz. */
  kpis: KpiDados[];
  entregas: { titulo: string; descricao?: string }[];
  proximos: { titulo: string; descricao?: string }[];
  decisoes: ReportDados['decisoes'];
}

/** Os textos que dependem da cadência do docs.config.ts. */
export const CADENCIA: Record<Cadencia, { adjetivo: string; comparacao: string; dias: number }> = {
  semanal: { adjetivo: 'semanal', comparacao: 'vs. semana anterior', dias: 7 },
  quinzenal: { adjetivo: 'quinzenal', comparacao: 'vs. quinzena anterior', dias: 14 },
};

export function textosDaCadencia() {
  return CADENCIA[config.cadencia];
}

/**
 * Todos os reports, em ordem de data, com o que é calculado: o número, o início
 * do período e o valor anterior de cada KPI.
 */
export function listarReports(): Report[] {
  const brutos = source
    .getPages()
    .flatMap((pagina: Pagina) => {
      const data = dataDoReport(pagina.path);
      const report = pagina.data.report;
      return data && report ? [{ data, url: pagina.url, report }] : [];
    })
    .sort((a, b) => a.data.localeCompare(b.data));

  const resolvidos: Report[] = [];
  for (const [i, { data, url, report }] of brutos.entries()) {
    const anterior = resolvidos[i - 1];
    resolvidos.push({
      numero: i + 1,
      data,
      inicio: report.inicio ?? (anterior ? somarDias(anterior.data, 1) : config.inicioProjeto),
      url,
      status: report.status,
      statusMotivo: report.statusMotivo,
      manchete: report.manchete,
      kpis: report.kpis.map((kpi) => ({
        ...kpi,
        anterior: kpi.anterior ?? anterior?.kpis.find((k) => k.id === kpi.id)?.valor,
      })),
      entregas: report.entregas,
      proximos: report.proximos,
      decisoes: report.decisoes,
    });
  }
  return resolvidos;
}

export function reportDaData(data: string): Report | undefined {
  return listarReports().find((r) => r.data === data);
}

export function ultimoReport(): Report | undefined {
  return listarReports().at(-1);
}

export interface Entrega {
  data: string;
  url: string;
  titulo: string;
  descricao?: string;
}

/** Os registros técnicos de entrega, do mais novo ao mais antigo. */
export function listarEntregas(): Entrega[] {
  return source
    .getPages()
    .flatMap((pagina: Pagina) => {
      const data = dataDaEntrega(pagina.path);
      return data ? [{ data, url: pagina.url, titulo: pagina.data.title ?? data, descricao: pagina.data.description }] : [];
    })
    .sort((a, b) => b.data.localeCompare(a.data));
}

/** O registro técnico com a mesma data do report, se existir (e se a aba Técnico está no site). */
export function entregaDaData(data: string): Entrega | undefined {
  return listarEntregas().find((e) => e.data === data);
}
