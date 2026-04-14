/**
 * Supabase Edge Function: send-email
 * Generic transactional email sender supporting Resend and SMTP providers.
 *
 * Required secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   EMAIL_PROVIDER  — 'resend' | 'smtp'
 *   RESEND_API_KEY  — if using Resend
 *   SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS  — if using SMTP
 *
 * Usage:
 *   POST /functions/v1/send-email
 *   Body: { to, subject, html, type? }
 *
 * Add new email types by adding cases to the getEmailTemplate function.
 * See docs/EMAIL_SETUP.md for full configuration instructions.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const EMAIL_PROVIDER = Deno.env.get('EMAIL_PROVIDER') ?? 'resend';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('SMTP_FROM_EMAIL') ?? 'noreply@yourdomain.com';
const FROM_NAME = Deno.env.get('SMTP_FROM_NAME') ?? 'App Name';

// TODO: [BASE-APP SETUP NEEDED] AI sets FROM_EMAIL and FROM_NAME from PRD.md

interface EmailPayload {
  /** Recipient email address */
  to: string;
  /** Email subject line */
  subject: string;
  /** HTML email body */
  html: string;
  /** Optional email type identifier for logging */
  type?: string;
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Basic auth check — caller must include service role or auth header
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const payload: EmailPayload = await req.json();
    const { to, subject, html, type } = payload;

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Missing required fields: to, subject, html' }), { status: 400 });
    }

    let result: { success: boolean; error?: string };

    if (EMAIL_PROVIDER === 'resend') {
      result = await sendViaResend({ to, subject, html });
    } else {
      // For SMTP, you'd use a Deno SMTP library or a relay service
      // Placeholder — implement with your preferred SMTP approach
      console.warn('[send-email] SMTP provider not yet implemented. Switch to EMAIL_PROVIDER=resend.');
      result = { success: false, error: 'SMTP not implemented. Use EMAIL_PROVIDER=resend.' };
    }

    console.log(`[send-email] type=${type ?? 'unknown'} to=${to} success=${result.success}`);

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500,
    });
  } catch (err) {
    console.error('[send-email] Unexpected error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});

async function sendViaResend(payload: { to: string; subject: string; html: string }): Promise<{ success: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error('[Resend] Error:', data);
    return { success: false, error: data.message ?? 'Resend API error' };
  }

  return { success: true };
}
