import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import complete, { complete as namedComplete } from 'terraform-mars/complete';
import conjunction, {
  content,
  heading,
  id,
} from 'terraform-mars/sections/mandate-and-completion/conditions-of-completion/conjunction';
import { extractSection } from '../scripts/source.ts';

describe('published modules', () => {
  it('exports the complete document byte-for-byte', () => {
    const source = readFileSync(resolve('Terraform_Mars.md'), 'utf8');
    assert.equal(complete, source);
    assert.equal(namedComplete, source);
  });

  it('exports section objects with matching named exports and unchanged source content', () => {
    const sourceFile = resolve('src/Part I Mandate and completion/§3 Conditions of completion/§3.1 Conjunction.md');
    const extracted = extractSection(readFileSync(sourceFile, 'utf8'), sourceFile);
    assert.equal(id, 'mandate-and-completion/conditions-of-completion/conjunction');
    assert.equal(heading, extracted.heading);
    assert.equal(content, extracted.content);
    assert.deepEqual(conjunction, { id, heading, content });
    assert.match(content, /`A ∧ W ∧ B ∧ D ∧ I ∧ V ∧ H`/);
  });

  it('maps every public JavaScript export to an existing declaration', () => {
    const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
    for (const [subpath, target] of Object.entries(packageJson.exports) as [
      string,
      string | { types: string; import: string },
    ][]) {
      if (typeof target === 'string') continue;
      assert.equal(typeof target.types, 'string', `${subpath} has a types target`);
      assert.equal(typeof target.import, 'string', `${subpath} has an import target`);
      assert.ok(existsSync(resolve(target.types)), `${subpath} declaration exists`);
      assert.ok(existsSync(resolve(target.import)), `${subpath} module exists`);
    }
  });
});
