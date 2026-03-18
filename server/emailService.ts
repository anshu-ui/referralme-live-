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
const APP_URL = "https://referralme.in";
const SEEKER_DASHBOARD_URL = `${APP_URL}/seeker-dashboard`;
const REFERRER_DASHBOARD_URL = `${APP_URL}/referrer-dashboard`;

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
function wrapEmail({
  preheader,
  eyebrow = "ReferralMe",
  title,
  intro,
  body,
  ctaLabel = "Open ReferralMe",
  ctaHref = APP_URL,
  footerNote,
  secondaryLinkLabel = "Visit ReferralMe",
  secondaryLinkHref = APP_URL,
}: {
  preheader: string;
  eyebrow?: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
  secondaryLinkLabel?: string;
  secondaryLinkHref?: string;
}) {
  return `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${preheader}
  </div>
  <div style="margin:0;padding:24px 12px;background:#f3f6fb;font-family:Arial,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbe3f0;border-radius:20px;overflow:hidden;">
      <div style="padding:30px 32px;background:radial-gradient(circle at top right, rgba(191,219,254,0.35), transparent 28%),linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);text-align:left;">
        <img src="${LOGO_URL}" alt="ReferralMe" style="height:40px;display:block;margin-bottom:18px;" />
        <div style="font-size:12px;line-height:18px;letter-spacing:1.2px;text-transform:uppercase;color:#bfdbfe;font-weight:700;">
          ${eyebrow}
        </div>
        <h1 style="margin:8px 0 0;font-size:28px;line-height:36px;color:#ffffff;font-weight:700;">
          ${title}
        </h1>
      </div>

      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:16px;line-height:26px;color:#334155;">
          ${intro}
        </p>
        <div style="font-size:15px;line-height:25px;color:#475569;">
          ${body}
        </div>

        <div style="margin:28px 0 8px;">
          <a href="${ctaHref}" style="display:inline-block;padding:14px 22px;background:#1d4ed8;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">
            ${ctaLabel}
          </a>
        </div>
        <p style="margin:12px 0 0;font-size:13px;line-height:22px;color:#64748b;">
          Or open directly:
          <a href="${secondaryLinkHref}" style="color:#1d4ed8;text-decoration:none;font-weight:700;">
            ${secondaryLinkLabel}
          </a>
        </p>

        ${footerNote ? `<p style="margin:20px 0 0;font-size:13px;line-height:22px;color:#64748b;">${footerNote}</p>` : ""}
      </div>

      <div style="padding:20px 32px;border-top:1px solid #e2e8f0;background:#f8fafc;">
        <p style="margin:0 0 6px;font-size:12px;line-height:20px;color:#64748b;">
          You are receiving this email because you created or interacted with an account on ReferralMe.
        </p>
        <p style="margin:0;font-size:12px;line-height:20px;color:#94a3b8;">
          &copy; ${new Date().getFullYear()} ReferralMe. All rights reserved.
        </p>
      </div>
    </div>
  </div>
  `;
}

// ---------- EMAIL TEMPLATES ----------
export function generateWelcomeEmailSeeker(name: string) {
  return {
    subject: "You are in. Start getting referred with ReferralMe",
    html: wrapEmail({
      preheader: "Your seeker profile is live. Start applying with stronger ATS-backed referrals.",
      eyebrow: "Seeker Onboarding",
      title: `Welcome aboard, ${name}`,
      intro: "Your seeker profile is live and ready to start opening doors.",
      body: `
        <p style="margin:0 0 14px;">Discover verified referral opportunities, track every application in one place, and move faster than the traditional cold-apply route.</p>
        <p style="margin:0 0 14px;">To improve response rates, keep your resume updated and use ATS analysis before applying so referrers can quickly review a stronger profile.</p>
      `,
      ctaLabel: "Explore Referral Opportunities",
      ctaHref: SEEKER_DASHBOARD_URL,
      secondaryLinkLabel: "Open Seeker Dashboard",
      secondaryLinkHref: SEEKER_DASHBOARD_URL,
      footerNote: "Candidates with a complete profile and current resume usually see better engagement from referrers.",
    }),
  };
}

export function generateSignupStartedEmail(name: string) {
  return {
    subject: "Your ReferralMe account is ready. Finish setup to unlock everything",
    html: wrapEmail({
      preheader: "Your account is ready. Complete setup to unlock ATS tools, referrals, and job workflows.",
      eyebrow: "Account Created",
      title: `Welcome to ReferralMe, ${name}`,
      intro: "Your account has been created successfully. One quick setup step remains.",
      body: `
        <p style="margin:0 0 14px;">Complete role selection and profile setup to unlock ATS tools, referral workflows, job alerts, and the dashboard built for your use case.</p>
        <p style="margin:0 0 14px;">Once your setup is complete, ReferralMe will tailor the experience for either a seeker journey or a referrer workflow.</p>
      `,
      ctaLabel: "Complete My Setup",
      ctaHref: `${APP_URL}/auth`,
      secondaryLinkLabel: "Continue Account Setup",
      secondaryLinkHref: `${APP_URL}/auth`,
    }),
  };
}

