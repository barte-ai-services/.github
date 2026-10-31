import type { LoaderPlugin } from 'fumadocs-core/source';

type Armazem = Parameters<NonNullable<LoaderPlugin['transformStorage']>>[0]['storage'];

/**
 * Tira do conteúdo os caminhos que `sai` aponta, e depois tudo o que ficou sem
 * página: a pasta só com meta.json, e a aba inteira quando nenhuma página dela
 * sobrou. Os `pages` dos meta.json perdem os nomes que deixaram de existir.
 *
 * Pelo prefixo, e não com storage.delete(pasta, true): o recursivo do
 * Fumadocs 16.16 só desce um nível, e as subpastas sobreviveriam.
 */
export function podar(storage: Armazem, sai: (caminho: string) => boolean) {
  for (const caminho of [...storage.files.keys()]) if (sai(caminho)) storage.files.delete(caminho);

  const temPagina = (pasta: string): boolean =>
    (storage.folders.get(pasta) ?? []).some((filho) =>
      storage.folders.has(filho) ? temPagina(filho) : storage.files.get(filho)?.format === 'page',
    );
  const vazias = [...storage.folders.keys()].filter((pasta) => pasta !== '' && !temPagina(pasta));
  const dentro = (caminho: string) => vazias.some((p) => caminho === p || caminho.startsWith(`${p}/`));
  for (const caminho of [...storage.files.keys()]) if (dentro(caminho)) storage.files.delete(caminho);
  for (const pasta of [...storage.folders.keys()]) if (pasta !== '' && (sai(pasta) || dentro(pasta))) storage.folders.delete(pasta);
  for (const [pasta, filhos] of storage.folders) {
    storage.folders.set(pasta, filhos.filter((f) => storage.files.has(f) || storage.folders.has(f)));
  }

  // Um nome simples no `pages` aponta uma página ou uma pasta; o resto
  // (separadores, "...", "z...a", "!exclusão", links) fica como está.
  for (const arquivo of storage.files.values()) {
    if (arquivo.format !== 'meta' || !Array.isArray(arquivo.data.pages)) continue;
    const pasta = arquivo.path.split('/').slice(0, -1).join('/');
    const junto = (nome: string) => (pasta ? `${pasta}/${nome}` : nome);
    arquivo.data.pages = arquivo.data.pages.filter((nome: string) => {
      if (!/^[\w-]+$/.test(nome)) return true;
      return storage.folders.has(junto(nome)) || storage.files.has(`${junto(nome)}.mdx`) || storage.files.has(`${junto(nome)}.md`);
    });
  }
}
