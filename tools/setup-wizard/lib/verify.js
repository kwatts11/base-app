/**
 * verify — per-install smoke tests run after all generators.
 *
 * Surfaces any leftover sentinels, broken JSON, missing scaffold files, and
 * (when DB creds were provided) confirms the entity tables exist. Optionally
 * runs `tsc --noEmit` against the produced project.
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { snake } = require('./generators/entity-sql');

// Sentinels that MUST NOT survive wizard generation. Markers + placeholder
// secrets/IDs only. The "[BASE-APP SETUP NEEDED]" tag is intentionally NOT
// listed: those breadcrumbs flag follow-up work for the AI / user and are
// expected to remain (SETUP_TODO.md is the canonical to-do list).
const SENTINELS = [
  'WIZARD:BEGIN',
  'WIZARD:END',
  'YOUR_MAPBOX_PUBLIC_TOKEN',
  'YOUR_MAPBOX_SECRET_TOKEN',
  'YOUR_PROJECT_ID',
];

const SENTINEL_WHITELIST = new Set([
  // SETUP_TODO.md historically references this string and we don't want to fail.
  'SETUP_TODO.md',
  // Wizard-internal templates won't be in the generated project.
]);

async function runChecks(targetDir, formData, conn) {
  const results = [];
  results.push(checkJsonFiles(targetDir));
  results.push(checkScaffolds(targetDir, formData));
  results.push(checkSentinels(targetDir));
  if (conn && conn.projectId && conn.dbPassword) {
    results.push(await checkDbTables(formData, conn));
  }
  results.push(await checkTypeScript(targetDir));
  return results;
}

function checkJsonFiles(targetDir) {
  const files = ['app.json', 'public/manifest.json', 'package.json'];
  const errors = [];
  for (const rel of files) {
    const f = path.join(targetDir, rel);
    if (!fs.existsSync(f)) continue;
    try { JSON.parse(fs.readFileSync(f, 'utf8')); }
    catch (e) { errors.push(`${rel}: ${e.message}`); }
  }
  return { name: 'JSON validity', ok: errors.length === 0, errors };
}

function checkScaffolds(targetDir, formData) {
  const tabs = ((formData.tabs || {}).selected || []).filter(t => t !== 'admin' && t !== 'setup');
  const dataModel = formData.dataModel || {};
  const tableName = snake(dataModel.entityPlural || `${dataModel.entitySingular || 'item'}s`);
  const entitySlug = snake(dataModel.entitySingular || 'item');
  const errors = [];

  for (const slug of tabs) {
    // map and area are committed in base-app for location apps; not generated
    if (slug === 'map' || slug === 'area') continue;
    const f = path.join(targetDir, 'app', '(tabs)', `${slug}.tsx`);
    if (!fs.existsSync(f)) errors.push(`missing tab screen: app/(tabs)/${slug}.tsx`);
  }

  if ((formData.tabs || {}).indexType === 'time') {
    const addModal = path.join(targetDir, 'app', '(modal)', `add-${entitySlug}.tsx`);
    if (!fs.existsSync(addModal)) errors.push(`missing modal: app/(modal)/add-${entitySlug}.tsx`);
    const mig = path.join(targetDir, 'database', 'migrations', `004_${tableName}.sql`);
    if (!fs.existsSync(mig)) errors.push(`missing entity migration: 004_${tableName}.sql`);
  }
  return { name: 'Scaffold presence', ok: errors.length === 0, errors };
}

function checkSentinels(targetDir) {
  const errors = [];
  walk(targetDir, (filePath) => {
    const rel = path.relative(targetDir, filePath).replace(/\\/g, '/');
    if (SENTINEL_WHITELIST.has(rel)) return;
    if (rel.startsWith('node_modules/') || rel.startsWith('.git/') || rel.startsWith('dist/')) return;
    if (!/\.(ts|tsx|js|jsx|json|sql|md)$/i.test(filePath)) return;
    let text;
    try { text = fs.readFileSync(filePath, 'utf8'); } catch { return; }
    for (const s of SENTINELS) {
      if (text.includes(s)) errors.push(`${rel}: contains "${s}"`);
    }
  });
  return { name: 'Sentinel sweep', ok: errors.length === 0, errors };
}

function walk(dir, fn) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === '.git' || ent.name === 'dist') continue;
      walk(p, fn);
    } else fn(p);
  }
}

async function checkDbTables(formData, conn) {
  let pg;
  try { pg = require('pg'); }
  catch { return { name: 'DB sanity', ok: false, errors: ['pg not installed; skipping'] }; }

  const { buildPoolerUri } = require('./db/migrate');
  const pool = new pg.Pool({
    connectionString: buildPoolerUri(conn),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const tables = ['user_profiles', 'editable_enums'];
  const dataModel = formData.dataModel || {};
  if ((formData.tabs || {}).indexType === 'time' && dataModel.entityPlural) {
    tables.push(snake(dataModel.entityPlural));
  }
  if ((formData.tabs || {}).indexType === 'location') {
    tables.push('areas', 'locations');
  }
  const errors = [];
  try {
    for (const t of tables) {
      const r = await pool.query("SELECT to_regclass($1) AS reg", [`public.${t}`]);
      if (!r.rows[0].reg) errors.push(`missing table: public.${t}`);
    }
  } catch (e) {
    errors.push(`DB query failed: ${e.message}`);
  } finally {
    await pool.end().catch(() => {});
  }
  return { name: 'DB sanity', ok: errors.length === 0, errors };
}

function checkTypeScript(targetDir) {
  return new Promise((resolve) => {
    const tsconfig = path.join(targetDir, 'tsconfig.json');
    if (!fs.existsSync(tsconfig)) {
      resolve({ name: 'TypeScript compile', ok: true, errors: ['skipped (no tsconfig.json)'] });
      return;
    }
    // Skip if node_modules not installed — `npm install` happens later.
    if (!fs.existsSync(path.join(targetDir, 'node_modules', 'typescript'))) {
      resolve({ name: 'TypeScript compile', ok: true, errors: ['skipped (run after npm install)'] });
      return;
    }
    exec('npx tsc --noEmit -p .', { cwd: targetDir, timeout: 120000 }, (err, stdout, stderr) => {
      if (!err) resolve({ name: 'TypeScript compile', ok: true, errors: [] });
      else resolve({
        name: 'TypeScript compile',
        ok: false,
        errors: (stdout + stderr).split('\n').filter(Boolean).slice(0, 50),
      });
    });
  });
}

module.exports = { runChecks };
