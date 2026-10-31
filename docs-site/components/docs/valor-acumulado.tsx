import Link from 'next/link';
import config from '@/docs.config';
import { dataLonga, periodo, valorEmTexto } from '@/lib/formato';
import { numeroFormatado } from '@/lib/report-core';
import { listarReports } from '@/lib/reports';
import type { KpiDados } from '@/lib/report-schema';
import { KpiCard } from './kpi-card';

interface Serie {
  kpi: KpiDados;
  /** O valor em cada report, na ordem dos reports. `undefined` onde o KPI não foi medido. */
  valores: (number | undefined)[];
}

/**
 * Os KPIs somados desde o início do projeto, a partir de todos os reports.
 *
 * Cada KPI diz como acumula no frontmatter: `soma` (horas poupadas, notas
 * lançadas) mostra o total; `ultimo` (taxa de automação, tempo médio) mostra o
 * valor atual e a variação desde a primeira medição.
 *
 * ```mdx
 * <ValorAcumulado />
 * ```
 */
export function ValorAcumulado() {
  const reports = listarReports();
  if (reports.length === 0) return <p className="bd-report-vazio not-prose">Ainda não há status report.</p>;

  // A ordem dos KPIs é a do report mais recente; os que saíram dele vêm depois.
  const ordem = new Map<string, KpiDados>();
  for (const r of [...reports].reverse()) for (const k of r.kpis) if (!ordem.has(k.id)) ordem.set(k.id, k);
  const series: Serie[] = [...ordem.values()].map((kpi) => ({
    kpi,
    valores: reports.map((r) => r.kpis.find((k) => k.id === kpi.id)?.valor),
  }));

  const ultimo = reports.at(-1)!;
  const medidos = (s: Serie) => s.valores.filter((v): v is number => v !== undefined);
  const total = (s: Serie) => (s.kpi.acumula === 'soma' ? medidos(s).reduce((a, b) => a + b, 0) : medidos(s).at(-1)!);
  const primeiroNumero = (s: Serie) => reports[s.valores.findIndex((v) => v !== undefined)].numero;

  return (
    <div className="bd-acumulado not-prose">
      <p className="bd-acumulado-periodo">
        De {periodo(config.inicioProjeto, ultimo.data)}, em {reports.length}{' '}
        {reports.length === 1 ? 'status report' : 'status reports'}.
      </p>

      <div className="bd-kpi-grade">
        {series.map((s) =>
          s.kpi.acumula === 'soma' ? (
            <KpiCard
              key={s.kpi.id}
              rotulo={s.kpi.rotulo}
              valor={total(s)}
              unidade={s.kpi.unidade}
              nota={`Soma de ${medidos(s).length} ${medidos(s).length === 1 ? 'período' : 'períodos'}`}
            />
          ) : (
            <KpiCard
              key={s.kpi.id}
              rotulo={s.kpi.rotulo}
              valor={total(s)}
              unidade={s.kpi.unidade}
              anterior={medidos(s).length > 1 ? medidos(s)[0] : undefined}
              melhorQuando={s.kpi.melhorQuando}
              comparacao={`desde o nº ${numeroFormatado(primeiroNumero(s))}`}
              nota="Valor do último período"
            />
          ),
        )}
      </div>

      <div className="bd-tabela-rolagem">
        <table className="bd-tabela">
          <thead>
            <tr>
              <th scope="col">Report</th>
              {series.map((s) => (
                <th key={s.kpi.id} scope="col">
                  {s.kpi.rotulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map((r, i) => (
              <tr key={r.data}>
                <th scope="row">
                  <Link href={r.url}>Nº {numeroFormatado(r.numero)}</Link>
                  <span className="bd-tabela-data">{dataLonga(r.data)}</span>
                </th>
                {series.map((s) => (
                  <td key={s.kpi.id}>{s.valores[i] === undefined ? '' : valorEmTexto(s.valores[i]!, s.kpi.unidade)}</td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">Acumulado</th>
              {series.map((s) => (
                <td key={s.kpi.id}>
                  {valorEmTexto(total(s), s.kpi.unidade)}
                  {s.kpi.acumula === 'ultimo' && <span className="bd-tabela-data">atual</span>}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
