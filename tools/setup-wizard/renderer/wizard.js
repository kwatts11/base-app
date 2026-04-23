/* ── State ────────────────────────────────────────────────────────────────── */
const state = {
  currentScreen: 0,   // 0 = location, 1–10 = steps, 11 = review, 'done' = done
  targetDir: null,
  logoData: null,
  logoName: null,
  enumCandidates: [],  // detected from data import
  stepValid: Array(12).fill(false),
  stepVisited: Array(12).fill(false),  // only show checkmarks after visiting
  indexType: 'time',
  mapboxPublicToken: '',
  mapboxSecretToken: '',
};

/* ── Required fields per index type ──────────────────────────────────────── */
const INDEX_REQUIRED_FIELDS = {
  time: {
    label: 'Time-indexed',
    required: [
      {
        type: ['datetime', 'date'],
        name: 'start_time',
        isRequired: true,
        description: 'A datetime field (e.g. "Start Time") — maps to start_time column used by DayView/WeekView/MonthView.',
        suggestedName: 'Start Time',
        suggestedType: 'datetime',
      },
      {
        type: ['text'],
        name: 'title',
        isRequired: true,
        description: 'A text field (e.g. "Title" or "Name") — displayed on EventTile.',
        suggestedName: 'Title',
        suggestedType: 'text',
      },
    ],
    recommended: [
      {
        type: ['datetime'],
        name: 'end_time',
        isRequired: false,
        description: 'End Time (datetime) — for duration display in calendar views.',
        suggestedName: 'End Time',
        suggestedType: 'datetime',
      },
    ],
  },
  location: {
    label: 'Location-indexed',
    required: [
      {
        type: ['text', 'url'],
        name: 'name',
        isRequired: true,
        description: 'A text field (e.g. "Name" or "Title") — display label for each location item.',
        suggestedName: 'Name',
        suggestedType: 'text',
      },
    ],
    recommended: [
      {
        type: ['text'],
        name: 'address',
        isRequired: false,
        description: 'Address or location string for map display.',
        suggestedName: 'Address',
        suggestedType: 'text',
      },
    ],
  },
  custom: { label: 'Custom', required: [], recommended: [] },
};

/**
 * Checks current fields in Step 3 against requirements for the given index type.
 * Returns { missing: [], present: [] } arrays of requirement objects.
 */
function checkRequiredFields(indexType) {
  const spec = INDEX_REQUIRED_FIELDS[indexType] || INDEX_REQUIRED_FIELDS.custom;
  const fields = getFields();

  const check = (reqs) => reqs.map(req => {
    const found = fields.some(f =>
      req.type.includes(f.type) &&
      f.name.trim().length > 0
    );
    return { ...req, found };
  });

  return {
    required: check(spec.required),
    recommended: check(spec.recommended || []),
  };
}

/**
 * Adds any missing required/recommended fields from the spec into the fields table.
 * Called when user clicks "Add missing fields" in the warning banner.
 */
function addMissingFields(indexType) {
  const { required, recommended } = checkRequiredFields(indexType);
  const toAdd = [...required, ...recommended].filter(r => !r.found);
  toAdd.forEach(r => addFieldRow(r.suggestedName, r.suggestedType, r.isRequired, ''));
  validateStep(3);
}

