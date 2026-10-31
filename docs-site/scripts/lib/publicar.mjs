import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Tira `rascunho: true` do frontmatter de uma página, se ele estiver lá.
 * Devolve true quando a página passou a ser publicada.
 */
export function publicar(arquivo) {
  if (!existsSync(arquivo)) return false;
  const texto = readFileSync(arquivo, 'utf8');
  const fim = texto.startsWith('---\n') ? texto.indexOf('\n---', 4) : -1;
  if (fim < 0) return false;
  const frontmatter = texto.slice(0, fim);
  const sem = frontmatter.replace(/^rascunho:\s*true\s*\n/m, '');
  if (sem === frontmatter) return false;
  writeFileSync(arquivo, sem + texto.slice(fim));
  return true;
}
