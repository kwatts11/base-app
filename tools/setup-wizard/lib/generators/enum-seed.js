/**
 * enum-seed — enums[] from wizard → INSERT block body for migration 002.
 *
 * Each enum has: { name: 'category', examples: 'Option A, Option B', usedOn: '...' }.
 * `examples` is a comma-separated list of values.
 */

function snake(s) {
  return String(s || '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function sqlEscape(s) {
  return String(s).replace(/'/g, "''");
}

function buildEnumSeed(enums) {
  const valid = (enums || []).filter(e => e && e.name && e.examples);
  if (valid.length === 0) return '-- (no enums defined)';

  const rows = [];
  valid.forEach(e => {
    const enumName = snake(e.name);
    const values = String(e.examples)
      .split(',')
      .map(v => v.trim())
      .filter(Boolean);
    values.forEach((v, i) => {
      rows.push(`  ('${sqlEscape(enumName)}', '${sqlEscape(v)}', ${i + 1}, true)`);
    });
  });

  return `INSERT INTO public.editable_enums (enum_name, enum_value, display_order, is_active) VALUES\n${rows.join(',\n')};`;
}

module.exports = { buildEnumSeed, snake };
