/**
 * useSetupChecklist — tracks app setup completion state
 *
 * Auto-detects what it can (Supabase connected, branding configured, migrations run).
 * Remaining items are manually checked off by the developer.
 * State is persisted in localStorage so it survives page refreshes.
 */
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { APP_CONFIG } from '../constants/appConfig';
import { supabase } from '../lib/supabase';
import { WIZARD_COMPLETED_ITEMS } from '../constants/setupConfig';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface SetupStep {
  heading: string;
  body: string;
  code?: string;
}

export interface SetupItem {
  id: string;
  title: string;
  description: string;
  category: 'required' | 'optional';
  /** If provided, auto-detects completion — overrides manual toggle */
  autoDetect?: () => boolean | Promise<boolean>;
  steps: SetupStep[];
}

export interface SetupItemState {
  id: string;
  completed: boolean;
  autoDetected: boolean;
}

// ── Checklist definition ──────────────────────────────────────────────────────
export const SETUP_ITEMS: SetupItem[] = [
  {
    id: 'prd_filled',
    title: 'Fill out PRD.md',
    description: 'Define your app identity, branding, roles, entity fields, and tab structure.',
    category: 'required',
    autoDetect: () => APP_CONFIG.name !== 'APP_NAME',
    steps: [
      {
        heading: 'Open PRD.md',
        body: 'Open PRD.md in the root of the project. It has 14 sections covering everything the AI needs to set up your app.',
      },
      {
        heading: 'Fill out every [REQUIRED] section',
        body: 'Complete: App Identity, Branding (colors), Indexing Type, Core Entity (fields), Roles, Editable Enum Categories, Tab Structure, Email, Supabase Project, Deployment.',
      },
      {
        heading: 'Save and commit',
        body: 'Save the file. PRD.md is committed to git — it serves as the permanent specification for your app.',
      },
    ],
  },
  {
    id: 'env_configured',
    title: 'Configure .env file',
    description: 'Set Supabase URL and keys, SMTP credentials, and other API keys.',
    category: 'required',
    autoDetect: () =>
      !!(
        process.env.EXPO_PUBLIC_SUPABASE_URL &&
        process.env.EXPO_PUBLIC_SUPABASE_URL !== '' &&
        !process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project')
      ),
    steps: [
      {
        heading: 'Copy the example file',
        body: 'In your terminal:',
        code: 'cp .env.example .env',
      },
      {
        heading: 'Get Supabase credentials',
        body: 'Go to Supabase Dashboard → Settings → API. Copy: Project URL → EXPO_PUBLIC_SUPABASE_URL, anon key → EXPO_PUBLIC_SUPABASE_ANON_KEY, service_role key → SUPABASE_SERVICE_ROLE_KEY.',
      },
      {
        heading: 'Get SMTP credentials',
        body: 'Recommended: Create a free Resend account at resend.com. Set EMAIL_PROVIDER=resend and RESEND_API_KEY=re_...',
      },
      {
        heading: 'Fill in remaining values',
        body: 'Set APP_URL to your production URL, SMTP_FROM_EMAIL, SMTP_FROM_NAME. Slack/Cursor keys can be added later.',
      },
    ],
  },
  {
    id: 'ai_setup_run',
    title: 'Run AI setup in Cursor',
    description: 'Open master-prompt.md in Cursor Agent mode to configure branding, roles, tabs, and apply database migrations automatically.',
    category: 'required',
    autoDetect: () => APP_CONFIG.name !== 'APP_NAME' && APP_CONFIG.tagline !== 'Your app tagline here.',
    steps: [
      {
        heading: 'Find master-prompt.md',
        body: 'If you used the Setup Wizard, master-prompt.md is in the project root and was highlighted in your file explorer. Right-click it → Open With → Cursor.',
        code: '# Or open manually:\ncursor master-prompt.md',
      },
      {
        heading: 'Open a new Agent chat in Cursor',
        body: 'Press Cmd/Ctrl+L to open the chat panel. Switch to Agent mode (not Ask mode). Paste or drag the contents of master-prompt.md into the chat.',
      },
      {
        heading: 'Wait for AI completion',
        body: 'The AI configures app name, colors, roles, applies database migrations via Supabase MCP, scaffolds tabs, and writes SETUP_TODO.md with remaining manual steps.',
      },
      {
        heading: 'Verify changes',
        body: 'Check that appConfig.ts, theme.ts, and the tab layout reflect your app values. The [BASE-APP SETUP NEEDED] banners should be gone. Open SETUP_TODO.md for what remains.',
      },
    ],
  },
  {
    id: 'migrations_run',
    title: 'Run database migrations',
    description: 'Create user_profiles, editable_enums, RLS policies, and your entity table in Supabase.',
    category: 'required',
    autoDetect: async () => {
      try {
        const { error } = await supabase.from('user_profiles').select('id').limit(1);
        return !error;
      } catch {
        return false;
      }
    },
    steps: [
      {
        heading: 'Go to Supabase SQL Editor',
        body: 'Open Supabase Dashboard → SQL Editor → New Query.',
      },
      {
        heading: 'Run migration 001',
        body: 'Copy the contents of database/migrations/001_user_profiles.sql and run it. This creates the user_profiles table and UserRole enum.',
      },
      {
        heading: 'Run migration 002',
        body: 'Copy and run database/migrations/002_editable_enums.sql. This creates the editable_enums table with seed data.',
      },
      {
        heading: 'Run migration 003',
        body: 'Copy and run database/migrations/003_rls_policies.sql. This enables Row-Level Security on all tables.',
      },
      {
        heading: 'Run entity migration (if generated)',
        body: 'If the AI generated a 004_*.sql migration during TIME_INDEX_PROMPT, run that too.',
      },
    ],
  },
  {
    id: 'first_admin',
    title: 'Create first admin user',
    description: 'Invite the first admin user and set their role to Admin in the database.',
    category: 'required',
    autoDetect: async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('role', 'admin')
          .limit(1);
        return !error && (data?.length ?? 0) > 0;
      } catch {
        return false;
      }
    },
    steps: [
      {
        heading: 'Invite the admin via Supabase',
        body: 'Go to Supabase Dashboard → Authentication → Users → Invite User. Enter the admin\'s email address.',
      },
      {
        heading: 'Admin accepts invite',
        body: 'The admin clicks the invite link in their email and sets a password.',
      },
      {
        heading: 'Set admin role in database',
        body: 'Go to Supabase Dashboard → Table Editor → user_profiles. Find the new row and change the role column to "admin".',
      },
      {
        heading: 'Sign in and verify',
        body: 'Sign in with the admin account. You should see the Admin tab and full access to user management and enum editing.',
      },
      {
        heading: 'Use the Invite User tool going forward',
        body: 'Once signed in as admin, use the Admin tab → Invite User to add all other users without going to the Supabase dashboard.',
      },
    ],
  },
  {
    id: 'smtp_configured',
    title: 'Configure Supabase SMTP',
    description: 'Connect your email provider so Supabase can send password reset and invite emails.',
    category: 'required',
    steps: [
      {
        heading: 'Go to Supabase Authentication settings',
        body: 'Open Supabase Dashboard → Authentication → SMTP Settings.',
      },
      {
        heading: 'Enable custom SMTP',
        body: 'Toggle "Enable Custom SMTP" on.',
      },
      {
        heading: 'Fill in SMTP details',
        body: 'Use the SMTP_* values from your .env file:\n• Host: smtp.resend.com (Resend) or your provider\n• Port: 587\n• User: resend (for Resend) or your username\n• Password: your API key or password\n• Sender name and email',
      },
      {
        heading: 'Send a test email',
        body: 'Click "Save" then test with the "Send test email" button. Check your inbox.',
      },
    ],
  },
  {
    id: 'email_templates',
    title: 'Customize email templates',
    description: 'Apply your app branding to Supabase auth emails (reset, invite, magic link).',
    category: 'optional',
    steps: [
      {
        heading: 'Open EMAIL_BRANDING.md',
        body: 'Open docs/EMAIL_BRANDING.md. It contains an HTML email template with {{APP_NAME}}, {{PRIMARY_COLOR}} placeholders.',
      },
      {
        heading: 'Replace placeholders',
        body: 'In the template, replace:\n• {{APP_NAME}} with your app name\n• {{PRIMARY_COLOR}} with your primary hex color\n• {{BACKGROUND_COLOR}} with your background color\n• {{LOGO_URL}} with your logo image URL\n• {{SUPPORT_EMAIL}} with your support email',
      },
      {
        heading: 'Apply to each Supabase template',
        body: 'Go to Supabase Dashboard → Authentication → Email Templates. For each template (Confirm, Reset, Invite, Magic Link), paste your branded HTML and update the title/button text. See docs/EMAIL_SETUP.md for per-template guidance.',
      },
    ],
  },
  {
    id: 'app_icons',
    title: 'Upload app icons',
    description: 'Replace placeholder icons with your app logo for PWA and native.',
    category: 'optional',
    steps: [
      {
        heading: 'Prepare icon files',
        body: 'Create PNG icon files in these sizes:\n• 512×512 (PWA, required)\n• 192×192 (PWA maskable)\n• 180×180 (Apple touch icon)\n• 72, 96, 128, 144 (Android)\n• favicon.ico',
      },
      {
        heading: 'Place in assets/pwa-icons/',
        body: 'Copy all icon files to assets/pwa-icons/ using the naming convention from public/manifest.json.',
      },
      {
        heading: 'Update app.json',
        body: 'In app.json, update:\n• expo.icon → path to your 1024×1024 icon\n• expo.splash.image → path to your splash screen\n• expo.android.adaptiveIcon.foregroundImage\n• expo.web.apple.touchIcon',
      },
      {
        heading: 'Update manifest.json',
        body: 'In public/manifest.json, verify the icon paths match the files you placed in assets/pwa-icons/.',
      },
    ],
  },
  {
    id: 'slack_automation',
    title: 'Set up Slack automation',
    description: 'Connect the Cursor bug-fix pipeline so bug reports auto-trigger AI fixes via Slack.',
    category: 'optional',
    steps: [
      {
        heading: 'Read CURSOR_AUTOMATION_PROMPT.md',
        body: 'Open docs/CURSOR_AUTOMATION_PROMPT.md for the full setup guide.',
      },
      {
        heading: 'Create a Slack app',
        body: 'Go to api.slack.com/apps → Create New App → From scratch. Give it a name and choose your workspace.',
      },
      {
        heading: 'Add bot permissions',
        body: 'In OAuth & Permissions → Bot Token Scopes, add: chat:write, channels:read, groups:read.',
      },
      {
        heading: 'Install to workspace and get token',
        body: 'Click "Install to Workspace". Copy the Bot User OAuth Token (starts with xoxb-) → SLACK_BOT_TOKEN in .env.',
      },
      {
        heading: 'Get channel IDs',
        body: 'Right-click each Slack channel → Copy Link. The last segment of the URL is the channel ID. Set SLACK_BUG_REPORTS_CHANNEL_ID and SLACK_FEATURE_REQUESTS_CHANNEL_ID in .env.',
      },
      {
        heading: 'Deploy edge function',
        body: 'Deploy the trigger-cursor-agent edge function:\n',
        code: 'npx supabase functions deploy trigger-cursor-agent',
      },
      {
        heading: 'Set edge function secrets',
        body: 'In Supabase Dashboard → Edge Functions → trigger-cursor-agent → Secrets, add all SLACK_* and CURSOR_API_KEY values.',
      },
    ],
  },
  {
    id: 'deployed',
    title: 'Deploy to production',
    description: 'Build and deploy your app to Netlify, Vercel, or your chosen platform.',
    category: 'optional',
    steps: [
      {
        heading: 'Build the web app',
        body: 'Run the build command:',
        code: 'npm run build:web',
      },
      {
        heading: 'Deploy to Netlify',
        body: '1. Connect your GitHub repo to Netlify\n2. Build command: npm run build:web\n3. Publish directory: dist\n4. Add all .env variables under Site settings → Environment variables',
      },
      {
        heading: 'Or deploy to Vercel',
        body: '1. Import your repo\n2. Framework preset: Other\n3. Build command: npm run build:web\n4. Output directory: dist\n5. Add env vars under Settings → Environment Variables',
      },
      {
        heading: 'Connect custom domain',
        body: 'In your hosting platform, go to Domain settings and add your custom domain from PRD.md. Update APP_URL in env vars to match.',
      },
      {
        heading: 'Verify PWA install',
        body: 'Visit your production URL on mobile. You should see an "Add to Home Screen" prompt. Install and verify the app opens in standalone mode.',
      },
    ],
  },
];

