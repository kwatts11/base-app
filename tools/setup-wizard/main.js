const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile, exec } = require('child_process');

// ── Constants ─────────────────────────────────────────────────────────────────
const BASE_APP_REPO = 'https://github.com/kwatts11/base-app';
const WINDOW_WIDTH = 960;
const WINDOW_HEIGHT = 700;

// ── Window ────────────────────────────────────────────────────────────────────
let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 800,
    minHeight: 620,
    center: true,
    title: 'Base-App Setup Wizard',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
    backgroundColor: '#0f172a',
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Remove default menu
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: Choose folder ────────────────────────────────────────────────────────
ipcMain.handle('wizard:choose-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Choose where to create your new app',
    buttonLabel: 'Select Folder',
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// ── IPC: Clone base-app ───────────────────────────────────────────────────────
ipcMain.handle('wizard:clone', async (event, parentPath, projectName) => {
  const targetDir = path.join(parentPath, projectName);

  if (fs.existsSync(targetDir)) {
    return { ok: false, error: `Folder "${projectName}" already exists at that location.` };
  }

  return new Promise((resolve) => {
    const send = (msg) => {
      try { event.sender.send('clone:progress', msg); } catch {}
    };

    send('Cloning base-app...');

    const clone = exec(
      `git clone --depth=1 "${BASE_APP_REPO}" "${targetDir}"`,
      { timeout: 120000 }
    );

    clone.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) send(line);
    });

    clone.on('close', (code) => {
      if (code !== 0) {
        return resolve({ ok: false, error: 'git clone failed. Check your internet connection.' });
      }

      send('Removing .git history...');
      try {
        fs.rmSync(path.join(targetDir, '.git'), { recursive: true, force: true });
      } catch {}

      send('Initializing fresh git repo...');
      exec(
        `git init && git add . && git commit -m "init: from base-app"`,
        { cwd: targetDir, timeout: 30000 },
        (err) => {
          if (err) {
            // Git init failure is non-fatal — project still usable
            send('Warning: git init failed, but project files are ready.');
          } else {
            send('Git repository initialized.');
          }
          resolve({ ok: true, targetDir });
        }
      );
    });

    clone.on('error', (err) => {
      resolve({ ok: false, error: `Clone error: ${err.message}` });
    });
  });
});

