import { z } from 'zod';
import { pageSchema } from 'fumadocs-core/source/schema';

/**
 * O FRONTMATTER DO STATUS REPORT.
 *
 * O report é dado, não texto: cada `executivo/reports/AAAA-MM-DD.mdx` traz um
 * bloco `report:` e o corpo `<Report />`. O build recusa o report fora do
 * formato, com a mensagem do campo errado. É o que deixa um agente gerar o
 * report preenchendo dados sem quebrar a estrutura fixa.
 */

/** Uma data AAAA-MM-DD. O YAML lê `2026-09-25` sem aspas como data: aceita os dois. */
export const dataIso = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'data no formato AAAA-MM-DD'), z.date()])
  .transform((valor) => (typeof valor === 'string' ? valor : valor.toISOString().slice(0, 10)));

export const STATUS = ['no-prazo', 'em-risco', 'bloqueado', 'concluido', 'em-andamento', 'nao-iniciado', 'pausado'] as const;
export const statusSchema = z.enum(STATUS);
export type Status = z.infer<typeof statusSchema>;

export const kpiSchema = z.strictObject({
  /** Identifica o KPI entre reports: é por ele que o anterior e o acumulado se encontram. */
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id em minúsculas e hífen: horas-poupadas'),
  rotulo: z.string().min(1, 'escreva o rótulo do KPI'),
  valor: z.number({ error: 'preencha o valor do período (um número)' }),
  /** `BRL`, `%`, `h`, `min` ou um texto livre (`notas`). */
  unidade: z.string().min(1, 'unidade vazia: apague a linha ou use BRL, %, h, min ou um texto').optional(),
  /** O valor do período anterior. Sem ele, vem do KPI de mesmo `id` no report anterior. */
  anterior: z.number().optional(),
  /** O sentido de "bom": `maior` para horas poupadas, `menor` para tempo de lançamento. */
  melhorQuando: z.enum(['maior', 'menor']).default('maior'),
  /** Como entra no valor acumulado: `soma` (horas poupadas) ou `ultimo` (taxa de automação). */
  acumula: z.enum(['soma', 'ultimo']).default('soma'),
  /** Uma linha de contexto abaixo do número. */
  nota: z.string().min(1).optional(),
});
export type KpiDados = z.infer<typeof kpiSchema>;

/** Um item de lista: texto só, ou título com descrição. */
const itemSchema = z.union(
  [
    z.string().min(1).transform((titulo) => ({ titulo, descricao: undefined as string | undefined })),
    z.strictObject({
      titulo: z.string().min(1, 'escreva o título'),
      descricao: z.string().min(1, 'escreva a descrição, ou apague a linha').optional(),
    }),
  ],
  { error: 'item vazio: escreva um texto, ou titulo e descricao' },
);

export const decisaoSchema = z.strictObject({
  decisao: z.string().min(1, 'escreva a decisão'),
  contexto: z.string().min(1).optional(),
  prazo: dataIso.optional(),
});

export const reportSchema = z
  .strictObject({
    status: statusSchema,
    /** Uma frase sobre o status. Obrigatória em `em-risco` e `bloqueado`: o badge não aparece sem o porquê. */
    statusMotivo: z.string().min(1).max(240).optional(),
    /** O primeiro dia do período. Sem ele, o dia seguinte ao report anterior (ou o início do projeto). */
    inicio: dataIso.optional(),
    /** Uma frase: o que um executivo precisa saber se ler só isto. */
    manchete: z
      .string()
      .min(1, 'escreva a manchete')
      .max(220, 'a manchete tem no máximo 220 caracteres')
      .refine((m) => (m.match(/[.!?](\s|$)/g) ?? []).length <= 1, 'a manchete é uma frase só'),
    kpis: z.array(kpiSchema).min(3, 'o report tem de 3 a 5 KPIs').max(5, 'o report tem de 3 a 5 KPIs'),
    /** As entregas do período, em linguagem de negócio. */
    entregas: z.array(itemSchema).min(1, 'liste ao menos uma entrega'),
    proximos: z.array(itemSchema).min(1, 'liste ao menos um próximo passo'),
    /** O que o projeto precisa que o cliente decida. Vazio quando não há nada. */
    decisoes: z.array(decisaoSchema).default([]),
  })
  .superRefine((report, ctx) => {
    if ((report.status === 'em-risco' || report.status === 'bloqueado') && !report.statusMotivo) {
      ctx.addIssue({ code: 'custom', path: ['statusMotivo'], message: `com status ${report.status}, diga o porquê em statusMotivo` });
    }
    const vistos = new Set<string>();
    report.kpis.forEach((kpi, i) => {
      if (vistos.has(kpi.id)) ctx.addIssue({ code: 'custom', path: ['kpis', i, 'id'], message: `KPI repetido: ${kpi.id}` });
      vistos.add(kpi.id);
    });
  });
export type ReportDados = z.infer<typeof reportSchema>;

/**
 * O schema das páginas: o do Fumadocs, com o bloco `report` opcional. O título
 * do report é calculado (Status report nº 07) e por isso não é exigido nele.
 */
export const paginaSchema = pageSchema
  .extend({
    title: z.string().optional(),
    /** Página do esqueleto ainda não escrita: aparece no `npm run dev`, fica fora do build. */
    rascunho: z.boolean().optional(),
    report: reportSchema.optional(),
  })
  .superRefine((pagina, ctx) => {
    if (pagina.title === undefined && pagina.report === undefined) {
      ctx.addIssue({ code: 'custom', path: ['title'], message: 'toda página tem `title` (só o report o dispensa)' });
    }
  });
