type Intake = {
  targetRole?: string;
  dreamCompanies?: string;
  experience?: string;
  location?: string;
  currentStatus?: string;
  biggestBlocker?: string;
  resumeText?: string;
};

function norm(v?: string) {
  return String(v || "").trim();
}

function guessTrack(roleRaw: string) {
  const role = roleRaw.toLowerCase();
  if (/(front|react|ui|web|next|javascript|typescript)/.test(role)) return "frontend";
  if (/(back|api|node|java|spring|golang|python|django|rails)/.test(role)) return "backend";
  if (/(data|analyst|analytics|ml|ai|scientist|sql)/.test(role)) return "data";
  if (/(product|pm|apm)/.test(role)) return "product";
  if (/(design|ux|ui\/ux)/.test(role)) return "design";
  return "general";
}

function limitedText(v: string, max = 900) {
  const s = norm(v);
  return s.length > max ? s.slice(0, max) + "..." : s;
}

export function generateLitePlan(input: Intake) {
  const targetRole = norm(input.targetRole) || "your target role";
  const dream = norm(input.dreamCompanies);
  const exp = norm(input.experience);
  const loc = norm(input.location);
  const status = norm(input.currentStatus);
  const blocker = norm(input.biggestBlocker);
  const track = guessTrack(targetRole);

  const resumeSignal = norm(input.resumeText);
  const resumeNote = resumeSignal
    ? "Resume text provided (good)."
    : "Resume text not provided (plan will be more general).";

  const roleTasks: Record<string, string[]> = {
    frontend: [
      "Build 1 portfolio project with auth + database + deployment (Vercel/Netlify).",
      "Master JS/TS fundamentals + React patterns (state, effects, forms).",
      "Practice frontend interviews: JS/React + basic DSA (arrays/strings).",
    ],
    backend: [
      "Build 1 API project (CRUD) with auth + DB + deployment (Render/Fly).",
      "Refresh core CS: networking basics, DB indexing, caching basics.",
      "Practice backend interviews: DSA + system design lite (REST, DB schema).",
    ],
    data: [
      "Create 2 case studies (SQL + dashboard + business insights).",
      "Revise SQL + basic stats, and practice 20 SQL interview questions.",
      "Build a portfolio repo: notebooks + clean README + results.",
    ],
    product: [
      "Write 2 product teardown docs and 1 PRD for a feature.",
      "Practice product sense + execution questions daily.",
      "Prepare metrics + tradeoffs stories using STAR format.",
    ],
    design: [
      "Improve 1 portfolio case study (problem, process, outcome, metrics).",
      "Practice UX interview questions and critique daily (30 mins).",
      "Refine UI craft: typography, spacing, components, constraints.",
    ],
    general: [
      "Pick 1 strong project aligned with your role and ship it publicly.",
      "Improve resume clarity + impact and tailor it for the target role.",
      "Practice interview basics daily (1 hour).",
    ],
  };

  const week: Array<{ day: string; tasks: string[] }> = [
    {
      day: "Day 1 (Setup + targeting)",
      tasks: [
        `Finalize target: ${targetRole}${dream ? ` (targets: ${dream})` : ""}.`,
        "Create a tracking sheet: applications, referrals, responses, interviews.",
        "Collect 20 target job descriptions and note repeated keywords.",
      ],
    },
    {
      day: "Day 2 (Resume + ATS basics)",
      tasks: [
        "Rewrite top section: 2-line headline + 3 bullets (impact + stack + domain).",
        "Add quantified outcomes to 3 bullets (numbers, %).",
        "Tailor resume once for your target role using job keywords (no stuffing).",
      ],
    },
    {
      day: "Day 3 (Portfolio / proof of work)",
      tasks: [
        roleTasks[track][0],
        "Update LinkedIn headline + About (clear role + proof + keywords).",
        "Create 1 featured post: project/case study + what you learned.",
      ],
    },
    {
      day: "Day 4 (Interview prep sprint)",
      tasks: [
        roleTasks[track][1],
        "Do 2 mock questions (record yourself, write improved answers).",
        "Prepare 6 STAR stories: conflict, ownership, failure, leadership, learning, impact.",
      ],
    },
    {
      day: "Day 5 (Referral outreach, ethical + high-signal)",
      tasks: [
        "Build a list of 30 people: alumni, seniors, same college/company, mutuals.",
        "Send 10 high-quality messages (template below).",
        "Follow up: reply with resume + 2 bullets of fit + specific job link.",
      ],
    },
    {
      day: "Day 6 (Apply smart, not spam)",
      tasks: [
        "Apply to 8 roles max, but tailor each application (headline + keywords).",
        "For each role: send 1 referral request to a relevant person with job link.",
        "Track outcomes and improve your message based on response rate.",
      ],
    },
    {
      day: "Day 7 (Review + iterate)",
      tasks: [
        "Review: responses, interviews, weak points, what to fix next week.",
        "Upgrade 1 resume section and 1 portfolio artifact.",
        "Plan next 7 days based on what actually moved the needle.",
      ],
    },
  ];

  const outreachTemplate = [
    "Hi {Name}, I’m {YourName}. I’m targeting {Role}.",
    "Would you be open to referring me for this role? {JobLink}",
    "Quick fit:",
    "• {Bullet 1: impact + stack}",
    "• {Bullet 2: impact + stack}",
    "Resume: {Link}",
    "Thanks!",
  ].join("\n");

  const bulletLines = (lines: string[]) => lines.map((l) => `• ${l}`);

  const outputLines: string[] = [];
  outputLines.push("GOAL");
  outputLines.push(
    ...bulletLines([
      `Target role: ${targetRole}`,
      `Targets: ${dream || "(not specified)"}`,
      `Experience: ${exp || "(not specified)"}`,
      `Location: ${loc || "(not specified)"}`,
    ]),
  );
  outputLines.push("");

  outputLines.push("CURRENT SNAPSHOT");
  outputLines.push(status ? limitedText(status, 900) : "(not provided)");
  if (blocker) outputLines.push(`Biggest blocker: ${limitedText(blocker, 240)}`);
  outputLines.push(resumeNote, "");

  outputLines.push("7-DAY PLAN");
  for (const d of week) {
    outputLines.push(d.day.toUpperCase());
    outputLines.push(...bulletLines(d.tasks));
    outputLines.push("");
  }

  outputLines.push("RESUME / ATS FIXES (TOP 8)");
  outputLines.push(
    ...bulletLines([
      "Ensure each role has 3–5 bullets with impact and tools (not responsibilities).",
      "Add numbers: users, latency, revenue, cost saved, time saved.",
      "Add a Skills section with keywords from your target roles.",
      "Keep resume 1 page (0–3 YoE) / 2 pages (3+ YoE) and readable.",
      "Replace vague claims (hardworking) with proof and outcomes.",
      "Put your best project first; include links.",
      "Make titles consistent: Company, Role, Dates, Location.",
      "Tailor the top third of the resume per role type.",
    ]),
  );
  outputLines.push("");

  outputLines.push("REFERRAL OUTREACH PLAN");
  outputLines.push(
    ...bulletLines([
      "Start warm: alumni, seniors, mutual connections, college communities.",
      "Ask for one role at a time with a job link and two fit bullets.",
      "Follow up once after 48 hours (short and polite).",
    ]),
  );
  outputLines.push("", "OUTREACH TEMPLATE", outreachTemplate, "");

  outputLines.push("INTERVIEW PREP PLAN");
  outputLines.push(
    ...bulletLines([
      `Focus area: ${track} fundamentals plus role-specific questions.`,
      "Do 1 mock per day (record yourself).",
      "Maintain a mistakes doc and revise weekly.",
    ]),
  );
  outputLines.push("");

  outputLines.push("CHECKPOINTS");
  outputLines.push(
    ...bulletLines([
      "Response rate (replies / messages sent)",
      "Interview rate (interviews / applications)",
      "Top 5 weak topics and improvement week over week",
    ]),
  );
  outputLines.push("", "If you want human help, book a mentor session in the Mentorship tab.");

  return outputLines.join("\n");
}

