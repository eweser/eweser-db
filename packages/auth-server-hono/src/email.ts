import { createLogger } from '@eweser/logger';
import { env } from './env.js';

const log = createLogger('auth-email');

const resendApiUrl = 'https://api.resend.com/emails';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function sendEmail(input: {
  html: string;
  subject: string;
  text: string;
  to: string;
}) {
  if (env.AUTH_EMAIL_PROVIDER !== 'resend') {
    log.warn(
      { provider: env.AUTH_EMAIL_PROVIDER, to: input.to },
      'Auth email delivery is disabled.'
    );
    return;
  }

  const response = await fetch(resendApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.AUTH_EMAIL_FROM,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(env.AUTH_EMAIL_REPLY_TO ? { reply_to: env.AUTH_EMAIL_REPLY_TO } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Resend email delivery failed (${response.status}): ${body || 'no body'}`
    );
  }
}

export async function sendPasswordResetEmail(input: {
  to: string;
  url: string;
}) {
  const escapedUrl = escapeHtml(input.url);

  await sendEmail({
    to: input.to,
    subject: 'Reset your EweserDB password',
    text: `Reset your EweserDB password: ${input.url}`,
    html: [
      '<p>Use the link below to reset your EweserDB password.</p>',
      `<p><a href="${escapedUrl}">Reset your password</a></p>`,
      '<p>If you did not request this, you can ignore this email.</p>',
    ].join(''),
  });
}

export async function sendVerificationEmail(input: {
  to: string;
  url: string;
}) {
  const escapedUrl = escapeHtml(input.url);

  await sendEmail({
    to: input.to,
    subject: 'Verify your EweserDB email',
    text: `Verify your EweserDB email: ${input.url}`,
    html: [
      '<p>Verify your email address to continue using EweserDB.</p>',
      `<p><a href="${escapedUrl}">Verify your email</a></p>`,
      '<p>If you did not create this account, you can ignore this email.</p>',
    ].join(''),
  });
}