/* ── Step metadata ───────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'App Identity' },
  { id: 2, label: 'Branding' },
  { id: 3, label: 'Data Model' },
  { id: 4, label: 'Roles' },
  { id: 5, label: 'Enum Categories' },
  { id: 6, label: 'Tab Structure' },
  { id: 7, label: 'Email' },
  { id: 8, label: 'Supabase' },
  { id: 9, label: 'Email Provider' },
  { id: 10, label: 'Deployment' },
  { id: 11, label: 'Review & Generate' },
];

/* ── Color palette ───────────────────────────────────────────────────────── */
const PALETTE = [
  // Whites / Grays
  { name: 'White', hex: '#ffffff' },
  { name: 'Snow', hex: '#f8fafc' },
  { name: 'Light Gray', hex: '#e2e8f0' },
  { name: 'Silver', hex: '#cbd5e1' },
  { name: 'Gray', hex: '#94a3b8' },
  { name: 'Steel', hex: '#64748b' },
  { name: 'Slate', hex: '#475569' },
  { name: 'Graphite', hex: '#334155' },
  { name: 'Charcoal', hex: '#1e293b' },
  { name: 'Near Black', hex: '#0f172a' },
  { name: 'Jet Black', hex: '#020617' },
  { name: 'Warm White', hex: '#fafaf9' },
  // Blues
  { name: 'Sky', hex: '#bae6fd' },
  { name: 'Cornflower', hex: '#93c5fd' },
  { name: 'Periwinkle', hex: '#818cf8' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Royal Blue', hex: '#4f46e5' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Ocean', hex: '#0ea5e9' },
  { name: 'Cobalt', hex: '#2563eb' },
  { name: 'Sapphire', hex: '#1d4ed8' },
  { name: 'Navy', hex: '#1e3a5f' },
  { name: 'Midnight', hex: '#1e293b' },
  { name: 'Deep Blue', hex: '#172554' },
  // Greens
  { name: 'Mint', hex: '#d1fae5' },
  { name: 'Seafoam', hex: '#6ee7b7' },
  { name: 'Emerald', hex: '#34d399' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Sage', hex: '#86efac' },
  { name: 'Forest', hex: '#16a34a' },
  { name: 'Hunter', hex: '#15803d' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Dark Teal', hex: '#0f766e' },
  { name: 'Olive', hex: '#4d7c0f' },
  { name: 'Moss', hex: '#365314' },
  { name: 'Jungle', hex: '#14532d' },
  // Reds / Pinks
  { name: 'Rose', hex: '#fda4af' },
  { name: 'Pink', hex: '#f472b6' },
  { name: 'Hot Pink', hex: '#ec4899' },
  { name: 'Blush', hex: '#fb7185' },
  { name: 'Coral', hex: '#f87171' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Crimson', hex: '#dc2626' },
  { name: 'Scarlet', hex: '#b91c1c' },
  { name: 'Berry', hex: '#9f1239' },
  { name: 'Burgundy', hex: '#7f1d1d' },
  { name: 'Maroon', hex: '#450a0a' },
  { name: 'Magenta', hex: '#c026d3' },
  // Oranges / Yellows
  { name: 'Butter', hex: '#fef9c3' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Gold', hex: '#d97706' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Tangerine', hex: '#ea580c' },
  { name: 'Peach', hex: '#fdba74' },
  { name: 'Bronze', hex: '#92400e' },
  { name: 'Brown', hex: '#78350f' },
  { name: 'Dark Brown', hex: '#451a03' },
  { name: 'Pumpkin', hex: '#c2410c' },
  { name: 'Cream', hex: '#fefce8' },
  // Purples
  { name: 'Lavender', hex: '#e9d5ff' },
  { name: 'Lilac', hex: '#c4b5fd' },
  { name: 'Violet', hex: '#8b5cf6' },
  { name: 'Purple', hex: '#7c3aed' },
  { name: 'Plum', hex: '#6d28d9' },
  { name: 'Grape', hex: '#5b21b6' },
  { name: 'Eggplant', hex: '#4c1d95' },
  { name: 'Mauve', hex: '#9f7aea' },
  { name: 'Fuchsia', hex: '#a21caf' },
  { name: 'Dark Purple', hex: '#3b0764' },
  // Browns / Neutrals
  { name: 'Sand', hex: '#fef3c7' },
  { name: 'Khaki', hex: '#d9c97c' },
  { name: 'Tan', hex: '#d4a96a' },
  { name: 'Camel', hex: '#a07850' },
  { name: 'Taupe', hex: '#8c7864' },
  { name: 'Walnut', hex: '#5c4033' },
  { name: 'Espresso', hex: '#3e2723' },
  { name: 'Mocha', hex: '#4e342e' },
  { name: 'Stone', hex: '#78716c' },
  { name: 'Warm Gray', hex: '#57534e' },
];

/* ── Color themes ────────────────────────────────────────────────────────── */
// Sourced from real design systems: Tokyo Night, Catppuccin, Nord, Dracula,
// Everforest, + 3 originals (Desert, Slate Light, Midnight Gold)
const COLOR_THEMES = [
  {
    name: 'Tokyo Night',
    desc: 'Deep navy · blue & purple accents',
    colors: { primary: '#7aa2f7', secondary: '#bb9af7', accent: '#73daca', background: '#1a1b26', surface: '#24283b', textPrimary: '#c0caf5', textSecondary: '#565f89' },
  },
  {
    name: 'Catppuccin',
    desc: 'Cozy dark · pastel mauve',
    colors: { primary: '#cba6f7', secondary: '#89b4fa', accent: '#a6e3a1', background: '#1e1e2e', surface: '#313244', textPrimary: '#cdd6f4', textSecondary: '#7f849c' },
  },
  {
    name: 'Nord',
    desc: 'Arctic · clean frost blues',
    colors: { primary: '#88c0d0', secondary: '#81a1c1', accent: '#a3be8c', background: '#2e3440', surface: '#3b4252', textPrimary: '#eceff4', textSecondary: '#616e88' },
  },
  {
    name: 'Dracula',
    desc: 'Dark · bold purple & pink',
    colors: { primary: '#bd93f9', secondary: '#ff79c6', accent: '#50fa7b', background: '#282a36', surface: '#44475a', textPrimary: '#f8f8f2', textSecondary: '#6272a4' },
  },
  {
    name: 'Everforest',
    desc: 'Muted · natural sage green',
    colors: { primary: '#a7c080', secondary: '#83c092', accent: '#d699b6', background: '#272e33', surface: '#2e383c', textPrimary: '#d3c6aa', textSecondary: '#7a8478' },
  },
  {
    name: 'Desert',
    desc: 'Warm · amber & terracotta',
    colors: { primary: '#d4903a', secondary: '#c47030', accent: '#7aaf7a', background: '#18100a', surface: '#261810', textPrimary: '#f2e0c8', textSecondary: '#9a7050' },
  },
  {
    name: 'Slate Light',
    desc: 'Light · indigo on crisp white',
    colors: { primary: '#4f46e5', secondary: '#7c3aed', accent: '#16a34a', background: '#f8fafc', surface: '#ffffff', textPrimary: '#0f172a', textSecondary: '#64748b' },
  },
  {
    name: 'Ocean Fresh',
    desc: 'Light · cyan & emerald on sky',
    colors: { primary: '#0891b2', secondary: '#0e7490', accent: '#10b981', background: '#f0f9ff', surface: '#ffffff', textPrimary: '#0c4a6e', textSecondary: '#64748b' },
  },
  {
    name: 'Violet Dawn',
    desc: 'Light · violet & pink creative',
    colors: { primary: '#7c3aed', secondary: '#6d28d9', accent: '#db2777', background: '#faf5ff', surface: '#ffffff', textPrimary: '#1e0a3c', textSecondary: '#6b7280' },
  },
  {
    name: 'Rose Quartz',
    desc: 'Light · rose & amber warmth',
    colors: { primary: '#e11d48', secondary: '#db2777', accent: '#d97706', background: '#fff5f7', surface: '#ffffff', textPrimary: '#3b0015', textSecondary: '#71717a' },
  },
  {
    name: 'Forest Sage',
    desc: 'Light · deep green & earth amber',
    colors: { primary: '#15803d', secondary: '#166534', accent: '#b45309', background: '#f7f5f0', surface: '#ffffff', textPrimary: '#1c1917', textSecondary: '#6b7280' },
  },
  {
    name: 'Amber Grove',
    desc: 'Light · amber & sage warmth',
    colors: { primary: '#d97706', secondary: '#b45309', accent: '#15803d', background: '#fffbeb', surface: '#ffffff', textPrimary: '#1c1208', textSecondary: '#71717a' },
  },
  {
    name: 'Cobalt',
    desc: 'Light · deep blue enterprise',
    colors: { primary: '#1d4ed8', secondary: '#1e40af', accent: '#0891b2', background: '#eff6ff', surface: '#ffffff', textPrimary: '#0f1c45', textSecondary: '#4b5563' },
  },
  {
    name: 'Midnight Gold',
    desc: 'Near-black · gold accents',
    colors: { primary: '#c8932a', secondary: '#a67820', accent: '#6366f1', background: '#0a0a0f', surface: '#141420', textPrimary: '#e8e0d0', textSecondary: '#666080' },
  },
];

const COLOR_FIELDS = [
  { key: 'primary',       label: 'Primary',        default: '#6366f1' },
  { key: 'secondary',     label: 'Secondary',      default: '#818cf8' },
  { key: 'accent',        label: 'Accent',         default: '#22c55e' },
  { key: 'background',    label: 'Background',     default: '#0f172a' },
  { key: 'surface',       label: 'Surface',        default: '#1e293b' },
  { key: 'textPrimary',   label: 'Text Primary',   default: '#f1f5f9' },
  { key: 'textSecondary', label: 'Text Secondary', default: '#94a3b8' },
];

const colorValues = {};
COLOR_FIELDS.forEach(f => { colorValues[f.key] = f.default; });

/* ── Tab options ─────────────────────────────────────────────────────────── */
const TAB_OPTIONS = [
  { id: 'today', label: 'Today / Day View', desc: 'Scrollable list of items for the current day', indexTypes: ['time'] },
  { id: 'week', label: 'Week View', desc: '7-day strip with items', indexTypes: ['time'] },
  { id: 'month', label: 'Month View', desc: 'Calendar grid with item indicators', indexTypes: ['time'] },
  { id: 'map', label: 'Map View', desc: 'Interactive map of items by location', indexTypes: ['location'] },
  { id: 'list', label: 'List View', desc: 'Sortable list of all items', indexTypes: ['location', 'custom'] },
  { id: 'search', label: 'Search', desc: 'Full-text search across your entity', indexTypes: ['time', 'location', 'custom'] },
  { id: 'reports', label: 'Reports', desc: 'Summary data and exports', indexTypes: ['time', 'location', 'custom'] },
];

const selectedTabs = new Set();

/* ── Role defaults ───────────────────────────────────────────────────────── */
const roleDefaults = [
  { name: 'Employee', description: 'View items, basic data entry' },
  { name: 'Manager', description: 'Create, edit, and delete items' },
  { name: 'Admin', description: 'Manage users, edit enums, full access' },
];

/* ── Sidebar init ────────────────────────────────────────────────────────── */
function initSidebar() {
  const nav = document.getElementById('sidebarSteps');
  nav.innerHTML = STEPS.map(s => `
    <div class="step-item" id="sidebar-step-${s.id}" data-step="${s.id}">
      <span class="step-num" id="stepnum-${s.id}">${s.id}</span>
      <span class="step-label">${s.label}</span>
      <span class="step-check hidden" id="stepcheck-${s.id}">✓</span>
    </div>
  `).join('');

  nav.querySelectorAll('.step-item').forEach(el => {
    el.addEventListener('click', () => {
      const n = parseInt(el.dataset.step, 10);
      if (n <= state.currentScreen || state.stepValid[n - 1]) {
        goToScreen(n);
      }
    });
  });
}

function updateSidebar() {
  STEPS.forEach(s => {
    const el = document.getElementById(`sidebar-step-${s.id}`);
    const check = document.getElementById(`stepcheck-${s.id}`);
    if (!el) return;
    const done = state.stepValid[s.id - 1] && state.stepVisited[s.id - 1];
    el.classList.toggle('active', state.currentScreen === s.id);
    el.classList.toggle('completed', done);
    check.classList.toggle('hidden', !done);
  });

  const completed = state.stepValid.slice(0, 10).filter(Boolean).length;
  document.getElementById('progressText').textContent = `${completed} of 10`;
  document.getElementById('progressFill').style.width = `${(completed / 10) * 100}%`;
}

/* ── Screen navigation ───────────────────────────────────────────────────── */
function goToScreen(n) {
  // Mark the screen we're leaving as visited
  if (typeof state.currentScreen === 'number' && state.currentScreen >= 1 && state.currentScreen <= 11) {
    state.stepVisited[state.currentScreen - 1] = true;
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screenId = n === 'done' ? 'screen-done' : `screen-${n}`;
  document.getElementById(screenId).classList.add('active');
  state.currentScreen = n;
  updateSidebar();

  const bottomNav = document.getElementById('bottomNav');
  if (n === 0 || n === 'done') {
    bottomNav.style.display = 'none';
  } else if (n === 11) {
    bottomNav.style.display = 'flex';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('backBtn').style.display = '';
    document.getElementById('navHint').textContent = 'Review your settings before generating.';
    buildReview();
  } else {
    bottomNav.style.display = 'flex';
    document.getElementById('nextBtn').style.display = '';
    updateNavHint(n);
  }

  // Refresh tab checklist + panels whenever user reaches step 6
  if (n === 6) setTimeout(() => {
    buildTabChecklist(state.indexType);
    renderMapboxPanel(state.indexType);
    renderFieldWarning(state.indexType);
  }, 50);
}

function updateNavHint(n) {
  const hints = {
    1: 'Define your app\'s name, identity, and indexing type.',
    2: 'Upload a logo and choose your color palette.',
    3: 'Define your core data entity.',
    4: 'Configure access roles.',
    5: 'Set up dropdown/tag categories.',
    6: 'Adjust the tabs for your app.',
    7: 'Set email "from" details.',
    8: 'Enter Supabase credentials.',
    9: 'Choose an email provider.',
    10: 'Set deployment target.',
  };
  document.getElementById('navHint').textContent = hints[n] || '';
}

/* ── Step validation ─────────────────────────────────────────────────────── */
function validateStep(n) {
  const screen = document.getElementById(`screen-${n}`);
  if (!screen) return false;
  const required = screen.querySelectorAll('[data-validate="required"]');
  const allFilled = Array.from(required).every(el => el.value && el.value.trim());
  state.stepValid[n - 1] = allFilled;
  updateSidebar();
  return allFilled;
}

function attachValidationListeners() {
  document.querySelectorAll('[data-validate="required"]').forEach(el => {
    el.addEventListener('input', () => {
      const screen = el.closest('.screen');
      if (screen) {
        const n = parseInt(screen.id.replace('screen-', ''), 10);
        if (!isNaN(n)) validateStep(n);
      }
    });
  });
}

/* ── Screen 0: Location & Clone ──────────────────────────────────────────── */
function initScreen0() {
  const chooseFolderBtn = document.getElementById('chooseFolderBtn');
  const parentFolderInput = document.getElementById('parentFolder');
  const projectNameInput = document.getElementById('projectName');
  const cloneBtn = document.getElementById('cloneBtn');
  const progressEl = document.getElementById('cloneProgress');
  const errorEl = document.getElementById('locationError');

  function checkReady() {
    cloneBtn.disabled = !(parentFolderInput.value && projectNameInput.value.trim());
  }

  chooseFolderBtn.addEventListener('click', async () => {
    const folder = await window.wizard.chooseFolder();
    if (folder) {
      parentFolderInput.value = folder;
      checkReady();
    }
  });

  projectNameInput.addEventListener('input', () => {
    projectNameInput.value = projectNameInput.value.replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    checkReady();
  });

  window.wizard.onCloneProgress(msg => {
    const line = document.createElement('div');
    line.className = 'clone-progress-line';
    line.textContent = msg;
    progressEl.appendChild(line);
    progressEl.scrollTop = progressEl.scrollHeight;
  });

  cloneBtn.addEventListener('click', async () => {
    const parent = parentFolderInput.value;
    const name = projectNameInput.value.trim();
    if (!parent || !name) return;

    errorEl.classList.add('hidden');
    cloneBtn.disabled = true;
    cloneBtn.textContent = 'Cloning…';
    progressEl.innerHTML = '';
    progressEl.classList.add('visible');

    const result = await window.wizard.clone(parent, name);
    if (!result.ok) {
      errorEl.textContent = result.error;
      errorEl.classList.remove('hidden');
      cloneBtn.disabled = false;
      cloneBtn.textContent = 'Clone & Continue →';
      return;
    }

    state.targetDir = result.targetDir;
    // Pre-fill app name from project name
    const appNameInput = document.getElementById('appName');
    if (appNameInput && !appNameInput.value) {
      appNameInput.value = name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      autoSlug();
    }

    goToScreen(1);
  });
}

/* ── Screen 1: App Identity ──────────────────────────────────────────────── */
function autoSlug() {
  const name = document.getElementById('appName').value;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.getElementById('appSlug').value = slug;
  validateStep(1);
}

function initScreen1() {
  document.getElementById('appName').addEventListener('input', () => {
    autoSlug();
    const sn = document.getElementById('emailSenderName');
    if (sn && !sn.value) sn.placeholder = document.getElementById('appName').value || 'App Name';
  });
  document.getElementById('appSlug').addEventListener('input', () => validateStep(1));
  document.getElementById('appTagline').addEventListener('input', () => validateStep(1));

  // Index type selection (moved here from Step 6 so it informs Step 3 data model)
  document.getElementById('indexCards').querySelectorAll('.index-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#indexCards .index-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      state.indexType = card.dataset.index;
      buildTabChecklist(card.dataset.index);
      refreshProtectedFields(card.dataset.index);
    });
  });
  // Default: time
  document.querySelector('#indexCards .index-card[data-index="time"]').classList.add('selected');
}

/* ── Screen 2: Branding ──────────────────────────────────────────────────── */
function buildColorFields() {
  const container = document.getElementById('colorFields');
  container.innerHTML = COLOR_FIELDS.map(f => `
    <div class="color-field-row">
      <div class="color-field-label">${f.label}</div>
      <div class="color-picker-group">
        <div style="display:flex; align-items:center; gap:8px">
          <div class="color-mode-pills">
            <button class="color-mode-pill active" data-color="${f.key}" data-mode="palette">Palette</button>
            <button class="color-mode-pill" data-color="${f.key}" data-mode="word">Name</button>
            <button class="color-mode-pill" data-color="${f.key}" data-mode="hex">Hex</button>
          </div>
          <span class="selected-color-preview" id="colorpreview-${f.key}" style="background:${f.default}"></span>
          <span style="font-size:11px; color:var(--text-muted)" id="colorlabel-${f.key}">${f.default}</span>
        </div>
        <div class="color-input-area active" id="colorarea-palette-${f.key}">
          <div class="color-palette-grid" id="palettegrid-${f.key}"></div>
        </div>
        <div class="color-input-area" id="colorarea-word-${f.key}">
          <div class="color-word-row">
            <div class="color-word-preview" id="wordpreview-${f.key}" style="background:${f.default}"></div>
            <input type="text" placeholder="e.g. dark navy, forest green" id="colorword-${f.key}" />
          </div>
        </div>
        <div class="color-input-area" id="colorarea-hex-${f.key}">
          <div class="color-hex-row">
            <input type="color" id="colorpicker-${f.key}" value="${f.default}" />
            <input type="text" id="colorhex-${f.key}" value="${f.default}" placeholder="#000000" maxlength="7" />
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Build palette grids
  COLOR_FIELDS.forEach(f => {
    const grid = document.getElementById(`palettegrid-${f.key}`);
    grid.innerHTML = PALETTE.map(c => `
      <div class="color-swatch" title="${c.name}" style="background:${c.hex}"
           data-color="${f.key}" data-hex="${c.hex}"></div>
    `).join('');

    // Mark default
    markPaletteSelected(f.key, f.default);
  });

  // Mode pill clicks
  container.querySelectorAll('.color-mode-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const key = pill.dataset.color;
      const mode = pill.dataset.mode;
      container.querySelectorAll(`.color-mode-pill[data-color="${key}"]`).forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      container.querySelectorAll(`[id^="colorarea-"][id$="-${key}"]`).forEach(a => a.classList.remove('active'));
      document.getElementById(`colorarea-${mode}-${key}`).classList.add('active');
    });
  });

  // Palette swatch clicks
  container.querySelectorAll('.color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      const key = swatch.dataset.color;
      const hex = swatch.dataset.hex;
      setColor(key, hex);
      markPaletteSelected(key, hex);
    });
  });

  // Hex input
  COLOR_FIELDS.forEach(f => {
    const picker = document.getElementById(`colorpicker-${f.key}`);
    const hexInput = document.getElementById(`colorhex-${f.key}`);

    picker.addEventListener('input', () => {
      hexInput.value = picker.value;
      setColor(f.key, picker.value);
    });

    hexInput.addEventListener('input', () => {
      const val = hexInput.value;
      if (/^#[0-9a-f]{6}$/i.test(val)) {
        picker.value = val;
        setColor(f.key, val);
      }
    });

    // Word input
    const wordInput = document.getElementById(`colorword-${f.key}`);
    wordInput.addEventListener('input', () => {
      const style = new Option().style;
      style.color = wordInput.value;
      if (style.color) {
        // Create a canvas to resolve the color to hex
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = wordInput.value;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
        document.getElementById(`wordpreview-${f.key}`).style.background = hex;
        setColor(f.key, hex);
      }
    });
  });
}

function markPaletteSelected(key, hex) {
  const grid = document.getElementById(`palettegrid-${key}`);
  if (!grid) return;
  grid.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.hex.toLowerCase() === hex.toLowerCase());
  });
}

function setColor(key, hex) {
  colorValues[key] = hex;
  const preview = document.getElementById(`colorpreview-${key}`);
  const label = document.getElementById(`colorlabel-${key}`);
  if (preview) preview.style.background = hex;
  if (label) label.textContent = hex;
}

function buildThemeSection() {
  const container = document.getElementById('themeCards');
  if (!container) return;

  container.innerHTML = COLOR_THEMES.map((t, i) => {
    const swatchKeys = ['background', 'surface', 'primary', 'secondary', 'accent'];
    const swatches = swatchKeys.map(k =>
      `<span style="flex:1;height:100%;background:${t.colors[k]}" title="${k}: ${t.colors[k]}"></span>`
    ).join('');

    const isLight = t.colors.background.startsWith('#f') || t.colors.background.startsWith('#e');
    const previewBg = t.colors.background;
    const previewText = t.colors.textPrimary;
    const previewMuted = t.colors.textSecondary;

    return `
      <div class="theme-card" data-theme="${i}" style="
        border-radius:8px; border:2px solid var(--border); cursor:pointer;
        overflow:hidden; transition:border-color var(--transition);
      ">
        <div style="background:${previewBg}; padding:10px 12px 0">
          <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:4px">
            <span style="font-size:12px; font-weight:700; color:${previewText}">${t.name}</span>
            <span style="font-size:10px; color:${previewMuted}">${t.desc}</span>
          </div>
          <div style="display:flex; gap:5px; margin-bottom:10px">
            <span style="background:${t.colors.primary}; color:${previewBg}; font-size:10px; font-weight:600; padding:2px 8px; border-radius:4px">Button</span>
            <span style="background:${t.colors.surface}; color:${t.colors.primary}; font-size:10px; font-weight:600; padding:2px 8px; border-radius:4px; border:1px solid ${t.colors.primary}40">Outline</span>
          </div>
          <div style="display:flex; height:8px; border-radius:3px; overflow:hidden">
            ${swatches}
          </div>
        </div>
        <div style="height:3px"></div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.theme-card').forEach(c => c.style.borderColor = 'var(--border)');
      card.style.borderColor = 'var(--primary)';
      const theme = COLOR_THEMES[parseInt(card.dataset.theme)];
      Object.entries(theme.colors).forEach(([key, hex]) => {
        colorValues[key] = hex;
        const preview = document.getElementById(`colorpreview-${key}`);
        const label = document.getElementById(`colorlabel-${key}`);
        const picker = document.getElementById(`colorpicker-${key}`);
        const hexInput = document.getElementById(`colorhex-${key}`);
        if (preview) preview.style.background = hex;
        if (label) label.textContent = hex;
        if (picker) picker.value = hex;
        if (hexInput) hexInput.value = hex;
        markPaletteSelected(key, hex);
      });
    });
  });
}

