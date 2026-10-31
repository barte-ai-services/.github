#!/usr/bin/env node
/**
 * The handbook content the server answers from, bundled at build time.
 *
 * Reads the site's pages (../docs-site/content/docs), the Tech Radar (../docs-site/data/radar.yaml, when
 * present) and the AGENTS.md block (../agents/handbook-block.md), and writes src/generated/content.json.
 * The server never reads GitHub at run time: it answers from what was on main when it was deployed, and
 * every merge to main deploys it again.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parse } from "yaml";

const ROOT = resolve(import.meta.dirname, "..", "..");
const DOCS = join(ROOT, "docs-site", "content", "docs");
const RADAR = join(ROOT, "docs-site", "data", "radar.yaml");
const BLOCK = join(ROOT, "agents", "handbook-block.md");
const OUT = resolve(import.meta.dirname, "..", "src", "generated", "content.json");
const SITE = "https://barte-ai-services.github.io/.github";

function frontmatter(source) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) return { data: {}, body: source };
  return { data: parse(match[1]) ?? {}, body: source.slice(match[0].length) };
}

function readMeta(dir) {
  const path = join(dir, "meta.json");
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : {};
}

/** The pages of a folder, in the order its meta.json lists them, then any it leaves out. */
function walk(dir, section, pages) {
  const meta = readMeta(dir);
  const entries = readdirSync(dir).filter((name) => name !== "meta.json");
  const listed = (meta.pages ?? []).filter((name) => entries.some((e) => e.replace(/\.mdx?$/, "") === name));
  const rest = entries.map((e) => e.replace(/\.mdx?$/, "")).filter((name) => !listed.includes(name));
  for (const name of [...listed, ...rest]) {
    const folder = join(dir, name);
    if (existsSync(folder) && statSync(folder).isDirectory()) {
      walk(folder, section, pages);
      continue;
    }
    const file = [`${folder}.mdx`, `${folder}.md`].find((f) => existsSync(f));
    if (!file) continue;
    const { data, body } = frontmatter(readFileSync(file, "utf8"));
    const slug = relative(DOCS, file)
      .replace(/\.mdx?$/, "")
      .replace(/\/index$/, "")
      .split("\\")
      .join("/");
    pages.push({
      slug,
      section: section.id,
      title: String(data.title ?? name),
      description: String(data.description ?? ""),
      url: `${SITE}/${slug}/`,
      body: body.trim(),
    });
  }
}

const sections = [];
const pages = [];
const rootMeta = readMeta(DOCS);
for (const id of rootMeta.pages ?? []) {
  const dir = join(DOCS, id);
  if (!existsSync(dir)) continue;
  const meta = readMeta(dir);
  const section = { id, title: String(meta.title ?? id), description: String(meta.description ?? "") };
  sections.push(section);
  walk(dir, section, pages);
}

const radar = existsSync(RADAR) ? parse(readFileSync(RADAR, "utf8")) : null;
const rules = readFileSync(BLOCK, "utf8").trim();

mkdirSync(resolve(OUT, ".."), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ site: SITE, commit: process.env.GITHUB_SHA ?? "local", sections, pages, radar, rules }),
);
console.log(`content: ${sections.length} sections, ${pages.length} pages, radar ${radar ? "yes" : "no"}`);
