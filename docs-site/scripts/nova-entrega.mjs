#!/usr/bin/env node
/**
 * Cria o registro técnico de uma entrega, com as seções já postas.
 *
 *   npm run nova-entrega                  data de hoje
 *   npm run nova-entrega -- 2026-10-09    data escolhida (a mesma do report liga os dois)
 *
 * Cada seção traz um comentário {/* ESCREVER: ... *\/} com o que ela deve conter.
 * O comentário não aparece no site; a verificação final confere que nenhum sobrou.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { publicar } from './lib/publicar.mjs';

const raiz = resolve(import.meta.dirname, '..');
const pasta = join(raiz, 'content/docs/tecnico/entregas');
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function falha(mensagem) {
  console.error(`nova-entrega: ${mensagem}`);
  process.exit(1);
}

const agora = new Date();
const hoje = new Date(Date.UTC(agora.getFullYear(), agora.getMonth(), agora.getDate())).toISOString().slice(0, 10);
const data = process.argv[2] ?? hoje;
const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
if (!m) falha(`a data é AAAA-MM-DD (recebi ${data})`);

mkdirSync(pasta, { recursive: true });
const arquivo = join(pasta, `${data}.mdx`);
if (existsSync(arquivo)) falha(`${relative(raiz, arquivo)} já existe`);

const longa = `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
writeFileSync(
  arquivo,
  `---
title: Entrega de ${longa}
description: ""
---

{/* ESCREVER: description acima, uma frase com o que a entrega trouxe. */}

## O que mudou no sistema

{/* ESCREVER: uma linha por módulo alterado ou criado: o comportamento novo, não o código. Link para a página que aprofunda. */}

## Pull requests

{/* ESCREVER: tabela Número | O que faz. Sem link: o repositório não é do leitor. */}

## Configuração e implantação

{/* ESCREVER: tabela O que | Onde, com o que o TI precisa fazer: variável, permissão, migração. Sem nada a fazer, diga isso numa frase. */}

## Testes

{/* ESCREVER: a saída real da suíte, num bloco de código com o comando no título. */}

## Páginas atualizadas

{/* ESCREVER: links para as páginas das abas que mudaram com esta entrega. */}
`,
);
console.log(`nova-entrega: ${relative(raiz, arquivo)} criado.`);
// No primeiro registro, a lista de entregas deixa de ser rascunho.
if (publicar(join(pasta, 'index.mdx'))) console.log('nova-entrega: content/docs/tecnico/entregas/index.mdx publicada.');
