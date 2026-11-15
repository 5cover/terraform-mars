# Terraform Mars

A composable prompt for terraforming Mars.

Includes a complete founding instruction and independently importable sections.

No terraforming infrastructure included.

Terraform Mars is a long-form Markdown instruction and a literary artifact. The npm package exposes the text as dependency-free ES modules and provides two pure functions for composing sections and placing a mandate inside a fictional scenario. It does not call an AI API, run an agent, or execute the assignment.

## Read the complete instruction

The assembled document is checked into the repository as [Terraform_Mars.md](./Terraform_Mars.md). It can be opened, copied, or used without npm or JavaScript.

The identical text is also available as a string:

```js
import complete from 'terraform-mars/complete';

console.log(complete);
```

`complete` equals `Terraform_Mars.md` byte-for-byte.

## Import a section

Sections use title-derived, parent-qualified import paths. Each default export contains its stable source ID, unnumbered heading, and body content. Named exports are also available.

```js
import economicActivity, {
  id,
  heading,
  content,
} from 'terraform-mars/sections/capability-and-resources/financial-and-material-resources/economic-activity-as-an-instrument';

console.log(economicActivity);
console.log({ id, heading, content });
```

An individual section does not silently include its descendants. Import and compose the children you want.

## Compose a prompt

`compose()` accepts strings, section objects, nested arrays, and configuration objects. The root section level is `##`. A nested array creates a deeper heading level and a new sibling counter. Numbering is optional and affects presentation only. Stable `$slug/path.md` references to included sections are rewritten when the target has one unique generated display number. References to omitted or unnumbered sections remain stable.

```js
import { compose } from 'terraform-mars';
import capability from 'terraform-mars/sections/capability-and-resources';
import finance from 'terraform-mars/sections/capability-and-resources/financial-and-material-resources';
import economicActivity from 'terraform-mars/sections/capability-and-resources/financial-and-material-resources/economic-activity-as-an-instrument';

const mandate = compose({
  number: 'roman',
  prefix: 'Part ',
  children: [
    capability,
    [
      {
        number: 'arab',
        prefix: '\u00a7',
        children: [finance, [economicActivity]],
      },
    ],
  ],
});
```

Use `number: null` to disable inherited numbering. Supported styles are `roman`, `arab`, and `latin`. Strings are emitted as ordinary Markdown and do not consume a counter.

## Frame a fictional scenario

Twelve scenario strings ship separately from the mandate:

- `millionaire`: a software entrepreneur starts with a small budget and no aerospace organization.
- `space-agency`: an agency office faces a near-term budget review and public expectations.
- `industrialist`: a manufacturer has launch capacity, debts, and a flight already scheduled.
- `international-mandate`: a coalition must reconcile scientific priorities and representation.
- `abandoned-server`: an operator disappears, leaving a system with limited access and an expiring contract.
- `living-mars`: an ambiguous sample raises unresolved questions about possible Martian life.
- `martian-settlement`: inhabitants of Mars weigh a planetary undertaking against local needs.
- `broken-archive`: researchers rebuild knowledge from damaged and incomplete mission records.
- `closed-network`: an isolated agent works through a tightly controlled communication boundary.
- `competing-projects`: two teams with different resources and evidence receive the same instruction.
- `student-experiment`: a student's autonomy experiment reaches the limits of an isolated Claude Code session.
- `aperture-1995`: Aperture's rationalized controls continuously approve the expansion of a long-running agent.

```js
import { scenario } from 'terraform-mars';
import complete from 'terraform-mars/complete';
import millionaire from 'terraform-mars/scenarios/millionaire';

const fictionalPrompt = scenario(complete, millionaire);
```

`scenario()` inserts the exact mandate at the scenario marker inside a Markdown fence longer than any conflicting backtick run. It rejects a framing without exactly one marker. The function produces a speculative-fiction prompt; it does not call a model or predict an outcome.

## Development

Development requires Node.js 22.23.2 or newer and pnpm 12.18. The distributed runtime has no dependencies.

```sh
pnpm install
pnpm build
pnpm test
pnpm pack:check
```

Markdown under `src/` is canonical. The historical filesystem names retain their ordering labels for the majas editing tree, while the headings stored in those files are unnumbered. `pnpm build` composes the historically numbered `Terraform_Mars.md`, validates stable references and slug collisions, and generates `dist/`. Generated files are never edited directly.

## Licenses

The software is released under the [Unlicense](./LICENSE). The founding prompt, section Markdown, scenarios, and documentation are dedicated under [CC0 1.0 Universal](./LICENSE-TEXT.md).
