/**
 * tab-screens — render per-tab screen files from templates in tools/setup-wizard/templates/tab-screens/.
 * Templates use {{TOKEN}} placeholders.
 */
const fs = require('fs');
const path = require('path');
const { fillTokens } = require('../edits/text-replace');
const { snake } = require('./entity-sql');
const { metaFor } = require('./tab-config');

const TEMPLATE_FOR = {
  today:   'today.tsx.tpl',
  week:    'week.tsx.tpl',
  month:   'month.tsx.tpl',
  search:  'search.tsx.tpl',
  list:    'list.tsx.tpl',
  reports: 'reports.tsx.tpl',
  // map and area are committed in base-app for location-indexed apps; not regenerated
  // anything else falls through to custom.tsx.tpl
};

function pascalCase(s) {
  return String(s || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\s+/g, '');
}

function applyTabScreens(targetDir, formData) {
  const tabs = ((formData.tabs && formData.tabs.selected) || [])
    .filter(t => t !== 'admin' && t !== 'setup' && t !== 'home');
  const dataModel = formData.dataModel || {};
  const tplDir = path.join(__dirname, '..', '..', 'templates', 'tab-screens');
  const tabsDir = path.join(targetDir, 'app', '(tabs)');
  const tableName = snake(dataModel.entityPlural || `${dataModel.entitySingular || 'item'}s`);
  const entitySingular = dataModel.entitySingular || 'Item';
  const entityPlural = dataModel.entityPlural || `${entitySingular}s`;
  const pageIdMap = {};
  tabs.forEach((slug, i) => { pageIdMap[slug] = `T${i + 4}`; });

  const written = [];
  for (const slug of tabs) {
    // map/area exist in base-app committed source for location apps — don't overwrite
    if (slug === 'map' || slug === 'area') continue;

    const isKnown = !!TEMPLATE_FOR[slug];
    const tplName = TEMPLATE_FOR[slug] || 'custom.tsx.tpl';
    const tplPath = path.join(tplDir, tplName);
    if (!fs.existsSync(tplPath)) continue;

    const pageId = pageIdMap[slug] || 'T0';
    const pageIdKey = isKnown
      ? slug.toUpperCase().replace(/[-_]/g, '_')
      : slug.toUpperCase().replace(/[-_]/g, '_');
    const out = fillTokens(fs.readFileSync(tplPath, 'utf8'), {
      TABLE_NAME: tableName,
      ENTITY_SINGULAR: entitySingular,
      ENTITY_PLURAL: entityPlural,
      PAGE_ID: pageId,
      PAGE_ID_KEY: pageIdKey,
      TAB_SLUG: slug,
      TAB_TITLE: metaFor(slug).title,
      COMPONENT_NAME: pascalCase(slug),
    });
    const dest = path.join(tabsDir, `${slug}.tsx`);
    fs.writeFileSync(dest, out, 'utf8');
    written.push(dest);
  }
  return written;
}

/** Write the create-entity modal `app/(modal)/add-<entity>.tsx`. */
function applyAddEntityModal(targetDir, formData) {
  const dataModel = formData.dataModel || {};
  const entitySingular = dataModel.entitySingular || 'Item';
  const entitySlug = snake(entitySingular);
  const tableName = snake(dataModel.entityPlural || `${entitySingular}s`);
  const tplPath = path.join(__dirname, '..', '..', 'templates', 'add-entity-modal.tsx.tpl');
  if (!fs.existsSync(tplPath)) return null;
  const out = fillTokens(fs.readFileSync(tplPath, 'utf8'), {
    ENTITY_SINGULAR: entitySingular,
    ENTITY_SLUG: entitySlug,
    TABLE_NAME: tableName,
  });
  const dest = path.join(targetDir, 'app', '(modal)', `add-${entitySlug}.tsx`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, out, 'utf8');
  return dest;
}

module.exports = { applyTabScreens, applyAddEntityModal };
