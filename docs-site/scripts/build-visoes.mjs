#!/usr/bin/env node
/**
 * Gera um site por visão do docs.config.ts, em out-visoes/<visão>/, e confere
 * os links de cada um. É o build que vai para o deploy.
 *
 *   npm run build:visoes
 *   BRAND_FILE=caminho/brand.yml npm run build:visoes
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import config from '../docs.config.ts';

const raiz = resolve(import.meta.dirname, '..');
const destino = join(raiz, 'out-visoes');
function rodar(cmd, args, env = {}) {
  try {
    execFileSync(cmd, args, { cwd: raiz, stdio: 'inherit', env: { ...process.env, ...env } });
  } catch {
    // O comando já mostrou o erro; aqui só para, sem stack trace.
    console.error(`\nbuild:visoes: parou em ${[cmd, ...args].join(' ')}${env.VISAO ? ` (VISAO=${env.VISAO})` : ''}`);
    process.exit(1);
  }
}

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });
rodar('node', ['scripts/marca.mjs']);

for (const [visao, { abas }] of Object.entries(config.visoes)) {
  console.log(`\nbuild:visoes: ${visao} (${abas.join(', ')})`);
  rmSync(join(raiz, 'out'), { recursive: true, force: true });
  rodar('npx', ['next', 'build'], { VISAO: visao });
  if (!existsSync(join(raiz, 'out'))) throw new Error(`o build de ${visao} não gerou out/`);
  renameSync(join(raiz, 'out'), join(destino, visao));
  rodar('node', ['scripts/conferir-links.mjs', join(destino, visao)]);
}

// O prefixo com que o build foi feito, para a imagem servir no mesmo caminho.
writeFileSync(join(destino, 'base.txt'), `${process.env.BASE_PATH ?? ''}\n`);

// A ordem das visões e os papéis de cada uma, para o deploy escolher a pasta de quem entrou.
writeFileSync(
  join(destino, 'visoes.json'),
  `${JSON.stringify(Object.entries(config.visoes).map(([nome, { papeis }]) => ({ nome, papeis })), null, 2)}\n`,
);

console.log(`\nbuild:visoes: ${Object.keys(config.visoes).join(', ')} em out-visoes/`);
