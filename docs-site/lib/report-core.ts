import type { LoaderPlugin } from 'fumadocs-core/source';
import { dataCurta, dataCurtaComAno } from './formato';

/**
 * A NUMERAÇÃO DOS REPORTS.
 *
 * Um report é um arquivo `executivo/reports/AAAA-MM-DD.mdx`. O número é a
 * posição dele em ordem de data, e ninguém o digita: um report inserido entre
 * dois renumera os seguintes no build.
 */

export const PASTA_REPORTS = 'executivo/reports';
const ARQUIVO_REPORT = /^executivo\/reports\/(\d{4}-\d{2}-\d{2})\.mdx?$/;

/**
 * O registro técnico de uma entrega: `tecnico/entregas/AAAA-MM-DD.mdx`. Quando a
 * data coincide com a de um report, o report aponta para ele.
 */
export const PASTA_ENTREGAS = 'tecnico/entregas';
const ARQUIVO_ENTREGA = /^tecnico\/entregas\/(\d{4}-\d{2}-\d{2})\.mdx?$/;

export function dataDaEntrega(caminho: string): string | null {
  return ARQUIVO_ENTREGA.exec(caminho.replaceAll('\\', '/'))?.[1] ?? null;
}

/** A data do report, tirada do nome do arquivo. `null` se o arquivo não é um report. */
export function dataDoReport(caminho: string): string | null {
  return ARQUIVO_REPORT.exec(caminho.replaceAll('\\', '/'))?.[1] ?? null;
}

export function numeroFormatado(numero: number): string {
  return String(numero).padStart(2, '0');
}

/** "Status report nº 07": o título da página, da aba do navegador e da busca. */
export function tituloDoReport(numero: number): string {
  return `Status report nº ${numeroFormatado(numero)}`;
}

/** "Nº 07, 26 set": o nome na barra lateral. */
export function nomeNaBarra(numero: number, data: string): string {
  return `Nº ${numeroFormatado(numero)}, ${dataCurta(data)}`;
}

/**
 * Plugin do loader: dá a cada report o título calculado, a manchete como
 * descrição (para a busca) e o nome curto na barra lateral; e ao registro de
 * entrega, a data como nome na barra.
 */
export function pluginReports(): LoaderPlugin {
  const numeros = new Map<string, { numero: number; data: string }>();
  return {
    name: 'status-reports',
    transformStorage({ storage }) {
      numeros.clear();
      const reports = [...storage.files.values()]
        .flatMap((arquivo) => {
          if (arquivo.format !== 'page') return [];
          const data = dataDoReport(arquivo.path);
          return data ? [{ arquivo, data }] : [];
        })
        .sort((a, b) => a.data.localeCompare(b.data));
      reports.forEach(({ arquivo, data }, i) => {
        const dados = arquivo.data as { title?: string; description?: string; report?: { manchete: string } };
        dados.title = tituloDoReport(i + 1);
        dados.description ??= dados.report?.manchete;
        numeros.set(arquivo.path, { numero: i + 1, data });
      });
    },
    transformPageTree: {
      file(node, caminho) {
        const report = caminho ? numeros.get(caminho) : undefined;
        if (report) node.name = nomeNaBarra(report.numero, report.data);
        // O registro de entrega aparece na barra só pela data: "25 set 2026".
        const entrega = caminho ? dataDaEntrega(caminho) : null;
        if (entrega) node.name = dataCurtaComAno(entrega);
        return node;
      },
    },
  };
}
