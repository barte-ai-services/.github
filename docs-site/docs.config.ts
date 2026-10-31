/**
 * A configuração do site que não é marca. A marca está em brand.yml.
 *
 * O arquivo é TypeScript simples, sem import: o scripts/novo-report.mjs também o lê.
 */

export type Cadencia = 'semanal' | 'quinzenal';

/** Uma visão: o site de um público, com só as abas que ele vê. */
export interface Visao {
  /** As abas deste público: as pastas com `"root": true` em content/docs. */
  abas: string[];
  /**
   * Os papéis do Tessera (realm roles) que dão esta visão. Quem tem mais de um
   * papel recebe a primeira visão da lista que casa: a mais ampla vem primeiro.
   * Vazio, a visão não sai para ninguém pelo papel (útil num site sem login).
   */
  papeis: string[];
}

export interface DocsConfig {
  /** O nome do projeto, no topo da página inicial. */
  projeto: string;
  /**
   * De quanto em quanto tempo sai o status report. Muda os textos do report
   * ("Status report quinzenal", "vs. quinzena anterior") e a data que o
   * `npm run novo-report` propõe para o próximo.
   */
  cadencia: Cadencia;
  /**
   * O primeiro dia do projeto, AAAA-MM-DD. É o início do período do primeiro
   * report e o marco zero do valor acumulado.
   */
  inicioProjeto: string;
  /**
   * As visões: um site por público. `npm run build:visoes` gera uma pasta por
   * visão em out-visoes/, e o deploy serve a de cada pessoa pelo papel dela
   * (deploy/zone) ou pelo grupo (deploy/standalone). Quem não vê uma aba não
   * recebe nada dela: nem página, nem título na barra lateral, nem texto na busca.
   *
   * `npm run dev` e `npm run build` usam a primeira visão; `VISAO=operacao npm
   * run dev` mostra outra.
   */
  visoes: Record<string, Visao>;
}

const config: DocsConfig = {
  projeto: 'Handbook de engenharia',
  cadencia: 'quinzenal',
  inicioProjeto: '2026-10-31',
  visoes: {
    // Uma visão só: o site é público, como o repositório, e todos veem as três abas.
    completa: { abas: ['how-we-work'], papeis: [] },
  },
};

export default config;
