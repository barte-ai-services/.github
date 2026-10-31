import { dataCurtaComAno, ehDataIso } from '@/lib/formato';

export type EstadoMarco = 'feito' | 'andamento' | 'previsto';

export interface Marco {
  /** AAAA-MM-DD, ou um texto livre quando a data ainda não é exata ("Novembro"). */
  data: string;
  titulo: string;
  descricao?: string;
  status: EstadoMarco;
}

export interface TimelineProps {
  marcos: Marco[];
}

const ROTULO: Record<EstadoMarco, string> = {
  feito: 'Feito',
  andamento: 'Em andamento',
  previsto: 'Previsto',
};

/**
 * Os marcos de entrega acordados, em ordem. Feito, em andamento ou previsto.
 *
 * ```mdx
 * <Timeline marcos={[
 *   { data: '2026-08-28', titulo: 'Piloto com três fornecedores', status: 'feito' },
 *   { data: '2026-10-09', titulo: 'Fila de exceções no ERP', status: 'andamento' },
 * ]} />
 * ```
 */
export function Timeline({ marcos }: TimelineProps) {
  return (
    <ol className="bd-timeline not-prose">
      {marcos.map((marco, i) => (
        <li key={`${marco.data}-${i}`} className="bd-marco" data-status={marco.status}>
          <span className="bd-marco-ponto" aria-hidden>
            {marco.status === 'feito' && (
              <svg viewBox="0 0 12 12" width="10" height="10">
                <path d="m2.5 6.2 2.2 2.2 4.8-4.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </span>
          <div className="bd-marco-corpo">
            <p className="bd-marco-topo">
              <time dateTime={ehDataIso(marco.data) ? marco.data : undefined}>
                {ehDataIso(marco.data) ? dataCurtaComAno(marco.data) : marco.data}
              </time>
              <span className="bd-marco-estado">{ROTULO[marco.status]}</span>
            </p>
            <p className="bd-marco-titulo">{marco.titulo}</p>
            {marco.descricao && <p className="bd-marco-descricao">{marco.descricao}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
