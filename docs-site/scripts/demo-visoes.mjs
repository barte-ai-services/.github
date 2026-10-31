#!/usr/bin/env node
/**
 * Mostra as visões funcionando, como numa instalação: a imagem da zone (deploy/zone)
 * atrás de um Shell de mentira, que deixa escolher o papel de quem entra.
 *
 *   npm run demo                 build das visões em /docs, imagem, e o Shell em http://localhost:4300
 *   npm run demo -- --sem-build  usa o out-visoes/ e a imagem que já existem
 *
 * O Shell de mentira faz o que o de verdade faz com a zone: descarta o
 * x-barte-access-token que vier do navegador e manda o seu, com os papéis da
 * pessoa. Aqui o token não é assinado e o papel vem de um cookie: é só para ver,
 * nunca para publicar. Precisa do Docker.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import http from 'node:http';
import { join, resolve } from 'node:path';

const raiz = resolve(import.meta.dirname, '..');
const PORTA = Number(process.env.PORT || 4300);
const PORTA_ZONE = 18090;
const IMAGEM = 'docs-zone-demo';
const BASE = '/docs';

function rodar(cmd, args, env = {}) {
  execFileSync(cmd, args, { cwd: raiz, stdio: 'inherit', env: { ...process.env, ...env } });
}

if (!process.argv.includes('--sem-build')) {
  rodar('node', ['scripts/build-visoes.mjs'], { BASE_PATH: BASE });
  rodar('docker', ['build', '-q', '-f', 'deploy/zone/Dockerfile', '-t', IMAGEM, '.']);
}
try {
  execFileSync('docker', ['rm', '-f', IMAGEM], { stdio: 'ignore' });
} catch {}
rodar('docker', ['run', '-d', '--rm', '--name', IMAGEM, '-p', `${PORTA_ZONE}:8080`, IMAGEM]);

// Um papel por visão, o primeiro da lista dela, e a opção sem papel.
const visoes = JSON.parse(readFileSync(join(raiz, 'out-visoes/visoes.json'), 'utf8'));
const papeis = visoes.filter((v) => v.papeis.length > 0).map((v) => ({ papel: v.papeis[0], visao: v.nome }));

const b64 = (dados) => Buffer.from(JSON.stringify(dados)).toString('base64url');
const token = (papel) => `${b64({ alg: 'none' })}.${b64({ realm_access: { roles: [papel] }, preferred_username: 'demo' })}.demo`;

function papelDoCookie(cookie = '') {
  const valor = /(?:^|;\s*)papel=([^;]*)/.exec(cookie)?.[1];
  return valor === undefined ? papeis[0]?.papel : decodeURIComponent(valor);
}

function barra(atual) {
  const opcoes = [...papeis, { papel: '', visao: 'sem acesso' }]
    .map(({ papel, visao }) => {
      const ativo = papel === atual;
      const rotulo = papel ? `${papel} (${visao})` : 'sem papel';
      return `<a href="/_papel?p=${encodeURIComponent(papel)}" style="padding:4px 10px;border-radius:999px;text-decoration:none;font-weight:600;${
        ativo ? 'background:#171717;color:#fefefe' : 'color:#404040;border:1px solid #d4d4d4'
      }">${rotulo}</a>`;
    })
    .join('');
  return `<div style="position:fixed;z-index:2147483647;left:50%;bottom:16px;transform:translateX(-50%);display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;background:#fefefe;border:1px solid #d4d4d4;border-radius:14px;box-shadow:0 8px 24px rgb(0 0 0 / .18);font:500 12px Inter,system-ui,sans-serif;max-width:calc(100vw - 32px)"><span style="color:#737373;padding:0 4px">Entrar como</span>${opcoes}</div>`;
}

const servidor = http.createServer((pedido, resposta) => {
  const url = new URL(pedido.url, `http://localhost:${PORTA}`);

  if (url.pathname === '/') {
    resposta.writeHead(302, { location: `${BASE}/` }).end();
    return;
  }
  if (url.pathname === '/_papel') {
    const papel = url.searchParams.get('p') ?? '';
    const volta = pedido.headers.referer && new URL(pedido.headers.referer).host === url.host ? pedido.headers.referer : `${BASE}/`;
    resposta.writeHead(302, { 'set-cookie': `papel=${encodeURIComponent(papel)}; Path=/; SameSite=Lax`, location: volta }).end();
    return;
  }

  const papel = papelDoCookie(pedido.headers.cookie);
  const cabecalhos = { ...pedido.headers, host: `127.0.0.1:${PORTA_ZONE}` };
  // Como o Shell: o cabeçalho que vem do navegador sai, e entra o da sessão.
  delete cabecalhos['x-barte-access-token'];
  delete cabecalhos['accept-encoding'];
  if (papel && !url.pathname.startsWith(`${BASE}/_next/`)) cabecalhos['x-barte-access-token'] = token(papel);

  const ida = http.request({ host: '127.0.0.1', port: PORTA_ZONE, path: pedido.url, method: pedido.method, headers: cabecalhos }, (volta) => {
    const html = (volta.headers['content-type'] ?? '').startsWith('text/html');
    if (!html) {
      resposta.writeHead(volta.statusCode ?? 502, volta.headers);
      volta.pipe(resposta);
      return;
    }
    const partes = [];
    volta.on('data', (p) => partes.push(p));
    volta.on('end', () => {
      const corpo = Buffer.concat(partes).toString('utf8').replace('</body>', `${barra(papel)}</body>`);
      const { 'content-length': _, ...resto } = volta.headers;
      resposta.writeHead(volta.statusCode ?? 502, resto).end(corpo);
    });
  });
  ida.on('error', () => resposta.writeHead(502).end('a zone não respondeu'));
  pedido.pipe(ida);
});

function parar() {
  try {
    execFileSync('docker', ['rm', '-f', IMAGEM], { stdio: 'ignore' });
  } catch {}
  process.exit(0);
}
process.on('SIGINT', parar);
process.on('SIGTERM', parar);

servidor.listen(PORTA, () => {
  console.log(`\ndemo: http://localhost:${PORTA}${BASE}/`);
  console.log(`demo: papéis ${papeis.map((p) => `${p.papel} (${p.visao})`).join(', ')}, e sem papel`);
  console.log('demo: Ctrl-C para parar (a imagem da zone para junto)');
});
