/**
 * migrate — apply SQL migration files to a Supabase Postgres via the session-mode
 * pooler URI. Pooler avoids IPv6 issues common on Windows and supports DDL.
 *
 * Connection: postgresql://postgres.<project-id>:<db-password>@aws-0-<region>.pooler.supabase.com:5432/postgres
 *
 * Idempotency: each run records applied filenames in `wizard_migrations(name TEXT PRIMARY KEY)`.
 * We do NOT consult `supabase_migrations.schema_migrations` directly because its layout
 * differs from CLI runs and we want a wizard-owned audit trail.
 */
const fs = require('fs');
const path = require('path');

let Pool;
try { ({ Pool } = require('pg')); } catch { /* lazy: surfaces in connect() */ }

const DEFAULT_REGION = 'aws-0-us-east-1';

function buildPoolerUri({ projectId, dbPassword, region }) {
  if (!projectId || !dbPassword) throw new Error('migrate: projectId and dbPassword required');
  const r = region || DEFAULT_REGION;
  const host = r.startsWith('aws-') ? `${r}.pooler.supabase.com` : `aws-0-${r}.pooler.supabase.com`;
  const encPwd = encodeURIComponent(dbPassword);
  return `postgresql://postgres.${projectId}:${encPwd}@${host}:5432/postgres`;
}

async function withClient({ projectId, dbPassword, region }, fn) {
  if (!Pool) throw new Error('migrate: `pg` module not installed. Run `npm install` in tools/setup-wizard.');
  const pool = new Pool({
    connectionString: buildPoolerUri({ projectId, dbPassword, region }),
    ssl: { rejectUnauthorized: false },
    max: 1,
  });
  const client = await pool.connect();
  try { return await fn(client); }
  finally { client.release(); await pool.end(); }
}

async function ensureLedger(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS public.wizard_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function alreadyApplied(client, name) {
  const r = await client.query('SELECT 1 FROM public.wizard_migrations WHERE name = $1', [name]);
  return r.rowCount > 0;
}

/**
 * Apply a list of {name, sql} migrations in order. Returns per-migration status.
 *
 * @param {{projectId, dbPassword, region}} conn
 * @param {Array<{name: string, sql: string}>} migrations
 * @param {(msg: string) => void} onProgress
 */
async function applyMigrations(conn, migrations, onProgress = () => {}) {
  const results = [];
  await withClient(conn, async (client) => {
    await ensureLedger(client);
    for (const m of migrations) {
      if (await alreadyApplied(client, m.name)) {
        onProgress(`[skip] ${m.name} (already applied)`);
        results.push({ name: m.name, status: 'skipped' });
        continue;
      }
      onProgress(`[apply] ${m.name}`);
      try {
        await client.query('BEGIN');
        await client.query(m.sql);
        await client.query('INSERT INTO public.wizard_migrations(name) VALUES ($1)', [m.name]);
        await client.query('COMMIT');
        results.push({ name: m.name, status: 'applied' });
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        results.push({ name: m.name, status: 'failed', error: err.message });
        throw new Error(`Migration ${m.name} failed: ${err.message}`);
      }
    }
  });
  return results;
}

/**
 * Discover & order migration files in the produced project, then apply them.
 * Returns the result list. Callers handle error → AI fallback.
 */
async function applyProjectMigrations(targetDir, conn, onProgress) {
  const dir = path.join(targetDir, 'database', 'migrations');
  if (!fs.existsSync(dir)) throw new Error('migrate: database/migrations not found in target project');
  const files = fs.readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  const migrations = files.map(name => ({
    name: name.replace(/\.sql$/, ''),
    sql: fs.readFileSync(path.join(dir, name), 'utf8'),
  }));
  return applyMigrations(conn, migrations, onProgress);
}

/** Quick connection test — used by a wizard "Test DB" button if we want one. */
async function testConnection(conn) {
  return withClient(conn, async (client) => {
    const r = await client.query('SELECT now() AS now');
    return { ok: true, now: r.rows[0].now };
  });
}

module.exports = {
  buildPoolerUri,
  applyMigrations,
  applyProjectMigrations,
  testConnection,
};
