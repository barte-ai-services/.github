/**
 * A folha de marca: o arquivo de tokens, se houver, e por cima as sobreposições
 * do `brand.yml`.
 *
 * Porte de `brandCss` em barte-ai-services/shell, packages/config/src/brand.ts
 * (commit 17ee87f). Os seletores são os mesmos do Shell: `:root:root` vence o
 * `:root` do design system em qualquer ordem de folha, e o tema escuro troca os
 * mesmos tokens em `[data-theme="dark"]`. A casca liga esse atributo junto com a
 * classe `.dark` do Fumadocs (components/provider.tsx), e por isso a folha serve
 * sem adaptação.
 *
 * `padrao` devolve uma folha vazia: o design system já é a marca.
 */
export function brandCss(brand, tokensFileContent) {
  if (brand.strategy !== 'custom') {
    return '/* marca: padrao */\n';
  }
  const parts = ['/* marca: custom */'];
  if (tokensFileContent !== undefined) {
    parts.push(tokensFileContent.trim());
  }
  const rule = (selector, tokens) => {
    const lines = Object.entries(tokens).map(([name, value]) => `  --${name}: ${value};`);
    if (lines.length > 0) {
      parts.push(`${selector} {\n${lines.join('\n')}\n}`);
    }
  };
  rule(':root:root', brand.tokens);
  rule(':root:root[data-theme="dark"]', brand.tokens_dark);
  const before = parts.length;
  rule(':root:root[data-theme="system"]', brand.tokens_dark);
  if (parts.length > before) {
    parts.push(`@media (prefers-color-scheme: dark) {\n${parts.pop()}\n}`);
  }
  return `${parts.join('\n\n')}\n`;
}
