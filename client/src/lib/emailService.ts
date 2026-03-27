interface EmailRequestOptions {
  endpoint: string;
  payload: Record<string, unknown>;
}

async function postEmailRequest({ endpoint, payload }: EmailRequestOptions): Promise<boolean> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Email request failed for ${endpoint}:`, errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Email request error for ${endpoint}:`, error);
    return false;
  }
}

export async function sendWelcomeEmail(name: string, email: string, role: string): Promise<boolean> {
  if (!name || !email || !role) {
    console.error("Missing required fields for welcome email", { name, email, role });
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/welcome",
    payload: { name, email, role },
  });
}

export async function sendSignupStartedEmail(name: string, email: string): Promise<boolean> {
  if (!name || !email) {
    console.error("Missing required fields for signup email", { name, email });
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/signup-started",
    payload: { name, email },
  });
}

export async function sendJobPostingConfirmation(
  referrerName: string,
  referrerEmail: string,
  job: any,
): Promise<boolean> {
  if (!referrerName || !referrerEmail || !job) {
    console.error("Missing required fields for job posting confirmation", {
      referrerName,
      referrerEmail,
      hasJob: !!job,
    });
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/job-posted",
    payload: { referrerName, referrerEmail, job },
  });
}

export async function sendApplicationReceivedNotification(
  referrerName: string,
  referrerEmail: string,
  job: any,
  seeker: any,
): Promise<boolean> {
  if (!referrerName || !referrerEmail || !job || !seeker) {
    console.error("Missing required fields for application notification", {
      referrerName,
      referrerEmail,
      hasJob: !!job,
      hasSeeker: !!seeker,
    });
    return false;
  }

  const seekerName =
    seeker.name ||
    [seeker.firstName, seeker.lastName].filter(Boolean).join(" ").trim() ||
    seeker.email;

  return postEmailRequest({
    endpoint: "/api/email/application-received",
    payload: {
      referrerName,
      referrerEmail,
      job,
      seeker: {
        ...seeker,
        name: seekerName,
      },
    },
  });
}

export async function sendApplicationStatusUpdate(
  seekerName: string,
  seekerEmail: string,
  job: any,
  status: string,
  referrerName: string,
): Promise<boolean> {
  if (!seekerName || !seekerEmail || !job || !status || !referrerName) {
    console.error("Missing required fields for application status update", {
      seekerName,
      seekerEmail,
      hasJob: !!job,
      status,
      referrerName,
    });
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/status-update",
    payload: {
      seekerName,
      seekerEmail,
      job,
      status,
      referrerName,
    },
  });
}

export async function sendAdminBroadcastEmail(payload: {
  recipients: Array<{ email: string; name?: string }>;
  subject: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaHref?: string;
}): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    const response = await fetch("/api/admin/broadcast-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Admin broadcast email failed:", errorText);
      return { success: false, sent: 0, failed: payload.recipients.length };
    }

    return response.json();
  } catch (error) {
    console.error("Admin broadcast email error:", error);
    return { success: false, sent: 0, failed: payload.recipients.length };
  }
}

export async function sendCampusAmbassadorStatusEmail(payload: {
  name: string;
  email: string;
  status: "shortlisted" | "accepted";
  dashboardUrl?: string;
}): Promise<boolean> {
  if (!payload.name || !payload.email || !payload.status) {
    console.error("Missing required fields for campus ambassador status email", payload);
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/campus-ambassador-status",
    payload,
  });
}

export async function sendCampusApplicationReceivedEmail(payload: {
  name: string;
  email: string;
}): Promise<boolean> {
  if (!payload.name || !payload.email) {
    console.error("Missing required fields for campus application received email", payload);
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/campus-application-received",
    payload,
  });
}

export async function sendCampusProofReviewedEmail(payload: {
  name: string;
  email: string;
  taskTitle: string;
  status: "approved" | "rejected";
  pointsAwarded: number;
  reviewNote?: string;
  dashboardUrl?: string;
}): Promise<boolean> {
  if (!payload.name || !payload.email || !payload.taskTitle || !payload.status) {
    console.error("Missing required fields for campus proof reviewed email", payload);
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/campus-proof-reviewed",
    payload,
  });
}

export async function sendCampusRewardUnlockedEmail(payload: {
  name: string;
  email: string;
  rewardTitle: string;
  rewardDescription?: string;
  currentPoints: number;
  dashboardUrl?: string;
}): Promise<boolean> {
  if (!payload.name || !payload.email || !payload.rewardTitle) {
    console.error("Missing required fields for campus reward unlocked email", payload);
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/campus-reward-unlocked",
    payload,
  });
}

export async function sendCampusWeeklyDigestEmail(payload: {
  recipients: Array<{ name: string; email: string; currentPoints: number }>;
  activeTasks: Array<{ title: string; points: number; dueDate?: string }>;
  activeAnnouncements: Array<{ title: string; message: string }>;
  dashboardUrl?: string;
}): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    const response = await fetch("/api/email/campus-weekly-digest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Campus weekly digest failed:", errorText);
      return { success: false, sent: 0, failed: payload.recipients.length };
    }

    return response.json();
  } catch (error) {
    console.error("Campus weekly digest error:", error);
    return { success: false, sent: 0, failed: payload.recipients.length };
  }
}

export async function sendJobAlertToSeekers(payload: {
  seekerName: string;
  seekerEmail: string;
  job: unknown;
  referrerName: string;
}): Promise<boolean> {
  if (!payload.seekerName || !payload.seekerEmail || !payload.job || !payload.referrerName) {
    console.error("Missing required fields for job alert email", payload);
    return false;
  }

  return postEmailRequest({
    endpoint: "/api/email/job-alert",
    payload,
  });
}
