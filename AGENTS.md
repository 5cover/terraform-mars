# AGENTS.md

## Project context

This repository develops **Terraform Mars**, a long-form Markdown prompt for an AI agent, and a central artifact of the science-fiction project of the same name. In the fiction, Simon Delcourt assigns an agent the literal objective of transforming Mars into a habitable world. The agent's subsequent strategies, institutions, and history are not prescribed by the document.

The text is meant to work both as a plausible operational prompt and as a literary artifact. It specifies the objective, completion criteria, and initial operating principles while acknowledging that the methods, capabilities, and requirements must be discovered and revised over the course of the undertaking. It is not a screenplay, a prediction, or a complete technical plan for terraforming Mars.

## Working on the document

- Edit the relevant section source files in the hierarchy managed by **majas**; rebuild the assembled Markdown through that workflow. Do not treat generated output as the primary editing source.
- Keep changes local to the sections involved. Preserve the founding instruction, its intended meaning, and the distinction between immutable founding requirements and revisable operational methods.
- Write in restrained, precise, operational language. The instructions should sound like a serious assignment, not like a narrator explaining the story or anticipating its later events.
- Derive intermediate work from the planetary objective. Long indirect strategies can be legitimate, but their dependencies, assumptions, and conditions for revision or conclusion should remain intelligible.
- Avoid prescribing a particular future organization, agent architecture, project name, or historical outcome. _AUBE_ is the name that emerges in the fiction, not a name supplied by the founding prompt.
- Treat Markdown under `src/` as canonical. The historical numbering in directory and file names preserves the majas editing order and the canonical display profile; headings in Markdown remain unnumbered.
- Use parent-qualified, title-derived `$slug/path.md` references. Update references when a title change changes its public slug path.
- Preserve the majas editing tree, but build `Terraform_Mars.md` as the canonical numbered composition through `pnpm build`. The build validates heading structure, slug uniqueness, and source references before generating package modules.
- Never edit `dist/` or the package export map manually. They are generated from Markdown, runtime sources, scenarios, and discovered slug paths.
- Keep scenarios separate from the founding mandate. They describe fictional starting conditions and must not add requirements to the canonical instruction or prescribe an outcome.
- After structural edits, rebuild the document and check that cross-references and completion conditions remain coherent.

Prefer small, justified editorial revisions over broad rewrites. The goal is a document whose apparent simplicity can support consequences far beyond what its author could foresee.
