import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/**
 * O prefixo em que o site é servido: vazio na raiz de um domínio, `/docs` como
 * zone do Shell numa instalação, `/.github` no GitHub Pages deste repositório.
 * Vem de BASE_PATH no build.
 */
const basePath = process.env.BASE_PATH ?? '';
if (basePath && !/^\/[a-z0-9.][a-z0-9.-]*$/.test(basePath)) {
  throw new Error(`BASE_PATH=${basePath}: use um caminho como /docs, sem barra no fim`);
}

/**
 * Site estático: `npm run build` gera out/, servido por qualquer servidor de
 * arquivos atrás do login. Nada depende de servidor Node.
 *
 * @type {import('next').NextConfig}
 */
const config = {
  output: 'export',
  basePath: basePath || undefined,
  // O prefixo, para o que o Next não prefixa sozinho: a busca e os arquivos da marca.
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  // Cada página vira pasta/index.html, o formato que S3, nginx e afins servem sem regra extra.
  trailingSlash: true,
  // O otimizador de imagem do Next precisa de servidor.
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default withMDX(config);
