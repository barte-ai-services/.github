#!/usr/bin/env node
/**
 * Confere os links internos de um site exportado: todo href="/..." de toda
 * página tem de existir na mesma pasta. Numa visão, um link para uma aba que
 * ela não vê é um link quebrado, e é aqui que ele aparece.
 *
 *   node scripts/conferir-links.mjs out
 *   node scripts/conferir-links.mjs out-visoes/operacao
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const pasta = resolve(process.argv[2] ?? 'out');
if (!existsSync(pasta)) {
  console.error(`conferir-links: ${pasta} não existe`);
  process.exit(1);
}

// Caminhos que não são páginas.
const IGNORAR = /^\/(_next|marca|images)\/|^\/(busca\.json|robots\.txt|favicon\.ico)$/;

function* paginas(dir) {
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) yield* paginas(caminho);
    else if (nome.endsWith('.html')) yield caminho;
  }
}

// Os links levam o prefixo do BASE_PATH; os arquivos em disco, não.
const BASE = process.env.BASE_PATH ?? '';

/** O caminho existe no site exportado? Recebe o caminho já sem o prefixo. */
function existe(caminho) {
  const limpo = decodeURIComponent(caminho.split(/[?#]/)[0]);
  if (limpo === '' || limpo === '/') return existsSync(join(pasta, 'index.html'));
  const alvo = join(pasta, limpo);
  return [alvo, join(alvo, 'index.html'), `${alvo}.html`].some((c) => existsSync(c) && statSync(c).isFile());
}

const quebrados = [];
for (const arquivo of paginas(pasta)) {
  const html = readFileSync(arquivo, 'utf8');
  // Só os links que a pessoa segue: os <a>. O <link rel="preconnect" href="/"> do Next não é navegação.
  for (const [, href] of html.matchAll(/<a\b[^>]*?\shref="(\/[^"]*)"/g)) {
    if (href.startsWith('//')) continue;
    let caminho = href;
    if (BASE) {
      if (href !== BASE && !href.startsWith(`${BASE}/`)) {
        quebrados.push(`${relative(pasta, arquivo)} -> ${href} (sem o prefixo ${BASE}: sai do site)`);
        continue;
      }
      caminho = href.slice(BASE.length) || '/';
    }
    if (IGNORAR.test(caminho) || existe(caminho)) continue;
    quebrados.push(`${relative(pasta, arquivo)} -> ${href}`);
  }
}

const unicos = [...new Set(quebrados)];
if (unicos.length > 0) {
  console.error(`conferir-links: ${unicos.length} link(s) quebrado(s) em ${relative(process.cwd(), pasta)}:`);
  for (const q of unicos) console.error(`  ${q}`);
  process.exit(1);
}
console.log(`conferir-links: ${relative(process.cwd(), pasta) || pasta} sem link quebrado`);
