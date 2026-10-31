#!/usr/bin/env node
/**
 * Gera a página do Tech Radar a partir de `data/radar.yaml`. Roda antes do
 * `dev`, do `build` e do `types:check`.
 *
 *   node scripts/radar.mjs
 *   RADAR_FILE=outro/radar.yaml node scripts/radar.mjs
 *
 * Gera (fora do git):
 *   content/docs/specifications/tech-radar.mdx
 *
 * O YAML é a fonte única: o site lê daqui, e um servidor MCP vai ler o mesmo
 * arquivo. Um YAML inválido (anel ou quadrante que não existe, id repetido,
 * campo obrigatório faltando) para o build com a lista dos erros.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { parse } from 'yaml';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, process.env.RADAR_FILE || 'data/radar.yaml');
const target = resolve(root, 'content/docs/specifications/tech-radar.mdx');

function fail(message) {
  console.error(`radar: ${message}`);
  process.exit(1);
}

if (!existsSync(source)) fail(`${source} não existe`);
let doc;
try {
  doc = parse(readFileSync(source, 'utf8')) ?? {};
} catch (error) {
  fail(`${source}: não é YAML válido (${error.message})`);
}

// --- validação -------------------------------------------------------------

const errors = [];
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function list(key) {
  const value = doc[key];
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`\`${key}\` tem de ser uma lista não vazia`);
    return [];
  }
  return value;
}

function checkFields(item, where, required, optional = []) {
  if (item === null || typeof item !== 'object' || Array.isArray(item)) {
    errors.push(`${where}: tem de ser um objeto`);
    return false;
  }
  for (const field of required) {
    if (!isText(item[field])) errors.push(`${where}: \`${field}\` é obrigatório`);
  }
  for (const field of optional) {
    if (item[field] !== undefined && !isText(item[field])) errors.push(`${where}: \`${field}\` tem de ser texto`);
  }
  const known = new Set([...required, ...optional]);
  for (const field of Object.keys(item)) {
    if (!known.has(field)) errors.push(`${where}: campo desconhecido \`${field}\``);
  }
  return true;
}

function uniqueIds(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!item || !isText(item.id)) continue;
    if (!KEBAB.test(item.id)) errors.push(`${label} \`${item.id}\`: o id tem de ser kebab-case`);
    if (seen.has(item.id)) errors.push(`${label} \`${item.id}\`: id repetido`);
    seen.add(item.id);
  }
  return seen;
}

const allowedRoot = new Set(['rings', 'quadrants', 'technologies', 'drift']);
for (const key of Object.keys(doc)) {
  if (!allowedRoot.has(key)) errors.push(`chave desconhecida na raiz: \`${key}\``);
}

const rings = list('rings');
rings.forEach((ring, i) => checkFields(ring, `rings[${i}]`, ['id', 'name', 'description']));
const ringIds = uniqueIds(rings, 'anel');

const quadrants = list('quadrants');
quadrants.forEach((quadrant, i) => checkFields(quadrant, `quadrants[${i}]`, ['id', 'name'], ['description']));
const quadrantIds = uniqueIds(quadrants, 'quadrante');

const technologies = list('technologies');
technologies.forEach((tech, i) => {
  const where = `technologies[${i}]${tech && isText(tech.id) ? ` (${tech.id})` : ''}`;
  if (!checkFields(tech, where, ['id', 'name', 'quadrant', 'ring', 'what', 'how'], ['version', 'replaces'])) return;
  if (isText(tech.ring) && !ringIds.has(tech.ring)) errors.push(`${where}: o anel \`${tech.ring}\` não existe`);
  if (isText(tech.quadrant) && !quadrantIds.has(tech.quadrant)) {
    errors.push(`${where}: o quadrante \`${tech.quadrant}\` não existe`);
  }
});
const techIds = uniqueIds(technologies, 'tecnologia');
for (const tech of technologies) {
  if (tech && isText(tech.replaces)) {
    if (!techIds.has(tech.replaces)) errors.push(`tecnologia \`${tech.id}\`: \`replaces\` aponta para \`${tech.replaces}\`, que não existe`);
    if (tech.replaces === tech.id) errors.push(`tecnologia \`${tech.id}\`: \`replaces\` aponta para ela mesma`);
  }
}

const drift = doc.drift ?? [];
if (!Array.isArray(drift)) errors.push('`drift` tem de ser uma lista');
else drift.forEach((entry, i) => checkFields(entry, `drift[${i}]`, ['name', 'versions'], ['note']));

if (errors.length > 0) fail(`${source}: radar inválido\n${errors.map((e) => `  ${e}`).join('\n')}`);

// --- geração ---------------------------------------------------------------

// Texto do YAML numa célula de tabela MDX: o código entre crases fica como está;
// fora dele, escapamos o que o MDX leria como JSX ou o que quebraria a tabela.
function cell(text) {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replace(/[{}<>]/g, (c) => `\\${c}`)))
    .join('')
    .replace(/\|/g, '\\|');
}

const byId = new Map(technologies.map((tech) => [tech.id, tech]));
const label = (tech) => `**${cell(tech.name)}**${tech.version ? ` (${cell(tech.version)})` : ''}`;

const lines = [
  '---',
  'title: Tech Radar',
  'description: As tecnologias homologadas na Barte, em que anel cada uma está e como usar num projeto',
  '---',
  '',
  `{/* Gerado por scripts/radar.mjs a partir de data/radar.yaml. Não edite aqui: edite o YAML. */}`,
  '',
  'O Tech Radar diz quais tecnologias são homologadas na Barte: as que um projeto novo usa sem pedir licença, as que estão em teste num módulo, as que estamos avaliando e as que não devem entrar em nada novo. Para cada uma, ele diz para que serve aqui e como usar num projeto.',
  '',
  '| Anel | O que quer dizer |',
  '|------|------------------|',
  ...rings.map((ring) => `| [${cell(ring.name)}](#${ring.id}) | ${cell(ring.description)} |`),
  '',
  'Mudar uma tecnologia de anel é um pull request em `docs-site/data/radar.yaml`, neste repositório, e quem decide é a liderança de plataforma. A página é gerada desse arquivo.',
  '',
];

