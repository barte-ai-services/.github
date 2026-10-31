'use client';
import SearchDialog from '@/components/search';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { type ReactNode } from 'react';

/** Os textos da interface do Fumadocs em português. As chaves são as de fumadocs-ui/dist/.translations/keys.js. */
const traducoes: Record<string, string> = {
  'Back to Home(404 not found page)': 'Voltar ao início',
  'Close Banner(banner)(aria-label)': 'Fechar o aviso',
  'Close Search(search dialog)(aria-label)': 'Fechar a busca',
  'Close Sidebar(aria-label)': 'Fechar a barra lateral',
  'Close Sidebar(sidebar)(aria-label)': 'Fechar a barra lateral',
  'Collapse Sidebar(sidebar)(aria-label)': 'Recolher a barra lateral',
  'Copied Anchor Link(heading anchor)(aria-label)': 'Link copiado',
  'Copied Link(accordion)(aria-label)': 'Link copiado',
  'Copied Text(code block)(aria-label)': 'Texto copiado',
  'Copy Anchor Link(heading anchor)(aria-label)': 'Copiar o link da seção',
  'Copy Link(accordion)(aria-label)': 'Copiar o link',
  'Copy Text(code block)(aria-label)': 'Copiar o código',
  'Dark(theme switcher)(aria-label)': 'Escuro',
  'Hide Sidebar(sidebar)': 'Recolher a barra lateral',
  'Last updated on(page footer)': 'Atualizado em',
  'Layout Tab(layout tab trigger)': 'Público',
  'Light(theme switcher)(aria-label)': 'Claro',
  'Next Page(pagination)': 'Próxima',
  'No Headings(table of contents)': 'Sem seções',
  'No results found(search dialog)': 'Nenhum resultado',
  'On this page(table of contents)': 'Nesta página',
  'Open Search(search trigger)(aria-label)': 'Abrir a busca',
  'Open Sidebar(aria-label)': 'Abrir a barra lateral',
  'Open Sidebar(sidebar)(aria-label)': 'Abrir a barra lateral',
  'Options(aria-label)': 'Opções',
  'Page Not Found(404 not found page)': 'Página não encontrada',
  'Previous Page(pagination)': 'Anterior',
  'Search(search dialog)': 'Buscar na documentação',
  'Search(search trigger)': 'Buscar',
  'Show Sidebar(sidebar)': 'Mostrar a barra lateral',
  'System(theme switcher)(aria-label)': 'Sistema',
  'Table of Contents(inline table of contents)': 'Nesta página',
  'The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.(404 not found page)':
    'A página pode ter sido removida ou mudado de endereço.',
  'Theme(site menu)': 'Tema',
  'Toggle Menu(home layout header)(aria-label)': 'Abrir o menu',
  'Toggle Theme(theme switcher)(aria-label)': 'Trocar o tema',
};

export function Provider({ children }: { children: ReactNode }) {
  return (
    <RootProvider
      search={{ SearchDialog }}
      // A classe `.dark` é a do Fumadocs; `data-theme` é a do Shell e do brand.yml.
      theme={{ attribute: ['class', 'data-theme'] }}
      i18n={{ locale: 'pt-BR', translations: traducoes }}
    >
      {children}
    </RootProvider>
  );
}
