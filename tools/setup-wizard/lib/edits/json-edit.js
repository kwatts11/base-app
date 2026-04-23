/**
 * json-edit — set values at dot-paths inside JSON files (app.json, manifest.json, package.json).
 *
 * Path syntax:
 *   "expo.name"               → obj.expo.name
 *   "expo.web.shortName"      → obj.expo.web.shortName
 *   "expo.ios.icon"           → obj.expo.ios.icon
 *   "scripts['db:schema']"    → obj.scripts["db:schema"]   (bracket form for keys with special chars)
 *
 * Intermediate objects are created if missing. Arrays are not auto-created.
 */
const fs = require('fs');

function setJsonPaths(file, updates) {
  const raw = fs.readFileSync(file, 'utf8');
  const trailingNewline = raw.endsWith('\n');
  const obj = JSON.parse(raw);
  for (const [path, value] of Object.entries(updates)) {
    setPath(obj, parsePath(path), value);
  }
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + (trailingNewline ? '\n' : ''), 'utf8');
}

function deleteJsonPaths(file, paths) {
  const raw = fs.readFileSync(file, 'utf8');
  const trailingNewline = raw.endsWith('\n');
  const obj = JSON.parse(raw);
  for (const path of paths) {
    deletePath(obj, parsePath(path));
  }
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + (trailingNewline ? '\n' : ''), 'utf8');
}

function parsePath(path) {
  // Split on dots, but respect bracket subscripts: foo.bar['baz.qux'].x
  const parts = [];
  const re = /[^.\[\]'"]+|\[(['"])(.*?)\1\]|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(path)) !== null) {
    if (m[2] !== undefined) parts.push(m[2]);
    else if (m[3] !== undefined) parts.push(parseInt(m[3], 10));
    else parts.push(m[0]);
  }
  return parts;
}

function setPath(obj, parts, value) {
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (cursor[k] == null || typeof cursor[k] !== 'object') cursor[k] = {};
    cursor = cursor[k];
  }
  cursor[parts[parts.length - 1]] = value;
}

function deletePath(obj, parts) {
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cursor == null || typeof cursor !== 'object') return;
    cursor = cursor[parts[i]];
  }
  if (cursor && typeof cursor === 'object') delete cursor[parts[parts.length - 1]];
}

module.exports = { setJsonPaths, deleteJsonPaths, parsePath };