function initScreen2() {
  buildColorFields();
  buildThemeSection();

  const logoDrop = document.getElementById('logoDrop');
  const logoInput = document.getElementById('logoInput');
  const logoPreview = document.getElementById('logoPreview');
  const removeBtn = document.getElementById('removeLogoBtn');

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => {
      state.logoData = e.target.result;
      state.logoName = file.name;
      document.getElementById('logoFileName').textContent = file.name;
      ['512', '192', '32'].forEach(size => {
        document.getElementById(`logoPreview${size}`).src = e.target.result;
      });
      logoPreview.classList.add('visible');
      document.getElementById('logoDropContent').style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function validateLogo() {
    state.stepValid[1] = !!state.logoData;
    updateSidebar();
    const hint = document.getElementById('logoRequiredHint');
    if (hint) hint.style.display = state.logoData ? 'none' : '';
  }

  logoInput.addEventListener('change', e => { handleFile(e.target.files[0]); validateLogo(); });

  logoDrop.addEventListener('dragover', e => { e.preventDefault(); logoDrop.classList.add('drag-over'); });
  logoDrop.addEventListener('dragleave', () => logoDrop.classList.remove('drag-over'));
  logoDrop.addEventListener('drop', e => {
    e.preventDefault();
    logoDrop.classList.remove('drag-over');
    handleFile(e.dataTransfer.files[0]);
    validateLogo();
  });

  removeBtn.addEventListener('click', () => {
    state.logoData = null;
    state.logoName = null;
    logoPreview.classList.remove('visible');
    document.getElementById('logoDropContent').style.display = '';
    logoInput.value = '';
    validateLogo();
  });
}

/* ── Screen 3: Data Model ────────────────────────────────────────────────── */
// ── Field Presets ─────────────────────────────────────────────────────────
const FIELD_PRESETS = {
  contact: [
    { name: 'Email', type: 'text' },
    { name: 'Phone', type: 'text' },
    { name: 'Contact Name', type: 'text' },
  ],
  address: [
    { name: 'Street', type: 'text' },
    { name: 'City', type: 'text' },
    { name: 'State', type: 'text' },
    { name: 'Zip', type: 'text' },
    { name: 'Country', type: 'text' },
  ],
  financial: [
    { name: 'Amount', type: 'number' },
    { name: 'Currency', type: 'enum' },
    { name: 'Payment Status', type: 'enum' },
  ],
  notes: [
    { name: 'Note', type: 'text' },
    { name: 'Tags', type: 'tags' },
  ],
};

function addPresetFields(presetKey) {
  const preset = FIELD_PRESETS[presetKey];
  if (!preset) return;
  const existing = new Set(getFields().map(f => f.name?.toLowerCase()));
  preset.forEach(f => {
    if (!existing.has(f.name.toLowerCase())) addFieldRow(f.name, f.type);
  });
  detectEnums();
}

function fieldTypeOptions(selected = 'text') {
  const types = ['text', 'number', 'date', 'time', 'datetime', 'boolean', 'enum', 'tags', 'image', 'url'];
  return types.map(t => `<option value="${t}" ${t === selected ? 'selected' : ''}>${t}</option>`).join('');
}

function createFieldRow(name = '', type = 'text', required = false, notes = '', searchable = false, locked = '') {
  const tr = document.createElement('tr');
  if (locked) tr.dataset.locked = locked;
  const isNameLocked = locked === 'name';
  const isProtected = locked === 'name' || locked === 'required';

  tr.innerHTML = `
    <td class="drag-handle ${isNameLocked ? 'drag-handle--disabled' : ''}">≡</td>
    <td><input type="text" placeholder="Field name" value="${name}" class="field-name" ${isNameLocked ? 'readonly' : ''} /></td>
    <td><select class="field-type">${fieldTypeOptions(type)}</select></td>
    <td style="text-align:center"><input type="checkbox" class="field-required" ${required ? 'checked' : ''} /></td>
    <td style="text-align:center"><input type="checkbox" class="field-searchable" ${searchable ? 'checked' : ''} /></td>
    <td><input type="text" placeholder="Notes" value="${notes}" class="field-notes" /></td>
    <td>${isProtected ? '' : `<button class="btn-icon" onclick="this.closest('tr').remove(); detectEnums();">✕</button>`}</td>
  `;
  tr.querySelectorAll('input, select').forEach(el => el.addEventListener('change', detectEnums));
  if (!isNameLocked) initRowDrag(tr);
  return tr;
}

function addFieldRow(name = '', type = 'text', required = false, notes = '', searchable = false, locked = '') {
  const tbody = document.getElementById('fieldsBody');
  tbody.appendChild(createFieldRow(name, type, required, notes, searchable, locked));
}

function addCardBreak(label = '') {
  const tbody = document.getElementById('fieldsBody');
  const tr = document.createElement('tr');
  tr.dataset.cardBreak = 'true';
  tr.innerHTML = `
    <td class="drag-handle">≡</td>
    <td colspan="5" style="padding:4px 8px">
      <input type="text" class="card-break-label" placeholder="Section label (e.g. Contact Info)" value="${label}" style="font-weight:600; width:100%" />
    </td>
    <td><button class="btn-icon" onclick="this.closest('tr').remove();">✕</button></td>
  `;
  tbody.appendChild(tr);
  initRowDrag(tr);
}

let dragSrcRow = null;

function initRowDrag(tr) {
  const handle = tr.querySelector('.drag-handle');
  if (!handle) return;

  handle.addEventListener('mousedown', () => { tr.draggable = true; });
  handle.addEventListener('mouseup', () => { tr.draggable = false; });

  tr.addEventListener('dragstart', e => {
    dragSrcRow = tr;
    setTimeout(() => tr.classList.add('dragging'), 0);
    e.dataTransfer.effectAllowed = 'move';
  });

  tr.addEventListener('dragend', () => {
    dragSrcRow = null;
    tr.draggable = false;
    tr.classList.remove('dragging');
    document.querySelectorAll('#fieldsBody tr').forEach(r => r.classList.remove('drag-over'));
  });

  tr.addEventListener('dragover', e => {
    if (!dragSrcRow || dragSrcRow === tr) return;
    if (tr.dataset.locked === 'name') return;
    e.preventDefault();
    document.querySelectorAll('#fieldsBody tr').forEach(r => r.classList.remove('drag-over'));
    tr.classList.add('drag-over');
  });

  tr.addEventListener('drop', e => {
    if (!dragSrcRow || dragSrcRow === tr) return;
    if (tr.dataset.locked === 'name') return;
    e.preventDefault();
    tr.classList.remove('drag-over');
    const tbody = document.getElementById('fieldsBody');
    tbody.insertBefore(dragSrcRow, tr);
  });
}

function getFields() {
  return Array.from(document.querySelectorAll('#fieldsBody tr')).map(tr => {
    if (tr.dataset.cardBreak) {
      return { type: 'card_break', label: tr.querySelector('.card-break-label')?.value || '' };
    }
    return {
      name: tr.querySelector('.field-name')?.value || '',
      type: tr.querySelector('.field-type')?.value || 'text',
      required: tr.querySelector('.field-required')?.checked || false,
      searchable: tr.querySelector('.field-searchable')?.checked || false,
      notes: tr.querySelector('.field-notes')?.value || '',
    };
  }).filter(f => f.type === 'card_break' || f.name);
}

function detectEnums() {
  const fields = getFields();
  state.enumCandidates = fields
    .filter(f => f.type === 'enum' || f.type === 'tags')
    .map(f => ({ name: f.name, type: f.type }));
  const banner = document.getElementById('enumBanner');
  if (state.enumCandidates.length > 0) {
    const names = state.enumCandidates.map(c => c.name).join(', ');
    banner.classList.add('visible');
    banner.querySelector('strong').textContent = `Enum/tag candidates: ${names}`;
  } else {
    banner.classList.remove('visible');
  }
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1, 51).map(l => l.split(sep).map(c => c.replace(/^"|"$/g, '').trim()));
  return { headers, rows };
}

