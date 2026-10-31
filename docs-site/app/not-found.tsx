import { HomeLayout } from 'fumadocs-ui/layouts/home';
import Link from 'next/link';
import { baseOptions } from '@/lib/layout.shared';

export default function NotFound() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="bd-inicio">
        <header className="bd-inicio-cabecalho">
          <p className="bd-sobretitulo">Erro 404</p>
          <h1>Página não encontrada</h1>
        </header>
        <Link href="/" className="bd-link-seta">
          Voltar ao início
        </Link>
      </main>
    </HomeLayout>
  );
}
