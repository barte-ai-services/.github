import type { LoaderPlugin } from 'fumadocs-core/source';
import { podar } from './conteudo';

/**
 * OS RASCUNHOS.
 *
 * Uma página com `rascunho: true` no frontmatter ainda não foi escrita. O
 * `npm run dev` a mostra, com um aviso no topo, para quem está escrevendo; o
 * build a deixa de fora. Assim o site sai apresentável com as páginas que já
 * existem, e as do esqueleto esperam a vez sem aparecer vazias.
 *
 * `RASCUNHOS=1` mostra os rascunhos também no build.
 */
export const MOSTRAR_RASCUNHOS = process.env.NODE_ENV === 'development' || process.env.RASCUNHOS === '1';

export function pluginRascunhos(): LoaderPlugin {
  return {
    name: 'rascunhos',
    enforce: 'pre',
    transformStorage({ storage }) {
      if (MOSTRAR_RASCUNHOS) return;
      const rascunhos = new Set(
        [...storage.files.values()]
          .filter((f) => f.format === 'page' && (f.data as { rascunho?: boolean }).rascunho === true)
          .map((f) => f.path),
      );
      podar(storage, (caminho) => rascunhos.has(caminho));
    },
  };
}