function guessType(values) {
  const nonEmpty = values.filter(v => v !== '' && v !== null && v !== undefined);
  if (!nonEmpty.length) return 'text';
  const unique = [...new Set(nonEmpty)];

  if (nonEmpty.every(v => /^\d{4}-\d{2}-\d{2}(T|\s)/.test(v))) return 'datetime';
  if (nonEmpty.every(v => /^\d{4}-\d{2}-\d{2}$/.test(v))) return 'date';
  if (nonEmpty.every(v => /^\d{2}:\d{2}/.test(v))) return 'time';
  if (nonEmpty.every(v => /^-?\d+(\.\d+)?$/.test(v))) return 'number';
  if (nonEmpty.every(v => /^(true|false|yes|no|1|0)$/i.test(v))) return 'boolean';
  if (unique.length <= 20 && nonEmpty.length > 5) return 'enum';
  return 'text';
}

function importFromData(headers, rows) {
  const existing = new Set(getFields().filter(f => f.type !== 'card_break').map(f => f.name?.toLowerCase()));
  headers.forEach((h, i) => {
    if (existing.has(h.toLowerCase())) return;
    const colValues = rows.map(r => r[i] || '');
    const type = guessType(colValues);
    addFieldRow(h, type, false, '');
  });
  detectEnums();
  validateStep(3);
}