// ── Storage key ───────────────────────────────────────────────────────────────
const STORAGE_KEY = 'app_setup_checklist_v1';

function readFromStorage(): Record<string, boolean> {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeToStorage(state: Record<string, boolean>): void {
  if (Platform.OS !== 'web' || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSetupChecklist() {
  const [manualState, setManualState] = useState<Record<string, boolean>>({});
  const [autoState, setAutoState] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Load manual state from localStorage
  useEffect(() => {
    setManualState(readFromStorage());
    setLoading(false);
  }, []);

  // Run auto-detections
  useEffect(() => {
    const runDetections = async () => {
      const results: Record<string, boolean> = {};
      await Promise.all(
        SETUP_ITEMS.map(async item => {
          if (item.autoDetect) {
            try {
              results[item.id] = await item.autoDetect();
            } catch {
              results[item.id] = false;
            }
          }
        })
      );
      setAutoState(results);
    };
    runDetections();
  }, []);

  const isCompleted = useCallback(
    (id: string): boolean => {
      // Items completed by the setup wizard are always marked done
      if (WIZARD_COMPLETED_ITEMS.includes(id)) return true;
      // Auto-detected items take precedence
      const item = SETUP_ITEMS.find(i => i.id === id);
      if (item?.autoDetect) {
        return autoState[id] ?? false;
      }
      return manualState[id] ?? false;
    },
    [autoState, manualState]
  );

  const toggleComplete = useCallback(
    (id: string) => {
      const item = SETUP_ITEMS.find(i => i.id === id);
      if (item?.autoDetect) return; // Can't manually toggle auto-detected items

      setManualState(prev => {
        const next = { ...prev, [id]: !prev[id] };
        writeToStorage(next);
        return next;
      });
    },
    []
  );

  const markComplete = useCallback((id: string) => {
    const item = SETUP_ITEMS.find(i => i.id === id);
    if (item?.autoDetect) return;
    setManualState(prev => {
      const next = { ...prev, [id]: true };
      writeToStorage(next);
      return next;
    });
  }, []);

  const itemStates: SetupItemState[] = SETUP_ITEMS.map(item => ({
    id: item.id,
    completed: isCompleted(item.id),
    autoDetected: item.autoDetect !== undefined,
  }));

  const requiredItems = SETUP_ITEMS.filter(i => i.category === 'required');
  const completedCount = itemStates.filter(s => s.completed).length;
  const requiredCompleted = requiredItems.every(i => isCompleted(i.id));
  const allCompleted = SETUP_ITEMS.every(i => isCompleted(i.id));
  const hasIncomplete = !allCompleted;
  const requiredIncomplete = !requiredCompleted;

  return {
    items: SETUP_ITEMS,
    itemStates,
    completedCount,
    totalCount: SETUP_ITEMS.length,
    requiredCompleted,
    allCompleted,
    hasIncomplete,
    requiredIncomplete,
    isCompleted,
    toggleComplete,
    markComplete,
    loading,
  };
}
