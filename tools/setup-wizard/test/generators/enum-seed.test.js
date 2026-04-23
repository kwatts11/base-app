const test = require('node:test');
const assert = require('node:assert/strict');

const { buildEnumSeed } = require('../../lib/generators/enum-seed');

test('buildEnumSeed: empty list returns sentinel comment', () => {
  assert.equal(buildEnumSeed([]), '-- (no enums defined)');
  assert.equal(buildEnumSeed(null), '-- (no enums defined)');
});

test('buildEnumSeed: produces one row per value with display_order', () => {
  const sql = buildEnumSeed([
    { name: 'Status', examples: 'Active, Inactive, Archived' },
    { name: 'Priority', examples: 'Low, High' },
  ]);

  assert.match(sql, /INSERT INTO public\.editable_enums/);
  assert.match(sql, /\('status', 'Active', 1, true\)/);
  assert.match(sql, /\('status', 'Inactive', 2, true\)/);
  assert.match(sql, /\('status', 'Archived', 3, true\)/);
  assert.match(sql, /\('priority', 'Low', 1, true\)/);
  assert.match(sql, /\('priority', 'High', 2, true\)/);
});

test('buildEnumSeed: escapes single quotes in values', () => {
  const sql = buildEnumSeed([{ name: 'Style', examples: "O'Brien's, Standard" }]);
  assert.match(sql, /'O''Brien''s'/);
});

test('buildEnumSeed: skips entries missing name or examples', () => {
  const sql = buildEnumSeed([
    { name: 'Status', examples: 'Active' },
    { name: '', examples: 'Foo' },
    { name: 'NoExamples', examples: '' },
  ]);
  assert.match(sql, /'status', 'Active'/);
  assert.doesNotMatch(sql, /noexamples/);
});