function refreshNameRow() {
  const singular = document.getElementById('entitySingular')?.value || 'Entity';
  const nameRow = document.querySelector('#fieldsBody tr[data-locked="name"] .field-name');
  if (nameRow) nameRow.value = `${singular} Name`;
}

const INDEX_FIELDS = {
  time: [
    { name: 'Start Time', type: 'datetime', required: true,  locked: 'required' },
    { name: 'End Time',   type: 'datetime', required: false, locked: '' },
  ],
  location: [
    { name: 'Location', type: 'text', required: true, locked: 'required' },
  ],
  custom: [],
};

function refreshProtectedFields(indexType) {
  const tbody = document.getElementById('fieldsBody');

  // Remove all previously injected index-specific rows
  tbody.querySelectorAll('tr[data-index-field]').forEach(tr => tr.remove());

  // Find the name row anchor — insert index fields immediately after it
  const nameRow = tbody.querySelector('tr[data-locked="name"]');
  let insertBefore = nameRow ? nameRow.nextSibling : null;

  (INDEX_FIELDS[indexType] || []).forEach(f => {
    const tr = createFieldRow(f.name, f.type, f.required, '', false, f.locked);
    tr.dataset.indexField = 'true';
    tbody.insertBefore(tr, insertBefore);
    // Keep subsequent fields in order
    insertBefore = tr.nextSibling;
  });
}

function initScreen3() {
  // Sensitivity card selection
  document.getElementById('sensitivityCards').querySelectorAll('.index-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#sensitivityCards .index-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const value = card.dataset.sensitivity;
      document.getElementById('dataSensitivity').value = value;
      validateStep(3);
      syncStep8Sensitivity(value);
    });
  });

  // Pinned entity-name row (always first, non-draggable, non-deletable)
  addFieldRow('Entity Name', 'text', true, '', false, 'name');
  refreshNameRow();

  // General default fields (all deletable)
  addFieldRow('Description', 'text', false, '');

  // Inject index-specific required fields for the current index type
  refreshProtectedFields(state.indexType);

  document.getElementById('addFieldBtn').addEventListener('click', () => addFieldRow());
  document.getElementById('addCardBreakBtn').addEventListener('click', () => addCardBreak());

  // Preset panel toggle
  document.getElementById('presetsToggleBtn').addEventListener('click', () => {
    const panel = document.getElementById('presetsPanel');
    panel.hidden = !panel.hidden;
  });
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => addPresetFields(btn.dataset.preset));
  });

  // Entity name listeners
  document.getElementById('entitySingular').addEventListener('input', () => {
    refreshNameRow();
    validateStep(3);
    const s = document.getElementById('entitySingular').value;
    const p = document.getElementById('entityPlural');
    if (!p.value || p.dataset.autoSet === 'true') {
      p.value = s.endsWith('s') ? s : s + 's';
      p.dataset.autoSet = 'true';
    }
  });
  document.getElementById('entityPlural').addEventListener('input', () => {
    document.getElementById('entityPlural').dataset.autoSet = 'false';
    validateStep(3);
  });

  // Import file
  document.getElementById('importCsvBtn').addEventListener('click', () => {
    document.getElementById('importFileInput').click();
  });

  document.getElementById('importFileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.headers) importFromData(parsed.headers, parsed.rows);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (data.length) importFromData(data[0].map(String), data.slice(1, 51));
    }
    e.target.value = '';
  });

  // Paste text
  document.getElementById('pasteTextBtn').addEventListener('click', () => {
    document.getElementById('pasteModal').classList.add('open');
  });
  document.getElementById('pasteModalCancel').addEventListener('click', () => {
    document.getElementById('pasteModal').classList.remove('open');
  });
  document.getElementById('pasteModalConfirm').addEventListener('click', () => {
    const text = document.getElementById('pasteTextarea').value;
    const parsed = parseCSV(text);
    if (parsed.headers) importFromData(parsed.headers, parsed.rows);
    document.getElementById('pasteModal').classList.remove('open');
    document.getElementById('pasteTextarea').value = '';
  });
}

/* ── Screen 4: Roles ─────────────────────────────────────────────────────── */
function initScreen4() {
  const container = document.getElementById('roleRows');
  const dbLevels = ['employee', 'manager', 'admin'];
  const levelLabels = ['Level 1 — Lowest access', 'Level 2 — Mid-level', 'Level 3 — Full access (Admin)'];

  container.innerHTML = roleDefaults.map((r, i) => `
    <div style="padding: ${i > 0 ? '14px 0 0' : '0 0 14px'}; ${i > 0 && i < 2 ? 'border-top:1px solid var(--border); margin-top:0;' : ''}">
      <div style="font-size:11px; font-weight:700; color:var(--text-muted); letter-spacing:0.05em; margin-bottom:8px;">
        ${levelLabels[i]} · maps to DB role: <code style="background:var(--surface2); padding:1px 6px; border-radius:4px; font-size:10px">${dbLevels[i]}</code>
      </div>
      <div class="form-row cols-2">
        <div class="form-group" style="margin-bottom:0">
          <label>Display Name</label>
          <input type="text" id="role-name-${i}" value="${r.name}" />
        </div>
        <div class="form-group" style="margin-bottom:0">
          <label>What they can do</label>
          <input type="text" id="role-desc-${i}" value="${r.description}" />
        </div>
      </div>
    </div>
  `).join('<hr class="section-divider" />');

  // Update default role dropdown labels on change
  for (let i = 0; i < 3; i++) {
    document.getElementById(`role-name-${i}`).addEventListener('input', updateDefaultRoleDropdown);
  }

  state.stepValid[3] = true;
  updateSidebar();
}

