import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { MarcaTopo } from '@/components/marca/marca-topo';

/** O que o topo tem em toda página. Sem link para repositório: o site é privado. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <MarcaTopo />, url: '/' },
  };
}
