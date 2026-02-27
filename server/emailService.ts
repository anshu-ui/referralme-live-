// emailservice.ts
// Hostinger + Brevo production-safe email service

// ---------- TYPES ----------
interface EmailParams {
  to: string;
  subject: string;
  html: string;
}

// ---------- CONSTANTS ----------
const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const LOGO_URL = "https://referralme.in/logo.png";

// ---------- CORE EMAIL FUNCTION ----------
export async function sendEmail({
  to,
  subject,
  html,
}: EmailParams): Promise<boolean> {
  try {
    // 🔐 Read env vars at runtime
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    const FROM_EMAIL = process.env.EMAIL_FROM;
    const FROM_NAME = process.env.EMAIL_FROM_NAME;

    if (!BREVO_API_KEY || !FROM_EMAIL || !FROM_NAME) {
      console.error("❌ Email env vars missing", {
        BREVO_API_KEY: !!BREVO_API_KEY,
        FROM_EMAIL: !!FROM_EMAIL,
        FROM_NAME: !!FROM_NAME,
      });
      return false;
    }

    // ✅ Use native fetch (Hostinger-safe)
    const fetchFn = global.fetch;
    if (!fetchFn) {
      console.error("❌ global.fetch is not available. Node 18+ required.");
      return false;
    }

    const response = await fetchFn(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    // 🛡️ Brevo sometimes returns non-JSON
    const rawText = await response.text();
    let result: any;

    try {
      result = JSON.parse(rawText);
    } catch {
      result = rawText;
    }

    if (!response.ok) {
      console.error("❌ Brevo API Error", {
        status: response.status,
        result,
      });
      return false;
    }

    console.log("✅ Email sent:", {
      to,
      messageId: result?.messageId,
    });

    return true;
  } catch (error: any) {
    console.error("❌ Email send failed:", error?.message || error);
    return false;
  }
}

// ---------- EMAIL WRAPPER ----------
function wrapEmail(content: string) {
  return `
  <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto;
              border:1px solid #eee; padding:20px; border-radius:8px;
              background:#f9f9f9;">
    <div style="text-align:center; margin-bottom:20px;">
      <img src="${LOGO_URL}" alt="ReferralMe" style="height:50px;" />
    </div>

    <div style="font-size:16px; color:#333;">
      ${content}
    </div>

    <hr style="margin:20px 0;" />

    <div style="font-size:12px; color:#999; text-align:center;">
      &copy; ${new Date().getFullYear()} ReferralMe. All rights reserved.
    </div>
  </div>
  `;
}

// ---------- EMAIL TEMPLATES ----------
export function generateWelcomeEmailSeeker(name: string) {
  return {
    subject: "Welcome to ReferralMe 🎉",
    html: wrapEmail(`
      <h2>Hi ${name},</h2>
      <p>Your job-seeker profile is now live.</p>
      <p>Start applying with referrals and boost your chances!</p>
    `),
  };
}

export function generateWelcomeEmailReferrer(name: string) {
  return {
    subject: "Welcome to ReferralMe Referrer Community 🤝",
    html: wrapEmail(`
      <h2>Hi ${name},</h2>
      <p>You can now post referral opportunities and help others get hired.</p>
    `),
  };
}

export function generateJobPostingConfirmationEmail(
  referrerName: string,
  job: any
) {
  return {
    subject: `Job Posted Successfully – ${job.title}`,
    html: wrapEmail(`
      <p>Hi ${referrerName},</p>
      <p>Your job posting for <b>${job.company}</b> is now live.</p>
      <p><b>Role:</b> ${job.title}</p>
    `),
  };
}

export function generateJobAlertEmail(
  seekerName: string,
  job: any,
  referrerName: string
) {
  return {
    subject: `New Job Alert – ${job.title}`,
    html: wrapEmail(`
      <p>Hi ${seekerName},</p>
      <p>A new job at <b>${job.company}</b> was posted by ${referrerName}.</p>
      <p><b>Role:</b> ${job.title}</p>
    `),
  };
}

export function generateApplicationReceivedEmail(
  referrerName: string,
  job: any,
  seeker: any
) {
  return {
    subject: `New Application – ${job.title}`,
    html: wrapEmail(`
      <p>Hi ${referrerName},</p>
      <p><b>${seeker.name}</b> applied for <b>${job.title}</b>.</p>
    `),
  };
}

export function generateApplicationStatusUpdateEmail(
  seekerName: string,
  job: any,
  status: string,
  referrerName: string
) {
  return {
    subject: `Application Update – ${job.title}`,
    html: wrapEmail(`
      <p>Hi ${seekerName},</p>
      <p>Your application for <b>${job.title}</b> is now <b>${status}</b>.</p>
      <p>Updated by ${referrerName}.</p>
    `),
  };
}

export function generateApplicationAcceptedEmail(
  seekerName: string,
  job: any,
  referrerName: string
) {
  return {
    subject: "Your Referral Request Was Accepted 🎉",
    html: wrapEmail(`
      <h2>Congratulations ${seekerName}!</h2>
      <p>${referrerName} accepted your request for <b>${job.title}</b>.</p>
    `),
  };
}

export function generateApplicationDeclinedEmail(
  seekerName: string,
  job: any,
  referrerName: string
) {
  return {
    subject: "Update on Your Referral Request",
    html: wrapEmail(`
      <p>Hi ${seekerName},</p>
      <p>${referrerName} declined your request for <b>${job.title}</b>.</p>
      <p>More opportunities are waiting for you.</p>
    `),
  };
}
