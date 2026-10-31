import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Card, Cards } from 'fumadocs-ui/components/card';
import { File, Files, Folder } from 'fumadocs-ui/components/files';
import { ImageZoom } from 'fumadocs-ui/components/image-zoom';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';
import { KpiCard, KpiGrid } from './docs/kpi-card';
import { Mermaid } from './docs/mermaid';
import { ListaEntregas, ListaReports, Report, UltimoReport } from './docs/report';
import { StatusBadge } from './docs/status-badge';
import { Timeline } from './docs/timeline';
import { ValorAcumulado } from './docs/valor-acumulado';

/**
 * Os componentes disponíveis em todo MDX, sem import. A referência com exemplos
 * está em content/docs/componentes.mdx (rota /componentes).
 */
export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    img: (props: ComponentProps<'img'>) => <ImageZoom {...(props as ComponentProps<typeof ImageZoom>)} />,
    Callout,
    Card,
    Cards,
    Steps,
    Step,
    Tabs,
    Tab,
    Accordions,
    Accordion,
    Files,
    File,
    Folder,
    KpiCard,
    KpiGrid,
    StatusBadge,
    Timeline,
    Report,
    UltimoReport,
    ListaReports,
    ListaEntregas,
    ValorAcumulado,
    Mermaid,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
