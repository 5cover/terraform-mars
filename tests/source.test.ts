import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { extractSection, slugifyTitle, stripHistoricalPrefix } from '../scripts/source.ts';

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