for (const ring of rings) {
  const hold = ring.id === 'hold';
  lines.push(`## ${cell(ring.name)} [#${ring.id}]`, '', cell(ring.description), '');
  for (const quadrant of quadrants) {
    const items = technologies.filter((tech) => tech.ring === ring.id && tech.quadrant === quadrant.id);
    if (items.length === 0) continue;
    lines.push(`### ${cell(quadrant.name)} [#${ring.id}-${quadrant.id}]`, '');
    if (quadrant.description) lines.push(cell(quadrant.description), '');
    lines.push(
      hold ? '| Tecnologia | Para quê | Como usar | Use no lugar |' : '| Tecnologia | Para quê | Como usar |',
      hold ? '|------------|----------|-----------|--------------|' : '|------------|----------|-----------|',
    );
    for (const tech of items) {
      const row = [label(tech), cell(tech.what), cell(tech.how)];
      if (hold) row.push(tech.replaces ? label(byId.get(tech.replaces)) : '—');
      lines.push(`| ${row.join(' | ')} |`);
    }
    lines.push('');
  }
}

if (Array.isArray(drift) && drift.length > 0) {
  lines.push(
    '## Versões a padronizar [#drift]',
    '',
    'Tecnologias homologadas que hoje convivem em mais de uma versão nos repositórios.',
    '',
    '| Tecnologia | Versões em uso | Observação |',
    '|------------|----------------|------------|',
    ...drift.map((entry) => `| **${cell(entry.name)}** | ${cell(entry.versions)} | ${entry.note ? cell(entry.note) : '—'} |`),
    '',
  );
}

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, lines.join('\n'));
console.log(`radar: ${relative(root, target)} (${technologies.length} tecnologias)`);
