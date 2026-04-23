/**
 * marker-edit — block-level edits in source files using WIZARD:BEGIN/END sentinels.
 *
 * Markers are line-comments matching one of these per language:
 *   //  WIZARD:BEGIN <key>      …  // WIZARD:END <key>          (TS/JS/TSX)
 *   {/* WIZARD:BEGIN <key> *\/} … {/* WIZARD:END <key> *\/}     (JSX expressions)
 *   --  WIZARD:BEGIN <key>      …  -- WIZARD:END <key>          (SQL)
 *   #   WIZARD:BEGIN <key>      …  #  WIZARD:END <key>          (env, yaml, md fences)
 *
 * The block body between BEGIN and END (exclusive) is the editable region.
 * Indentation of the BEGIN line is preserved when re-writing the body so
 * generated content drops in cleanly.
 */
const fs = require('fs');

const BEGIN_RE = (key) =>
  new RegExp(`([ \\t]*)(?://|--|#|\\{/\\*)\\s*WIZARD:BEGIN\\s+${escapeKey(key)}\\b.*`, 'm');
const END_RE = (key) =>
  new RegExp(`[ \\t]*(?://|--|#|\\{/\\*)\\s*WIZARD:END\\s+${escapeKey(key)}\\b.*`, 'm');

function escapeKey(k) {
  return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Replace the body between WIZARD:BEGIN <key> and WIZARD:END <key> with `body`.
 * Throws if either marker is missing or the END appears before the BEGIN.
 * Idempotent: replacing with the same body returns the same file content.
 *
 * @param {string} file absolute path
 * @param {string} key  marker key
 * @param {string} body new body content (no surrounding markers; trailing newline added if absent)
 */
function replaceBlock(file, key, body) {
  const text = fs.readFileSync(file, 'utf8');
  const next = replaceBlockInString(text, key, body);
  if (next !== text) fs.writeFileSync(file, next, 'utf8');
}

function replaceBlockInString(text, key, body) {
  const beginMatch = text.match(BEGIN_RE(key));
  if (!beginMatch) throw new Error(`marker-edit: WIZARD:BEGIN ${key} not found`);
  const beginIdx = beginMatch.index;
  const beginLineEnd = text.indexOf('\n', beginIdx);
  if (beginLineEnd === -1) throw new Error(`marker-edit: BEGIN ${key} has no following line`);

  const after = text.slice(beginLineEnd + 1);
  const endMatch = after.match(END_RE(key));
  if (!endMatch) throw new Error(`marker-edit: WIZARD:END ${key} not found after BEGIN`);
  const endLineStart = beginLineEnd + 1 + endMatch.index;

  const normalizedBody = body.endsWith('\n') ? body : body + '\n';
  return text.slice(0, beginLineEnd + 1) + normalizedBody + text.slice(endLineStart);
}

/**
 * Remove the entire block including the BEGIN and END marker lines.
 * Throws if either marker is missing.
 */
function removeBlock(file, key) {
  const text = fs.readFileSync(file, 'utf8');
  const next = removeBlockInString(text, key);
  if (next !== text) fs.writeFileSync(file, next, 'utf8');
}

function removeBlockInString(text, key) {
  const beginMatch = text.match(BEGIN_RE(key));
  if (!beginMatch) throw new Error(`marker-edit: WIZARD:BEGIN ${key} not found`);
  const beginIdx = beginMatch.index;
  const beginLineStart = text.lastIndexOf('\n', beginIdx - 1) + 1;

  const after = text.slice(beginIdx);
  const endMatch = after.match(END_RE(key));
  if (!endMatch) throw new Error(`marker-edit: WIZARD:END ${key} not found after BEGIN`);
  const endIdx = beginIdx + endMatch.index;
  const endLineEnd = text.indexOf('\n', endIdx);
  const cut = endLineEnd === -1 ? text.length : endLineEnd + 1;

  return text.slice(0, beginLineStart) + text.slice(cut);
}

/**
 * Strip *only* the WIZARD:BEGIN/END marker lines from a file, keeping the body.
 * Used by post-generate sweep so the produced project carries no wizard sentinels.
 */
function stripMarkers(file) {
  const text = fs.readFileSync(file, 'utf8');
  const next = text.replace(/^[ \t]*(?:\/\/|--|#|\{\/\*)\s*WIZARD:(?:BEGIN|END)\b.*\r?\n/gm, '');
  if (next !== text) fs.writeFileSync(file, next, 'utf8');
}

module.exports = {
  replaceBlock,
  removeBlock,
  stripMarkers,
  // Pure-string helpers exported for unit tests
  replaceBlockInString,
  removeBlockInString,
};
