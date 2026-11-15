import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compose, type Section } from 'terraform-mars';

const section = (heading: string, content = ''): Section => ({ id: heading.toLowerCase(), heading, content });

describe('compose', () => {
  it('emits a literal string as supplied', () => {
    assert.equal(compose('opening text\n'), 'opening text\n');
  });

  it('renders unnumbered sections from heading and unchanged content', () => {
    const content = 'Body with $stable/reference.md and `code`.\n';
    assert.equal(compose(section('Heading', content)), `## Heading\n\n${content}`);
  });

  it('rewrites forward references when the target has a unique generated number', () => {
    const first = { id: 'first', heading: 'First', content: 'See $second.md and $omitted.md.\n' };
    const second = { id: 'second', heading: 'Second', content: '' };
    const output = compose({ number: 'arab', prefix: '\u00a7', children: [first, second] });
    assert.equal(output, '## \u00a71 First\n\nSee \u00a72 and $omitted.md.\n\n## \u00a72 Second');
  });

  it('rewrites references in literal strings and leaves unnumbered targets stable', () => {
    const target = { id: 'target', heading: 'Target', content: '' };
    assert.equal(compose(['See $target.md.', target]), 'See $target.md.\n\n## Target');
    assert.equal(compose({ number: 'latin', children: ['See $target.md.', target] }), 'See A.\n\n## A Target');
  });

  it('renders Roman, Arabic, and Latin counters', () => {
    assert.equal(
      compose({ number: 'roman', prefix: 'Part ', children: [section('One'), section('Two')] }),
      '## Part I One\n\n## Part II Two'
    );
    assert.equal(
      compose({ number: 'arab', prefix: '\u00a7', children: [section('One'), section('Two')] }),
      '## \u00a71 One\n\n## \u00a72 Two'
    );
    assert.match(
      compose({ number: 'latin', children: Array.from({ length: 27 }, (_, index) => section(String(index))) }),
      /## Z 25\n\n## AA 26$/
    );
  });

  it('inherits same-style numbering through nested arrays and resets sibling scopes', () => {
    const output = compose({
      number: 'arab',
      prefix: '\u00a7',
      children: [
        section('First'),
        [section('First child'), section('Second child')],
        section('Second'),
        [section('Reset child')],
      ],
    });
    assert.equal(
      output,
      '## \u00a71 First\n\n### \u00a71.1 First child\n\n### \u00a71.2 Second child\n\n## \u00a72 Second\n\n### \u00a72.1 Reset child'
    );
  });

  it('starts a new display lineage when the number style is overridden', () => {
    const output = compose({
      number: 'roman',
      prefix: 'Part ',
      children: [
        section('Capability', 'See $finance.md.\n'),
        [
          {
            number: 'arab',
            prefix: '\u00a7',
            children: [section('Finance'), [section('Economic activity')]],
          },
        ],
      ],
    });
    assert.equal(
      output,
      '## Part I Capability\n\nSee \u00a71.\n\n### \u00a71 Finance\n\n#### \u00a71.1 Economic activity'
    );
  });

  it('distinguishes inherited undefined numbering from disabled null numbering', () => {
    const output = compose({
      number: 'arab',
      prefix: '\u00a7',
      children: [
        section('First'),
        'transition',
        { number: null, children: section('Unnumbered') },
        { number: undefined, children: section('Second') },
      ],
    });
    assert.equal(output, '## \u00a71 First\n\ntransition\n\n## Unnumbered\n\n## \u00a72 Second');
  });

  it('lets an explicit prefix replace the inherited prefix without consuming a counter', () => {
    const output = compose({
      number: 'arab',
      prefix: '\u00a7',
      children: [section('First'), { prefix: 'Article ', children: section('Second') }, section('Third')],
    });
    assert.equal(output, '## \u00a71 First\n\n## Article 2 Second\n\n## \u00a73 Third');
  });

  it('rejects invalid values and heading depth beyond Markdown limits', () => {
    assert.throws(() => compose(42 as never), /Invalid composition/);
    assert.throws(
      () => compose({ number: 'binary', children: section('Invalid') } as never),
      /Unsupported number style/
    );
    assert.throws(() => compose({ prefix: 1, children: section('Invalid') } as never), /prefix must be a string/);
    assert.throws(() => compose([[[[[[section('Too deep')]]]]]]), /heading level 6/);
  });

  it('rejects references with ambiguous numbered targets or display labels', () => {
    const target = { id: 'target', heading: 'Target', content: '' };
    const reference = { id: 'reference', heading: 'Reference', content: 'See $target.md.\n' };
    assert.throws(
      () => compose({ number: 'arab', children: [reference, target, target] }),
      /section target is ambiguous because the section is numbered more than once/
    );

    const dummy = { id: 'dummy', heading: 'Dummy', content: '' };
    const other = { id: 'other', heading: 'Other', content: '' };
    assert.throws(
      () =>
        compose([{ number: 'arab', children: [reference, target] }, [{ number: 'arab', children: [dummy, other] }]]),
      /display label 2 is not unique/
    );
  });
});
