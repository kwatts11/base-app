/**
 * update-system — generate the page-ID table for UPDATE_SYSTEM.md.
 *
 * Reuses the tab-config slug list to derive T4..Tn entries.
 */
const fs = require('fs');
const path = require('path');
const { metaFor } = require('./tab-config');

function buildPageIdTable(selected) {
  const tabs = (selected || []).filter(t => t !== 'admin' && t !== 'setup');
  const fixed = [
    ['T0', 'Tabs Layout',     'app/(tabs)/_layout.tsx'],
    ['T1', 'Home',            'app/(tabs)/home.tsx'],
    ['T2', 'Admin',           'app/(tabs)/admin.tsx'],
    ['T3', 'Setup Checklist', 'app/(tabs)/setup.tsx'],
  ];
  const dynamic = tabs.map((slug, i) => {
    const m = metaFor(slug);
    return [`T${i + 4}`, m.title, `app/(tabs)/${slug}.tsx`];
  });
  const rows = [...fixed, ...dynamic]
    .map(([id, name, file]) => `| ${id} | ${name} | \`${file}\` |`)
    .join('\n');
  return `| Page ID | Name | File |\n| --- | --- | --- |\n${rows}\n`;
}

function applyUpdateSystem(targetDir, formData) {
  const file = path.join(targetDir, 'docs', 'UPDATE_SYSTEM.md');
  const tplPath = path.join(__dirname, '..', '..', 'templates', 'update-system.md.tpl');
  if (!fs.existsSync(tplPath)) return;
  const tpl = fs.readFileSync(tplPath, 'utf8');
  const tabs = (formData.tabs && formData.tabs.selected) || [];
  const out = tpl
    .replace(/\{\{APP_NAME\}\}/g, (formData.identity || {}).name || '')
    .replace(/\{\{PAGE_ID_TABLE\}\}/g, buildPageIdTable(tabs))
    .replace(/\{\{GENERATED_DATE\}\}/g, new Date().toISOString().split('T')[0]);
  // Only write if a template exists; otherwise the wizard leaves the existing file untouched.
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out, 'utf8');
}

module.exports = { buildPageIdTable, applyUpdateSystem };
