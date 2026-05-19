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
const CAMPUS_DASHBOARD_URL = `${APP_URL}/campus-ambassador/dashboard`;
const MENTORSHIP_SEEKER_URL = `${APP_URL}/seeker-dashboard`;
const MENTORSHIP_MENTOR_URL = `${APP_URL}/referrer-dashboard`;

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

export function generateCampusAmbassadorShortlistedEmail(name: string) {
  return {
    subject: "You made the shortlist for ReferralMe Campus Ambassador",
    html: wrapEmail({
      preheader: "You’re shortlisted. The next step is almost here.",
      eyebrow: "Campus Ambassador",
      title: `You’re shortlisted, ${name}`,
      intro: "Your application stood out, and you’ve made it to the shortlist for the ReferralMe Campus Ambassador program.",
      body: `
        <p style="margin:0 0 14px;">This means your profile, campus fit, and energy look strong from our side.</p>
        <p style="margin:0 0 14px;">Hold tight while we complete the next review step. If you’re selected, you’ll get direct access to the ambassador dashboard and the first program updates there.</p>
        <p style="margin:0;">Big win already. You’re officially in the strong-consideration zone.</p>
      `,
      ctaLabel: "View Program Page",
      ctaHref: `${APP_URL}/campus-ambassador`,
      secondaryLinkLabel: "Open Campus Ambassador Page",
      secondaryLinkHref: `${APP_URL}/campus-ambassador`,
      footerNote: "No extra action is needed right now. We’ll email you again if you’re moved to the accepted stage.",
    }),
  };
}

export function generateCampusAmbassadorAcceptedEmail(name: string, dashboardUrl = CAMPUS_DASHBOARD_URL) {
  return {
    subject: "You’re in. Welcome to ReferralMe Campus Ambassador",
    html: wrapEmail({
      preheader: "You’re accepted. Sign in with the same email to open your campus dashboard.",
      eyebrow: "Campus Ambassador",
      title: `Welcome to the squad, ${name}`,
      intro: "You’ve been accepted into the ReferralMe Campus Ambassador program.",
      body: `
        <p style="margin:0 0 14px;">Your dashboard access is now unlocked.</p>
        <p style="margin:0 0 14px;">To open it, click the button below and sign in with the <strong>same Google email</strong> you used in your application.</p>
        <p style="margin:0;">That’s your access key. No password setup, no extra friction.</p>
      `,
      ctaLabel: "Sign In to Ambassador Dashboard",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "Sign In to Campus Dashboard",
      secondaryLinkHref: dashboardUrl,
      footerNote: "If you sign in with a different email, dashboard access will not open.",
    }),
  };
}

export function generateCampusAmbassadorApplicationReceivedEmail(name: string) {
  return {
    subject: "Application received. You’re on our campus radar now",
    html: wrapEmail({
      preheader: "Your ReferralMe Campus Ambassador application has been received and is now under review.",
      eyebrow: "Campus Ambassador Application",
      title: `Application received, ${name}`,
      intro: "Your ReferralMe Campus Ambassador application is now in review.",
      body: `
        <p style="margin:0 0 14px;">We’ve saved your submission and the campus team can now review your college fit, campus reach, and program readiness.</p>
        <div style="padding:16px;border:1px solid #dbe3f0;border-radius:14px;background:#f8fbff;margin:0 0 16px;">
          <p style="margin:0 0 8px;"><strong>What happens next</strong></p>
          <p style="margin:0 0 8px;">1. We review your application details and campus context.</p>
          <p style="margin:0 0 8px;">2. Shortlisted applicants hear from us first.</p>
          <p style="margin:0;">3. Accepted ambassadors get dashboard access and weekly missions.</p>
        </div>
        <p style="margin:0 0 14px;">You do not need to submit the form again. If we move your profile forward, we’ll email you with the next step directly.</p>
      `,
      ctaLabel: "View Campus Program",
      ctaHref: `${APP_URL}/campus-ambassador`,
      secondaryLinkLabel: "Open Campus Ambassador Page",
      secondaryLinkHref: `${APP_URL}/campus-ambassador`,
      footerNote: "Use the same email address for any future campus sign-in. That keeps your application and dashboard access aligned.",
    }),
  };
}

