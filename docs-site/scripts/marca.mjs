#!/usr/bin/env node
/**
 * Aplica a marca do `brand.yml` ao site. Roda antes do `dev` e do `build`.
 *
 *   node scripts/marca.mjs                                   ./brand.yml
 *   BRAND_FILE=exemplos/marca-custom/brand.yml node scripts/marca.mjs
 *
 * Gera (tudo fora do git):
 *   app/marca.generated.css     os tokens da marca, com os seletores do Shell
 *   lib/marca.generated.json    nome, estratégia e os caminhos do logo e do ícone
 *   public/marca/               o logo e o ícone copiados do brand.yml
 *
 * O site é estático: trocar a marca é rodar de novo e reconstruir.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { brandCss } from './marca/css.mjs';
import { brandSchema, FAVICON_TYPES, IMAGE_TYPES } from './marca/schema.mjs';

const raiz = resolve(import.meta.dirname, '..');
const arquivo = resolve(raiz, process.env.BRAND_FILE || 'brand.yml');

function falha(mensagem) {
  console.error(`marca: ${mensagem}`);
  process.exit(1);
}

function lerYaml(caminho) {
  if (!existsSync(caminho)) {
    if (process.env.BRAND_FILE) falha(`${caminho} não existe`);
    return {};
  }
  let lido;
  try {
    lido = parse(readFileSync(caminho, 'utf8'));
  } catch (erro) {
    falha(`${caminho}: não é YAML válido (${erro.message})`);
  }
  const doc = lido ?? {};
  const chaves = Object.keys(doc);
  if (chaves.some((chave) => chave !== 'brand')) {
    falha(`${caminho}: a única chave da raiz é \`brand\` (achei: ${chaves.join(', ')})`);
  }
  return doc.brand ?? {};
}

const resultado = brandSchema.safeParse(lerYaml(arquivo));
if (!resultado.success) {
  const linhas = resultado.error.issues.map((i) => `  ${i.path.map(String).join('.') || '(raiz)'}: ${i.message}`);
  falha(`${arquivo}: configuração inválida\n${linhas.join('\n')}`);
}
const marca = resultado.data;

const aoLado = (alvo) => (isAbsolute(alvo) ? alvo : join(dirname(arquivo), alvo));

let tokensArquivo;
if (marca.strategy === 'custom' && marca.tokens_file !== undefined) {
  const caminho = aoLado(marca.tokens_file);
  if (!existsSync(caminho)) falha(`${arquivo}: tokens_file aponta para ${caminho}, que não existe`);
  tokensArquivo = readFileSync(caminho, 'utf8');
}

const publico = join(raiz, 'public/marca');
rmSync(publico, { recursive: true, force: true });
mkdirSync(publico, { recursive: true });

function copiar(campo, alvo, tipos, nome) {
  if (alvo === undefined) return null;
  const origem = aoLado(alvo);
  const ext = extname(origem).toLowerCase();
  if (!existsSync(origem)) falha(`${arquivo}: ${campo} aponta para ${origem}, que não existe`);
  if (!(ext in tipos)) falha(`${arquivo}: ${campo} tem de ser ${Object.keys(tipos).join(', ')}`);
  copyFileSync(origem, join(publico, `${nome}${ext}`));
  return `/marca/${nome}${ext}`;
}

// O ícone padrão é o do Shell: o símbolo da Barte no rosa da marca.
const ICONE_PADRAO = readFileSync(join(raiz, 'scripts/marca/icone-barte.svg'), 'utf8');

const logo = copiar('logo_file', marca.logo_file, IMAGE_TYPES, 'logo');
let icone = copiar('favicon_file', marca.favicon_file, FAVICON_TYPES, 'icone');
if (icone === null) {
  writeFileSync(join(publico, 'icone.svg'), ICONE_PADRAO);
  icone = '/marca/icone.svg';
}
// O ícone dos componentes é do Shell: validado como lá, e não usado aqui.
if (marca.component_favicon_file !== undefined && !existsSync(aoLado(marca.component_favicon_file))) {
  falha(`${arquivo}: component_favicon_file aponta para ${aoLado(marca.component_favicon_file)}, que não existe`);
}

writeFileSync(join(raiz, 'app/marca.generated.css'), brandCss(marca, tokensArquivo));
writeFileSync(
  join(raiz, 'lib/marca.generated.json'),
  `${JSON.stringify({ strategy: marca.strategy, name: marca.name, logo, icone }, null, 2)}\n`,
);

console.log(`marca: ${marca.strategy}, ${marca.name} (${relative(raiz, arquivo) || arquivo})`);
