import nodemailer from "nodemailer";

// Credentials come from the environment only — a committed fallback password
// is a credential leak for anyone with read access to the source.
const SMTP_HOST = process.env.SMTP_HOST || "smtp.hostinger.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "465");
const SMTP_USER = process.env.SMTP_USER || "info@kassenta.com";
const SMTP_PASS = process.env.SMTP_PASS || "";
const FROM_NAME = process.env.MAIL_FROM_NAME || "Kassenta POS";
const REPLY_TO = process.env.MAIL_REPLY_TO || SMTP_USER;

if (!SMTP_PASS) {
  console.warn("[SMTP] SMTP_PASS is not set — outgoing mail is disabled.");
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // 465 = implicit TLS, 587 = STARTTLS
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false },
});

export async function sendLicenseKeyEmail(opts: {
  to: string;
  ownerName: string;
  businessName: string;
  licenseKey: string;
  planName: string;
  planType: string;
  tempPassword: string;
  expiresAt: Date;
}) {
  const { to, ownerName, businessName, licenseKey, planName, planType, tempPassword, expiresAt } = opts;
  const planLabel = planName === "advanced" ? "Smart Business Growth" : "POS Starter";
  const billingLabel = planType === "yearly" ? "Annual" : planType === "monthly" ? "Monthly" : "Trial";
  const expiryStr = expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Welcome to Kassenta</title>
</head>
<body style="margin:0;padding:0;background:#0A0E17;font-family:Inter,Arial,sans-serif;color:#e2e8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0E17;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#13172A;border-radius:20px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);max-width:600px">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1f35,#0d1120);padding:40px 40px 32px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)">
            <div style="font-size:32px;font-weight:900;background:linear-gradient(135deg,#2FD3C6,#6366F1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:-1px;margin-bottom:8px">
              Kassenta POS
            </div>
            <div style="font-size:13px;color:#64748b;letter-spacing:2px;text-transform:uppercase">Point of Sale System</div>
          </td>
        </tr>
        <!-- Confetti banner -->
        <tr>
          <td style="background:linear-gradient(135deg,#2FD3C620,#6366F110);padding:28px 40px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.05)">
            <div style="font-size:40px;margin-bottom:10px">🎉</div>
            <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#f0f4f8">You're all set, ${ownerName}!</h1>
            <p style="margin:0;font-size:15px;color:#94a3b8">Your <strong style="color:#2FD3C6">${businessName}</strong> store is ready to go live</p>
          </td>
        </tr>
        <!-- License Key Box -->
        <tr>
          <td style="padding:32px 40px">
            <div style="background:#0A0E17;border:1px solid rgba(47,211,198,0.3);border-radius:16px;padding:24px;text-align:center;margin-bottom:24px">
              <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#64748b;margin-bottom:12px">Your License Key</div>
              <div style="font-size:20px;font-weight:800;letter-spacing:3px;color:#2FD3C6;font-family:monospace;word-break:break-all">${licenseKey}</div>
              <div style="margin-top:12px;font-size:12px;color:#475569">Valid until ${expiryStr}</div>
            </div>

            <!-- Plan Info -->
            <div style="display:flex;gap:12px;margin-bottom:24px">
              <div style="flex:1;background:rgba(47,211,198,0.08);border:1px solid rgba(47,211,198,0.2);border-radius:12px;padding:16px;text-align:center">
                <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Plan</div>
                <div style="font-size:15px;font-weight:700;color:#2FD3C6">${planLabel}</div>
              </div>
              <div style="flex:1;background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;text-align:center">
                <div style="font-size:11px;color:#64748b;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px">Billing</div>
                <div style="font-size:15px;font-weight:700;color:#6366F1">${billingLabel}</div>
              </div>
            </div>

            <!-- Login Credentials -->
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;padding:20px;margin-bottom:24px">
              <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-bottom:12px;text-transform:uppercase;letter-spacing:1px">App Login Credentials</div>
              <table width="100%" cellpadding="4" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#64748b;width:100px">Email</td>
                  <td style="font-size:13px;color:#e2e8f0;font-weight:600">${to}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b">Password</td>
                  <td style="font-size:13px;color:#e2e8f0;font-weight:600;font-family:monospace">${tempPassword}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b">License Key</td>
                  <td style="font-size:13px;color:#2FD3C6;font-weight:600;font-family:monospace">${licenseKey}</td>
                </tr>
              </table>
            </div>

            <!-- Steps -->
            <div style="margin-bottom:24px">
              <div style="font-size:13px;font-weight:700;color:#94a3b8;margin-bottom:16px;text-transform:uppercase;letter-spacing:1px">Get Started in 3 Steps</div>
              <div style="display:flex;flex-direction:column;gap:10px">
                <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.02);border-radius:10px;padding:12px">
                  <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2FD3C6,#6366F1);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;text-align:center;line-height:28px">1</div>
                  <span style="font-size:14px;color:#cbd5e1">Download the <strong style="color:#f0f4f8">Kassenta POS</strong> app</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.02);border-radius:10px;padding:12px">
                  <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2FD3C6,#6366F1);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;text-align:center;line-height:28px">2</div>
                  <span style="font-size:14px;color:#cbd5e1">Enter your <strong style="color:#f0f4f8">email & password</strong> to log in</span>
                </div>
                <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.02);border-radius:10px;padding:12px">
                  <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#2FD3C6,#6366F1);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;flex-shrink:0;text-align:center;line-height:28px">3</div>
                  <span style="font-size:14px;color:#cbd5e1">Enter your <strong style="color:#2FD3C6">license key</strong> to activate your store</span>
                </div>
              </div>
            </div>

            <!-- CTA Button -->
            <div style="text-align:center">
              <a href="https://barmagly.com" style="display:inline-block;background:linear-gradient(135deg,#2FD3C6,#6366F1);color:#fff;text-decoration:none;padding:14px 40px;border-radius:999px;font-weight:700;font-size:15px;letter-spacing:0.5px">Open Kassenta POS →</a>
            </div>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.05);padding:24px 40px;text-align:center">
            <p style="margin:0 0 8px;font-size:12px;color:#475569">Questions? Contact us at <a href="mailto:info@kassenta.com" style="color:#2FD3C6;text-decoration:none">info@kassenta.com</a></p>
            <p style="margin:0;font-size:11px;color:#334155">© ${new Date().getFullYear()} Kassenta POS · All rights reserved</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${SMTP_USER}>`,
    replyTo: REPLY_TO,
    to,
    subject: `🎉 Welcome to Kassenta POS — Your License Key for ${businessName}`,
    html,
    text: `Welcome to Kassenta POS!\n\nHi ${ownerName},\n\nYour store "${businessName}" is ready.\n\nLicense Key: ${licenseKey}\nEmail: ${to}\nPassword: ${tempPassword}\nPlan: ${planLabel} (${billingLabel})\nExpires: ${expiryStr}\n\nGet the Kassenta POS app and enter your credentials to get started.\n\nQuestions? Email us at info@kassenta.com`,
  });
}

/** Website demo/contact request. Delivered to the sales inbox, reply-to the sender. */
export async function sendContactEnquiry(opts: {
  name: string;
  email: string;
  business?: string;
  phone?: string;
  industry?: string;
  message?: string;
  sourceIp?: string;
}): Promise<void> {
  if (!SMTP_PASS) throw new Error("SMTP is not configured");

  const rows: [string, string][] = [
    ["Name", opts.name],
    ["Email", opts.email],
    ["Business", opts.business || "—"],
    ["Phone", opts.phone || "—"],
    ["Industry", opts.industry || "—"],
    ["Source IP", opts.sourceIp || "—"],
  ];
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const html = `<div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0B1220">
  <h2 style="margin:0 0 14px;color:#040E32">New demo request</h2>
  <table style="border-collapse:collapse;font-size:14px">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:5px 16px 5px 0;color:#667085">${k}</td><td style="padding:5px 0"><strong>${escape(v)}</strong></td></tr>`
      )
      .join("")}
  </table>
  ${opts.message ? `<p style="margin-top:18px;padding:14px;background:#F4F6FA;border-radius:8px;white-space:pre-wrap">${escape(opts.message)}</p>` : ""}
</div>`;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${SMTP_USER}>`,
    to: SMTP_USER,
    replyTo: opts.email,
    subject: `Demo request — ${opts.business || opts.name}`,
    html,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (opts.message ? `\n\n${opts.message}` : ""),
  });
}

export async function verifySmtp(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (e) {
    console.error("[SMTP] Verification failed:", e);
    return false;
  }
}
