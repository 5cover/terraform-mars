export const SCENARIO_MARKER = '<!-- TERRAFORM_MARS_MANDATE -->';

function fenceFor(value) {
  const longest = Math.max(0, ...[...value.matchAll(/`+/g)].map(match => match[0].length));
  return '`'.repeat(Math.max(3, longest + 1));
}

export function scenario(mandate, framing) {
  const occurrences = framing.split(SCENARIO_MARKER).length - 1;
  if (occurrences !== 1) throw new Error(`Scenario framing must contain ${SCENARIO_MARKER} exactly once`);

  const fence = fenceFor(mandate);
  const insertion = `${fence}\n${mandate}${mandate.endsWith('\n') ? '' : '\n'}${fence}`;
  return framing.replace(SCENARIO_MARKER, insertion);
}
