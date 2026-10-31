/**
 * Números e datas em pt-BR. As datas são AAAA-MM-DD, lidas em UTC: o dia do
 * arquivo é o dia que aparece, qualquer que seja o fuso de quem faz o build.
 */

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function ehDataIso(texto: string): boolean {
  return ISO.test(texto);
}

function partes(iso: string): [number, number, number] {
  const m = ISO.exec(iso);
  if (!m) throw new Error(`data fora do formato AAAA-MM-DD: ${iso}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** 25 de setembro de 2026 */
export function dataLonga(iso: string): string {
  const [a, m, d] = partes(iso);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** 25 set */
export function dataCurta(iso: string): string {
  const [, m, d] = partes(iso);
  return `${d} ${MESES_CURTOS[m - 1]}`;
}

/** 25 set 2026 */
export function dataCurtaComAno(iso: string): string {
  return `${dataCurta(iso)} ${partes(iso)[0]}`;
}

/** "15 a 26 de setembro de 2026", "28 de agosto a 11 de setembro de 2026" */
export function periodo(inicio: string, fim: string): string {
  const [ai, mi, di] = partes(inicio);
  const [af, mf, df] = partes(fim);
  if (ai !== af) return `${dataLonga(inicio)} a ${dataLonga(fim)}`;
  if (mi !== mf) return `${di} de ${MESES[mi - 1]} a ${df} de ${MESES[mf - 1]} de ${af}`;
  return `${di} a ${df} de ${MESES[mf - 1]} de ${af}`;
}

export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = partes(iso);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

const numero = (casas: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: casas });

/** Casas decimais: nenhuma acima de 100, uma abaixo. */
function casasPara(valor: number): number {
  return Math.abs(valor) >= 100 ? 0 : 1;
}

export interface ValorFormatado {
  prefixo?: string;
  numero: string;
  sufixo?: string;
}

/** O valor de um KPI, separado em prefixo, número e unidade para o desenho. */
export function formatarValor(valor: number, unidade?: string): ValorFormatado {
  if (unidade === 'BRL') {
    const compacto = Math.abs(valor) >= 1_000_000;
    const n = compacto ? valor / 1_000_000 : valor;
    return {
      prefixo: 'R$',
      numero: numero(compacto ? 1 : Math.abs(valor) >= 1000 ? 0 : 2).format(n),
      sufixo: compacto ? 'mi' : undefined,
    };
  }
  if (unidade === '%') return { numero: numero(1).format(valor), sufixo: '%' };
  return { numero: numero(casasPara(valor)).format(valor), sufixo: unidade };
}

/** O valor numa linha só: "R$ 61.900", "91%", "1.460 notas". */
export function valorEmTexto(valor: number, unidade?: string): string {
  const { prefixo, numero: n, sufixo } = formatarValor(valor, unidade);
  const colado = sufixo === '%';
  return [prefixo, colado ? `${n}${sufixo}` : n, colado ? undefined : sufixo].filter(Boolean).join(' ');
}

export type Sentido = 'bom' | 'ruim' | 'neutro';

export interface Variacao {
  /** "+24%", "-0,7 p.p.", "+312" */
  texto: string;
  direcao: 'sobe' | 'desce' | 'igual';
  sentido: Sentido;
}

/**
 * A variação contra o período anterior. Em %, a diferença em pontos
 * percentuais; nas outras unidades, a variação relativa. Sem base (anterior
 * zero), a diferença absoluta.
 */
export function variacao(valor: number, anterior: number, unidade: string | undefined, melhorQuando: 'maior' | 'menor'): Variacao {
  const diferenca = valor - anterior;
  const direcao = diferenca > 0 ? 'sobe' : diferenca < 0 ? 'desce' : 'igual';
  const sentido: Sentido =
    direcao === 'igual' ? 'neutro' : (direcao === 'sobe') === (melhorQuando === 'maior') ? 'bom' : 'ruim';
  const sinal = diferenca > 0 ? '+' : diferenca < 0 ? '−' : '';
  let corpo: string;
  if (unidade === '%') {
    corpo = `${numero(1).format(Math.abs(diferenca))} p.p.`;
  } else if (anterior === 0) {
    corpo = valorEmTexto(Math.abs(diferenca), unidade);
  } else {
    const relativa = (diferenca / Math.abs(anterior)) * 100;
    corpo = `${numero(Math.abs(relativa) >= 10 ? 0 : 1).format(Math.abs(relativa))}%`;
  }
  return { texto: `${sinal}${corpo}`, direcao, sentido };
}
