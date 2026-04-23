const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');

const { setJsonPaths, deleteJsonPaths, parsePath } = require('../../lib/edits/json-edit');

function tmpFile(name, obj) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wiz-test-'));
  const f = path.join(dir, name);
  fs.writeFileSync(f, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  return f;
}

test('parsePath: dot, bracket-quoted, and numeric subscripts', () => {
  assert.deepEqual(parsePath('a.b.c'), ['a', 'b', 'c']);
  assert.deepEqual(parsePath("scripts['db:schema']"), ['scripts', 'db:schema']);
  assert.deepEqual(parsePath('expo.android.config[0]'), ['expo', 'android', 'config', 0]);
});

test('setJsonPaths: sets nested keys, creates missing intermediates', () => {
  const f = tmpFile('app.json', { expo: { name: 'old' } });
  setJsonPaths(f, {
    'expo.name': 'NewApp',
    'expo.web.shortName': 'NA',
    'expo.ios.bundleIdentifier': 'com.x.y',
  });
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(obj.expo.name, 'NewApp');
  assert.equal(obj.expo.web.shortName, 'NA');
  assert.equal(obj.expo.ios.bundleIdentifier, 'com.x.y');
});

test('setJsonPaths: bracket-quoted keys with special chars', () => {
  const f = tmpFile('package.json', { scripts: {} });
  setJsonPaths(f, { "scripts['db:schema']": 'node ./scripts/x.mjs' });
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(obj.scripts['db:schema'], 'node ./scripts/x.mjs');
});

test('setJsonPaths: preserves trailing newline', () => {
  const f = tmpFile('a.json', { x: 1 });
  setJsonPaths(f, { x: 2 });
  const text = fs.readFileSync(f, 'utf8');
  assert.ok(text.endsWith('\n'));
});

test('deleteJsonPaths: removes leaf keys', () => {
  const f = tmpFile('app.json', { expo: { name: 'X', web: { shortName: 'Y' } } });
  deleteJsonPaths(f, ['expo.web.shortName']);
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.equal(obj.expo.web.shortName, undefined);
  assert.equal(obj.expo.name, 'X');
});

test('deleteJsonPaths: missing path is a no-op', () => {
  const f = tmpFile('a.json', { a: 1 });
  deleteJsonPaths(f, ['x.y.z']);
  const obj = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.deepEqual(obj, { a: 1 });
});
