import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

export const revalidate = false;

// O índice da busca, exportado como arquivo estático em out/busca.json.
export const { staticGET: GET } = createFromSource(source, {
  language: 'portuguese',
});
