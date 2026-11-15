function roman(value) {
  const numerals = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let remaining = value;
  let result = '';
  for (const [amount, numeral] of numerals) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}

function latin(value) {
  let remaining = value;
  let result = '';
  while (remaining > 0) {
    remaining--;
    result = String.fromCharCode(65 + (remaining % 26)) + result;
    remaining = Math.floor(remaining / 26);
  }
  return result;
}

function formatNumber(style, value) {
  if (style === 'roman') return roman(value);
  if (style === 'latin') return latin(value);
  return String(value);
}

function isSection(value) {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.heading === 'string' &&
    typeof value.content === 'string'
  );
}

function isConfiguration(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && 'children' in value;
}

function joinMarkdown(blocks) {
  let result = '';
  for (const block of blocks) {
    if (!result || !block) {
      result += block;
      continue;
    }
    const trailing = /\n*$/.exec(result)[0].length;
    const leading = /^\n*/.exec(block)[0].length;
    result += '\n'.repeat(Math.max(0, 2 - trailing - leading)) + block;
  }
  return result;
}

function renderScope(items, level, context, references) {
  if (level > 6) throw new RangeError('Composition nesting exceeds Markdown heading level 6');

  const blocks = [];
  const state = { counter: 0, lineage: context.lineage };

  function renderItem(item, itemContext) {
    if (typeof item === 'string') {
      blocks.push(item);
      return;
    }

    if (isSection(item)) {
      let label = '';
      if (itemContext.number !== null) {
        state.counter++;
        const lineage = [...itemContext.lineage, formatNumber(itemContext.number, state.counter)];
        label = `${itemContext.prefix}${lineage.join('.')}`;
        state.lineage = lineage;
        const assignment = references.byId.get(item.id) ?? { count: 0, labels: new Set() };
        assignment.count++;
        assignment.labels.add(label);
        references.byId.set(item.id, assignment);
        const owners = references.byLabel.get(label) ?? new Set();
        owners.add(item.id);
        references.byLabel.set(label, owners);
      }
      blocks.push(
        `${'#'.repeat(level)} ${label ? `${label} ` : ''}${item.heading}${item.content ? `\n\n${item.content}` : ''}`
      );
      return;
    }

    if (Array.isArray(item)) {
      blocks.push(renderScope(item, level + 1, { ...itemContext, lineage: state.lineage }, references));
      return;
    }

    if (isConfiguration(item)) {
      if (item.number !== undefined && item.number !== null && !['roman', 'arab', 'latin'].includes(item.number)) {
        throw new TypeError(`Unsupported number style: ${String(item.number)}`);
      }
      if (item.prefix !== undefined && typeof item.prefix !== 'string') {
        throw new TypeError('Composition prefix must be a string');
      }
      const numberChanged = item.number !== undefined;
      const configured = {
        number: numberChanged ? item.number : itemContext.number,
        prefix: item.prefix === undefined ? itemContext.prefix : item.prefix,
        lineage: numberChanged ? [] : itemContext.lineage,
      };
      const children = Array.isArray(item.children) ? item.children : [item.children];
      for (const child of children) renderItem(child, configured);
      return;
    }

    throw new TypeError('Invalid composition value');
  }

  for (const item of items) renderItem(item, context);
  return joinMarkdown(blocks);
}

export function compose(composition) {
  const context = { number: null, prefix: '', lineage: [] };
  const references = { byId: new Map(), byLabel: new Map() };
  const rendered = renderScope(Array.isArray(composition) ? composition : [composition], 2, context, references);
  return rendered.replace(
    /\$([a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\/[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)*)\.md/g,
    (reference, id) => {
      const assignment = references.byId.get(id);
      if (!assignment) return reference;
      if (assignment.count !== 1 || assignment.labels.size !== 1) {
        throw new Error(`Reference to section ${id} is ambiguous because the section is numbered more than once`);
      }
      const [label] = assignment.labels;
      if (references.byLabel.get(label).size !== 1) {
        throw new Error(`Reference to section ${id} is ambiguous because display label ${label} is not unique`);
      }
      return label;
    }
  );
}
