/**
 * time-index — set the entity-specific defaults inside src/components/time-index/*.
 * Targets the WIZARD:BEGIN/END marker blocks: default-table, default-time-column,
 * default-fields, default-enums.
 */
const fs = require('fs');
const path = require('path');
const { replaceBlock } = require('../edits/marker-edit');
const { snake } = require('./entity-sql');

function applyTimeIndexDefaults(targetDir, formData) {
  const dataModel = formData.dataModel || {};
  const tableName = snake(dataModel.entityPlural || `${dataModel.entitySingular || 'event'}s`);
  const fields = (dataModel.fields || []).filter(f => f.type !== 'card_break');
  const startField = fields.find(f => f.type === 'datetime' || f.type === 'date');
  const timeColumn = startField ? snake(startField.name) : 'start_time';
  const enumCategories = ((formData.enums) || []).map(e => snake(e.name)).filter(Boolean);

  const dir = path.join(targetDir, 'src', 'components', 'time-index');
  if (!fs.existsSync(dir)) return;

  const tableLine = `  tableName = '${tableName}',`;
  const timeLine = `  timeColumn = '${timeColumn}',`;

  for (const f of ['DayView.tsx', 'WeekView.tsx', 'MonthView.tsx', 'EventForm.tsx']) {
    const fp = path.join(dir, f);
    if (!fs.existsSync(fp)) continue;
    safeReplace(fp, 'default-table', tableLine);
    if (f !== 'EventForm.tsx') safeReplace(fp, 'default-time-column', timeLine);
  }

  // EventForm: also set default enums + replace fields interface
  const eventForm = path.join(dir, 'EventForm.tsx');
  if (fs.existsSync(eventForm)) {
    safeReplace(eventForm, 'default-enums',
      `  enumCategories = [${enumCategories.map(c => `'${c}'`).join(', ')}],`);
    safeReplace(eventForm, 'default-fields', buildFieldsBlock(fields));
  }
}

function buildFieldsBlock(fields) {
  const tsTypeFor = (t) => {
    switch (t) {
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'tags': return 'string[]';
      default: return 'string';
    }
  };
  const titleField = fields.find(f => /name|title/i.test(f.name)) || fields[0];
  const lines = [];
  lines.push(`  ${titleField ? snake(titleField.name) : 'title'}: string;`);
  lines.push(`  description?: string;`);
  lines.push(`  startTime: string;`);
  lines.push(`  endTime?: string;`);
  lines.push(`  tags: string[];`);
  return lines.join('\n');
}

function safeReplace(file, key, body) {
  try { replaceBlock(file, key, body); }
  catch (err) {
    // Marker missing → log, continue. Lets the orchestrator surface this.
    if (process.env.WIZARD_DEBUG) console.error(`[time-index] ${file}: ${err.message}`);
  }
}

module.exports = { applyTimeIndexDefaults };
