/**
 * prd — write PRD.md from formData. Lifted from main.js (unchanged behavior).
 */
const fs = require('fs');
const path = require('path');

function buildPRD(d) {
  const identity = d.identity || {};
  const branding = d.branding || {};
  const dataModel = d.dataModel || {};
  const roles = d.roles || {};
  const enums = d.enums || [];
  const tabs = d.tabs || {};
  const email = d.email || {};
  const supabase = d.supabase || {};
  const deployment = d.deployment || {};

  const fieldRows = (dataModel.fields || [])
    .map(f => {
      if (f.type === 'card_break') return `| --- Section: ${f.label || 'Untitled'} --- | | | |`;
      return `| ${f.name || ''} | ${f.type || 'text'} | ${f.required ? 'yes' : 'no'} | ${f.notes || ''} |`;
    })
    .join('\n');

  const roleRows = (roles.levels || [])
    .map((r, i) => {
      const defaults = ['Employee', 'Manager', 'Admin'];
      const dbNames = ['employee', 'manager', 'admin'];
      return `| ${r.name || defaults[i]} | ${dbNames[i]} | ${r.description || ''} |`;
    })
    .join('\n');

  const enumRows = enums
    .map(e => `| ${e.name || ''} | ${e.examples || ''} | ${e.usedOn || ''} |`)
    .join('\n');

  const tabList = (tabs.selected || []).map(t => `- ${t}`).join('\n');
  const customTabs = (tabs.custom || []).map(t => `- ${t.name}: ${t.description}`).join('\n');

  return `# Product Requirements Document (PRD)

# App Setup Specification

---

## 1. App Identity

**App Name:** ${identity.name || ''}
**App Slug:** ${identity.slug || ''}
**Tagline:** ${identity.tagline || ''}
**Short Description:** ${identity.description || ''}
**Target Audience:** ${identity.audience || ''}
**Production URL:** ${identity.url || ''}

---

## 2. Branding

**Primary:** ${branding.primary || ''}
**Secondary:** ${branding.secondary || ''}
**Accent:** ${branding.accent || ''}
**Background:** ${branding.background || ''}
**Surface:** ${branding.surface || ''}
**Text Primary:** ${branding.textPrimary || ''}
**Text Secondary:** ${branding.textSecondary || ''}

---

## 3. Indexing Type

**Primary Index:** ${tabs.indexType || 'time'}

---

## 4. Core Entity

**Singular:** ${dataModel.entitySingular || ''}
**Plural:** ${dataModel.entityPlural || ''}

| Field Name | Type | Required | Notes |
| --- | --- | --- | --- |
${fieldRows}

**Searchable:** ${(dataModel.searchableFields || []).join(', ')}
**Default Sort:** ${dataModel.defaultSort || ''} ${dataModel.defaultSortDir || 'asc'}

---

## 5. Roles

| Display Name | DB Role | Description |
| --- | --- | --- |
${roleRows}

**Default role for new users:** ${roles.defaultRole || 'employee'}
**Invite-only:** ${roles.inviteOnly ? 'yes' : 'no'}

---

## 6. Editable Enum Categories

| Category | Examples | Used On |
| --- | --- | --- |
${enumRows}

---

## 7. Tabs

${tabList}

**Custom tabs:**
${customTabs || 'None'}

---

## 8. Email

**From:** ${email.fromAddress || ''}
**Sender Name:** ${email.senderName || ''}
**Tone:** ${email.tone || 'Friendly'}

---

## 9. Supabase

**Project ID:** ${supabase.projectId || ''}
**Region:** ${supabase.region || ''}

---

## 10. Deployment

**Platform:** ${deployment.platform || ''}
**Custom Domain:** ${deployment.domain || ''}
`;
}

function applyPRD(targetDir, formData) {
  fs.writeFileSync(path.join(targetDir, 'PRD.md'), buildPRD(formData), 'utf8');
}

module.exports = { applyPRD, buildPRD };