function updateDefaultRoleDropdown() {
  const sel = document.getElementById('defaultRole');
  const vals = ['employee', 'manager', 'admin'];
  sel.innerHTML = vals.map((v, i) => {
    const name = document.getElementById(`role-name-${i}`)?.value || roleDefaults[i].name;
    return `<option value="${v}">${name}</option>`;
  }).join('');
}

/* ── Screen 5: Enum categories ───────────────────────────────────────────── */
function addEnumRow(name = '', examples = '', usedOn = '') {
  const tbody = document.getElementById('enumsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="text" placeholder="Category name" value="${name}" /></td>
    <td><input type="text" placeholder="Value 1, Value 2, Value 3" value="${examples}" /></td>
    <td><input type="text" placeholder="Entity form — Type field" value="${usedOn}" /></td>
    <td><button class="btn-icon" onclick="this.closest('tr').remove()">✕</button></td>
  `;
  document.getElementById('enumsBody').appendChild(tr);
}

function initScreen5() {
  document.getElementById('addEnumBtn').addEventListener('click', () => addEnumRow());
  state.stepValid[4] = true;
  updateSidebar();
}

function populateEnumsFromCandidates() {
  const tbody = document.getElementById('enumsBody');
  if (!tbody) return;
  const entitySingular = document.getElementById('entitySingular')?.value || 'Entity';
  state.enumCandidates.forEach(({ name, type }) => {
    const exists = Array.from(tbody.querySelectorAll('input:first-child')).some(i => i.value === name);
    if (!exists) {
      const placeholder = type === 'tags' ? 'Tag 1, Tag 2, Tag 3' : '';
      addEnumRow(name, placeholder, `${entitySingular} form — ${name} ${type}`);
    }
  });
  if (tbody.children.length === 0) {
    addEnumRow('Type', '', `${entitySingular} form`);
    addEnumRow('Status', 'Active, Inactive', `${entitySingular} form`);
  }
}

/* ── Screen 6: Tab Structure ─────────────────────────────────────────────── */
function buildTabChecklist(indexType) {
  state.indexType = indexType;
  const container = document.getElementById('tabsChecklist');

  // Pre-select based on index
  selectedTabs.clear();
  TAB_OPTIONS.forEach(t => {
    if (t.indexTypes.includes(indexType)) selectedTabs.add(t.id);
  });
  // Always include search
  selectedTabs.add('search');

  container.innerHTML = [
    ...TAB_OPTIONS.map(t => `
      <label class="tab-check-item">
        <input type="checkbox" data-tab="${t.id}" ${selectedTabs.has(t.id) ? 'checked' : ''} />
        <div>
          <div class="tab-check-label">${t.label}</div>
          <div class="tab-check-desc">${t.desc}</div>
        </div>
      </label>
    `),
    `<label class="tab-check-item disabled">
      <input type="checkbox" checked disabled />
      <div>
        <div class="tab-check-label">Admin <span class="badge badge-muted" style="font-size:10px">Always included</span></div>
        <div class="tab-check-desc">User management, enum editing, app configuration.</div>
      </div>
    </label>`,
    `<label class="tab-check-item disabled">
      <input type="checkbox" checked disabled />
      <div>
        <div class="tab-check-label">Setup Checklist <span class="badge badge-muted" style="font-size:10px">Hides when complete</span></div>
        <div class="tab-check-desc">Tracks setup progress. Disappears when all steps are done.</div>
      </div>
    </label>`,
  ].join('');

  container.querySelectorAll('input[type="checkbox"][data-tab]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) selectedTabs.add(cb.dataset.tab);
      else selectedTabs.delete(cb.dataset.tab);
    });
  });
}

function renderMapboxPanel(indexType) {
  const container = document.getElementById('mapboxPanel');
  if (!container) return;

  if (indexType !== 'location') {
    container.innerHTML = '';
    container.className = 'hidden';
    return;
  }

  container.className = '';
  container.innerHTML = `
    <div class="card" style="border-color: var(--primary); background: var(--primary-light);">
      <div class="card-title" style="color: var(--primary)">🗺️ Mapbox Required</div>
      <p style="font-size:12px; color:var(--text-secondary); margin-bottom:14px; line-height:1.6">
        The Map tab uses <strong>@rnmapbox/maps</strong> and requires a Mapbox account.
        Get free tokens at <a href="#" onclick="window.wizard.openUrl('https://account.mapbox.com/access-tokens/'); return false;" style="color:var(--primary)">account.mapbox.com</a>.
        The map view requires a <strong>native build</strong> (EAS) — web shows a fallback message.
      </p>

      <div class="form-row cols-2">
        <div class="form-group">
          <label>Public Access Token <span class="required">*</span>
            <span class="hint">— starts with pk.</span>
          </label>
          <input type="text" id="mapboxPublicToken" placeholder="pk.eyJ1IjoiLi4uIn0.…"
            value="${state.mapboxPublicToken}" />
          <div class="text-small text-muted mt-4">Paste into <code>src/constants/mapConfig.ts</code> and used in the map component.</div>
        </div>
        <div class="form-group">
          <label>Secret Download Token
            <span class="hint">— starts with sk.</span>
          </label>
          <input type="password" id="mapboxSecretToken" placeholder="sk.eyJ1IjoiLi4uIn0.…"
            value="${state.mapboxSecretToken}" />
          <div class="text-small text-muted mt-4">Required for native builds. Goes in <code>app.json</code> plugin + EAS secret.</div>
        </div>
      </div>

      <div class="status-row info" style="margin-top:0; flex-direction:column; align-items:flex-start; gap:4px">
        <strong>Native build requirement</strong>
        <span style="font-size:12px">
          @rnmapbox/maps does not work in Expo Go. You'll need to run
          <code>npx expo prebuild</code> and build with EAS or Android Studio / Xcode.
          The web build works without Mapbox (shows a "Map not available" message).
        </span>
      </div>
    </div>
  `;

  document.getElementById('mapboxPublicToken').addEventListener('input', e => {
    state.mapboxPublicToken = e.target.value;
  });
  document.getElementById('mapboxSecretToken').addEventListener('input', e => {
    state.mapboxSecretToken = e.target.value;
  });
}

function renderFieldWarning(indexType) {
  const container = document.getElementById('fieldRequirementsWarning');
  if (!container) return;

  if (indexType === 'custom') {
    container.innerHTML = '';
    container.className = 'hidden';
    return;
  }

  const { required, recommended } = checkRequiredFields(indexType);
  const missingRequired = required.filter(r => !r.found);
  const missingRecommended = recommended.filter(r => !r.found);

  if (missingRequired.length === 0 && missingRecommended.length === 0) {
    container.innerHTML = `<div class="status-row success" style="margin-top:12px">✓ Data model has all required fields for ${INDEX_REQUIRED_FIELDS[indexType].label} apps.</div>`;
    container.className = '';
    return;
  }

  const lines = [];
  if (missingRequired.length > 0) {
    lines.push(`<strong>Required fields missing:</strong>`);
    missingRequired.forEach(r => lines.push(`<li>${r.description}</li>`));
  }
  if (missingRecommended.length > 0) {
    lines.push(`<strong style="margin-top:8px;display:block">Recommended:</strong>`);
    missingRecommended.forEach(r => lines.push(`<li>${r.description}</li>`));
  }

  container.className = '';
  container.innerHTML = `
    <div class="status-row error" style="margin-top:12px; flex-direction:column; align-items:flex-start; gap:6px">
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%">
        <span>⚠️ <strong>Data model check</strong> — Step 3 is missing fields required by ${INDEX_REQUIRED_FIELDS[indexType].label} components.</span>
        <div style="display:flex; gap:6px; flex-shrink:0; margin-left:12px">
          <button class="btn btn-sm btn-secondary" onclick="addMissingFields('${indexType}'); renderFieldWarning('${indexType}')">Add missing fields</button>
          <button class="btn btn-sm btn-ghost" onclick="goToScreen(3)">Go to Step 3 →</button>
        </div>
      </div>
      <ul style="padding-left:16px; font-size:12px; line-height:1.7">${lines.join('\n')}</ul>
    </div>
  `;
}

function initScreen6() {
  // Build tab checklist from the index type already chosen in Step 1
  buildTabChecklist(state.indexType);
  setTimeout(() => {
    renderMapboxPanel(state.indexType);
    renderFieldWarning(state.indexType);
  }, 50);

  document.getElementById('addCustomTabBtn').addEventListener('click', () => {
    const row = document.createElement('div');
    row.className = 'custom-tab-row';
    row.innerHTML = `
      <input type="text" placeholder="Tab name" />
      <input type="text" placeholder="Description" />
      <button class="btn-icon" onclick="this.closest('.custom-tab-row').remove()">✕</button>
    `;
    document.getElementById('customTabsRows').appendChild(row);
  });

  state.stepValid[5] = true;
  updateSidebar();
}

/* ── Screen 7: Email ─────────────────────────────────────────────────────── */
function initScreen7() {
  document.getElementById('emailFrom').addEventListener('input', () => validateStep(7));
  document.getElementById('emailSenderName').addEventListener('input', () => validateStep(7));
}

/* ── Sensitivity sync: only adjusts the AI-access banner now.
     DB password is always required so the wizard can apply migrations. ──── */
function syncStep8Sensitivity(value) {
  const banner = document.getElementById('supabaseModeBanner');
  if (banner) {
    banner.style.display = '';
    banner.textContent = value === 'sensitive'
      ? '🔒 Sensitive mode: Cursor will read schema from database/schema.md and cannot query live data.'
      : '🔓 Standard mode: Cursor has full MCP access to read and write data directly.';
  }
  validateStep(8);
}

/* ── Screen 8: Supabase ──────────────────────────────────────────────────── */
function initScreen8() {
  const projectIdInput = document.getElementById('supabaseProjectId');
  const urlInput = document.getElementById('supabaseUrl');

  projectIdInput.addEventListener('input', () => {
    urlInput.value = projectIdInput.value
      ? `https://${projectIdInput.value}.supabase.co`
      : '';
    validateStep(8);
  });

  document.getElementById('supabaseAnonKey').addEventListener('input', () => validateStep(8));
  document.getElementById('supabaseServiceKey').addEventListener('input', () => validateStep(8));
  document.getElementById('supabaseDbPassword').addEventListener('input', () => validateStep(8));

  // Apply current sensitivity state in case user navigated back to step 8
  const currentSensitivity = document.getElementById('dataSensitivity')?.value;
  if (currentSensitivity) syncStep8Sensitivity(currentSensitivity);

  document.getElementById('testConnectionBtn').addEventListener('click', async () => {
    const url = urlInput.value;
    const key = document.getElementById('supabaseAnonKey').value;
    if (!url || !key) {
      setConnStatus('error', 'Enter Project ID and Anon Key first.');
      return;
    }
    document.getElementById('connSpinner').classList.add('visible');
    document.getElementById('connStatus').innerHTML = '';
    const result = await window.wizard.testSupabase(url, key);
    document.getElementById('connSpinner').classList.remove('visible');
    if (result.ok) {
      setConnStatus('success', '✓ Connected successfully');
    } else {
      setConnStatus('error', result.error || 'Connection failed');
    }
  });
}

