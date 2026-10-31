#!/usr/bin/env node
/**
 * Cria o próximo status report, com os KPIs do anterior já listados.
 *
 *   npm run novo-report                  data proposta: o último report mais a cadência
 *   npm run novo-report -- 2026-10-09    data escolhida
 *
 * O arquivo nasce com os valores em branco (`valor: null`, `manchete: ""`): o
 * build recusa o report até tudo estar preenchido, e diz qual campo falta.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import config from '../docs.config.ts';
import { publicar } from './lib/publicar.mjs';

const raiz = resolve(import.meta.dirname, '..');
const pasta = join(raiz, 'content/docs/executivo/reports');
const DIAS = { semanal: 7, quinzenal: 14 };
const ISO = /^\d{4}-\d{2}-\d{2}$/;

function falha(mensagem) {
  console.error(`novo-report: ${mensagem}`);
  process.exit(1);
}

function somarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

function hoje() {
  const agora = new Date();
  return new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())).toISOString().slice(0, 10);
}

mkdirSync(pasta, { recursive: true });
const existentes = readdirSync(pasta)
  .map((nome) => /^(\d{4}-\d{2}-\d{2})\.mdx?$/.exec(nome)?.[1])
  .filter(Boolean)
  .sort();
const ultimo = existentes.at(-1);

const data = process.argv[2] ?? (ultimo ? somarDias(ultimo, DIAS[config.cadencia]) : hoje());
if (!ISO.test(data)) falha(`a data é AAAA-MM-DD (recebi ${data})`);
const arquivo = join(pasta, `${data}.mdx`);
if (existsSync(arquivo)) falha(`${relative(raiz, arquivo)} já existe`);
if (ultimo && data < ultimo) console.warn(`novo-report: ${data} é anterior ao último report (${ultimo}); os números dos seguintes mudam.`);

// Os KPIs do report anterior a esta data, para a série continuar com os mesmos ids.
const anterior = existentes.filter((d) => d < data).at(-1);
let kpis = [];
if (anterior) {
  const texto = readFileSync(join(pasta, `${anterior}.mdx`), 'utf8');
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(texto)?.[1];
  kpis = (frontmatter && parse(frontmatter)?.report?.kpis) || [];
}

const q = (texto) => JSON.stringify(texto);
const linhasKpi = kpis.length
  ? kpis.flatMap((k) => [
      `    - id: ${k.id}`,
      `      rotulo: ${q(k.rotulo)}`,
      `      valor: null  # no report anterior: ${k.valor}`,
      ...(k.unidade ? [`      unidade: ${q(k.unidade)}`] : []),
      ...(k.melhorQuando && k.melhorQuando !== 'maior' ? [`      melhorQuando: ${k.melhorQuando}`] : []),
      ...(k.acumula && k.acumula !== 'soma' ? [`      acumula: ${k.acumula}`] : []),
      ...(k.nota ? [`      nota: ${q(k.nota)}`] : []),
    ])
  : [
      '    - id: exemplo-de-kpi       # minúsculas e hífen; é o que liga o KPI entre reports',
      '      rotulo: ""',
      '      valor: null',
      '      unidade: ""              # BRL, %, h, min ou texto livre',
      '      melhorQuando: maior      # maior | menor',
      '      acumula: soma            # soma | ultimo',
    ];

const conteudo = `---
report:
  status: no-prazo  # no-prazo | em-risco | bloqueado | concluido | em-andamento | nao-iniciado | pausado
  # statusMotivo: uma frase, obrigatória com em-risco ou bloqueado
  manchete: ""  # uma frase: o resultado do período em linguagem de negócio
  kpis:  # de 3 a 5
${linhasKpi.join('\n')}
  entregas:  # o que ficou pronto, em linguagem de negócio
    - titulo: ""
      descricao: ""
  proximos:
    - ""
  decisoes: []  # - decisao: "", contexto: "", prazo: AAAA-MM-DD
---

<Report />
`;

writeFileSync(arquivo, conteudo);
console.log(`novo-report: ${relative(raiz, arquivo)} criado${anterior ? `, com os KPIs de ${anterior}` : ''}.`);
// No primeiro report, a lista e o valor acumulado deixam de ser rascunho.
for (const pagina of ['content/docs/executivo/reports/index.mdx', 'content/docs/executivo/valor-acumulado.mdx']) {
  if (publicar(join(raiz, pagina))) console.log(`novo-report: ${pagina} publicada.`);
}
console.log('Preencha os campos em branco. O build recusa o report até lá e diz o que falta.');
