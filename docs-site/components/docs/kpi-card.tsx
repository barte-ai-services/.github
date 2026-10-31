import type { ReactNode } from 'react';
import { formatarValor, variacao } from '@/lib/formato';

export interface KpiCardProps {
  /** O que o número mede: "Horas poupadas". */
  rotulo: string;
  valor: number;
  /** `BRL`, `%`, `h`, `min` ou um texto livre (`notas`). */
  unidade?: string;
  /** O valor do período anterior. Sem ele, o card não mostra variação. */
  anterior?: number;
  /** O sentido de "bom". Padrão: `maior`. */
  melhorQuando?: 'maior' | 'menor';
  /** O texto depois da variação. Padrão: "vs. período anterior". */
  comparacao?: string;
  /** Uma linha de contexto abaixo do número. */
  nota?: string;
}

/**
 * Um indicador com a variação contra o período anterior. A cor diz se a
 * variação é boa ou ruim, conforme `melhorQuando`; a seta diz se subiu ou desceu.
 *
 * ```mdx
 * <KpiCard rotulo="Tempo médio de lançamento" valor={1.4} unidade="min" anterior={2.1} melhorQuando="menor" />
 * ```
 */
export function KpiCard({
  rotulo,
  valor,
  unidade,
  anterior,
  melhorQuando = 'maior',
  comparacao = 'vs. período anterior',
  nota,
}: KpiCardProps) {
  const { prefixo, numero, sufixo } = formatarValor(valor, unidade);
  const v = anterior === undefined ? undefined : variacao(valor, anterior, unidade, melhorQuando);
  return (
    <div className="bd-kpi not-prose">
      <p className="bd-kpi-rotulo">{rotulo}</p>
      <p className="bd-kpi-valor">
        {prefixo && <span className="bd-kpi-unidade">{prefixo}</span>}
        <span className="bd-kpi-numero">{numero}</span>
        {sufixo && <span className="bd-kpi-unidade" data-colado={sufixo === '%' || undefined}>{sufixo}</span>}
      </p>
      {v ? (
        <p className="bd-kpi-variacao">
          <span className="bd-kpi-pilula" data-sentido={v.sentido}>
            <Seta direcao={v.direcao} />
            {v.texto}
            <span className="bd-visualmente-oculto">
              {v.sentido === 'bom' ? ', melhora' : v.sentido === 'ruim' ? ', piora' : ', estável'}
            </span>
          </span>
          <span>{comparacao}</span>
        </p>
      ) : null}
      {nota && <p className="bd-kpi-nota">{nota}</p>}
    </div>
  );
}

function Seta({ direcao }: { direcao: 'sobe' | 'desce' | 'igual' }) {
  if (direcao === 'igual') {
    return (
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden>
        <path d="M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden style={direcao === 'desce' ? { transform: 'rotate(180deg)' } : undefined}>
      <path d="M6 10V2.5M2.5 5.5 6 2l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Uma grade de KpiCard, de 1 a 3 por linha conforme a largura. */
export function KpiGrid({ children }: { children: ReactNode }) {
  return <div className="bd-kpi-grade not-prose">{children}</div>;
}
