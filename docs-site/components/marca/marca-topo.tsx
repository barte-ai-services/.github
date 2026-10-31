import { MARCA } from '@/lib/marca';
import { BarteLogo } from './barte-logo';

/**
 * A marca no topo.
 * - `padrao`, sem logo: o logo da Barte e o nome do cliente;
 * - com `logo_file`: o logo do cliente, que já traz o nome;
 * - `custom` sem logo: o nome.
 */
export function MarcaTopo() {
  if (MARCA.logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={MARCA.logo} alt={MARCA.name} className="bd-topo-logo" />;
  }
  return (
    <span className="bd-topo">
      {MARCA.strategy === 'padrao' && (
        <>
          <BarteLogo height={18} />
          <span className="bd-topo-divisor" aria-hidden />
        </>
      )}
      <span className="bd-topo-nome">{MARCA.name}</span>
    </span>
  );
}
