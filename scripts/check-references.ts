#!/usr/bin/env node

import { resolve } from 'node:path';
import { discoverSections, HISTORICAL_REFERENCE, validateReferences } from './source.ts';

const sourceRoot = resolve(process.argv[2] ?? 'src');

try {
  const sections = discoverSections(sourceRoot);
  const missing = validateReferences(sections);
  const historical = sections.flatMap(section =>
    [...section.content.matchAll(HISTORICAL_REFERENCE)].map(match => ({ file: section.file, reference: match[0] }))
  );

  for (const problem of missing) console.error(`${problem.file}: missing section $${problem.reference}.md`);
  for (const problem of historical) console.error(`${problem.file}: historical reference ${problem.reference}`);

  if (missing.length || historical.length) {
    process.exitCode = 1;
  } else {
    console.log(`Validated ${sections.length} sections and their stable references.`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
