import { readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

export interface SectionSource {
  id: string;
  heading: string;
  content: string;
  file: string;
  depth: number;
}

export interface ReferenceProblem {
  file: string;
  reference: string;
}

const PART_PREFIX = /^Part (?:I|II|III|IV|V|VI|VII) /;
const SECTION_PREFIX = /^§(?:[1-9]\d*|[A-D])(?:\.(?:0[1-9]|[1-9]\d*))? /;
export const HISTORICAL_REFERENCE = /§(?:[1-9]\d*|[A-D])(?:\.(?:0[1-9]|[1-9]\d*))?/g;
export const SLUG_REFERENCE = /\$([a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*)\.md/g;

export function stripHistoricalPrefix(value: string): string {
  return value.replace(PART_PREFIX, '').replace(SECTION_PREFIX, '');
}

export function slugifyTitle(value: string): string {
  const slug = stripHistoricalPrefix(value)
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) throw new Error(`Title produces an empty slug: ${JSON.stringify(value)}`);
  return slug;
}

export function extractSection(source: string, file: string): Pick<SectionSource, 'heading' | 'content' | 'depth'> {
  const match = /^(#{1,6}) ([^\r\n]+)(?:\r?\n|$)/.exec(source);
  if (!match) throw new Error(`Expected a leading ATX heading in ${file}`);

  let content = source.slice(match[0].length);
  if (content.startsWith('\r\n')) content = content.slice(2);
  else if (content.startsWith('\n')) content = content.slice(1);

  return { heading: match[2], content, depth: match[1].length };
}

export function discoverSections(sourceRoot: string): SectionSource[] {
  const sections: SectionSource[] = [];
  const ids = new Map<string, string>();

  function addSection(file: string, pathHeadings: string[], expectedDepth: number): void {
    const source = readFileSync(file, 'utf8');
    const extracted = extractSection(source, file);
    const expectedHeading = pathHeadings[pathHeadings.length - 1];
    if (extracted.heading !== expectedHeading) {
      throw new Error(
        `Heading does not match its source path in ${file}: expected ${JSON.stringify(expectedHeading)}, found ${JSON.stringify(extracted.heading)}`
      );
    }
    if (extracted.depth !== expectedDepth) {
      throw new Error(`Unexpected heading level in ${file}: expected ${expectedDepth}, found ${extracted.depth}`);
    }

    const id = pathHeadings.map(slugifyTitle).join('/');
    const previous = ids.get(id);
    if (previous) throw new Error(`Section slug collision for ${JSON.stringify(id)}: ${previous} and ${file}`);
    ids.set(id, file);
    sections.push({ id, heading: extracted.heading, content: extracted.content, file, depth: extracted.depth });
  }

  function walk(directory: string, parents: string[]): void {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name < right.name ? -1 : left.name > right.name ? 1 : 0
    );
    for (const entry of entries) {
      if (entry.name === 'content.md') continue;
      const path = join(directory, entry.name);
      const rawTitle = entry.isDirectory() ? entry.name : basename(entry.name, extname(entry.name));
      const heading = stripHistoricalPrefix(rawTitle);
      const headings = [...parents, heading];

      if (entry.isDirectory()) {
        const contentFile = join(path, 'content.md');
        addSection(contentFile, headings, headings.length);
        walk(path, headings);
      } else if (entry.isFile() && extname(entry.name) === '.md') {
        addSection(path, headings, headings.length);
      } else {
        throw new Error(`Unsupported source entry: ${path}`);
      }
    }
  }

  walk(sourceRoot, []);
  return sections;
}

export function validateReferences(sections: SectionSource[]): ReferenceProblem[] {
  const ids = new Set(sections.map(section => section.id));
  const problems: ReferenceProblem[] = [];

  for (const section of sections) {
    for (const match of section.content.matchAll(SLUG_REFERENCE)) {
      if (!ids.has(match[1])) problems.push({ file: section.file, reference: match[1] });
    }
  }

  return problems;
}
