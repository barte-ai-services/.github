import type { LoaderPlugin } from 'fumadocs-core/source';
import config from '@/docs.config';
import { podar } from './conteudo';

/**
 * A VISÃO DESTE BUILD: o público para quem o site está sendo gerado.
 *
 * Vem de `VISAO` (padrão: a primeira visão do docs.config.ts) e decide que abas
 * entram. As outras saem do conteúdo antes de tudo, e por isso não aparecem em
 * lugar nenhum: nem na árvore que toda página carrega, nem na busca, nem na
 * página inicial.
 */
export const VISAO = process.env.VISAO || Object.keys(config.visoes)[0];

export function abasDaVisao(visao = VISAO): string[] {
  const v = config.visoes[visao];
  if (!v) {
    throw new Error(`VISAO=${visao} não existe em docs.config.ts (visões: ${Object.keys(config.visoes).join(', ')})`);
  }
  return v.abas;
}

/**
 * Plugin do loader: tira do conteúdo as abas que a visão não vê. As abas são as
 * pastas do primeiro nível com `"root": true` no meta.json. Roda antes dos outros.
 */
export function pluginVisao(): LoaderPlugin {
  return {
    name: 'visao',
    enforce: 'pre',
    transformStorage({ storage }) {
      const abas = (storage.folders.get('') ?? []).filter((pasta) => {
        const meta = storage.read(`${pasta}/meta.json`);
        return meta?.format === 'meta' && Boolean((meta.data as { root?: unknown }).root);
      });
      const pedidas = abasDaVisao();
      const faltam = pedidas.filter((aba) => !abas.includes(aba));
      if (faltam.length > 0) {
        throw new Error(
          `docs.config.ts: a visão ${VISAO} pede ${faltam.join(', ')}, que não é aba (abas: ${abas.join(', ') || 'nenhuma'})`,
        );
      }
      const fora = abas.filter((aba) => !pedidas.includes(aba));
      podar(storage, (caminho) => fora.some((aba) => caminho === aba || caminho.startsWith(`${aba}/`)));
    },
  };
}
