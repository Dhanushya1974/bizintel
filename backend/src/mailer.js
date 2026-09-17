import nodemailer from "nodemailer";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : null;

/** Sends an email, or logs it to the console when SMTP isn't configured
 *  (so login codes still work during local dev without real credentials). */
export async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    console.log(`[mailer] SMTP not configured — simulating email to ${to}\n  subject: ${subject}\n  ${text}`);
    return { simulated: true };
  }
  return transporter.sendMail({ from: SMTP_FROM, to, subject, text, html });
}
