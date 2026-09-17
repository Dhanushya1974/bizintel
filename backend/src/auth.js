import { randomInt } from "crypto";
import { sendMail } from "./mailer.js";

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

// In-memory OTP store, keyed by email. Fine for a single backend instance;
// codes are short-lived and re-requestable, so no persistence is needed.
const codes = new Map();

function makeCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function requestLoginCode(email) {
  const now = Date.now();
  const existing = codes.get(email);
  if (existing && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.lastSentAt)) / 1000);
    throw fail(429, `Please wait ${wait}s before requesting another code`);
  }

  const code = makeCode();
  codes.set(email, { code, expiresAt: now + CODE_TTL_MS, attempts: 0, lastSentAt: now });

  await sendMail({
    to: email,
    subject: "Your BizIntel verification code",
    text: `Your BizIntel login code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your BizIntel login code is <strong style="font-size:20px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });
}

export function verifyLoginCode(email, code) {
  const entry = codes.get(email);
  if (!entry) throw fail(400, "No code requested for this email");

  if (Date.now() > entry.expiresAt) {
    codes.delete(email);
    throw fail(400, "Code expired, please request a new one");
  }

  entry.attempts += 1;
  if (entry.attempts > MAX_ATTEMPTS) {
    codes.delete(email);
    throw fail(429, "Too many attempts, please request a new code");
  }

  if (entry.code !== code) throw fail(400, "Incorrect code");

  codes.delete(email);
}