function setConnStatus(type, msg) {
  const el = document.getElementById('connStatus');
  el.className = `status-row ${type}`;
  el.textContent = msg;
  el.style.marginTop = '0';
}

/* ── Screen 9: Email Provider ────────────────────────────────────────────── */
function initScreen9() {
  document.querySelectorAll('.provider-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.provider-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.provider-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.provider}`).classList.add('active');
    });
  });

  state.stepValid[8] = true;
  updateSidebar();
}

/* ── Screen 10: Deployment ───────────────────────────────────────────────── */
function initScreen10() {
  state.stepValid[9] = true;
  updateSidebar();
}

/* ── Screen 11: Review & Generate ───────────────────────────────────────── */
function buildReviewWarnings() {
  const indexType = state.indexType;
  if (indexType === 'custom') return '';

  const { required } = checkRequiredFields(indexType);
  const missingRequired = required.filter(r => !r.found);
  if (missingRequired.length === 0) return '';

  const items = missingRequired.map(r => `<li>${r.description}</li>`).join('');
  return `
    <div class="status-row error" style="margin-bottom:16px; flex-direction:column; align-items:flex-start; gap:6px">
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%">
        <span>⚠️ <strong>Required fields missing</strong> — ${INDEX_REQUIRED_FIELDS[indexType].label} components won't work without these.</span>
        <div style="display:flex; gap:6px; flex-shrink:0; margin-left:12px">
          <button class="btn btn-sm btn-secondary" onclick="addMissingFields('${indexType}'); goToScreen(3)">Add fields in Step 3</button>
        </div>
      </div>
      <ul style="padding-left:16px; font-size:12px; line-height:1.7">${items}</ul>
    </div>
  `;
}