export function generateCampusProofReviewedEmail({
  name,
  taskTitle,
  status,
  pointsAwarded,
  reviewNote,
  dashboardUrl = CAMPUS_DASHBOARD_URL,
}: {
  name: string;
  taskTitle: string;
  status: "approved" | "rejected";
  pointsAwarded: number;
  reviewNote?: string;
  dashboardUrl?: string;
}) {
  const approved = status === "approved";

  return {
    subject: approved
      ? `Approved: ${taskTitle} is now counted`
      : `Update needed: ${taskTitle} needs a revision`,
    html: wrapEmail({
      preheader: approved
        ? `Your proof for ${taskTitle} has been approved.`
        : `Your proof for ${taskTitle} was reviewed and needs an update.`,
      eyebrow: approved ? "Proof Approved" : "Proof Needs Update",
      title: approved ? `Nice work, ${name}` : `Update needed, ${name}`,
      intro: approved
        ? "Your latest campus proof has been reviewed and approved."
        : "Your latest campus proof has been reviewed, but it is not approved yet.",
      body: `
        <div style="padding:16px;border:1px solid #dbe3f0;border-radius:14px;background:#f8fbff;margin:0 0 16px;">
          <p style="margin:0 0 8px;"><strong>Task</strong>: ${taskTitle}</p>
          <p style="margin:0 0 8px;"><strong>Status</strong>: ${approved ? "Approved" : "Needs revision"}</p>
          <p style="margin:0;"><strong>${approved ? "Points awarded" : "Points impacted"}</strong>: ${approved ? `${pointsAwarded} pts` : "0 pts"}</p>
        </div>
        ${
          reviewNote
            ? `<div style="padding:16px;border:1px solid #e2e8f0;border-radius:14px;background:#ffffff;margin:0 0 16px;">
                <p style="margin:0 0 8px;"><strong>Reviewer note</strong></p>
                <p style="margin:0;">${reviewNote}</p>
              </div>`
            : ""
        }
        <p style="margin:0 0 14px;">${
          approved
            ? "Your leaderboard progress and reward journey will update with this approval."
            : "Open your dashboard, review the note, and submit a stronger version if the task is still active."
        }</p>
      `,
      ctaLabel: approved ? "View My Dashboard" : "Fix And Resubmit",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "Open Ambassador Dashboard",
      secondaryLinkHref: dashboardUrl,
      footerNote: approved
        ? "Consistent approved submissions are the fastest way to climb the leaderboard."
        : "Clear proof, direct links, and concise summaries usually speed up approval.",
    }),
  };
}

export function generateCampusRewardUnlockedEmail({
  name,
  rewardTitle,
  rewardDescription,
  currentPoints,
  dashboardUrl = CAMPUS_DASHBOARD_URL,
}: {
  name: string;
  rewardTitle: string;
  rewardDescription?: string;
  currentPoints: number;
  dashboardUrl?: string;
}) {
  return {
    subject: `Reward unlocked: ${rewardTitle}`,
    html: wrapEmail({
      preheader: `You just unlocked ${rewardTitle} in the ReferralMe Campus Ambassador program.`,
      eyebrow: "Reward Unlocked",
      title: `You unlocked ${rewardTitle}`,
      intro: `Strong work, ${name}. Your recent momentum just unlocked a new reward tier.`,
      body: `
        <div style="padding:16px;border:1px solid #dbe3f0;border-radius:14px;background:#f8fbff;margin:0 0 16px;">
          <p style="margin:0 0 8px;"><strong>Unlocked reward</strong>: ${rewardTitle}</p>
          <p style="margin:0 0 8px;"><strong>Current points</strong>: ${currentPoints} pts</p>
          <p style="margin:0;"><strong>Program status</strong>: Active and progressing</p>
        </div>
        ${rewardDescription ? `<p style="margin:0 0 14px;">${rewardDescription}</p>` : ""}
        <p style="margin:0 0 14px;">Open your dashboard to view the unlocked reward preview and keep moving toward the next milestone.</p>
      `,
      ctaLabel: "Open Reward Ladder",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "View Campus Dashboard",
      secondaryLinkHref: dashboardUrl,
      footerNote: "Visible consistency compounds fast in this program. Keep stacking approved wins.",
    }),
  };
}

