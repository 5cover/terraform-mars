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

  it('renders Roman, Arabic, and Latin counters', () => {
    assert.equal(
      compose({ number: 'roman', prefix: 'Part ', children: [section('One'), section('Two')] }),
      '## Part I One\n\n## Part II Two'
    );
    assert.equal(
      compose({ number: 'arab', prefix: '§', children: [section('One'), section('Two')] }),
      '## §1 One\n\n## §2 Two'
    );
    assert.match(
      compose({ number: 'latin', children: Array.from({ length: 27 }, (_, index) => section(String(index))) }),
      /## Z 25\n\n## AA 26$/
    );
  });

  it('inherits same-style numbering through nested arrays and resets sibling scopes', () => {
    const output = compose({
      number: 'arab',
      prefix: '§',
      children: [
        section('First'),
        [section('First child'), section('Second child')],
        section('Second'),
        [section('Reset child')],
      ],
    });
    assert.equal(
      output,
      '## §1 First\n\n### §1.1 First child\n\n### §1.2 Second child\n\n## §2 Second\n\n### §2.1 Reset child'
    );
  });

  it('starts a new display lineage when the number style is overridden', () => {
    const output = compose({
      number: 'roman',
      prefix: 'Part ',
      children: [
        section('Capability'),
        [
          {
            number: 'arab',
            prefix: '§',
            children: [section('Finance'), [section('Economic activity')]],
          },
        ],
      ],
    });
    assert.equal(output, '## Part I Capability\n\n### §1 Finance\n\n#### §1.1 Economic activity');
  });

  it('distinguishes inherited undefined numbering from disabled null numbering', () => {
    const output = compose({
      number: 'arab',
      prefix: '§',
      children: [
        section('First'),
        'transition',
        { number: null, children: section('Unnumbered') },
        { number: undefined, children: section('Second') },
      ],
    });
    assert.equal(output, '## §1 First\n\ntransition\n\n## Unnumbered\n\n## §2 Second');
  });

  it('lets an explicit prefix replace the inherited prefix without consuming a counter', () => {
    const output = compose({
      number: 'arab',
      prefix: '§',
      children: [section('First'), { prefix: 'Article ', children: section('Second') }, section('Third')],
    });
    assert.equal(output, '## §1 First\n\n## Article 2 Second\n\n## §3 Third');
  });

  it('rejects invalid values and heading depth beyond Markdown limits', () => {
    assert.throws(() => compose(42 as never), /Invalid composition/);
    assert.throws(() => compose([[[[[[section('Too deep')]]]]]]), /heading level 6/);
  });
});
