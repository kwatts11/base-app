# send-email Edge Function

Generic transactional email sender for custom app emails (welcome, notifications, etc.).

> Auth emails (password reset, invite, magic link) are handled by Supabase's built-in SMTP.
> See `docs/EMAIL_SETUP.md` for configuring those.

## Setup

1. Set secrets in Supabase Dashboard → Edge Functions → Secrets:
   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxx
   SMTP_FROM_EMAIL=noreply@yourdomain.com
   SMTP_FROM_NAME=Your App Name
   SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
   ```

2. Deploy:
   ```bash
   npx supabase functions deploy send-email
   ```

## Usage

Call from another edge function or server-side code:

```typescript
const res = await supabase.functions.invoke('send-email', {
  body: {
    to: 'user@example.com',
    subject: 'Welcome to the app!',
    html: '<h1>Welcome!</h1><p>Thanks for joining.</p>',
    type: 'welcome',
  },
});
```

## Adding New Email Types

Add a template function and call it:

```typescript
function welcomeEmail(name: string): string {
  return `<html>...Your branded HTML...</html>`;
}

// In your calling code:
await supabase.functions.invoke('send-email', {
  body: {
    to: user.email,
    subject: `Welcome, ${name}!`,
    html: welcomeEmail(name),
    type: 'welcome',
  },
});
```

For email HTML templates with app branding, see `docs/EMAIL_BRANDING.md`.

## Providers

| Provider | Setup |
|----------|-------|
| Resend (recommended) | Set `EMAIL_PROVIDER=resend` and `RESEND_API_KEY` |
| SMTP | Set `EMAIL_PROVIDER=smtp` and configure SMTP_* vars (requires implementation) |
