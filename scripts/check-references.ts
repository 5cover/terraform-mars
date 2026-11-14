#!/usr/bin/env node
/**
 * Validate § identifiers, references, and heading numbering in Markdown.
 *
 * Install (in the project where you run the script):
 *   npm install --save-dev tsx unified remark-parse unist-util-visit
 *
 * Run:
 *   npx tsx check-references.ts "Terraform Mars.md"
 *
 * Conventions / assumptions:
 * - A section identifier is §TOKEN(.TOKEN)*. Each TOKEN is either one ASCII
 *   uppercase letter (A-Z) or a decimal integer (0 or [1-9][0-9]*).
 * - A declaration is an identifier at the very start of a heading's plain
 *   text, e.g. `## §7 — Title` or `### §7.2 — Subtitle`.
 * - The first one-token section heading establishes the base heading level.
 *   Each extra identifier token requires one deeper Markdown heading level.
 *   Unnumbered headings (e.g. document titles / Part dividers) are allowed.
 * - Each child requires a previously declared parent (§7 before §7.1).
 * - Siblings appear in ascending order without gaps. Numeric sibling series
 *   start at 0 or 1; letter series start at A. Numeric and letter
 *   sibling series are checked independently, so §1–§24 and §A–§D may
 *   coexist at the same depth (e.g. numbered sections and appendices).
 * - A single final period after a reference can be sentence punctuation;
 *   a final period on a heading identifier is invalid.
 * - References must match complete identifiers, not merely their prefixes.
 * - Code blocks, inline code, raw HTML (including comments), and link URLs
 *   are excluded by the Markdown parser. Visible link text is included.
 * - Both ATX (#) and Setext (underline) Markdown headings are supported.
 * - The source file is read-only. Exit codes: 0 valid, 1 validation errors,
 *   2 usage or I/O errors.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { visit } from 'unist-util-visit'

const IDENTIFIER = /^§(?:[A-Z]|[0-9]+)(?:\.(?:[A-Z]|[0-9]+))*$/
const CANDIDATE = /^§[\p{L}\p{N}._-]*/u

type Location = { line: number; column: number; offset: number }
type ProblemKind = 'syntax' | 'duplicate' | 'hierarchy' | 'sequence' | 'unresolved'
type Problem = { at: Location; kind: ProblemKind; message: string }
type Section = { id: string; tokens: string[]; depth: number; at: Location }
type Reference = { id: string; at: Location }
type Range = { start: number; end: number }
type SiblingState = { kind: 'number' | 'letter'; token: string }

