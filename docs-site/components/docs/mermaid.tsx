'use client';
import { useTheme } from 'next-themes';
import { use, useEffect, useId, useState } from 'react';

/**
 * Um diagrama Mermaid, desenhado no navegador. No MDX basta um bloco de código
 * com a linguagem `mermaid`: o plugin remarkMdxMermaid (lib/source.ts) o troca
 * por este componente. O tema acompanha o claro e o escuro do site.
 *
 * ```mermaid
 * flowchart LR
 *   A[Pedido] --> B{Aprovado?}
 * ```
 */
export function Mermaid({ chart }: { chart: string }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;
  return <Desenho chart={chart} />;
}

const promessas = new Map<string, Promise<unknown>>();
function uma<T>(chave: string, criar: () => Promise<T>): Promise<T> {
  if (!promessas.has(chave)) promessas.set(chave, criar());
  return promessas.get(chave) as Promise<T>;
}

function Desenho({ chart }: { chart: string }) {
  const id = useId().replaceAll(':', '');
  const { resolvedTheme } = useTheme();
  const escuro = resolvedTheme === 'dark';
  const { default: mermaid } = use(uma('mermaid', () => import('mermaid')));
  mermaid.initialize({
    startOnLoad: false,
    // Sem clique nem HTML dentro do diagrama: o texto é só texto.
    securityLevel: 'strict',
    fontFamily: 'inherit',
    theme: escuro ? 'dark' : 'neutral',
  });
  const { svg } = use(uma(`${escuro ? 'escuro' : 'claro'}:${chart}`, () => mermaid.render(`m${id}`, chart.replaceAll('\\n', '\n'))));
  return <div className="bd-mermaid not-prose" dangerouslySetInnerHTML={{ __html: svg }} />;
}