export function generateLiteChat(args: {
  intake?: Intake;
  lastUserMessage?: string;
}) {
  const intake = args.intake || {};
  const msg = norm(args.lastUserMessage);
  const targetRole = norm(intake.targetRole) || "your target role";
  const track = guessTrack(targetRole);

  const intent = (() => {
    const m = msg.toLowerCase();
    if (/(resume|cv|ats|keyword)/.test(m)) return "resume";
    if (/(referral|refer|dm|linkedin|message)/.test(m)) return "referral";
    if (/(interview|mock|hr|round|dsa|system design)/.test(m)) return "interview";
    if (/(job|apply|application|shortlist)/.test(m)) return "jobs";
    if (/(roadmap|learn|course|skill|project)/.test(m)) return "learning";
    return "general";
  })();

  const base = [
    "AI is rate-limited right now, but I can still help in offline mode.",
    `Target: ${targetRole} • Track: ${track}`,
    "",
  ];

  const bullets = (items: string[]) => items.map((i) => `• ${i}`);

  const blocks: Record<string, string[]> = {
    resume: [
      "RESUME QUICK FIXES (HIGH IMPACT)",
      ...bullets([
        "Write a 2-line headline and 3 impact bullets at the top (role, stack, outcomes).",
        "Convert responsibilities into outcomes with numbers (did X resulting in Y).",
        "Add a Skills section with keywords from 10 target job descriptions (no stuffing).",
        "Put your best project first with link and 2 bullets (problem, solution, result).",
      ]),
      "",
      "Reply with: your role, 1 project link, and 1 experience bullet. I’ll rewrite it.",
    ],
    referral: [
      "REFERRAL STRATEGY (ETHICAL + WORKS)",
      ...bullets([
        "Start warm: alumni, seniors, mutual connections, same college/company.",
        "Ask for one role at a time and include the job link.",
        "Send two fit bullets and a resume link to make it easy to say yes.",
      ]),
      "",
      "MESSAGE TEMPLATE",
      "Hi {Name}, I’m {YourName}. I’m targeting {Role}.",
      "Would you be open to referring me for this role? {JobLink}",
      "Quick fit:",
      "• {Impact + stack}",
      "• {Impact + stack}",
      "Resume: {Link}",
      "Thanks!",
      "",
      "Share the job link and your two fit bullets and I’ll customize it.",
    ],
    interview: [
      "INTERVIEW PLAN (NEXT 7 DAYS)",
      ...bullets([
        "Day 1-2: fundamentals plus 20 common questions for your role.",
        "Day 3-5: 1 mock per day (record yourself) and maintain a mistakes doc.",
        "Day 6: 2 timed mocks end-to-end.",
        "Day 7: revision + storytelling (STAR) + weak topics review.",
      ]),
      "",
      "Tell me which round (HR/Tech/Manager) and I’ll generate a checklist.",
    ],
    jobs: [
      "APPLICATION STRATEGY (SMART)",
      ...bullets([
        "Apply to max 8 roles per day, but tailor the top third of your resume each time.",
        "For each application, send one referral request to a relevant person with the job link.",
        "Track response rate and iterate your message and targeting weekly.",
      ]),
      "",
      "Tell me your current response rate and I’ll adjust your plan.",
    ],
    learning: [
      "SKILL ROADMAP (PRACTICAL)",
      ...bullets([
        "Pick one portfolio project aligned with the target role and ship in 7-10 days.",
        "Learn by building: define milestones, deploy, and document results.",
        "Write a clean README with screenshots and what you learned.",
      ]),
      "",
      "Tell me your stack and I’ll propose one project with milestones.",
    ],
    general: [
      "NEXT STEPS",
      ...bullets([
        "Share your experience level, 2 skills, 1 project link, and what’s blocking you.",
        "I’ll give you a 7-day plan, referral message, and interview checklist.",
      ]),
    ],
  };

  const out = [...base, ...(blocks[intent] || blocks.general)].join("\n");
  return out;
}

