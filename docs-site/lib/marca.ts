import marca from './marca.generated.json';

/**
 * A marca aplicada no build, gerada de brand.yml por scripts/marca.mjs.
 * `logo` é null quando o brand.yml não traz `logo_file`.
 */
export interface Marca {
  strategy: 'padrao' | 'custom';
  name: string;
  logo: string | null;
  icone: string;
}

/** Um caminho do site com o prefixo do BASE_PATH: o que o Next não prefixa sozinho. */
export function comBase(caminho: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${caminho}`;
}

const lida = marca as Marca;

/** Os caminhos do logo e do ícone já vêm com o prefixo. */
export const MARCA: Marca = {
  ...lida,
  logo: lida.logo ? comBase(lida.logo) : null,
  icone: comBase(lida.icone),
};
