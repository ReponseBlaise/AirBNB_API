import nodemailer from 'nodemailer';

const emailHost = process.env['EMAIL_HOST'];
const emailPort = Number(process.env['EMAIL_PORT'] ?? 587);
const emailUser = process.env['EMAIL_USER'];
const emailPass = process.env['EMAIL_PASS'];

const smtpConfigured = Boolean(emailHost && emailUser && emailPass);

if (!smtpConfigured) {
  console.warn(
    '[email] SMTP is not fully configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS to send real emails. Using jsonTransport fallback.'
  );
}

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: emailHost,
      port: emailPort,
      secure: emailPort === 465,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    })
  : nodemailer.createTransport({
      jsonTransport: true,
    });

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const info = await transporter.sendMail({
    from: process.env['EMAIL_FROM'] ?? 'mushimiyumukizab@gmail.com',
    to,
    subject,
    html,
  });

  if (!smtpConfigured) {
    console.info('[email] jsonTransport payload:', JSON.stringify(info))
  }
}
