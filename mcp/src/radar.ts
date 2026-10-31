import type { Radar, Technology } from "./content.js";
import { fold } from "./text.js";

/** A technology by its id or its name, ignoring case and accents; then by a name that contains the query. */
export function findTechnology(radar: Radar, query: string): Technology[] {
  const wanted = fold(query.trim());
  if (wanted === "") return [];
  const exact = radar.technologies.filter((t) => fold(t.id) === wanted || fold(t.name) === wanted);
  if (exact.length > 0) return exact;
  return radar.technologies.filter((t) => fold(t.name).includes(wanted) || fold(t.id).includes(wanted));
}

export function describe(radar: Radar, technology: Technology): string {
  const ring = radar.rings.find((r) => r.id === technology.ring);
  const lines = [
    `**${technology.name}**: ${ring?.name ?? technology.ring}${ring ? ` (${ring.description})` : ""}`,
    `- Para quê: ${technology.what}`,
    `- Como usar: ${technology.how}`,
  ];
  if (technology.version) lines.push(`- Versão: ${technology.version}`);
  if (technology.replaces) {
    const instead = radar.technologies.find((t) => t.id === technology.replaces);
    lines.push(`- Use no lugar: ${instead?.name ?? technology.replaces}`);
  }
  return lines.join("\n");
}

/** The radar as one page, for read_page on specifications/tech-radar. */
export function radarPage(radar: Radar): string {
  return radar.rings
    .map((ring) => {
      const items = radar.technologies.filter((t) => t.ring === ring.id);
      return [`## ${ring.name}`, ring.description, ...items.map((t) => describe(radar, t))].join("\n\n");
    })
    .join("\n\n");
}
