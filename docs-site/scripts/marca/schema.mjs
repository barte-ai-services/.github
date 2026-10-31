import { z } from 'zod';

/**
 * O `brand.yml`, no schema do Shell: o mesmo arquivo serve aos dois.
 *
 * Cópia de `brandSchema` em barte-ai-services/shell, packages/config/src/schema.ts
 * (commit 17ee87f, 2026-10-06). O schema é `strict`: uma chave que o Shell recusaria,
 * a casca também recusa. Chave nova no Shell entra aqui no mesmo formato.
 *
 * O que a casca usa: `strategy`, `name`, `logo_file`, `favicon_file`, `tokens_file`,
 * `tokens` e `tokens_dark`. `product` e `component_favicon_file` são aceitos e
 * ignorados: o primeiro é do título da aba do Shell, o segundo das UIs dos
 * componentes da plataforma.
 */

const TOKEN_NAME = /^[A-Za-z][A-Za-z0-9-]*$/;
/** Um valor de token CSS. Sem `;`, `{`, `}` ou `<`: o valor não fecha a regra em que entra. */
const TOKEN_VALUE = /^[^;{}<>]+$/;

export const brandSchema = z.strictObject({
  strategy: z.enum(['padrao', 'custom']).default('padrao'),
  name: z.string().min(1).default('Barte'),
  product: z.string().min(1).default('Finance OS'),
  logo_file: z.string().min(1).optional(),
  favicon_file: z.string().min(1).optional(),
  component_favicon_file: z.string().min(1).optional(),
  tokens_file: z.string().min(1).optional(),
  tokens: z.record(z.string().regex(TOKEN_NAME), z.string().regex(TOKEN_VALUE)).default({}),
  tokens_dark: z.record(z.string().regex(TOKEN_NAME), z.string().regex(TOKEN_VALUE)).default({}),
});

export const IMAGE_TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png' };
export const FAVICON_TYPES = { ...IMAGE_TYPES, '.ico': 'image/x-icon' };
