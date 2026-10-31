import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Handbook } from "./content.js";
import { describe, findTechnology, radarPage } from "./radar.js";
import { search } from "./search.js";

const RADAR_SLUG = "specifications/tech-radar";
const READ_ONLY = { readOnlyHint: true, openWorldHint: false } as const;

function text(body: string) {
  return { content: [{ type: "text" as const, text: body }] };
}

function refusal(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

// Every tool only reads the handbook bundled at build time.
export function registerTools(server: McpServer, handbook: Handbook): void {
  server.registerTool(
    "get_rules",
    {
      title: "As regras do handbook",
      description:
        "The Barte engineering handbook rules every AI follows, one line each, with the precedence rule. Read this before any engineering work in a Barte repository.",
      annotations: READ_ONLY,
    },
    () => text(`${handbook.rules}\n\nVersão do handbook: ${handbook.commit}. Site: ${handbook.site}/`),
  );

  server.registerTool(
    "list_sections",
    {
      title: "As seções do handbook",
      description:
        "Lists the handbook's sections and every page in them, with the slug read_page takes and the public URL.",
      annotations: READ_ONLY,
    },
    () => {
      const lines = handbook.sections.flatMap((section) => [
        `## ${section.title} (${section.id})`,
        section.description,
        ...handbook.pages
          .filter((page) => page.section === section.id)
          .map((page) => `- \`${page.slug}\`: ${page.title}. ${page.description}`),
        ...(section.id === "specifications" && handbook.radar
          ? [`- \`${RADAR_SLUG}\`: Tech Radar. As tecnologias homologadas, por anel.`]
          : []),
        "",
      ]);
      return text(lines.join("\n"));
    },
  );

  server.registerTool(
    "read_page",
    {
      title: "Ler uma página",
      description: "Returns one handbook page in full, by the slug list_sections or search gave.",
      inputSchema: { slug: z.string().describe("The page slug, e.g. how-we-work/pull-requests") },
      annotations: READ_ONLY,
    },
    ({ slug }) => {
      const wanted = slug.replace(/^\/+|\/+$/g, "");
      if (wanted === RADAR_SLUG && handbook.radar) {
        return text(`# Tech Radar\n\n${radarPage(handbook.radar)}\n\nFonte: ${handbook.site}/${RADAR_SLUG}/`);
      }
      const page = handbook.pages.find((p) => p.slug === wanted);
      if (!page) return refusal(`Não há página «${slug}». Use list_sections para ver as páginas.`);
      return text(`# ${page.title}\n\n${page.description}\n\n${page.body}\n\nFonte: ${page.url}`);
    },
  );

  server.registerTool(
    "search",
    {
      title: "Buscar no handbook",
      description:
        "Searches every handbook page (processes, specifications, guardrails) for the words given, in pt-BR or English, and returns the best pages with an excerpt.",
      inputSchema: {
        query: z.string().min(1).describe("Words to look for, e.g. paginação, idempotência, auto-merge"),
        limit: z.number().int().min(1).max(20).optional(),
      },
      annotations: READ_ONLY,
    },
    ({ query, limit }) => {
      const hits = search(handbook.pages, query, limit ?? 5);
      if (hits.length === 0) return text(`Nada no handbook para «${query}».`);
      return text(
        hits.map((hit) => `- \`${hit.slug}\` ${hit.title} (${hit.url})\n  ${hit.excerpt}`).join("\n"),
      );
    },
  );

  server.registerTool(
    "check_technology",
    {
      title: "Consultar o Tech Radar",
      description:
        "Says whether a technology is approved at Barte: its ring (adopt, trial, assess, hold), what it is for, how to use it in a project, and what to use instead when it is on hold.",
      inputSchema: { technology: z.string().min(1).describe("A technology name, e.g. Temporal, LocalStack") },
      annotations: READ_ONLY,
    },
    ({ technology }) => {
      const radar = handbook.radar;
      if (!radar) return refusal("O Tech Radar ainda não foi publicado no handbook.");
      const found = findTechnology(radar, technology);
      if (found.length === 0) {
        return text(
          `«${technology}» não está no Tech Radar: não é homologada. Usar uma tecnologia fora do radar pede um ADR no projeto e um PR no radar.`,
        );
      }
      return text(found.map((t) => describe(radar, t)).join("\n\n"));
    },
  );
}
