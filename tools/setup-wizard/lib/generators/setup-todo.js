/**
 * setup-todo — render SETUP_TODO.md from template using collected wizard data.
 */
const fs = require('fs');
const path = require('path');
const { fillTokens } = require('../edits/text-replace');

function applySetupTodo(targetDir, formData) {
  const tplPath = path.join(__dirname, '..', '..', 'templates', 'setup-todo.md.tpl');
  if (!fs.existsSync(tplPath)) return;

  const identity = formData.identity || {};
  const email = formData.email || {};
  const emailProvider = formData.emailProvider || {};
  const deployment = formData.deployment || {};

  const out = fillTokens(fs.readFileSync(tplPath, 'utf8'), {
    APP_NAME: identity.name || 'App',
    GENERATED_DATE: new Date().toISOString().split('T')[0],
    SMTP_HOST: emailProvider.smtpHost || 'smtp.resend.com',
    SMTP_PORT: emailProvider.smtpPort || '587',
    SMTP_USER: emailProvider.smtpUser || 'resend',
    EMAIL_FROM: email.fromAddress || 'noreply@yourdomain.com',
    DEPLOY_PLATFORM: deployment.platform || 'Netlify',
    DEPLOY_DOMAIN_LINE: deployment.domain ? `5. Connect domain: ${deployment.domain}` : '',
  });
  fs.writeFileSync(path.join(targetDir, 'SETUP_TODO.md'), out, 'utf8');
}

module.exports = { applySetupTodo };
