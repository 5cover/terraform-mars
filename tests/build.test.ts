import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, it } from 'node:test';

const { NODE_TEST_CONTEXT: _nodeTestContext, ...childEnvironment } = process.env;

function pnpm(args: string[]): string {
  return execFileSync('pnpm', args, {
    encoding: 'utf8',
    env: childEnvironment,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function generatedDigest(): string {
  const files = ['package.json', 'Terraform_Mars.md'];
  function collect(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) collect(path);
      else files.push(relative(resolve('.'), path));
    }
  }
  collect(resolve('dist'));
  files.sort();

  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(readFileSync(resolve(file)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

describe('release generation', () => {
  it('rebuilds deterministically', () => {
    const before = generatedDigest();
    pnpm(['run', 'build']);
    assert.equal(generatedDigest(), before);
  });

  it('packs only publication files', () => {
    const output = pnpm(['pack', '--dry-run', '--json']);
    const jsonStart = output.indexOf('{\n  "name"');
    assert.notEqual(jsonStart, -1);
    const manifest = JSON.parse(output.slice(jsonStart));
    const paths = manifest.files.map((file: { path: string }) => file.path);
    for (const required of [
      'LICENSE',
      'LICENSE-TEXT.md',
      'README.md',
      'Terraform_Mars.md',
      'dist/index.js',
      'dist/index.d.ts',
      'scenarios/millionaire.md',
      'src/content.md',
    ]) {
      assert.ok(paths.includes(required), `${required} is packed`);
    }
    assert.ok(
      paths.every((path: string) =>
        /^(?:LICENSE(?:-TEXT\.md)?|README\.md|Terraform_Mars\.md|package\.json|dist\/|scenarios\/|src\/)/.test(path)
      ),
      'tarball contains only intended paths'
    );
  });
});
