# Email Branding Guide

Use this file to customize email templates with your app's branding.

## Supabase Auth Email Template

Paste this into **Supabase Dashboard → Authentication → Email Templates → [template name]**:

> **Find & Replace before pasting:**
> - `{{APP_NAME}}` → your app name (from PRD.md)
> - `{{PRIMARY_COLOR}}` → your primary hex color (from PRD.md)
> - `{{BACKGROUND_COLOR}}` → your background hex color (from PRD.md)
> - `{{LOGO_URL}}` → URL to your logo image
> - `{{SUPPORT_EMAIL}}` → your support email address

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{APP_NAME}}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: {{BACKGROUND_COLOR}};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    .wrapper {
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    .logo {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo img {
      height: 48px;
      width: auto;
    }
    .card {
      background: #1a1e25;
      border-radius: 12px;
      padding: 40px;
    }
    .title {
      color: #f0f0f0;
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 16px;
    }
    .body {
      color: #9aa3b0;
      font-size: 15px;
      line-height: 1.6;
      margin: 0 0 28px;
    }
    .button {
      display: inline-block;
      background: {{PRIMARY_COLOR}};
      color: #ffffff;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 700;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      color: #5a6270;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer a {
      color: {{PRIMARY_COLOR}};
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="logo">
      <!-- Remove this img tag if you don't have a logo URL yet -->
      <img src="{{LOGO_URL}}" alt="{{APP_NAME}}" onerror="this.style.display='none'">
    </div>

    <div class="card">
      <!-- ======================================================= -->
      <!-- CUSTOMIZE THIS SECTION PER TEMPLATE TYPE:               -->
      <!--   Confirm signup / Invite user / Reset password / etc.  -->
      <!-- ======================================================= -->

      <p class="title"><!-- e.g. "Confirm your email" or "Reset your password" --></p>

      <p class="body">
        <!-- Main body text. Use Supabase template variables like {{ .Email }} -->
      </p>

      <!-- Primary action button -->
      <a href="{{ .ConfirmationURL }}" class="button">
        <!-- e.g. "Confirm Email" or "Reset Password" -->
      </a>

      <p class="body" style="margin-top: 24px; font-size: 13px;">
        If you didn't request this, you can safely ignore this email.
        This link expires in 24 hours.
      </p>
    </div>

    <div class="footer">
      <p>{{APP_NAME}}</p>
      <p>
        Questions? <a href="mailto:{{SUPPORT_EMAIL}}">{{SUPPORT_EMAIL}}</a>
      </p>
    </div>
  </div>
</body>
</html>
```

---

## Template-Specific Customization

### Confirm Signup
- Title: "Confirm your email"
- Button: "Confirm Email"
- Body: "Thanks for signing up for {{APP_NAME}}! Click below to verify your email address."

### Invite User
- Title: "You're invited to {{APP_NAME}}"
- Button: "Accept Invitation"
- Body: "You've been invited to join {{APP_NAME}}. Click below to set up your account."

### Reset Password
- Title: "Reset your password"
- Button: "Reset Password"
- Body: "We received a request to reset the password for your {{APP_NAME}} account."

### Magic Link
- Title: "Sign in to {{APP_NAME}}"
- Button: "Sign In"
- Body: "Click the button below to sign in to your {{APP_NAME}} account. This link expires in 1 hour."
