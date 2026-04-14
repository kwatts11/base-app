# Email Setup Guide

This app uses a two-track email strategy:

| Track | Handled by | Used for |
|-------|-----------|----------|
| Auth emails | Supabase built-in SMTP | Password reset, invite, magic link, email confirm |
| Transactional emails | `send-email` edge function | Welcome, notifications, custom flows |

---

## Track 1: Supabase Auth Emails (SMTP)

Supabase handles auth emails natively. You just configure SMTP credentials and customize the templates.

### Configure SMTP

1. Go to **Supabase Dashboard → Authentication → SMTP Settings**
2. Fill in:
   - **SMTP Host**: e.g. `smtp.resend.com`
   - **SMTP Port**: `587`
   - **SMTP User**: `resend` (for Resend) or your provider username
   - **SMTP Password**: your API key or password
   - **From Email**: e.g. `noreply@yourdomain.com`
   - **From Name**: e.g. `App Name`

Recommended provider: **[Resend](https://resend.com)** (free tier, excellent Supabase support).

### Customize Auth Email Templates

1. Go to **Supabase Dashboard → Authentication → Email Templates**
2. Available templates:
   - **Confirm signup** — sent when user first registers
   - **Invite user** — sent when admin invites a user
   - **Magic Link** — passwordless login
   - **Change email** — email address update confirmation
   - **Reset password** — password reset link

3. Use the **HTML editor** to apply your app branding.
   See `docs/EMAIL_BRANDING.md` for a base HTML template.

### Template Variables

Supabase uses Go template syntax. Available in all auth emails:

| Variable | Description |
|----------|-------------|
| `{{ .ConfirmationURL }}` | The action link (reset, confirm, invite) |
| `{{ .Email }}` | The recipient's email address |
| `{{ .Token }}` | Raw 6-digit OTP (for OTP flows) |
| `{{ .SiteURL }}` | Your app URL |
| `{{ .RedirectTo }}` | The redirect URL after confirmation |

---

## Track 2: Custom Transactional Emails (Edge Function)

For emails you send yourself (not auth-triggered), use the `send-email` edge function.

### Setup

1. Configure secrets in Supabase Dashboard → Edge Functions → Secrets:
   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxx
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   SMTP_FROM_NAME=App Name
   ```

2. Deploy: `npx supabase functions deploy send-email`

3. See `supabase/functions/send-email/README.md` for usage.

---

## Testing Emails Locally

```bash
# Start local Supabase
npx supabase start

# Test auth email flow
# Emails go to Supabase's built-in Inbucket: http://localhost:54324

# Test send-email function locally
npx supabase functions serve send-email --env-file .env
curl -X POST http://localhost:54321/functions/v1/send-email \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"to":"test@example.com","subject":"Test","html":"<p>Hello</p>"}'
```
