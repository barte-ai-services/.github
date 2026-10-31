import '@fontsource-variable/inter';
import './global.css';
import './marca.generated.css';
import type { Metadata } from 'next';
import { Provider } from '@/components/provider';
import { MARCA } from '@/lib/marca';

export const metadata: Metadata = {
  title: { default: MARCA.name, template: `%s | ${MARCA.name}` },
  // O site é privado: nenhum buscador indexa, e nenhum link externo leva o endereço no Referer.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  referrer: 'no-referrer',
  icons: { icon: MARCA.icone },
};

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