function main(): void {
  const file = process.argv[2]
  if (!file || process.argv.length !== 3) {
    console.error('Usage: npx tsx check-references.ts <document.md>')
    process.exitCode = 2
    return
  }

  const path = resolve(file)
  let source: string
  try {
    source = readFileSync(path, 'utf8')
  } catch (error) {
    console.error(`Cannot read ${path}: ${String(error)}`)
    process.exitCode = 2
    return
  }

  // remark-parse, not a handwritten Markdown scanner, decides which characters
  // belong to headings and visible text (rather than code, comments, etc.).
  const tree = unified().use(remarkParse).parse(source)
  const lineStarts = [0]
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') lineStarts.push(i + 1)
  }

  function locate(offset: number): Location {
    let low = 0
    let high = lineStarts.length - 1
    while (low < high) {
      const mid = Math.ceil((low + high) / 2)
      if (lineStarts[mid] <= offset) low = mid
      else high = mid - 1
    }
    return { line: low + 1, column: offset - lineStarts[low] + 1, offset }
  }

  const issues: Problem[] = []
  const sections: Section[] = []
  const declarations = new Map<string, Section>()
  const declarationsToIgnore: Range[] = []
  const references: Reference[] = []
  let totalHeadings = 0
  let unnumberedHeadings = 0
  let invalidSectionHeadings = 0
  let referenceCandidates = 0

  function problem(kind: ProblemKind, offset: number, message: string): void {
    issues.push({ kind, at: locate(offset), message })
  }

  function candidateAt(offset: number): string {
    const tail = source.slice(offset)
    // Keep whitespace after § in the diagnostic, instead of silently
    // interpreting `§ 4` as a reference to `§4`.
    const spaced = /^§[ \t]+[\p{L}\p{N}._-]*/u.exec(tail)
    return spaced?.[0] ?? CANDIDATE.exec(tail)?.[0] ?? '§'
  }

  // Pass 1: identify section declarations; mark their offsets so they aren't
  // mistaken for references during the text traversal.
  visit(tree, 'heading', node => {
    totalHeadings++
    const first = node.children[0]
    const start = first?.position?.start.offset
    if (first?.type !== 'text' || start === undefined || source[start] !== '§') {
      unnumberedHeadings++
      return
    }

    const raw = candidateAt(start)
    declarationsToIgnore.push({ start, end: start + raw.length })
    if (!IDENTIFIER.test(raw)) {
      invalidSectionHeadings++
      problem('syntax', start, `Invalid heading identifier ${JSON.stringify(raw)}`)
      return
    }
    const previous = declarations.get(raw)
    if (previous) {
      problem(
        'duplicate',
        start,
        `Duplicate heading ${raw}; first declared at ${previous.at.line}:${previous.at.column}`
      )
      return
    }
    const section: Section = {
      id: raw,
      tokens: raw.slice(1).split('.'),
      depth: node.depth,
      at: locate(start),
    }
    sections.push(section)
    declarations.set(raw, section)
  })

  // Pass 2: only Markdown text nodes contain potential references. The
  // parser has already excluded code blocks, inline code, and raw HTML.
  visit(tree, 'text', node => {
    const start = node.position?.start.offset
    const end = node.position?.end.offset
    if (start === undefined || end === undefined) return
    const rawText = source.slice(start, end)
    for (const match of rawText.matchAll(/§/g)) {
      const offset = start + match.index!
      if (declarationsToIgnore.some(range => offset >= range.start && offset < range.end)) continue
      referenceCandidates++
      let raw = candidateAt(offset)

      // `See §4.` is a reference to §4 followed by sentence punctuation.
      if (raw.endsWith('.') && !raw.endsWith('..') && IDENTIFIER.test(raw.slice(0, -1))) {
        raw = raw.slice(0, -1)
      }
      if (!IDENTIFIER.test(raw)) {
        problem('syntax', offset, `Invalid reference ${JSON.stringify(raw)}`)
      } else {
        references.push({ id: raw, at: locate(offset) })
      }
    }
  })

  // Pass 3: validate structural depth, parent existence, and sibling ordering.
  const firstRoot = sections.find(section => section.tokens.length === 1)
  if (!firstRoot && sections.length) {
    problem(
      'hierarchy',
      sections[0].at.offset,
      'No top-level (single-token) section heading establishes the numbering level'
    )
  }

  const siblings = new Map<string, SiblingState>()
  const encountered = new Set<string>()
  for (const section of sections) {
    const { id, tokens, at } = section
    if (firstRoot) {
      const expectedDepth = firstRoot.depth + tokens.length - 1
      if (section.depth !== expectedDepth) {
        problem(
          'hierarchy',
          at.offset,
          `${id} has Markdown heading level ${section.depth}; expected ${expectedDepth} ` +
            `for ${tokens.length} identifier token(s) (base level ${firstRoot.depth})`
        )
      }
    }

    const parent = tokens.length > 1 ? `§${tokens.slice(0, -1).join('.')}` : ''
    if (parent && !encountered.has(parent)) {
      problem(
        'hierarchy',
        at.offset,
        declarations.has(parent)
          ? `Parent ${parent} must appear before child ${id}`
          : `Missing parent heading ${parent} for ${id}`
      )
    }
    encountered.add(id)

    const current = tokens[tokens.length - 1]
    const kind: SiblingState['kind'] = /^[A-Z]$/.test(current) ? 'letter' : 'number'
    const siblingKey = `${parent}|${kind}`
    const previous = siblings.get(siblingKey)
    if (!previous) {
      if (kind === 'letter' && current !== 'A') {
        problem('sequence', at.offset, `First ${parent || 'top-level'} letter heading is ${id}; expected token A`)
      }
    } else {
      const previousValue = kind === 'letter' ? BigInt(previous.token.charCodeAt(0) - 65) : BigInt(previous.token)
      const currentValue = kind === 'letter' ? BigInt(current.charCodeAt(0) - 65) : BigInt(current)
      if (currentValue <= previousValue) {
        problem('sequence', at.offset, `Out-of-order sibling ${id}; previous sibling token was ${previous.token}`)
      } else if (currentValue > previousValue + 1n) {
        const next =
          kind === 'letter' ? String.fromCharCode(Number(previousValue + 1n) + 65) : String(previousValue + 1n)
        const expectedId = parent ? `${parent}.${next}` : `§${next}`
        problem('sequence', at.offset, `Gap before ${id}; expected ${expectedId} next`)
      }
    }
    siblings.set(siblingKey, { kind, token: current })
  }

  // Pass 4: exact resolution (never a partial or ancestor match).
  const useCounts = new Map<string, number>()
  for (const ref of references) {
    if (!declarations.has(ref.id)) {
      problem('unresolved', ref.at.offset, `Unresolved reference ${ref.id}`)
    } else {
      useCounts.set(ref.id, (useCounts.get(ref.id) ?? 0) + 1)
    }
  }

  issues.sort((a, b) => a.at.offset - b.at.offset || a.kind.localeCompare(b.kind))
  const distinct = new Set(references.map(ref => ref.id))
  const unused = sections.filter(section => !useCounts.has(section.id))
  const maxDepth = Math.max(0, ...sections.map(section => section.tokens.length))
  const popular = [...useCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 10)

  console.log(`File: ${path}`)
  console.log(`Lines: ${lineStarts.length}`)
  console.log(`Markdown headings: ${totalHeadings}`)
  console.log(`  Section headings: ${sections.length}`)
  console.log(`  Unnumbered headings: ${unnumberedHeadings}`)
  console.log(`  Invalid section headings: ${invalidSectionHeadings}`)
  console.log(`  Maximum section nesting: ${maxDepth} token(s)`)
  console.log(`  Top-level heading depth: ${firstRoot?.depth ?? 'not established'}`)
  console.log(`Reference occurrences: ${referenceCandidates}`)
  console.log(`  Syntactically valid references: ${references.length}`)
  console.log(`  Distinct referenced IDs: ${distinct.size}`)
  console.log(`  Declared IDs referenced: ${useCounts.size}`)
  console.log(`  Declared IDs never referenced: ${unused.length}`)
  console.log(`Validation errors: ${issues.length}`)

  if (popular.length) {
    console.log('Most cited sections: ' + popular.map(([id, count]) => `${id} (${count})`).join(', '))
  }
  if (issues.length) {
    console.error('\nProblems:')
    for (const issue of issues) {
      console.error(`  ${issue.at.line}:${issue.at.column} [${issue.kind}] ${issue.message}`)
    }
    process.exitCode = 1
  } else {
    console.log('All section declarations, numbering sequences, and references are valid.')
  }
}

main()
