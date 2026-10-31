import { DocsLayout } from 'fumadocs-ui/layouts/notebook';
import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

/**
 * As três abas (Executivo, Operação, Técnico) são as pastas com `"root": true`
 * no meta.json. `tabMode="navbar"` as põe no topo; `"sidebar"` as leva para um
 * seletor no alto da barra lateral.
 */
export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <DocsLayout tree={source.getPageTree()} tabMode="navbar" {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
