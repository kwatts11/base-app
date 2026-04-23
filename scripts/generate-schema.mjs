/**
 * Generates database/schema.md from live Supabase DB schema.
 *
 * Requires in .env:
 *   SUPABASE_PROJECT_ID — your Supabase project reference ID
 *   SUPABASE_DB_PASSWORD — database password (Settings → Database → Connection string)
 *
 * Run: npm run db:schema
 * Re-run after every migration and commit the result.
 */

import 'dotenv/config';
import { execSync } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';

const projectId = process.env.SUPABASE_PROJECT_ID;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!projectId || !dbPassword) {
  console.error('ERROR: Missing SUPABASE_PROJECT_ID or SUPABASE_DB_PASSWORD in .env');
  console.error('This script is for sensitive-mode projects. See .env.example.');
  process.exit(1);
}

const dbUrl = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectId}.supabase.co:5432/postgres`;

console.log(`Dumping schema for project: ${projectId}`);

let sql;
try {
  sql = execSync(`npx supabase db dump --db-url "${dbUrl}" --schema-only`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  console.error('Schema dump failed:');
  console.error(err.stderr || err.message);
  process.exit(1);
}

const markdown = `# Database Schema

> Auto-generated — do not edit manually.
> Regenerate after every migration: \`npm run db:schema\`
> Commit this file so Cursor reads schema without querying live data.
>
> Generated: ${new Date().toISOString()}

\`\`\`sql
${sql.trim()}
\`\`\`
`;

mkdirSync('database', { recursive: true });
writeFileSync('database/schema.md', markdown, 'utf8');
console.log('database/schema.md updated successfully.');
