/**
 * tab-config — selected tabs[] → TAB_CONFIG array literal body
 *                            + PAGE_IDS entries body + PAGE_NAMES entries body.
 *
 * Tabs follow the convention in app/(tabs)/_layout.tsx:
 *   { name, title, iconFocused, iconUnfocused }
 */

const TAB_META = {
  home:    { title: 'Home',    iconFocused: 'home',           iconUnfocused: 'home-outline' },
  today:   { title: 'Today',   iconFocused: 'today',          iconUnfocused: 'today-outline' },
  week:    { title: 'Week',    iconFocused: 'calendar',       iconUnfocused: 'calendar-outline' },
  month:   { title: 'Month',   iconFocused: 'calendar-clear', iconUnfocused: 'calendar-clear-outline' },
  map:     { title: 'Map',     iconFocused: 'navigate',       iconUnfocused: 'navigate-outline' },
  area:    { title: 'Area',    iconFocused: 'layers',         iconUnfocused: 'layers-outline' },
  list:    { title: 'List',    iconFocused: 'list',           iconUnfocused: 'list-outline' },
  search:  { title: 'Search',  iconFocused: 'search',         iconUnfocused: 'search-outline' },
  reports: { title: 'Reports', iconFocused: 'bar-chart',      iconUnfocused: 'bar-chart-outline' },
};

function metaFor(slug) {
  if (TAB_META[slug]) return TAB_META[slug];
  // Custom tab: title-case the slug
  const title = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return { title, iconFocused: 'apps', iconUnfocused: 'apps-outline' };
}

/** Filter & dedupe selected tabs. Always prepends `home` since the Home tab
    is permanent in base-app and the marker wraps it. */
function normalizedTabs(selected) {
  const tabs = ['home', ...((selected || []).filter(t => t !== 'admin' && t !== 'setup' && t !== 'home'))];
  return Array.from(new Set(tabs));
}

/** Body for the `tab-config` marker block. Each line is a TabConfig entry. */
function buildTabConfigBlock(selected) {
  return normalizedTabs(selected)
    .map(slug => {
      const m = metaFor(slug);
      return `  {
    name: '${slug}',
    title: '${m.title}',
    iconFocused: '${m.iconFocused}',
    iconUnfocused: '${m.iconUnfocused}',
  },`;
    })
    .join('\n');
}

/** Body for `app-page-ids` marker block in src/constants/version.ts.
    HOME is hard-coded in version.ts (T1) so we skip it here; user tabs start at T4. */
function buildPageIdsBlock(selected) {
  const tabs = normalizedTabs(selected).filter(t => t !== 'home');
  return tabs
    .map((slug, i) => `  ${slug.toUpperCase().replace(/[-_]/g, '_')}: 'T${i + 4}',`)
    .join('\n');
}

/** Body for `app-page-names` marker block in src/constants/version.ts (PAGE_NAMES map). */
function buildPageNamesBlock(selected) {
  const tabs = normalizedTabs(selected).filter(t => t !== 'home');
  return tabs
    .map((slug, i) => `  T${i + 4}: '${metaFor(slug).title}',`)
    .join('\n');
}

module.exports = { buildTabConfigBlock, buildPageIdsBlock, buildPageNamesBlock, metaFor, TAB_META };
