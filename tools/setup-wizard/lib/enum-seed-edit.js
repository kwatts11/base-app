/**
 * enum-seed-edit — replace the `enum-seed` block in
 * database/migrations/002_editable_enums.sql with the wizard-generated INSERT.
 */
const path = require('path');
const fs = require('fs');
const { replaceBlock } = require('./edits/marker-edit');
const { buildEnumSeed } = require('./generators/enum-seed');

function applyEnumSeed(targetDir, formData) {
  const file = path.join(targetDir, 'database', 'migrations', '002_editable_enums.sql');
  if (!fs.existsSync(file)) return;
  const body = buildEnumSeed(formData.enums || []);
  replaceBlock(file, 'enum-seed', body);
}

module.exports = { applyEnumSeed };
