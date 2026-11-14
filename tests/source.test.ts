import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  discoverSections,
  extractSection,
  slugifyTitle,
  stripHistoricalPrefix,
  validateReferences,
} from '../scripts/source.ts';

describe('source titles', () => {
  it('removes every historical prefix form present in the source tree', () => {
    assert.equal(stripHistoricalPrefix('Part III Capability and resources'), 'Capability and resources');
    assert.equal(stripHistoricalPrefix('§12 Financial and material resources'), 'Financial and material resources');
    assert.equal(
      stripHistoricalPrefix('§12.2 Economic activity as an instrument'),
      'Economic activity as an instrument'
    );
    assert.equal(stripHistoricalPrefix('§23.01 Permanent reporting function'), 'Permanent reporting function');
    assert.equal(stripHistoricalPrefix('§A Initial scientific references'), 'Initial scientific references');
    assert.equal(stripHistoricalPrefix('§A.2 Reference materials'), 'Reference materials');
  });

  it('does not remove meaningful title text', () => {
    assert.equal(stripHistoricalPrefix('Particulate systems'), 'Particulate systems');
    assert.equal(stripHistoricalPrefix('Section 12 resources'), 'Section 12 resources');
    assert.equal(stripHistoricalPrefix('§E Experimental appendix'), '§E Experimental appendix');
  });

  it('normalizes case, diacritics, and separator runs', () => {
    assert.equal(slugifyTitle('Évidence, review & closure'), 'evidence-review-closure');
    assert.throws(() => slugifyTitle('---'), /empty slug/);
  });
});

describe('section extraction', () => {
  it('extracts one heading and preserves body bytes', () => {
    const source = '### A heading\n\nQuotes "here", `code`, and café.\nSecond line.\n';
    assert.deepEqual(extractSection(source, 'section.md'), {
      heading: 'A heading',
      content: 'Quotes "here", `code`, and café.\nSecond line.\n',
      depth: 3,
    });
  });

  it('rejects an unsupported source shape', () => {
    assert.throws(() => extractSection('body only\n', 'section.md'), /leading ATX heading/);
  });
});

describe('source discovery', () => {
  it('uses ancestor paths to disambiguate duplicate titles', () => {
    const root = mkdtempSync(join(tmpdir(), 'terraform-mars-source-'));
    for (const parent of ['Alpha', 'Beta']) {
      const directory = join(root, parent);
      mkdirSync(directory);
      writeFileSync(join(directory, 'content.md'), `# ${parent}\n`);
      writeFileSync(join(directory, 'Shared.md'), '## Shared\n\nBody.\n');
    }
    assert.deepEqual(
      discoverSections(root).map(section => section.id),
      ['alpha', 'alpha/shared', 'beta', 'beta/shared']
    );
  });

  it('rejects full-path collisions introduced by normalization', () => {
    const root = mkdtempSync(join(tmpdir(), 'terraform-mars-collision-'));
    writeFileSync(join(root, 'Evidence.md'), '# Evidence\n');
    writeFileSync(join(root, 'Évidence.md'), '# Évidence\n');
    assert.throws(() => discoverSections(root), /slug collision/);
  });

  it('accepts valid references and reports missing source IDs', () => {
    const sections = [
      { id: 'parent', heading: 'Parent', content: 'See $parent/child.md.\n', file: 'parent.md', depth: 1 },
      { id: 'parent/child', heading: 'Child', content: '', file: 'child.md', depth: 2 },
    ];
    assert.deepEqual(validateReferences(sections), []);
    sections[0].content = 'See $parent/missing.md.\n';
    assert.deepEqual(validateReferences(sections), [{ file: 'parent.md', reference: 'parent/missing' }]);
  });
});