export function generateCampusWeeklyDigestEmail({
  name,
  currentPoints,
  activeTasks,
  activeAnnouncements,
  dashboardUrl = CAMPUS_DASHBOARD_URL,
}: {
  name: string;
  currentPoints: number;
  activeTasks: Array<{ title: string; points: number; dueDate?: string }>;
  activeAnnouncements: Array<{ title: string; message: string }>;
  dashboardUrl?: string;
}) {
  const taskMarkup = activeTasks.length
    ? activeTasks
        .slice(0, 4)
        .map(
          (task) => `
            <div style="padding:14px 16px;border:1px solid #dbe3f0;border-radius:14px;background:#ffffff;margin:0 0 12px;">
              <p style="margin:0 0 6px;font-weight:700;color:#0f172a;">${task.title}</p>
              <p style="margin:0 0 4px;color:#475569;">${task.points} pts${task.dueDate ? ` • Due ${task.dueDate}` : ""}</p>
            </div>
          `,
        )
        .join("")
    : `<p style="margin:0 0 14px;">No live missions right now. Keep an eye on the dashboard for the next push.</p>`;

  const announcementMarkup = activeAnnouncements.length
    ? activeAnnouncements
        .slice(0, 2)
        .map(
          (item) => `
            <div style="padding:14px 16px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;margin:0 0 12px;">
              <p style="margin:0 0 6px;font-weight:700;color:#0f172a;">${item.title}</p>
              <p style="margin:0;color:#475569;">${item.message}</p>
            </div>
          `,
        )
        .join("")
    : `<p style="margin:0 0 14px;">No new admin notices this week.</p>`;

  return {
    subject: "Your weekly ReferralMe campus mission digest",
    html: wrapEmail({
      preheader: "This week’s live campus missions, updates, and your current progress.",
      eyebrow: "Weekly Mission Digest",
      title: `Your weekly campus brief, ${name}`,
      intro: "Here is the clean weekly snapshot of what is live, what matters, and where your momentum stands.",
      body: `
        <div style="padding:16px;border:1px solid #dbe3f0;border-radius:14px;background:#eff6ff;margin:0 0 18px;">
          <p style="margin:0 0 8px;"><strong>Current points</strong>: ${currentPoints} pts</p>
          <p style="margin:0;"><strong>Live missions</strong>: ${activeTasks.length}</p>
        </div>
        <p style="margin:0 0 10px;font-weight:700;color:#0f172a;">Live missions</p>
        ${taskMarkup}
        <p style="margin:16px 0 10px;font-weight:700;color:#0f172a;">Admin updates</p>
        ${announcementMarkup}
        <p style="margin:8px 0 14px;">Open your dashboard to submit proof, track reviews, and move closer to the next reward tier.</p>
      `,
      ctaLabel: "Open My Campus Dashboard",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "View Ambassador Dashboard",
      secondaryLinkHref: dashboardUrl,
      footerNote: "The ambassadors who stay active weekly usually climb faster than the ambassadors who batch everything late.",
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

export function generatePlatformAnnouncementEmail(
  recipientName: string,
  title: string,
  message: string,
  ctaLabel?: string,
  ctaHref?: string,
) {
  return {
    subject: title,
    html: wrapEmail({
      preheader: title,
      eyebrow: "Platform Update",
      title,
      intro: `Hi ${recipientName || "there"}, there is a new update from ReferralMe.`,
      body: `
        <p style="margin:0 0 14px;">${message.replace(/\n/g, "<br />")}</p>
        <p style="margin:0 0 14px;">Open ReferralMe to review the latest update, take action, or continue where you left off.</p>
      `,
      ctaLabel: ctaLabel || "Open ReferralMe",
      ctaHref: ctaHref || APP_URL,
      secondaryLinkLabel: "Visit ReferralMe",
      secondaryLinkHref: ctaHref || APP_URL,
      footerNote: "This update was sent from the ReferralMe admin console.",
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

// ========================================
// Mentorship Emails
// ========================================

export function generateMentorshipPaymentReceivedEmail(args: {
  menteeName: string;
  mentorName: string;
  title: string;
  scheduledAtLabel: string;
  priceInr: number;
  dashboardUrl?: string;
}) {
  const dashboardUrl = args.dashboardUrl || MENTORSHIP_SEEKER_URL;
  return {
    subject: `Mentorship booked: ${args.title}`,
    html: wrapEmail({
      preheader: `Payment received. Your session with ${args.mentorName} is booked.`,
      eyebrow: "Mentorship",
      title: "Your mentorship session is booked",
      intro: `Hi ${args.menteeName}, your payment is confirmed and the session request is now sent to ${args.mentorName}.`,
      body: `
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 16px;background:#ffffff;">
          <p style="margin:0 0 6px;"><strong>Session:</strong> ${args.title}</p>
          <p style="margin:0 0 6px;"><strong>Mentor:</strong> ${args.mentorName}</p>
          <p style="margin:0 0 6px;"><strong>Scheduled:</strong> ${args.scheduledAtLabel}</p>
          <p style="margin:0;"><strong>Amount paid:</strong> ₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(args.priceInr || 0))}</p>
        </div>
        <p style="margin:0 0 14px;">Next step: the mentor will confirm the session and share the meeting link in your dashboard.</p>
      `,
      ctaLabel: "Open My Mentorship",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "Open Seeker Dashboard",
      secondaryLinkHref: MENTORSHIP_SEEKER_URL,
    }),
  };
}

export function generateMentorshipNewRequestEmail(args: {
  mentorName: string;
  mentorEmail: string;
  menteeName: string;
  title: string;
  scheduledAtLabel: string;
  durationMinutes: number;
  priceInr: number;
  mentorDashboardUrl?: string;
}) {
  const dashboardUrl = args.mentorDashboardUrl || MENTORSHIP_MENTOR_URL;
  return {
    subject: `New mentorship request: ${args.title}`,
    html: wrapEmail({
      preheader: `New session request from ${args.menteeName}.`,
      eyebrow: "Mentorship",
      title: "You have a new mentorship request",
      intro: `Hi ${args.mentorName}, ${args.menteeName} booked a session with you.`,
      body: `
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 16px;background:#ffffff;">
          <p style="margin:0 0 6px;"><strong>Session:</strong> ${args.title}</p>
          <p style="margin:0 0 6px;"><strong>Mentee:</strong> ${args.menteeName}</p>
          <p style="margin:0 0 6px;"><strong>Scheduled:</strong> ${args.scheduledAtLabel}</p>
          <p style="margin:0 0 6px;"><strong>Duration:</strong> ${args.durationMinutes} min</p>
          <p style="margin:0;"><strong>Price:</strong> ₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(args.priceInr || 0))}</p>
        </div>
        <p style="margin:0 0 14px;">Please confirm the request by adding a Google Meet / Zoom link in your mentor dashboard.</p>
      `,
      ctaLabel: "Open Mentor Dashboard",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "Open ReferralMe",
      secondaryLinkHref: APP_URL,
    }),
  };
}

export function generateMentorshipConfirmedEmail(args: {
  menteeName: string;
  mentorName: string;
  title: string;
  scheduledAtLabel: string;
  meetingUrl: string;
  dashboardUrl?: string;
}) {
  const dashboardUrl = args.dashboardUrl || MENTORSHIP_SEEKER_URL;
  return {
    subject: `Session confirmed: ${args.title}`,
    html: wrapEmail({
      preheader: `Meeting link added by ${args.mentorName}.`,
      eyebrow: "Mentorship",
      title: "Your mentorship session is confirmed",
      intro: `Hi ${args.menteeName}, ${args.mentorName} confirmed your session and added the meeting link.`,
      body: `
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 16px;background:#ffffff;">
          <p style="margin:0 0 6px;"><strong>Session:</strong> ${args.title}</p>
          <p style="margin:0 0 6px;"><strong>Scheduled:</strong> ${args.scheduledAtLabel}</p>
          <p style="margin:0 0 6px;"><strong>Mentor:</strong> ${args.mentorName}</p>
          <p style="margin:0;"><strong>Meeting link:</strong> <a href="${args.meetingUrl}" style="color:#2563eb;text-decoration:underline;">Join session</a></p>
        </div>
        <p style="margin:0 0 14px;">Tip: join 2 minutes early and keep your resume + JD ready.</p>
      `,
      ctaLabel: "Open Mentorship",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "Join Meeting",
      secondaryLinkHref: args.meetingUrl,
    }),
  };
}

export function generateMentorshipCompletedEmail(args: {
  menteeName: string;
  mentorName: string;
  title: string;
  dashboardUrl?: string;
}) {
  const dashboardUrl = args.dashboardUrl || MENTORSHIP_SEEKER_URL;
  return {
    subject: `Session completed: ${args.title}`,
    html: wrapEmail({
      preheader: `Your session with ${args.mentorName} is marked completed.`,
      eyebrow: "Mentorship",
      title: "Mentorship session completed",
      intro: `Hi ${args.menteeName}, your session with ${args.mentorName} is marked completed.`,
      body: `
        <p style="margin:0 0 14px;">Please rate the session in your dashboard. Ratings help us highlight top mentors and keep quality high.</p>
      `,
      ctaLabel: "Rate This Session",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "Open Dashboard",
      secondaryLinkHref: dashboardUrl,
    }),
  };
}

export function generateMentorshipRatingReceivedEmail(args: {
  mentorName: string;
  title: string;
  rating: number;
  mentorDashboardUrl?: string;
}) {
  const dashboardUrl = args.mentorDashboardUrl || MENTORSHIP_MENTOR_URL;
  return {
    subject: `New rating received: ${args.rating}/5`,
    html: wrapEmail({
      preheader: `You received a new rating for ${args.title}.`,
      eyebrow: "Mentorship",
      title: "You received a new rating",
      intro: `Hi ${args.mentorName}, thanks for supporting the ReferralMe community.`,
      body: `
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 16px;background:#ffffff;">
          <p style="margin:0 0 6px;"><strong>Session:</strong> ${args.title}</p>
          <p style="margin:0;"><strong>Rating:</strong> ${args.rating}/5</p>
        </div>
        <p style="margin:0 0 14px;">Higher ratings help you appear in the Top Mentors section on our site.</p>
      `,
      ctaLabel: "Open Mentor Dashboard",
      ctaHref: dashboardUrl,
      secondaryLinkLabel: "Open ReferralMe",
      secondaryLinkHref: APP_URL,
    }),
  };
}

export function generateMentorshipAdminEventEmail(args: {
  event: "booked" | "confirmed" | "completed" | "rated";
  mentorName: string;
  mentorEmail?: string;
  menteeName: string;
  menteeEmail?: string;
  title: string;
  scheduledAtLabel?: string;
  priceInr?: number;
  rating?: number;
  sessionId?: string;
}) {
  const label =
    args.event === "booked"
      ? "Booking paid"
      : args.event === "confirmed"
        ? "Meeting link added"
        : args.event === "completed"
          ? "Session completed"
          : "Rating received";

  const lines = [
    args.sessionId ? `<p style="margin:0 0 6px;"><strong>Session ID:</strong> ${args.sessionId}</p>` : "",
    `<p style="margin:0 0 6px;"><strong>Title:</strong> ${args.title}</p>`,
    `<p style="margin:0 0 6px;"><strong>Mentor:</strong> ${args.mentorName}${args.mentorEmail ? ` (${args.mentorEmail})` : ""}</p>`,
    `<p style="margin:0 0 6px;"><strong>Mentee:</strong> ${args.menteeName}${args.menteeEmail ? ` (${args.menteeEmail})` : ""}</p>`,
    args.scheduledAtLabel ? `<p style="margin:0 0 6px;"><strong>Scheduled:</strong> ${args.scheduledAtLabel}</p>` : "",
    typeof args.priceInr === "number"
      ? `<p style="margin:0 0 6px;"><strong>Amount:</strong> ₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(args.priceInr || 0))}</p>`
      : "",
    typeof args.rating === "number" ? `<p style="margin:0;"><strong>Rating:</strong> ${args.rating}/5</p>` : "",
  ].filter(Boolean);

  return {
    subject: `Mentorship admin: ${label}`,
    html: wrapEmail({
      preheader: `Mentorship update: ${label}.`,
      eyebrow: "Admin",
      title: `Mentorship update: ${label}`,
      intro: "A mentorship event just occurred on ReferralMe.",
      body: `
        <div style="border:1px solid #e2e8f0;border-radius:14px;padding:14px;margin:0 0 16px;background:#ffffff;">
          ${lines.join("")}
        </div>
      `,
      ctaLabel: "Open Admin Dashboard",
      ctaHref: `${APP_URL}/admin-dashboard`,
      secondaryLinkLabel: "Open ReferralMe",
      secondaryLinkHref: APP_URL,
    }),
  };
}
