const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildTabConfigBlock,
  buildPageIdsBlock,
  buildPageNamesBlock,
} = require('../../lib/generators/tab-config');

test('buildTabConfigBlock: always includes home plus selected tabs', () => {
  const out = buildTabConfigBlock(['today', 'week', 'search']);
  assert.match(out, /name: 'home'/);
  assert.match(out, /name: 'today'/);
  assert.match(out, /title: 'Today'/);
  assert.match(out, /iconFocused: 'today'/);
  assert.match(out, /iconUnfocused: 'today-outline'/);
  assert.match(out, /name: 'week'/);
  assert.match(out, /name: 'search'/);
  // home appears first
  assert.ok(out.indexOf("name: 'home'") < out.indexOf("name: 'today'"));
});

test('buildTabConfigBlock: drops admin and setup tabs', () => {
  const out = buildTabConfigBlock(['today', 'admin', 'setup', 'search']);
  assert.doesNotMatch(out, /name: 'admin'/);
  assert.doesNotMatch(out, /name: 'setup'/);
  assert.match(out, /name: 'today'/);
  assert.match(out, /name: 'search'/);
});

test('buildTabConfigBlock: deduplicates if home is also in selected', () => {
  const out = buildTabConfigBlock(['home', 'today']);
  const homeMatches = out.match(/name: 'home'/g) || [];
  assert.equal(homeMatches.length, 1);
});

test('buildTabConfigBlock: custom tab gets fallback icon and title-case name', () => {
  const out = buildTabConfigBlock(['my-custom']);
  assert.match(out, /name: 'my-custom'/);
  assert.match(out, /title: 'My Custom'/);
  assert.match(out, /iconFocused: 'apps'/);
});

test('buildPageIdsBlock: page IDs start at T4', () => {
  const out = buildPageIdsBlock(['today', 'week', 'search']);
  assert.match(out, /TODAY: 'T4'/);
  assert.match(out, /WEEK: 'T5'/);
  assert.match(out, /SEARCH: 'T6'/);
});

test('buildPageNamesBlock: parallels PAGE_IDS', () => {
  const out = buildPageNamesBlock(['today', 'week']);
  assert.match(out, /T4: 'Today'/);
  assert.match(out, /T5: 'Week'/);
});

test('buildPageIdsBlock: hyphens become underscores', () => {
  const out = buildPageIdsBlock(['my-tab']);
  assert.match(out, /MY_TAB: 'T4'/);
});