export function generateLiteReferralDm(args: {
  intake?: Intake;
  jobLink?: string;
  fitBullets?: string[];
  channel?: "linkedin" | "whatsapp" | "email";
}) {
  const intake = args.intake || {};
  const role = norm(intake.targetRole) || "your target role";
  const jobLink = norm(args.jobLink) || "{JobLink}";
  const bullets = (args.fitBullets || []).map((b) => norm(b)).filter(Boolean).slice(0, 2);
  const b1 = bullets[0] || "{Fit bullet 1 (impact + stack)}";
  const b2 = bullets[1] || "{Fit bullet 2 (impact + stack)}";
  const channel = args.channel || "linkedin";

  const header = "REFERRAL MESSAGE (OFFLINE MODE)";
  const lines: string[] = [header, ""];
  if (channel === "whatsapp") {
    lines.push(
      `Hi {Name}, I’m {YourName}. I’m applying for ${role}.`,
      `Can you refer me for this role? ${jobLink}`,
      "Quick fit:",
      `• ${b1}`,
      `• ${b2}`,
      "Resume: {Link}",
      "Thanks!",
    );
  } else if (channel === "email") {
    lines.push(
      `Subject: Referral request for ${role}`,
      "",
      "Hi {Name},",
      "",
      `I’m {YourName} and I’m applying for ${role}. I’d be grateful if you could refer me for this role:`,
      jobLink,
      "",
      "Quick fit:",
      `• ${b1}`,
      `• ${b2}`,
      "",
      "Resume: {Link}",
      "Thank you,",
      "{YourName}",
    );
  } else {
    lines.push(
      `Hi {Name}, I’m {YourName}. I’m targeting ${role}.`,
      `Would you be open to referring me for this role? ${jobLink}`,
      "Quick fit:",
      `• ${b1}`,
      `• ${b2}`,
      "Resume: {Link}",
      "Thanks!",
    );
  }
  return lines.join("\n");
}

