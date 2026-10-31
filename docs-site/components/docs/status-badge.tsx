import type { ReactNode } from 'react';
import type { Status } from '@/lib/report-schema';

export type { Status };

/** O rótulo de cada status. A cor está em docs.css, por `data-status`. */
export const ROTULO_STATUS: Record<Status, string> = {
  'no-prazo': 'No prazo',
  'em-risco': 'Em risco',
  bloqueado: 'Bloqueado',
  concluido: 'Concluído',
  'em-andamento': 'Em andamento',
  'nao-iniciado': 'Não iniciado',
  pausado: 'Pausado',
};

export interface StatusBadgeProps {
  status: Status;
  /** Troca o texto, mantendo a cor do status. */
  children?: ReactNode;
}

/**
 * O status padronizado de um projeto, frente ou marco.
 *
 * ```mdx
 * <StatusBadge status="em-risco" />
 * <StatusBadge status="concluido">Homologado</StatusBadge>
 * ```
 */
export function StatusBadge({ status, children }: StatusBadgeProps) {
  return (
    <span className="bd-status not-prose" data-status={status}>
      <span className="bd-status-ponto" aria-hidden />
      {children ?? ROTULO_STATUS[status]}
    </span>
  );
}
