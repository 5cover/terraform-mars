#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { compose } from '../runtime/compose.js';
import { discoverSections, SLUG_REFERENCE, stripHistoricalPrefix, type SectionSource } from './source.ts';

interface CanonicalSection extends SectionSource {
  displayHeading: string;
  displayLabel?: string;
}

const root = resolve('.');
const sourceRoot = join(root, 'src');
const sections = discoverSections(sourceRoot).map(section => {
  const sourceName =
    basename(section.file) === 'content.md'
      ? basename(dirname(section.file))
      : basename(section.file, extname(section.file));
  if (stripHistoricalPrefix(sourceName) !== section.heading) {
    throw new Error(`Historical source name does not match heading in ${section.file}`);
  }
  const displayLabel = /^(Part (?:I|II|III|IV|V|VI|VII)|\u00a7(?:[1-9]\d*|[A-D])(?:\.(?:0[1-9]|[1-9]\d*))?) /.exec(
    sourceName
  )?.[1];
  return { ...section, displayHeading: sourceName, displayLabel };
});

const labels = new Map(
  sections.filter(section => section.displayLabel).map(section => [section.id, section.displayLabel!])
);

function canonicalContent(section: CanonicalSection): string {
  return section.content.replace(SLUG_REFERENCE, (reference, id) => labels.get(id) ?? reference);
}

function displaySection(section: CanonicalSection) {
  return { id: section.id, heading: section.displayHeading, content: canonicalContent(section) };
}

function heading(level: number, section: CanonicalSection): string {
  const content = canonicalContent(section);
  return `${'#'.repeat(level)} ${section.displayHeading}${content ? `\n\n${content}` : ''}`;
}

const blocks: string[] = [readFileSync(join(sourceRoot, 'content.md'), 'utf8')];
let index = 0;
while (index < sections.length) {
  const section = sections[index];
  if (section.depth !== 1) throw new Error(`Expected a top-level section at ${section.file}`);
  blocks.push(heading(1, section));
  index++;

  const children = [];
  while (index < sections.length && sections[index].depth > 1) {
    const child = sections[index];
    if (child.depth !== 2) throw new Error(`Expected a second-level section at ${child.file}`);
    children.push(displaySection(child));
    index++;

    const grandchildren = [];
    while (index < sections.length && sections[index].depth === 3) {
      grandchildren.push(displaySection(sections[index]));
      index++;
    }
    if (grandchildren.length) children.push(grandchildren);
  }
  if (children.length) blocks.push(compose(children));
}

const complete = compose(blocks);
writeFileSync(join(root, 'Terraform_Mars.md'), complete.endsWith('\n') ? complete : `${complete}\n`);
console.log(`Composed the complete document from ${sections.length} sections.`);
