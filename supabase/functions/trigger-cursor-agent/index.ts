/**
 * Supabase Edge Function: trigger-cursor-agent
 * Posts bug reports and feature requests to Slack to drive the Cursor automation workflow.
 *
 * Workflow:
 * 1. Database trigger calls this function with a bug/feature record ID
 * 2. Function fetches the full record
 * 3. Posts formatted message to the appropriate Slack channel
 * 4. Updates the record with the Slack thread timestamp
 *
 * Required edge function secrets (set in Supabase Dashboard → Edge Functions → Secrets):
 *   SLACK_BOT_TOKEN
 *   SLACK_BUG_REPORTS_CHANNEL_ID
 *   SLACK_FEATURE_REQUESTS_CHANNEL_ID
 *   CURSOR_API_KEY (optional — for direct Cursor API integration)
 *
 * See docs/CURSOR_AUTOMATION_PROMPT.md for full setup instructions.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SLACK_BOT_TOKEN = Deno.env.get('SLACK_BOT_TOKEN')!;
const SLACK_BUG_CHANNEL = Deno.env.get('SLACK_BUG_REPORTS_CHANNEL_ID')!;
const SLACK_FEATURE_CHANNEL = Deno.env.get('SLACK_FEATURE_REQUESTS_CHANNEL_ID')!;

interface TriggerPayload {
  type: 'bug' | 'feature';
  record_id: string;
  // TODO: [BASE-APP SETUP NEEDED] Add your bug/feature table name if customized
  table?: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload: TriggerPayload = await req.json();
    const { type, record_id } = payload;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // TODO: [BASE-APP SETUP NEEDED] Update table names to match your app's bug/feature tables
    const tableName = type === 'bug' ? 'bug_reports' : 'feature_requests';
    const channelId = type === 'bug' ? SLACK_BUG_CHANNEL : SLACK_FEATURE_CHANNEL;

    // Fetch the full record
    const { data: record, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', record_id)
      .single();

    if (error || !record) {
      console.error('Failed to fetch record:', error);
      return new Response(JSON.stringify({ error: 'Record not found' }), { status: 404 });
    }

    // Format Slack message
    const emoji = type === 'bug' ? '🐛' : '✨';
    const label = type === 'bug' ? 'Bug Report' : 'Feature Request';
    const slackMessage = formatSlackMessage(emoji, label, record, record_id);

    // Post to Slack
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: channelId,
        text: slackMessage,
        unfurl_links: false,
      }),
    });

    const slackData = await slackRes.json();

    if (!slackData.ok) {
      console.error('Slack API error:', slackData.error);
      return new Response(JSON.stringify({ error: slackData.error }), { status: 500 });
    }

    // Update record with Slack thread timestamp
    await supabase
      .from(tableName)
      .update({ slack_thread_ts: slackData.ts, cursor_agent_status: 'slack_notified' })
      .eq('id', record_id);

    return new Response(JSON.stringify({ success: true, ts: slackData.ts }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

function formatSlackMessage(emoji: string, label: string, record: any, id: string): string {
  // TODO: [BASE-APP SETUP NEEDED] Customize this format for your bug/feature schema fields
  const lines = [
    `${emoji} *New ${label}* — ID: \`${id}\``,
    '',
    `*Title:* ${record.title ?? 'N/A'}`,
  ];

  if (record.current_behavior) lines.push(`*Current Behavior:* ${record.current_behavior}`);
  if (record.desired_behavior) lines.push(`*Desired Behavior:* ${record.desired_behavior}`);
  if (record.description) lines.push(`*Description:* ${record.description}`);
  if (record.use_case) lines.push(`*Use Case:* ${record.use_case}`);
  if (record.where_in_app) lines.push(`*Where in App:* ${record.where_in_app}`);
  if (record.page_id) lines.push(`*Page ID:* ${record.page_id}`);
  if (record.user_role) lines.push(`*User Role:* ${record.user_role}`);

  lines.push('', `_Cursor agent: plan and fix this issue following .cursor/rules/best-practices.mdc_`);

  return lines.join('\n');
}