export function generateWelcomeEmailReferrer(name: string) {
  return {
    subject: "Your referrer profile is live. Start posting smarter opportunities",
    html: wrapEmail({
      preheader: "Your referrer account is ready to publish opportunities and review candidates.",
      eyebrow: "Referrer Onboarding",
      title: `Welcome to the network, ${name}`,
      intro: "Your referrer profile is active and ready for high-signal hiring workflows.",
      body: `
        <p style="margin:0 0 14px;">You can now publish referral opportunities, review ATS-qualified candidates, and manage requests with far less manual effort.</p>
        <p style="margin:0 0 14px;">If you mainly work with internal openings, use quick posting and private controls to keep the workflow efficient, secure, and easy to maintain.</p>
      `,
      ctaLabel: "Open Referrer Dashboard",
      ctaHref: REFERRER_DASHBOARD_URL,
      secondaryLinkLabel: "Manage Referral Requests",
      secondaryLinkHref: REFERRER_DASHBOARD_URL,
      footerNote: "Clear ATS thresholds and concise job summaries help you review faster and attract better-fit applicants.",
    }),
  };
}

export function generateJobPostingConfirmationEmail(
  referrerName: string,
  job: any
) {
  return {
    subject: `${job.title} is now live on ReferralMe`,
    html: wrapEmail({
      preheader: `${job.title} at ${job.company} is now live on ReferralMe.`,
      eyebrow: "Posting Confirmed",
      title: "Your opportunity is live",
      intro: `Hi ${referrerName}, your opportunity has been published successfully.`,
      body: `
        <div style="padding:16px;border:1px solid #dbe3f0;border-radius:12px;background:#f8fafc;margin-bottom:16px;">
          <p style="margin:0 0 8px;"><strong>Role:</strong> ${job.title}</p>
          <p style="margin:0 0 8px;"><strong>Company:</strong> ${job.company}</p>
          <p style="margin:0;"><strong>Location:</strong> ${job.location || "Not specified"}</p>
        </div>
        <p style="margin:0 0 14px;">Candidates can now discover this role and apply through the workflow you selected.</p>
        <p style="margin:0 0 14px;">Open your dashboard to monitor incoming requests, review ATS fit, and move the strongest candidates forward quickly.</p>
      `,
      ctaLabel: "Review My Postings",
      ctaHref: REFERRER_DASHBOARD_URL,
      secondaryLinkLabel: "Open Referrer Dashboard",
      secondaryLinkHref: REFERRER_DASHBOARD_URL,
    }),
  };
}

export function generateJobAlertEmail(
  seekerName: string,
  job: any,
  referrerName: string
) {
  return {
    subject: `New opportunity: ${job.title} at ${job.company}`,
    html: wrapEmail({
      preheader: `${referrerName} posted a new opportunity that may match your profile.`,
      eyebrow: "New Opportunity",
      title: `${job.title} at ${job.company}`,
      intro: `Hi ${seekerName}, a new referral opportunity from ${referrerName} may be a strong fit for you.`,
      body: `
        <div style="padding:16px;border:1px solid #dbe3f0;border-radius:12px;background:#f8fafc;margin-bottom:16px;">
          <p style="margin:0 0 8px;"><strong>Role:</strong> ${job.title}</p>
          <p style="margin:0 0 8px;"><strong>Company:</strong> ${job.company}</p>
          <p style="margin:0;"><strong>Location:</strong> ${job.location || "Not specified"}</p>
        </div>
        <p style="margin:0 0 14px;">Review the details, strengthen your resume if needed, and apply with a profile ready for both ATS screening and referrer review.</p>
      `,
      ctaLabel: "View Opportunity",
      ctaHref: SEEKER_DASHBOARD_URL,
      secondaryLinkLabel: "Open Seeker Dashboard",
      secondaryLinkHref: SEEKER_DASHBOARD_URL,
      footerNote: "Applying with a stronger ATS score and current resume usually improves review speed.",
    }),
  };
}

