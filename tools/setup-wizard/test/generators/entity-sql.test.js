const test = require('node:test');
const assert = require('node:assert/strict');

const { buildEntityMigration, snake } = require('../../lib/generators/entity-sql');

test('snake: basic conversion', () => {
  assert.equal(snake('Order Items'), 'order_items');
  assert.equal(snake('  Mixed-Case Thing!  '), 'mixed_case_thing');
  assert.equal(snake(''), '');
});

test('buildEntityMigration: basic time-indexed entity', () => {
  const sql = buildEntityMigration({
    entitySingular: 'Visit',
    entityPlural: 'Visits',
    fields: [
      { name: 'Title', type: 'text', required: true, searchable: true },
      { name: 'Start Time', type: 'datetime', required: true },
      { name: 'Notes', type: 'text', searchable: true },
    ],
    searchableFields: ['Title', 'Notes'],
  });

  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.visits/);
  assert.match(sql, /title TEXT NOT NULL/);
  assert.match(sql, /start_time TIMESTAMPTZ NOT NULL/);
  assert.match(sql, /notes TEXT/);
  assert.match(sql, /id UUID PRIMARY KEY/);
  assert.match(sql, /created_at TIMESTAMPTZ/);
  assert.match(sql, /updated_at TIMESTAMPTZ/);
  assert.match(sql, /created_by UUID REFERENCES auth\.users/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /visits_select_authenticated/);
  assert.match(sql, /visits_write_manager/);
  assert.match(sql, /visits_set_updated_at/);
  // FTS index because both title + notes are searchable
  assert.match(sql, /visits_fts_idx/);
  assert.match(sql, /coalesce\(title::text/);
  assert.match(sql, /coalesce\(notes::text/);
});

test('buildEntityMigration: skips card_break rows', () => {
  const sql = buildEntityMigration({
    entitySingular: 'Item', entityPlural: 'Items',
    fields: [
      { name: 'Name', type: 'text', required: true },
      { type: 'card_break', label: 'Section' },
      { name: 'Price', type: 'number' },
    ],
    searchableFields: [],
  });
  assert.doesNotMatch(sql, /card_break/);
  assert.match(sql, /name TEXT NOT NULL/);
  assert.match(sql, /price NUMERIC/);
});

test('buildEntityMigration: omits FTS index when no searchable fields', () => {
  const sql = buildEntityMigration({
    entitySingular: 'Note', entityPlural: 'Notes',
    fields: [{ name: 'Body', type: 'text' }],
    searchableFields: [],
  });
  assert.doesNotMatch(sql, /_fts_idx/);
});