export function generateLiteInterviewPack(args: { intake?: Intake; roundType?: string }) {
  const intake = args.intake || {};
  const role = norm(intake.targetRole) || "your target role";
  const round = norm(args.roundType) || "Tech";
  const track = guessTrack(role);

  const lines: string[] = [];
  lines.push("INTERVIEW PREP PACK (OFFLINE MODE)", `Role: ${role}`, `Round: ${round}`, "");
  lines.push("WHAT TO PREP TODAY");
  lines.push(
    `• Review fundamentals for ${track} and write short notes (30-45 min).`,
    "• Prepare 6 STAR stories (impact, conflict, leadership, failure, learning, ownership).",
    "• Do 2 timed practice questions and write improvements.",
    "",
  );
  lines.push("COMMON QUESTIONS");
  lines.push(
    "• Walk me through your most impactful project.",
    "• What tradeoffs did you make and why?",
    "• Explain a difficult bug you fixed.",
    "• How do you handle unclear requirements?",
    "• What would you improve in your resume/project if you had 1 week?",
    "",
  );
  lines.push("NEXT 7 DAYS (1 HOUR/DAY)");
  lines.push(
    "• Day 1-2: fundamentals + 20 role questions.",
    "• Day 3-5: 1 mock/day (record) + mistakes doc.",
    "• Day 6: 2 full mocks timed.",
    "• Day 7: revision + weak topics + HR story practice.",
  );
  return lines.join("\n");
}

export function generateLiteResumeRewrite(args: { intake?: Intake; resumeText?: string }) {
  const intake = args.intake || {};
  const role = norm(intake.targetRole) || "your target role";
  const resume = norm(args.resumeText) || "";

  const lines: string[] = [];
  lines.push("RESUME REWRITE STARTER (OFFLINE MODE)", `Target role: ${role}`, "");
  lines.push("HEADLINE (COPY/EDIT)");
  lines.push(`• ${role} | {Top skill 1}, {Top skill 2} | Built {Outcome with numbers}`);
  lines.push("");
  lines.push("SUMMARY (2-3 LINES)");
  lines.push(
    "• {Years/level} building {domain}. Strong in {stack}.",
    "• Shipped {project/system} impacting {metric}. Seeking {role} roles.",
  );
  lines.push("");
  lines.push("BULLET UPGRADE FORMULA");
  lines.push("• Action + Scope + Tools + Outcome (numbers) + Why it matters");
  lines.push("");
  lines.push("EXAMPLE REWRITES");
  lines.push(
    "• Built {feature} using {stack}, reducing {metric} by {X}% and improving {impact}.",
    "• Owned {module} end-to-end, shipping {N} improvements and cutting {time/cost} by {X}.",
  );
  if (resume.length > 0) {
    lines.push("", "WHAT I NEED FROM YOU");
    lines.push("• Paste 1 experience bullet and 1 project bullet. I’ll rewrite them in impact format.");
  }
  return lines.join("\n");
}