// ── IPC: Test Supabase connection ─────────────────────────────────────────────
ipcMain.handle('wizard:test-supabase', async (_, url, anonKey) => {
  try {
    const normalizedUrl = url.replace(/\/$/, '');
    const res = await fetch(`${normalizedUrl}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok || res.status === 400) {
      // 400 = "no table specified" — still means credentials are valid
      return { ok: true };
    }
    return { ok: false, error: `Server returned ${res.status}. Check your keys.` };
  } catch (err) {
    return { ok: false, error: `Connection failed: ${err.message}` };
  }
});

// ── IPC: Generate project ─────────────────────────────────────────────────────
ipcMain.handle('wizard:generate', async (_, payload) => {
  try {
    const { targetDir, formData, icons, logo } = payload;

    // 1. Read master prompt template from the cloned repo
    const templatePath = path.join(targetDir, 'docs', 'prompts', 'master-prompt-template.md');
    let masterPromptTemplate = '';
    if (fs.existsSync(templatePath)) {
      masterPromptTemplate = fs.readFileSync(templatePath, 'utf8');
    }

    // 2. Write PRD.md
    fs.writeFileSync(path.join(targetDir, 'PRD.md'), buildPRD(formData), 'utf8');

    // 3. Write .env
    fs.writeFileSync(path.join(targetDir, '.env'), buildEnv(formData), 'utf8');

    // 4. Write master-prompt.md (filled template)
    const masterPrompt = fillTemplate(masterPromptTemplate, formData);
    const masterPromptPath = path.join(targetDir, 'master-prompt.md');
    fs.writeFileSync(masterPromptPath, masterPrompt, 'utf8');

    // 5. Write setupConfig.ts
    const setupConfigPath = path.join(targetDir, 'src', 'constants', 'setupConfig.ts');
    fs.writeFileSync(setupConfigPath, buildSetupConfig(), 'utf8');

    // 6. Write icon PNGs
    const iconsDir = path.join(targetDir, 'assets', 'pwa-icons');
    fs.mkdirSync(iconsDir, { recursive: true });

    const iconNames = { 512: 'icon-512x512.png', 192: 'icon-192x192.png', 180: 'apple-touch-icon-180x180.png', 32: 'favicon-32.png' };
    if (icons && Array.isArray(icons)) {
      for (const { size, data } of icons) {
        const base64 = data.replace(/^data:image\/png;base64,/, '');
        fs.writeFileSync(path.join(iconsDir, iconNames[size] || `icon-${size}.png`), Buffer.from(base64, 'base64'));
      }
    }

    // 7. Save original logo
    if (logo && logo.data) {
      const ext = logo.name ? path.extname(logo.name) : '.png';
      const base64 = logo.data.replace(/^data:[^;]+;base64,/, '');
      fs.writeFileSync(path.join(iconsDir, `logo${ext}`), Buffer.from(base64, 'base64'));
    }

    // 7b. Write Mapbox config if location-indexed
    const indexType = formData.tabs?.indexType || 'custom';
    if (indexType === 'location') {
      const mapboxToken = formData.tabs?.mapboxPublicToken || 'YOUR_MAPBOX_PUBLIC_TOKEN';
      const mapConfigPath = path.join(targetDir, 'src', 'constants', 'mapConfig.ts');
      if (fs.existsSync(mapConfigPath)) {
        const mapConfigContent = `/**
 * Mapbox configuration — generated by Base-App Setup Wizard
 * Get tokens at https://account.mapbox.com/access-tokens/
 * Secret download token goes in app.json plugins + EAS secret MAPBOX_SECRET_TOKEN
 */
export const MAPBOX_ACCESS_TOKEN = '${mapboxToken}';
`;
        fs.writeFileSync(mapConfigPath, mapConfigContent, 'utf8');
      }
    }

    // 8. Index-type based cleanup — remove components/hooks not relevant to this app

    // time-index components: only needed for time-indexed apps
    if (indexType !== 'time') {
      const timeIndexDir = path.join(targetDir, 'src', 'components', 'time-index');
      if (fs.existsSync(timeIndexDir)) {
        fs.rmSync(timeIndexDir, { recursive: true, force: true });
      }
    }

    // location files: only needed for location-indexed apps
    if (indexType !== 'location') {
      const locationFiles = [
        path.join(targetDir, 'src', 'hooks', 'useLocations.ts'),
        path.join(targetDir, 'database', 'migrations', '005_locations.sql'),
        path.join(targetDir, 'app', '(tabs)', 'map.tsx'),
        path.join(targetDir, 'app', '(tabs)', 'area.tsx'),
        path.join(targetDir, 'app', '(modal)', 'area-colors.tsx'),
        path.join(targetDir, 'app', '(modal)', 'add-location.tsx'),
        path.join(targetDir, 'src', 'constants', 'mapConfig.ts'),
      ];
      locationFiles.forEach(f => {
        if (fs.existsSync(f)) fs.rmSync(f, { force: true });
      });
    }

    // Remove tools/ from the new project
    const toolsDir = path.join(targetDir, 'tools');
    if (fs.existsSync(toolsDir)) {
      fs.rmSync(toolsDir, { recursive: true, force: true });
    }

    // 9. Open Cursor with master-prompt.md
    execFile('cursor', [masterPromptPath], () => {});

    // 10. Always show the file in Finder/Explorer so user can right-click → Open With
    shell.showItemInFolder(masterPromptPath);

    return { ok: true, targetDir, masterPromptPath };
  } catch (err) {
    return { ok: false, error: err.message };
  }
});

// ── IPC: Shell helpers ────────────────────────────────────────────────────────
ipcMain.handle('wizard:open-url', (_, url) => {
  shell.openExternal(url);
});

ipcMain.handle('wizard:show-in-folder', (_, filePath) => {
  shell.showItemInFolder(filePath);
});

// ── File generators ───────────────────────────────────────────────────────────

function buildPRD(d) {
  const identity = d.identity || {};
  const branding = d.branding || {};
  const dataModel = d.dataModel || {};
  const roles = d.roles || {};
  const enums = d.enums || [];
  const tabs = d.tabs || {};
  const email = d.email || {};
  const supabase = d.supabase || {};
  const emailProvider = d.emailProvider || {};
  const deployment = d.deployment || {};

  const fieldRows = (dataModel.fields || [])
    .map(f => `| ${f.name || ''} | ${f.type || 'text'} | ${f.required ? 'yes' : 'no'} | ${f.notes || ''} |`)
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

## 1. App Identity [REQUIRED]

**App Name:** ${identity.name || ''}
**App Slug:** ${identity.slug || ''}
**Tagline:** ${identity.tagline || ''}
**Short Description:** ${identity.description || ''}
**Target Audience:** ${identity.audience || ''}
**Production URL:** ${identity.url || ''}

---

## 2. Branding [REQUIRED]

**Primary Color:** ${branding.primary || ''}
**Secondary Color:** ${branding.secondary || ''}
**Accent Color:** ${branding.accent || ''}
**Background Color:** ${branding.background || ''}
**Surface Color:** ${branding.surface || ''}
**Text Primary:** ${branding.textPrimary || ''}
**Text Secondary:** ${branding.textSecondary || ''}

**Font Preference:** ${branding.font || 'System default'}

**Logo:**
- Logo URL: assets/pwa-icons/logo${branding.logoExt || '.png'}
- Logo Description: ${branding.logoDescription || ''}

---

## 3. Indexing Type [REQUIRED]

**Primary Index:** ${tabs.indexType || 'time'}
**Notes:** ${tabs.indexNotes || ''}

---

## 4. Core Entity [REQUIRED for time-indexed apps]

**Entity Name (singular):** ${dataModel.entitySingular || ''}
**Entity Name (plural):** ${dataModel.entityPlural || ''}

**Fields:**

| Field Name  | Type     | Required | Notes |
| ----------- | -------- | -------- | ----- |
${fieldRows}

**Searchable Fields:** ${(dataModel.searchableFields || []).join(', ')}
**Default Sort:** ${dataModel.defaultSort || ''} ${dataModel.defaultSortDir || 'asc'}

---

## 5. Roles [REQUIRED]

| Role (your name) | Maps to default | What they can do |
| ---------------- | --------------- | --------------------------------------- |
${roleRows}

**Default Role for new users:** ${roles.defaultRole || 'employee'}
**Invite-only registration:** ${roles.inviteOnly ? 'yes' : 'no'}

---

## 6. Editable Enum Categories [REQUIRED]

| Category Name | Example Values | Used On |
| ------------- | -------------- | ------- |
${enumRows}

---

## 7. Tab Structure [REQUIRED]

**Time-Indexed Views:**
${tabList}

**Custom Tabs:**
${customTabs || 'None'}

---

## 8. Email [REQUIRED]

**From Address:** ${email.fromAddress || ''}
**Sender Name:** ${email.senderName || ''}
**Email Tone/Style:** ${email.tone || 'Friendly'}

---

## 9. Supabase Project [REQUIRED]

**Project Name:** ${supabase.projectName || ''}
**Project ID:** ${supabase.projectId || ''}
**Region:** ${supabase.region || ''}

---

## 10. Deployment [REQUIRED]

**Hosting Platform:** ${deployment.platform || ''}
**Custom Domain:** ${deployment.domain || ''}
**Build Command:** npm run build:web
**Publish Directory:** dist

---

## 11. Slack Automation [OPTIONAL]

**Bug Reports Channel:** ${deployment.slackBugChannel || ''}
**Feature Requests Channel:** ${deployment.slackFeatureChannel || ''}
**Workspace Name:** ${deployment.slackWorkspace || ''}

---

## 12. Additional Requirements [OPTIONAL]

${identity.additionalNotes || ''}
`;
}

function buildEnv(d) {
  const supabase = d.supabase || {};
  const emailProvider = d.emailProvider || {};
  const deployment = d.deployment || {};
  const identity = d.identity || {};

  const isResend = (emailProvider.type || 'resend') === 'resend';

  const tabs = d.tabs || {};
  const isLocation = (tabs.indexType || 'custom') === 'location';

  return `# ==============================================================================
# ${identity.name || 'base-app'} — Environment Variables
# Generated by Base-App Setup Wizard
# ==============================================================================

# ── Supabase ───────────────────────────────────────────────────────────────────
EXPO_PUBLIC_SUPABASE_URL=https://${supabase.projectId || 'YOUR_PROJECT_ID'}.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=${supabase.anonKey || ''}
SUPABASE_SERVICE_ROLE_KEY=${supabase.serviceRoleKey || ''}
SUPABASE_PROJECT_ID=${supabase.projectId || ''}${isLocation ? `

# ── Mapbox (location-indexed apps only) ───────────────────────────────────────
# Public token: already written to src/constants/mapConfig.ts
EXPO_PUBLIC_MAPBOX_TOKEN=${tabs.mapboxPublicToken || 'YOUR_MAPBOX_PUBLIC_TOKEN'}
# Secret download token: required for native builds — add to app.json plugins + EAS secret
MAPBOX_SECRET_TOKEN=${tabs.mapboxSecretToken || 'YOUR_MAPBOX_SECRET_TOKEN'}` : ''}

# ── Auth Email — Supabase SMTP ─────────────────────────────────────────────────
SMTP_HOST=${emailProvider.smtpHost || 'smtp.resend.com'}
SMTP_PORT=${emailProvider.smtpPort || '587'}
SMTP_USER=${emailProvider.smtpUser || 'resend'}
SMTP_PASS=${emailProvider.smtpPass || emailProvider.resendKey || ''}
SMTP_FROM_EMAIL=${(d.email || {}).fromAddress || 'noreply@yourdomain.com'}
SMTP_FROM_NAME=${(d.email || {}).senderName || identity.name || 'App Name'}

# ── Custom Transactional Email (Edge Function) ─────────────────────────────────
EMAIL_PROVIDER=${isResend ? 'resend' : 'smtp'}
RESEND_API_KEY=${emailProvider.resendKey || ''}

# ── Slack + Cursor Automation ──────────────────────────────────────────────────
SLACK_BOT_TOKEN=${(d.deployment || {}).slackBotToken || ''}
SLACK_BUG_REPORTS_CHANNEL_ID=${(d.deployment || {}).slackBugChannel || ''}
SLACK_FEATURE_REQUESTS_CHANNEL_ID=${(d.deployment || {}).slackFeatureChannel || ''}
CURSOR_API_KEY=

# ── App ────────────────────────────────────────────────────────────────────────
APP_URL=${(d.identity || {}).url || 'https://your-app.netlify.app'}
`;
}

function buildSetupConfig() {
  return `// Generated by Base-App Setup Wizard — do not edit manually
export const WIZARD_RAN = true;
export const WIZARD_COMPLETED_AT = '${new Date().toISOString()}';
export const WIZARD_COMPLETED_ITEMS = ['prd_filled', 'env_configured'] as const;
`;
}

function fillTemplate(template, formData) {
  if (!template) return buildFallbackMasterPrompt(formData);

  const identity = formData.identity || {};
  const branding = formData.branding || {};
  const dataModel = formData.dataModel || {};
  const roles = formData.roles || {};
  const supabase = formData.supabase || {};
  const tabs = formData.tabs || {};
  const email = formData.email || {};
  const deployment = formData.deployment || {};

  const roleNames = (roles.levels || []).map(r => r.name).join(' → ');
  const fieldList = (dataModel.fields || [])
    .map(f => `  - ${f.name} (${f.type}${f.required ? ', required' : ''})`)
    .join('\n');
  const tabList = (tabs.selected || []).join(', ');
  const indexType = tabs.indexType || 'time';

  return template
    .replace(/\{\{APP_NAME\}\}/g, identity.name || '')
    .replace(/\{\{APP_SLUG\}\}/g, identity.slug || '')
    .replace(/\{\{TAGLINE\}\}/g, identity.tagline || '')
    .replace(/\{\{DESCRIPTION\}\}/g, identity.description || '')
    .replace(/\{\{PRODUCTION_URL\}\}/g, identity.url || '')
    .replace(/\{\{PRIMARY_COLOR\}\}/g, branding.primary || '')
    .replace(/\{\{SECONDARY_COLOR\}\}/g, branding.secondary || '')
    .replace(/\{\{ACCENT_COLOR\}\}/g, branding.accent || '')
    .replace(/\{\{BACKGROUND_COLOR\}\}/g, branding.background || '')
    .replace(/\{\{SURFACE_COLOR\}\}/g, branding.surface || '')
    .replace(/\{\{TEXT_PRIMARY\}\}/g, branding.textPrimary || '')
    .replace(/\{\{TEXT_SECONDARY\}\}/g, branding.textSecondary || '')
    .replace(/\{\{ENTITY_SINGULAR\}\}/g, dataModel.entitySingular || '')
    .replace(/\{\{ENTITY_PLURAL\}\}/g, dataModel.entityPlural || '')
    .replace(/\{\{ENTITY_FIELDS\}\}/g, fieldList)
    .replace(/\{\{SEARCHABLE_FIELDS\}\}/g, (dataModel.searchableFields || []).join(', '))
    .replace(/\{\{DEFAULT_SORT\}\}/g, `${dataModel.defaultSort || ''} ${dataModel.defaultSortDir || 'asc'}`.trim())
    .replace(/\{\{ROLE_NAMES\}\}/g, roleNames)
    .replace(/\{\{ROLE_LEVEL_1\}\}/g, (roles.levels || [])[0]?.name || 'Employee')
    .replace(/\{\{ROLE_LEVEL_2\}\}/g, (roles.levels || [])[1]?.name || 'Manager')
    .replace(/\{\{ROLE_LEVEL_3\}\}/g, (roles.levels || [])[2]?.name || 'Admin')
    .replace(/\{\{DEFAULT_ROLE\}\}/g, roles.defaultRole || 'employee')
    .replace(/\{\{INDEX_TYPE\}\}/g, indexType)
    .replace(/\{\{TABS\}\}/g, tabList)
    .replace(/\{\{SUPPORT_EMAIL\}\}/g, email.fromAddress || '')
    .replace(/\{\{FROM_NAME\}\}/g, email.senderName || '')
    .replace(/\{\{SUPABASE_PROJECT_ID\}\}/g, supabase.projectId || '')
    .replace(/\{\{SUPABASE_URL\}\}/g, `https://${supabase.projectId || 'YOUR_PROJECT_ID'}.supabase.co`)
    .replace(/\{\{DEPLOYMENT_PLATFORM\}\}/g, deployment.platform || '')
    .replace(/\{\{CUSTOM_DOMAIN\}\}/g, deployment.domain ? `Custom domain: ${deployment.domain}` : '')
    .replace(/\{\{MAPBOX_PUBLIC_TOKEN\}\}/g, (formData.tabs || {}).mapboxPublicToken || 'YOUR_MAPBOX_PUBLIC_TOKEN')
    .replace(/\{\{MAPBOX_SECRET_TOKEN\}\}/g, (formData.tabs || {}).mapboxSecretToken || 'YOUR_MAPBOX_SECRET_TOKEN')
    .replace(/\{\{FROM_NAME\}\}/g, (formData.email || {}).senderName || '')
    .replace(/\{\{GENERATED_DATE\}\}/g, new Date().toISOString().split('T')[0]);
}

function buildFallbackMasterPrompt(d) {
  const identity = d.identity || {};
  const branding = d.branding || {};
  const dataModel = d.dataModel || {};
  const roles = d.roles || {};
  const supabase = d.supabase || {};
  const tabs = d.tabs || {};
  const email = d.email || {};
  const deployment = d.deployment || {};

  const roleLevel1 = (roles.levels || [])[0]?.name || 'Employee';
  const roleLevel2 = (roles.levels || [])[1]?.name || 'Manager';
  const roleLevel3 = (roles.levels || [])[2]?.name || 'Admin';
  const indexType = tabs.indexType || 'time';
  const isTimeIndexed = indexType === 'time';

  return `# Setup: ${identity.name || 'New App'} — Execute all steps autonomously.

Do not ask questions. All values are provided below. Do not re-read PRD.md — use the values here directly.

## App Values

- **App name:** ${identity.name || ''}
- **Slug:** ${identity.slug || ''}
- **Tagline:** ${identity.tagline || ''}
- **Description:** ${identity.description || ''}
- **Production URL:** ${identity.url || ''}
- **Support email:** ${email.fromAddress || ''}

## Branding

- Primary: ${branding.primary || ''}
- Secondary: ${branding.secondary || ''}
- Accent: ${branding.accent || ''}
- Background: ${branding.background || ''}
- Surface: ${branding.surface || ''}
- Text primary: ${branding.textPrimary || ''}
- Text secondary: ${branding.textSecondary || ''}

## Roles

- Level 1 (employee): ${roleLevel1}
- Level 2 (manager): ${roleLevel2}
- Level 3 (admin): ${roleLevel3}
- Default role for new users: ${roles.defaultRole || 'employee'}
- Invite-only: ${roles.inviteOnly ? 'yes' : 'no'}

## Data Model

- Entity (singular): ${dataModel.entitySingular || ''}
- Entity (plural): ${dataModel.entityPlural || ''}
- Fields:
${(dataModel.fields || []).map(f => `  - ${f.name} | ${f.type} | required: ${f.required ? 'yes' : 'no'} | ${f.notes || ''}`).join('\n')}
- Searchable: ${(dataModel.searchableFields || []).join(', ')}
- Default sort: ${dataModel.defaultSort || ''} ${dataModel.defaultSortDir || 'asc'}

## Index Type

${indexType}

## Tabs

${(tabs.selected || []).map(t => `- ${t}`).join('\n')}
${(tabs.custom || []).map(t => `- ${t.name} (custom): ${t.description}`).join('\n')}

## Supabase

- Project ID: ${supabase.projectId || ''}
- Project URL: https://${supabase.projectId || 'YOUR_PROJECT_ID'}.supabase.co
- Region: ${supabase.region || ''}

## Deployment

- Platform: ${deployment.platform || ''}
- Domain: ${deployment.domain || ''}

---

## Instructions — Execute in order, do not stop between steps.

### Step 1: App identity and configuration

Update \`src/constants/appConfig.ts\`:
- name = "${identity.name || ''}"
- shortName = "${identity.slug || identity.name || ''}"
- tagline = "${identity.tagline || ''}"
- description = "${identity.description || ''}"
- supportEmail = "${email.fromAddress || ''}"

Update \`app.json\`:
- expo.name = "${identity.name || ''}"
- expo.slug = "${identity.slug || ''}"
- expo.web.name = "${identity.name || ''}"
- expo.web.shortName = "${identity.slug || ''}"
- expo.web.meta["apple-mobile-web-app-title"] = "${identity.name || ''}"

Update \`public/manifest.json\`:
- name = "${identity.name || ''}"
- short_name = "${identity.slug || ''}"
- description = "${identity.description || ''}"

### Step 2: Branding and theme

Update \`src/constants/theme.ts\` DEFAULT_THEME.colors:
- primary: "${branding.primary || ''}"
- secondary: "${branding.secondary || ''}"
- accent: "${branding.accent || ''}"
- background: "${branding.background || ''}"
- surface: "${branding.surface || ''}"
- text: "${branding.textPrimary || ''}"
- textSecondary: "${branding.textSecondary || ''}"

Update \`app.json\`:
- expo.splash.backgroundColor: "${branding.background || ''}"
- expo.web.themeColor: "${branding.primary || ''}"
- expo.web.backgroundColor: "${branding.background || ''}"
- expo.android.adaptiveIcon.backgroundColor: "${branding.primary || ''}"

Update \`public/manifest.json\`:
- background_color: "${branding.background || ''}"
- theme_color: "${branding.primary || ''}"

### Step 3: Roles

Update \`src/types/database.ts\` — rename UserRole display labels (keep DB values employee/manager/admin):
- employee → "${roleLevel1}"
- manager → "${roleLevel2}"
- admin → "${roleLevel3}"

Update \`src/utils/rolePermissions.ts\` — set ROLE_LABELS:
- employee: "${roleLevel1}"
- manager: "${roleLevel2}"
- admin: "${roleLevel3}"

### Step 4: Supabase MCP configuration

Update \`.cursor/rules/supabase-mcp.mdc\`:
- Set **Project ID** = \`${supabase.projectId || ''}\`
- Set **Project URL** = \`https://${supabase.projectId || 'YOUR_PROJECT_ID'}.supabase.co\`

### Step 5: Apply database migrations via Supabase MCP

Use the Supabase MCP tool \`apply_migration\` with project_id = "${supabase.projectId || ''}" to apply each migration in order:
1. \`database/migrations/001_user_profiles.sql\`
2. \`database/migrations/002_editable_enums.sql\`
3. \`database/migrations/003_rls_policies.sql\`

After applying, run \`list_tables\` to confirm all tables exist.

### Step 6: Generate TypeScript types

Run Supabase MCP \`generate_typescript_types\` with project_id = "${supabase.projectId || ''}" and update \`src/types/database.ts\` with the generated types (merge with existing role/permission logic — do not overwrite the UserRole enum or helper functions).
${isTimeIndexed ? `
### Step 7: Time-indexed entity setup

#### 7a. Generate entity migration

Create \`database/migrations/004_${(dataModel.entityPlural || 'entity').toLowerCase().replace(/\s/g, '_')}.sql\` with:
- Table name: \`${(dataModel.entityPlural || 'entity').toLowerCase().replace(/\s/g, '_')}\`
- Columns from the fields list above (map types: text→TEXT, number→NUMERIC, datetime→TIMESTAMPTZ, boolean→BOOLEAN, enum→TEXT, image→TEXT, url→TEXT)
- Always include: id UUID PRIMARY KEY DEFAULT gen_random_uuid(), created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(), created_by UUID REFERENCES auth.users(id)
- Full-text search index on: ${(dataModel.searchableFields || []).join(', ')}
- RLS policies consistent with 003_rls_policies.sql (authenticated read, manager/admin write)

Apply via Supabase MCP \`apply_migration\` with project_id = "${supabase.projectId || ''}".

#### 7b. Update enum seed data

Update \`database/migrations/002_editable_enums.sql\` — replace generic seed data with:
${(d.enums || []).map(e => `- Category: "${e.name}", examples: ${e.examples}`).join('\n')}

Apply the updated seed via \`execute_sql\` (INSERT the new categories if not already present).

#### 7c. Configure time-index components

Update \`src/components/time-index/\` components:
- Set default tableName to \`${(dataModel.entityPlural || 'entity').toLowerCase().replace(/\s/g, '_')}\`
- Set timeColumn to the datetime field from the fields list
- Update EventForm fields to match the entity fields above
- Replace "Event" terminology with "${dataModel.entitySingular || 'Item'}"

#### 7d. Scaffold tab screens

For each tab in the list:
${(tabs.selected || []).map(t => `- Create \`app/(tabs)/${t.toLowerCase().replace(/\s/g, '-')}.tsx\``).join('\n')}

Wire each time view (Today/Day, Week, Month) to the entity-specific components.
Add an \`app/(modal)/add-${(dataModel.entitySingular || 'item').toLowerCase()}.tsx\` create form.

Update \`app/(tabs)/_layout.tsx\` TAB_CONFIG with the real tabs. Remove SetupBanner.
` : ''}
### Step ${isTimeIndexed ? '9' : '8'}: Remove unused components

> The wizard deleted unused index files. Check for any dangling imports:
- If NOT time-indexed: verify \`src/components/time-index/\` is gone; remove any imports of it from layout files
- If NOT location-indexed: remove \`AreaRow\`, \`LocationRow\`, \`LocationWithArea\` from \`src/types/database.ts\`
- Remove all \`// TODO: [BASE-APP SETUP NEEDED]\` comments

---

### Step ${isTimeIndexed ? '10' : '9'}: Page ID table

Update \`UPDATE_SYSTEM.md\` with the complete page ID table for this app's route structure.

### Step ${isTimeIndexed ? '11' : '10'}: Email branding

Update \`docs/EMAIL_BRANDING.md\` — replace all template placeholders:
- APP_NAME → "${identity.name || ''}"
- PRIMARY_COLOR → "${branding.primary || ''}"
- BACKGROUND_COLOR → "${branding.background || ''}"
- SUPPORT_EMAIL → "${email.fromAddress || ''}"

### Step ${isTimeIndexed ? '12' : '11'}: Remove setup banners

Replace all \`[BASE-APP SETUP NEEDED]\` placeholders:
- \`app/(tabs)/_layout.tsx\` — configure real tabs, remove SetupBanner
- \`app/(tabs)/home.tsx\` — replace placeholder content
- Any other files with \`// TODO: [BASE-APP SETUP NEEDED]\`

### Step ${isTimeIndexed ? '13' : '12'}: Write SETUP_TODO.md

Write \`SETUP_TODO.md\` in the project root with ONLY these remaining manual steps:

\`\`\`markdown
# ${identity.name || 'App'} — Manual Setup Remaining

Generated: ${new Date().toISOString().split('T')[0]} | AI automated setup complete ✓

## Required (must do before launch)

### 1. Configure Email (5 min)
Supabase Dashboard → Authentication → SMTP Settings
- Host: ${d.emailProvider?.smtpHost || 'smtp.resend.com'}
- Port: ${d.emailProvider?.smtpPort || '587'}
- User: ${d.emailProvider?.smtpUser || 'resend'}
- From: ${email.fromAddress || 'noreply@yourdomain.com'}

### 2. Create First Admin (2 min)
1. Supabase Dashboard → Authentication → Users → Invite User
2. After accepting invite: Table Editor → user_profiles → set role = 'admin'

### 3. Upload App Icons (2 min)
Icons generated by the wizard are in assets/pwa-icons/
Update app.json expo.icon to point to your 1024×1024 source icon.

## Optional

### 4. Deploy to ${deployment.platform || 'Netlify/Vercel'}
1. Connect repo to ${deployment.platform || 'your hosting platform'}
2. Build command: npm run build:web
3. Publish directory: dist
4. Add all .env values to environment variables
${deployment.domain ? `5. Connect domain: ${deployment.domain}` : ''}

### 5. Email templates
Apply branded templates from docs/EMAIL_BRANDING.md to Supabase auth email templates.

### 6. Slack automation (optional)
See docs/CURSOR_AUTOMATION_PROMPT.md
\`\`\`

---

After completing all steps, run \`npm install && npm start\` to verify the app launches correctly.
`;
}
