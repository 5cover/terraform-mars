#!/usr/bin/env node

import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { discoverSections, HISTORICAL_REFERENCE, validateReferences } from './source.ts';

const root = resolve('.');
const sourceRoot = join(root, 'src');
const distRoot = join(root, 'dist');
const scenarioRoot = join(root, 'scenarios');
const requiredScenarios = [
  'abandoned-server',
  'broken-archive',
  'closed-network',
  'competing-projects',
  'industrialist',
  'international-mandate',
  'living-mars',
  'martian-settlement',
  'millionaire',
  'space-agency',
];
const marker = '<!-- TERRAFORM_MARS_MANDATE -->';

function writeGenerated(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`);
}

function stringModule(name: string, value: string): string {
  return `export const ${name} = ${JSON.stringify(value)}\nexport default ${name}\n`;
}

function stringDeclaration(name: string): string {
  return `export declare const ${name}: string\nexport default ${name}\n`;
}

function sectionModule(id: string, heading: string, content: string): string {
  return `export const id = ${JSON.stringify(id)}\nexport const heading = ${JSON.stringify(heading)}\nexport const content = ${JSON.stringify(content)}\nconst section = { id, heading, content }\nexport default section\n`;
}

function sectionDeclaration(id: string, heading: string): string {
  return `export declare const id: ${JSON.stringify(id)}\nexport declare const heading: ${JSON.stringify(heading)}\nexport declare const content: string\ndeclare const section: { id: typeof id; heading: typeof heading; content: string }\nexport default section\n`;
}

const sections = discoverSections(sourceRoot);
const referenceProblems = validateReferences(sections);
if (referenceProblems.length) {
  throw new Error(
    referenceProblems.map(problem => `${problem.file}: missing section $${problem.reference}.md`).join('\n')
  );
}
for (const section of sections) {
  const historical = section.content.match(HISTORICAL_REFERENCE);
  if (historical) throw new Error(`${section.file}: historical reference ${historical[0]}`);
}

const scenarioNames = readdirSync(scenarioRoot)
  .filter(name => name.endsWith('.md'))
  .map(name => name.slice(0, -3))
  .sort();
if (JSON.stringify(scenarioNames) !== JSON.stringify(requiredScenarios)) {
  throw new Error(`Expected scenarios ${requiredScenarios.join(', ')}, found ${scenarioNames.join(', ')}`);
}

rmSync(distRoot, { recursive: true, force: true });
mkdirSync(distRoot, { recursive: true });

for (const section of sections) {
  const output = join(distRoot, 'sections', section.id);
  writeGenerated(`${output}.js`, sectionModule(section.id, section.heading, section.content));
  writeGenerated(`${output}.d.ts`, sectionDeclaration(section.id, section.heading));
}

const complete = readFileSync(join(root, 'Terraform_Mars.md'), 'utf8');
writeGenerated(join(distRoot, 'complete.js'), stringModule('complete', complete));
writeGenerated(join(distRoot, 'complete.d.ts'), stringDeclaration('complete'));

for (const name of scenarioNames) {
  const framing = readFileSync(join(scenarioRoot, `${name}.md`), 'utf8');
  if (framing.split(marker).length - 1 !== 1) throw new Error(`Scenario ${name} must contain ${marker} exactly once`);
  writeGenerated(join(distRoot, 'scenarios', `${name}.js`), stringModule('framing', framing));
  writeGenerated(join(distRoot, 'scenarios', `${name}.d.ts`), stringDeclaration('framing'));
}

for (const name of ['compose', 'scenario']) {
  writeGenerated(join(distRoot, `${name}.js`), readFileSync(join(root, 'runtime', `${name}.js`), 'utf8'));
  writeGenerated(join(distRoot, `${name}.d.ts`), readFileSync(join(root, 'runtime', `${name}.d.ts`), 'utf8'));
}

writeGenerated(
  join(distRoot, 'index.js'),
  `export { compose } from './compose.js'\nexport { scenario } from './scenario.js'\n`
);
writeGenerated(
  join(distRoot, 'index.d.ts'),
  `export { compose } from './compose.js'\nexport type { Composition, NumberStyle, Section } from './compose.js'\nexport { scenario } from './scenario.js'\n`
);

const exportsMap: Record<string, unknown> = {
  '.': { types: './dist/index.d.ts', import: './dist/index.js', default: './dist/index.js' },
  './complete': { types: './dist/complete.d.ts', import: './dist/complete.js', default: './dist/complete.js' },
  './Terraform_Mars.md': './Terraform_Mars.md',
};
for (const section of sections) {
  exportsMap[`./sections/${section.id}`] = {
    types: `./dist/sections/${section.id}.d.ts`,
    import: `./dist/sections/${section.id}.js`,
    default: `./dist/sections/${section.id}.js`,
  };
}
for (const name of scenarioNames) {
  exportsMap[`./scenarios/${name}`] = {
    types: `./dist/scenarios/${name}.d.ts`,
    import: `./dist/scenarios/${name}.js`,
    default: `./dist/scenarios/${name}.js`,
  };
}
exportsMap['./package.json'] = './package.json';

const packagePath = join(root, 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as Record<string, unknown>;
packageJson.exports = exportsMap;
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

console.log(`Generated ${sections.length} sections, ${scenarioNames.length} scenarios, and the complete document.`);
