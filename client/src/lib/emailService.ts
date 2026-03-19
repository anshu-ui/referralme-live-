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

export async function sendJobAlertToSeekers(job: any, referrerName: string, seekers: any[]): Promise<void> {
  if (!job || !referrerName || !Array.isArray(seekers) || seekers.length === 0) {
    return;
  }

  const results = await Promise.all(
    seekers
      .filter((seeker) => seeker?.email)
      .map((seeker) =>
        postEmailRequest({
          endpoint: "/api/email/job-alert",
          payload: {
            seekerName: seeker.displayName || seeker.firstName || seeker.email,
            seekerEmail: seeker.email,
            job,
            referrerName,
          },
        }),
      ),
  );

  const failures = results.filter((result) => !result).length;
  if (failures > 0) {
    console.error(`Failed to send ${failures} job alert email(s)`);
  }
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
