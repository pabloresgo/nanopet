// Basic "does the site load" check: every local file the page and modules reference must exist.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(root, file), 'utf8');

test('index.html references only files that exist', () => {
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((ref) => !/^(https?:|#|data:)/.test(ref));
  assert.ok(refs.length > 0, 'expected local script and stylesheet references');
  for (const ref of refs) {
    assert.ok(existsSync(join(root, ref)), `missing file referenced by index.html: ${ref}`);
  }
});

test('local JavaScript imports resolve to existing files', () => {
  const jsDir = join(root, 'js');
  for (const file of readdirSync(jsDir).filter((f) => f.endsWith('.js'))) {
    const source = read(join('js', file));
    const imports = [...source.matchAll(/from\s+'(\.[^']+)'/g)].map((m) => m[1]);
    for (const spec of imports) {
      assert.ok(existsSync(join(jsDir, spec)), `${file} imports missing module: ${spec}`);
    }
  }
});
