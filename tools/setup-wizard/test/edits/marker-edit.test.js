const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  replaceBlock,
  removeBlock,
  stripMarkers,
  replaceBlockInString,
  removeBlockInString,
} = require('../../lib/edits/marker-edit');

function tmpFile(name, content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiz-test-'));
  const f = path.join(dir, name);
  fs.writeFileSync(f, content, 'utf8');
  return f;
}

test('replaceBlockInString: replaces body between BEGIN and END', () => {
  const src = `before
// WIZARD:BEGIN colors
old body
// WIZARD:END colors
after
`;
  const out = replaceBlockInString(src, 'colors', 'new body line 1\nnew body line 2');
  assert.match(out, /new body line 1/);
  assert.match(out, /new body line 2/);
  assert.doesNotMatch(out, /old body/);
  assert.match(out, /\/\/ WIZARD:BEGIN colors/);
  assert.match(out, /\/\/ WIZARD:END colors/);
});

test('replaceBlockInString: idempotent — same body produces same content', () => {
  const src = `// WIZARD:BEGIN k
inner
// WIZARD:END k
`;
  const once = replaceBlockInString(src, 'k', 'inner');
  const twice = replaceBlockInString(once, 'k', 'inner');
  assert.equal(once, twice);
});

test('replaceBlockInString: throws on missing BEGIN', () => {
  assert.throws(
    () => replaceBlockInString('no markers here', 'colors', 'x'),
    /WIZARD:BEGIN colors not found/
  );
});

test('replaceBlockInString: throws on missing END', () => {
  const src = `// WIZARD:BEGIN k
body
nothing closes
`;
  assert.throws(() => replaceBlockInString(src, 'k', 'x'), /WIZARD:END k not found/);
});

test('replaceBlockInString: handles SQL-style markers', () => {
  const src = `select 1;
-- WIZARD:BEGIN seed
old
-- WIZARD:END seed
select 2;
`;
  const out = replaceBlockInString(src, 'seed', 'INSERT INTO foo VALUES (1);');
  assert.match(out, /INSERT INTO foo/);
  assert.doesNotMatch(out, /^old$/m);
});

test('removeBlockInString: removes BEGIN, body, and END entirely', () => {
  const src = `keep above
// WIZARD:BEGIN drop
inside
// WIZARD:END drop
keep below
`;
  const out = removeBlockInString(src, 'drop');
  assert.doesNotMatch(out, /WIZARD:BEGIN drop/);
  assert.doesNotMatch(out, /WIZARD:END drop/);
  assert.doesNotMatch(out, /inside/);
  assert.match(out, /keep above/);
  assert.match(out, /keep below/);
});

test('replaceBlock: writes to disk', () => {
  const f = tmpFile('a.ts', `// WIZARD:BEGIN x\nold\n// WIZARD:END x\n`);
  replaceBlock(f, 'x', 'new content');
  const out = fs.readFileSync(f, 'utf8');
  assert.match(out, /new content/);
  assert.doesNotMatch(out, /^old$/m);
});

test('stripMarkers: removes only WIZARD comment lines, preserves bodies', () => {
  const f = tmpFile('b.ts', [
    'const a = 1;',
    '// WIZARD:BEGIN k',
    'const b = 2;',
    '// WIZARD:END k',
    'const c = 3;',
    '',
  ].join('\n'));
  stripMarkers(f);
  const out = fs.readFileSync(f, 'utf8');
  assert.doesNotMatch(out, /WIZARD:BEGIN/);
  assert.doesNotMatch(out, /WIZARD:END/);
  assert.match(out, /const a = 1;/);
  assert.match(out, /const b = 2;/);
  assert.match(out, /const c = 3;/);
});