export function generateApplicationReceivedEmail(
  referrerName: string,
  job: any,
  seeker: any
) {
  return {
    subject: `New candidate request for ${job.title}`,
    html: wrapEmail({
      preheader: `${seeker.name} submitted a referral request for ${job.title}.`,
      eyebrow: "New Candidate",
      title: "A new candidate is waiting for review",
      intro: `Hi ${referrerName}, ${seeker.name} just submitted a referral request.`,
      body: `
        <div style="padding:16px;border:1px solid #dbe3f0;border-radius:12px;background:#f8fafc;margin-bottom:16px;">
          <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${seeker.name}</p>
          <p style="margin:0 0 8px;"><strong>Role:</strong> ${job.title}</p>
          <p style="margin:0;"><strong>Company:</strong> ${job.company}</p>
        </div>
        <p style="margin:0 0 14px;">Open your request queue to review the candidate profile, ATS score, and resume while the application is still warm.</p>
      `,
      ctaLabel: "Review Candidate",
      ctaHref: REFERRER_DASHBOARD_URL,
      secondaryLinkLabel: "Open Request Queue",
      secondaryLinkHref: REFERRER_DASHBOARD_URL,
    }),
  };
}

export function generateApplicationStatusUpdateEmail(
  seekerName: string,
  job: any,
  status: string,
  referrerName: string
) {
  const normalizedStatus = status.replaceAll("_", " ");
  const isPositive = ["accepted", "referral_confirmed", "sent_to_hr", "interview_scheduled", "completed"].includes(status);

  return {
    subject: `${job.title}: your referral request status changed`,
    html: wrapEmail({
      preheader: `Your application status for ${job.title} is now ${normalizedStatus}.`,
      eyebrow: "Application Update",
      title: `Status changed to ${normalizedStatus}`,
      intro: `Hi ${seekerName}, there is an update on your referral request for ${job.title}.`,
      body: `
        <div style="padding:16px;border:1px solid #dbe3f0;border-radius:12px;background:#f8fafc;margin-bottom:16px;">
          <p style="margin:0 0 8px;"><strong>Role:</strong> ${job.title}</p>
          <p style="margin:0 0 8px;"><strong>Company:</strong> ${job.company}</p>
          <p style="margin:0;"><strong>Updated by:</strong> ${referrerName}</p>
        </div>
        <p style="margin:0 0 14px;">Current status: <strong>${normalizedStatus}</strong>.</p>
        <p style="margin:0 0 14px;">${isPositive ? "Keep a close eye on your dashboard for next steps and respond quickly to any follow-up requests." : "Continue exploring new opportunities and use ATS feedback to strengthen your next application."}</p>
      `,
      ctaLabel: "Open My Dashboard",
      ctaHref: SEEKER_DASHBOARD_URL,
      secondaryLinkLabel: "Track My Applications",
      secondaryLinkHref: SEEKER_DASHBOARD_URL,
    }),
  };
}

export function generateApplicationAcceptedEmail(
  seekerName: string,
  job: any,
  referrerName: string
) {
  return {
    subject: `Your request for ${job.title} just moved forward`,
    html: wrapEmail({
      preheader: `${referrerName} accepted your request for ${job.title}.`,
      eyebrow: "Accepted",
      title: "Your referral request was accepted",
      intro: `Good news, ${seekerName}. ${referrerName} moved your request forward.`,
      body: `
        <p style="margin:0 0 14px;">Your application for <strong>${job.title}</strong> at <strong>${job.company}</strong> has moved to the next step.</p>
        <p style="margin:0 0 14px;">Keep an eye on your dashboard and be ready in case the referrer or hiring team requests anything else.</p>
      `,
      ctaLabel: "Track My Application",
      ctaHref: SEEKER_DASHBOARD_URL,
      secondaryLinkLabel: "Open Seeker Dashboard",
      secondaryLinkHref: SEEKER_DASHBOARD_URL,
    }),
  };
}

export function generateApplicationDeclinedEmail(
  seekerName: string,
  job: any,
  referrerName: string
) {
  return {
    subject: `${job.title}: update on your referral request`,
    html: wrapEmail({
      preheader: `${referrerName} declined your request for ${job.title}.`,
      eyebrow: "Request Closed",
      title: "Your referral request was not selected",
      intro: `Hi ${seekerName}, ${referrerName} has closed this request.`,
      body: `
        <p style="margin:0 0 14px;">Your application for <strong>${job.title}</strong> at <strong>${job.company}</strong> was not selected for referral at this stage.</p>
        <p style="margin:0 0 14px;">Keep applying to other opportunities on ReferralMe. A stronger ATS score, tighter keyword alignment, and clearer impact statements can help improve the next application.</p>
      `,
      ctaLabel: "Browse More Opportunities",
      ctaHref: SEEKER_DASHBOARD_URL,
      secondaryLinkLabel: "Open Seeker Dashboard",
      secondaryLinkHref: SEEKER_DASHBOARD_URL,
    }),
  };
}