function buildReview() {
  const container = document.getElementById('reviewSections');
  const identity = collectIdentity();
  const branding = collectBranding();
  const dataModel = collectDataModel();
  const roles = collectRoles();
  const enums = collectEnums();
  const tabs = collectTabs();

  const sections = [
    {
      title: '1 · App Identity', step: 1, rows: [
        ['Name', identity.name],
        ['Slug', identity.slug],
        ['Tagline', identity.tagline],
        ['URL', identity.url],
        ['Audience', identity.audience],
      ]
    },
    {
      title: '2 · Branding', step: 2, rows: [
        ...Object.entries(colorValues).map(([k, v]) => [
          COLOR_FIELDS.find(f => f.key === k)?.label || k,
          `<span style="display:inline-flex;align-items:center;gap:6px"><span style="width:14px;height:14px;border-radius:3px;background:${v};border:1px solid var(--border);display:inline-block"></span>${v}</span>`
        ]),
        ['Logo', state.logoName || '(none)'],
      ]
    },
    {
      title: '3 · Data Model', step: 3, rows: [
        ['Entity', `${dataModel.entitySingular} / ${dataModel.entityPlural}`],
        ['Fields', (dataModel.fields || []).map(f => `${f.name} (${f.type})`).join(', ')],
        ['Searchable', (dataModel.searchableFields || []).join(', ')],
      ]
    },
    {
      title: '4 · Roles', step: 4, rows:
        (roles.levels || []).map((r, i) => [`Level ${i + 1}`, r.name])
    },
    {
      title: '5 · Enums', step: 5, rows:
        (enums || []).map(e => [e.name, e.examples])
    },
    {
      title: '6 · Tabs', step: 6, rows: [
        ['Index type', tabs.indexType],
        ['Selected tabs', (tabs.selected || []).join(', ')],
        ['Custom tabs', (tabs.custom || []).map(t => t.name).join(', ') || '—'],
        ...(tabs.indexType === 'location' ? [
          ['Mapbox public token', tabs.mapboxPublicToken ? '••••' + tabs.mapboxPublicToken.slice(-6) : '⚠️ not set'],
          ['Mapbox secret token', tabs.mapboxSecretToken ? '(set)' : '(not set)'],
        ] : []),
      ]
    },
    {
      title: '8 · Supabase', step: 8, rows: [
        ['Project ID', document.getElementById('supabaseProjectId').value],
        ['Region', document.getElementById('supabaseRegion').value],
        ['Anon Key', document.getElementById('supabaseAnonKey').value ? '••••••••' : '(not set)'],
        ['Service Key', document.getElementById('supabaseServiceKey').value ? '••••••••' : '(not set)'],
      ]
    },
  ];

  container.innerHTML = buildReviewWarnings() + sections.map(s => `
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-title">${s.title}</span>
        <a href="#" onclick="event.preventDefault(); goToScreen(${s.step})" style="font-size:12px; color:var(--primary); text-decoration:none">Edit</a>
      </div>
      <div class="review-section-body">
        ${s.rows.map(([k, v]) => `
          <div class="review-row">
            <span class="review-key">${k}</span>
            <span class="review-val">${v || '<span style="color:var(--text-muted)">—</span>'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');

  document.getElementById('generateBtn').onclick = runGenerate;
}

async function generateIcons() {
  if (!state.logoData) return [];
  const img = new Image();
  img.src = state.logoData;
  await new Promise(r => { img.onload = r; });
  return [512, 192, 180, 32].map(size => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    return { size, data: canvas.toDataURL('image/png') };
  });
}

function setGenStep(id, state) {
  const el = document.getElementById(`gstep-${id}`);
  if (!el) return;
  el.classList.remove('done', 'active');
  if (state === 'done') {
    el.classList.add('done');
    el.querySelector('.gen-step-icon').textContent = '✅';
  } else if (state === 'active') {
    el.classList.add('active');
    el.querySelector('.gen-step-icon').textContent = '⏳';
  }
}

async function runGenerate() {
  const btn = document.getElementById('generateBtn');
  btn.disabled = true;
  const progress = document.getElementById('generateProgress');
  progress.classList.add('visible');
  document.getElementById('generateError').classList.add('hidden');

  const logEl = document.getElementById('generateLog');
  logEl.style.display = '';
  logEl.innerHTML = '';
  const seen = new Set();
  if (window.wizard.onGenerateProgress) {
    window.wizard.onGenerateProgress((msg) => {
      const id = msg.id || '';
      const status = msg.status || '';
      const detail = msg.detail || msg.message || msg.error || '';
      const key = `${id}:${status}`;
      if (seen.has(key) && !detail) return;
      seen.add(key);
      const icon = status === 'done' ? '✓' : status === 'failed' ? '✗' : status === 'warning' ? '⚠' : status === 'skipped' ? '○' : '·';
      const color = status === 'failed' ? 'var(--error)' : status === 'warning' ? 'var(--warning, #f59e0b)' : status === 'done' ? 'var(--success)' : 'var(--text-secondary)';
      const line = document.createElement('div');
      line.style.color = color;
      line.textContent = `${icon} ${msg.label || id}${detail ? ` — ${detail}` : ''}`;
      logEl.appendChild(line);
      logEl.scrollTop = logEl.scrollHeight;
    });
  }

  // Step 1: icons
  setGenStep('icons', 'active');
  const icons = await generateIcons();
  setGenStep('icons', 'done');

  // Step 2: collect data and write files
  setGenStep('files', 'active');
  const payload = {
    targetDir: state.targetDir,
    formData: collectAllData(),
    icons,
    logo: state.logoData ? { data: state.logoData, name: state.logoName } : null,
  };

  const result = await window.wizard.generate(payload);
  if (!result.ok) {
    setGenStep('files', 'done');
    document.getElementById('generateError').textContent = result.error;
    document.getElementById('generateError').classList.remove('hidden');
    btn.disabled = false;
    return;
  }
  setGenStep('files', 'done');

  setGenStep('cleanup', 'done');

  // Step 3: opening cursor
  setGenStep('cursor', 'active');
  await new Promise(r => setTimeout(r, 600));
  setGenStep('cursor', 'done');

  // Done!
  document.getElementById('masterPromptPath').textContent = result.masterPromptPath || '';
  goToScreen('done');
}

/* ── Data collectors ─────────────────────────────────────────────────────── */
function collectIdentity() {
  return {
    name: document.getElementById('appName')?.value || '',
    slug: document.getElementById('appSlug')?.value || '',
    tagline: document.getElementById('appTagline')?.value || '',
    description: document.getElementById('appDescription')?.value || '',
    audience: document.getElementById('appAudience')?.value || '',
    url: document.getElementById('appUrl')?.value || '',
    additionalNotes: document.getElementById('appNotes')?.value || '',
  };
}

function collectBranding() {
  return {
    ...colorValues,
    logoExt: state.logoName ? '.' + state.logoName.split('.').pop() : '.png',
    logoDescription: document.getElementById('logoDescription')?.value || '',
  };
}

function collectDataModel() {
  const fields = getFields();
  return {
    entitySingular: document.getElementById('entitySingular')?.value || '',
    entityPlural: document.getElementById('entityPlural')?.value || '',
    fields,
    searchableFields: fields.filter(f => f.searchable).map(f => f.name),
    defaultSort: document.getElementById('defaultSort')?.value || '',
    defaultSortDir: document.getElementById('defaultSortDir')?.value || 'desc',
    dataSensitive: document.getElementById('dataSensitivity')?.value === 'sensitive',
  };
}

function collectRoles() {
  return {
    levels: [0, 1, 2].map(i => ({
      name: document.getElementById(`role-name-${i}`)?.value || roleDefaults[i].name,
      description: document.getElementById(`role-desc-${i}`)?.value || '',
    })),
    defaultRole: document.getElementById('defaultRole')?.value || 'employee',
    inviteOnly: document.getElementById('inviteOnly')?.checked ?? true,
  };
}

function collectEnums() {
  return Array.from(document.querySelectorAll('#enumsBody tr')).map(tr => {
    const inputs = tr.querySelectorAll('input');
    return {
      name: inputs[0]?.value || '',
      examples: inputs[1]?.value || '',
      usedOn: inputs[2]?.value || '',
    };
  }).filter(e => e.name);
}

function collectTabs() {
  const selected = Array.from(document.querySelectorAll('#tabsChecklist input[type="checkbox"][data-tab]:checked'))
    .map(cb => cb.dataset.tab);
  const custom = Array.from(document.querySelectorAll('#customTabsRows .custom-tab-row')).map(row => {
    const inputs = row.querySelectorAll('input');
    return { name: inputs[0]?.value || '', description: inputs[1]?.value || '' };
  }).filter(t => t.name);
  return {
    indexType: state.indexType,
    selected,
    custom,
    mapboxPublicToken: state.mapboxPublicToken,
    mapboxSecretToken: state.mapboxSecretToken,
  };
}

function collectEmailProvider() {
  const active = document.querySelector('.provider-tab.active')?.dataset.provider || 'skip';
  return {
    type: active,
    resendKey: document.getElementById('resendApiKey')?.value || '',
    smtpHost: document.getElementById('smtpHost')?.value || 'smtp.resend.com',
    smtpPort: document.getElementById('smtpPort')?.value || '587',
    smtpUser: document.getElementById('smtpUser')?.value || 'resend',
    smtpPass: document.getElementById('smtpPass')?.value || '',
  };
}

function collectDeployment() {
  return {
    platform: document.getElementById('deployPlatform')?.value || 'Netlify',
    domain: document.getElementById('deployDomain')?.value || '',
    slackBugChannel: document.getElementById('slackBugChannel')?.value || '',
    slackFeatureChannel: document.getElementById('slackFeatureChannel')?.value || '',
    slackBotToken: document.getElementById('slackBotToken')?.value || '',
    slackWorkspace: document.getElementById('slackWorkspace')?.value || '',
  };
}

function collectAllData() {
  return {
    identity: collectIdentity(),
    branding: collectBranding(),
    dataModel: collectDataModel(),
    roles: collectRoles(),
    enums: collectEnums(),
    tabs: collectTabs(),
    email: {
      fromAddress: document.getElementById('emailFrom')?.value || '',
      senderName: document.getElementById('emailSenderName')?.value || '',
      tone: document.getElementById('emailTone')?.value || 'Friendly',
    },
    supabase: {
      projectName: document.getElementById('supabaseProjectName')?.value || '',
      projectId: document.getElementById('supabaseProjectId')?.value || '',
      region: document.getElementById('supabaseRegion')?.value || '',
      anonKey: document.getElementById('supabaseAnonKey')?.value || '',
      serviceRoleKey: document.getElementById('supabaseServiceKey')?.value || '',
      dbPassword: document.getElementById('supabaseDbPassword')?.value || '',
    },
    emailProvider: collectEmailProvider(),
    deployment: collectDeployment(),
  };
}

/* ── Nav buttons ─────────────────────────────────────────────────────────── */
function initNav() {
  document.getElementById('backBtn').addEventListener('click', () => {
    if (typeof state.currentScreen === 'number' && state.currentScreen > 1) {
      goToScreen(state.currentScreen - 1);
    }
  });

  document.getElementById('nextBtn').addEventListener('click', () => {
    const n = state.currentScreen;
    // Step 2: logo is required, no data-validate inputs
    if (n === 2 && !state.logoData) {
      const hint = document.getElementById('logoRequiredHint');
      if (hint) { hint.style.display = ''; hint.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }
    if (!validateStep(n)) {
      // Highlight missing required fields
      const screen = document.getElementById(`screen-${n}`);
      screen.querySelectorAll('[data-validate="required"]').forEach(el => {
        if (!el.value.trim()) {
          el.style.borderColor = 'var(--error)';
          el.addEventListener('input', function fix() { el.style.borderColor = ''; el.removeEventListener('input', fix); });
        }
      });
      return;
    }

    // Side effects on leaving a step
    if (n === 3) populateEnumsFromCandidates();

    const next = n + 1;
    if (next <= 11) goToScreen(next);
  });
}

/* ── Helper: toggle password field mask ──────────────────────────────────── */
function toggleMask(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
  const btn = document.getElementById(`toggle${id.charAt(0).toUpperCase() + id.slice(1)}`);
  if (btn) btn.textContent = el.type === 'password' ? 'Show' : 'Hide';
}

/* ── Init ────────────────────────────────────────────────────────────────── */
function init() {
  initSidebar();
  initScreen0();
  initScreen1();
  initScreen2();
  initScreen3();
  initScreen4();
  initScreen5();
  initScreen6();
  initScreen7();
  initScreen8();
  initScreen9();
  initScreen10();
  initNav();
  attachValidationListeners();
  updateSidebar();
}

document.addEventListener('DOMContentLoaded', init);

// Expose goToScreen for review edit links
window.goToScreen = goToScreen;
window.toggleMask = toggleMask;
