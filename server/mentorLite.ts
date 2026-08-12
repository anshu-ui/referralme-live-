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

  const roadmap: Array<{ phase: string; tasks: string[] }> = [
    {
      phase: "Week 1 (Positioning + resume foundation)",
      tasks: [
        `Finalize target: ${targetRole}${dream ? ` (targets: ${dream})` : ""}.`,
        "Collect 20 target job descriptions and note repeated keywords.",
        "Rewrite top section: 2-line headline + 3 bullets (impact + stack + domain).",
        "Add quantified outcomes to 3 bullets (numbers, %).",
        "Tailor resume once for your target role using job keywords (no stuffing).",
      ],
    },
    {
      phase: "Week 2 (Proof of work + skill gaps)",
      tasks: [
        roleTasks[track][0],
        roleTasks[track][1],
        "Update LinkedIn headline + About (clear role + proof + keywords).",
        "Create 1 featured post: project/case study + what you learned.",
        "Create a mistakes log for weak concepts and revise it twice this week.",
      ],
    },
    {
      phase: "Week 3 (Interview readiness)",
      tasks: [
        roleTasks[track][2],
        "Do 2 mock interviews (record yourself, write improved answers).",
        "Prepare 6 STAR stories: conflict, ownership, failure, leadership, learning, impact.",
        "Prepare a 90-second project pitch with problem, solution, tradeoffs, and result.",
      ],
    },
    {
      phase: "Week 4 (Applications + mentor review)",
      tasks: [
        "Create a tracking sheet: applications, referrals, responses, interviews.",
        "Build a list of 30 people: alumni, seniors, same college/company, mutuals.",
        "Send 10 high-quality messages (template below).",
        "For each role: send 1 referral request to a relevant person with job link.",
        "Review: responses, interviews, weak points, ATS score, and next 30-day focus.",
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

  outputLines.push("30-DAY PLACEMENT ROADMAP");
  for (const phase of roadmap) {
    outputLines.push(phase.phase.toUpperCase());
    outputLines.push(...bulletLines(phase.tasks));
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

  const mLower = msg.toLowerCase();
  const isGreeting =
    mLower.length <= 8 &&
    /(hi|hello|hey|hii|hlo|yo|sup|good morning|good evening|good afternoon)/.test(mLower);
  const isAck = mLower.length <= 10 && /(ok|okay|kk|cool|thanks|thank you|thx|nice|great|done)/.test(mLower);

  const intent = (() => {
    const m = msg.toLowerCase();
    if (/(resume|cv|ats|keyword)/.test(m)) return "resume";
    if (/(referral|refer|dm|linkedin|message)/.test(m)) return "referral";
    if (/(interview|mock|hr|round|dsa|system design)/.test(m)) return "interview";
    if (/(job|apply|application|shortlist)/.test(m)) return "jobs";
    if (/(roadmap|learn|course|skill|project)/.test(m)) return "learning";
    return "general";
  })();

  const bullets = (items: string[]) => items.map((i) => `• ${i}`);

  // A more conversational, non-repetitive offline reply for short messages.
  if (isGreeting) {
    const lines: string[] = [];
    lines.push(`Hi! I can help you with a clear job plan for ${targetRole}.`);
    lines.push("");
    lines.push("While you reply, do this now (5 minutes):");
    lines.push(...bullets([
      "Open your resume and check: do you have numbers in at least 3 bullets?",
      "Pick one job description for your target role and note the top 8 repeated keywords.",
    ]));
    lines.push("");
    lines.push("Quick question (answer 1 line):");
    lines.push(...bullets([
      "Your experience level (fresher / 1-2 / 3-5 / 5+ years) and what’s blocking you right now.",
    ]));
    lines.push("");
    lines.push("If you paste 3 resume bullets (or 1 project), I’ll rewrite them in impact format.");
    return lines.join("\n");
  }

  if (isAck) {
    const lines: string[] = [];
    lines.push("Perfect. To make this practical, answer these 2 lines:");
    lines.push(...bullets([
      `Target role: ${targetRole}`,
      "Current status: (apps/interviews/projects in last 2 weeks)",
    ]));
    lines.push("");
    lines.push("Then I’ll give you a focused 30-day placement roadmap plus an interview checklist.");
    return lines.join("\n");
  }

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
        `Confirm your target role: ${targetRole} (or tell me the right one).`,
        "Share: experience level + 2 skills + 1 project + what’s blocking you right now.",
        "I’ll respond with: a 30-day placement roadmap + resume fixes + interview checklist.",
      ]),
    ],
  };

  const header = [`Target: ${targetRole} • Track: ${track}`, ""];
  return [...header, ...(blocks[intent] || blocks.general)].join("\n");
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

  const header = "REFERRAL MESSAGE";
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
  const round = norm(args.roundType) || "technical";
  const track = guessTrack(role);

  const r = round.toLowerCase();
  const lines: string[] = [];
  lines.push("INTERVIEW PREP PACK", `Role: ${role}`, `Round: ${round}`, "");

  const bullets = (items: string[]) => items.map((i) => `• ${i}`);

  if (r.includes("hr")) {
    lines.push("FOCUS");
    lines.push(...bullets([
      "Your story (2 minutes): who you are, what you built, what you want next.",
      "STAR stories for: ownership, conflict, failure, learning, leadership, impact.",
      "Clarity: why this company, why this role, why now.",
    ]));
    lines.push("", "COMMON QUESTIONS");
    lines.push(...bullets([
      "Tell me about yourself (2 minutes).",
      "Why do you want to switch?",
      "Strengths and weaknesses (with examples).",
      "A conflict you handled and what you learned.",
      "Salary expectations and notice period.",
    ]));
    lines.push("", "YOUR SCRIPT (COPY/EDIT)");
    lines.push(
      "I’m a {level} targeting {role}. Recently I built {project} using {stack}, which resulted in {metric}.",
      "I’m now looking for {role} roles where I can drive {impact}.",
    );
    return lines.join("\n");
  }

  if (r.includes("manager")) {
    lines.push("FOCUS");
    lines.push(...bullets([
      "Execution: how you plan, break down work, and ship reliably.",
      "Ownership: decisions you made, tradeoffs, and how you handled risk.",
      "Communication: how you align with stakeholders and handle ambiguity.",
    ]));
    lines.push("", "COMMON QUESTIONS");
    lines.push(...bullets([
      "Describe a project you owned end-to-end.",
      "How do you handle unclear requirements?",
      "A time you disagreed with a teammate and how you resolved it.",
      "How do you prioritize when everything is urgent?",
      "What would you improve in a system you built?",
    ]));
    lines.push("", "WHAT TO PREP TODAY");
    lines.push(...bullets([
      "Write 6 STAR stories with numbers (impact, scope, tools).",
      "Prepare one 'architecture walkthrough' of your best project (5 minutes).",
      "List 3 tradeoffs you made and why they were right.",
    ]));
    return lines.join("\n");
  }

  if (r.includes("system")) {
    lines.push("FOCUS");
    lines.push(...bullets([
      "Clarify requirements (users, scale, latency, consistency).",
      "Design: API, data model, high-level components, and request flow.",
      "Scale: caching, queues, pagination, indexes, and failure handling.",
    ]));
    lines.push("", "CHECKLIST");
    lines.push(...bullets([
      "Ask 5 clarifying questions before designing.",
      "Draw the request flow and data flow.",
      "Pick a storage model and justify it (SQL vs NoSQL).",
      "Add caching + rate limiting + retries.",
      "Explain bottlenecks and how you would scale.",
    ]));
    lines.push("", "PRACTICE PROMPTS");
    lines.push(...bullets([
      "Design a URL shortener.",
      "Design a file upload + processing pipeline.",
      "Design a simple chat system.",
      "Design a notification system.",
    ]));
    return lines.join("\n");
  }

  if (r.includes("case")) {
    lines.push("FOCUS");
    lines.push(...bullets([
      "Structure: clarify goal, define metrics, propose approach, tradeoffs.",
      "Communication: explain assumptions clearly and keep it simple.",
      "Decision making: show how you prioritize and validate.",
    ]));
    lines.push("", "FRAMEWORK (SIMPLE)");
    lines.push(...bullets([
      "Goal: what success means.",
      "Constraints: time, resources, risk.",
      "Options: 2-3 approaches.",
      "Decision: pick one, justify.",
      "Measurement: 3 metrics to track.",
    ]));
    return lines.join("\n");
  }

  // Technical default
  lines.push("FOCUS");
  lines.push(...bullets([
    `Fundamentals for ${track} plus role-specific questions.`,
    "DSA basics: arrays, strings, hashmaps, two pointers, recursion (as needed).",
    "One project deep-dive: architecture, tradeoffs, impact, metrics.",
  ]));
  lines.push("", "WHAT TO PREP TODAY");
  lines.push(...bullets([
    "Do 2 timed questions and write a short post-mortem: what went wrong and why.",
    "Prepare 3 project stories with numbers (performance, users, revenue, time saved).",
    "Write 5 'why' answers: why role, why company, why you are a fit.",
  ]));
  lines.push("", "COMMON QUESTIONS");
  lines.push(...bullets([
    "Walk me through your most impactful project.",
    "Explain a difficult bug you fixed (root cause + prevention).",
    "Explain a tradeoff you made and why.",
    "How do you handle unclear requirements?",
  ]));
  return lines.join("\n");
}

export function generateLiteInterviewQuestions(args: {
  intake?: Intake;
  roundType?: string;
  difficulty?: string;
  questionCount?: number;
}) {
  const intake = args.intake || {};
  const role = norm(intake.targetRole) || "your target role";
  const round = norm(args.roundType) || "technical";
  const difficulty = norm(args.difficulty) || "fresher";
  const track = guessTrack(role);
  const count = Math.max(3, Math.min(8, Number(args.questionCount || 5)));

  const technicalByTrack: Record<string, string[]> = {
    frontend: [
      "Explain a React project you built. How did you manage state, data fetching, and deployment?",
      "What performance issue did you face in a frontend app, and how did you diagnose it?",
      "How would you design a reusable form component with validation and error handling?",
      "Explain event loop, promises, and async/await using a real example.",
      "How do you make a web page accessible and responsive for mobile users?",
    ],
    backend: [
      "Walk me through an API you built. What were the endpoints, data model, and auth flow?",
      "How would you design rate limiting and retries for a production API?",
      "Explain SQL indexes and one case where an index can hurt performance.",
      "How do you handle validation, logging, and errors in a backend service?",
      "Describe a difficult bug you fixed in a server-side project.",
    ],
    data: [
      "Explain a data project where your analysis changed a decision.",
      "Write how you would investigate a sudden drop in conversion rate.",
      "What SQL concepts do you use most often, and where do people make mistakes?",
      "How do you handle missing data, outliers, and biased samples?",
      "Explain a dashboard metric and how you would prevent misinterpretation.",
    ],
    product: [
      "Choose one product you use daily. What would you improve and why?",
      "How would you prioritize features when engineering capacity is limited?",
      "Define success metrics for a referral or mentorship product.",
      "Tell me about a time you used data to make a product decision.",
      "How would you validate a new feature before building it fully?",
    ],
    design: [
      "Walk me through one case study: problem, users, constraints, solution, outcome.",
      "How do you handle conflicting feedback from users and stakeholders?",
      "What accessibility issue do you commonly check in UI design?",
      "Explain your design process from research to handoff.",
      "How would you redesign a confusing onboarding flow?",
    ],
    general: [
      "Walk me through your strongest project and the impact it created.",
      "What is one technical or domain skill you improved recently, and how?",
      "Describe a difficult problem you solved and the tradeoffs you considered.",
      "How do you approach a task when requirements are unclear?",
      "Why are you a strong fit for this role compared with other candidates?",
    ],
  };

  const roundLower = round.toLowerCase();
  const hrQuestions = [
    "Tell me about yourself in 90 seconds, focusing on your target role.",
    "Why do you want this role, and why now?",
    "Tell me about a failure or mistake and what changed after that.",
    "Describe a conflict with a teammate and how you handled it.",
    "What are your strengths and one honest improvement area?",
  ];
  const managerQuestions = [
    "Tell me about a project you owned end-to-end. How did you plan and execute it?",
    "How do you prioritize when multiple tasks are urgent?",
    "Describe a time you handled ambiguity or unclear requirements.",
    "How do you communicate delays, blockers, or tradeoffs?",
    "What would your previous teammates say you are reliable for?",
  ];
  const systemQuestions = [
    "Design a notification system for job alerts. Clarify requirements first.",
    "Design a resume upload and analysis pipeline for thousands of users.",
    "Design an application tracker with reminders and status updates.",
    "How would you scale search and filtering for mentor discovery?",
    "Explain your database choice, APIs, caching, and failure handling.",
  ];
  const caseQuestions = [
    "ReferralMe wants to improve paid mentorship bookings. How would you diagnose and improve conversion?",
    "A student has low ATS score but wants referrals. What product flow should guide them?",
    "Company recruiters want only high-quality candidates. What screening signals would you use?",
    "How would you price a career pro subscription for Indian students?",
    "What metrics would you track for an AI interview product?",
  ];

  const pool = roundLower.includes("hr")
    ? hrQuestions
    : roundLower.includes("manager")
      ? managerQuestions
      : roundLower.includes("system")
        ? systemQuestions
        : roundLower.includes("case")
          ? caseQuestions
          : technicalByTrack[track] || technicalByTrack.general;

  return pool.slice(0, count).map((question, index) => ({
    id: `q${index + 1}`,
    question,
    focus: `${round} ${difficulty} readiness`,
  }));
}

export function generateLiteInterviewEvaluation(args: {
  intake?: Intake;
  roundType?: string;
  difficulty?: string;
  answers?: Array<{ question?: string; answer?: string }>;
}) {
  const intake = args.intake || {};
  const role = norm(intake.targetRole) || "your target role";
  const round = norm(args.roundType) || "technical";
  const answers = Array.isArray(args.answers) ? args.answers : [];
  const joined = answers.map((a) => norm(a.answer)).join(" ");
  const words = joined.split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\d|%|users|reduced|improved|increased|decreased|saved/i.test(joined);
  const hasStructure = /because|first|second|finally|tradeoff|impact|result|learned/i.test(joined);
  const hasRoleTerms = new RegExp(role.split(/\s+/).filter((w) => w.length > 2).slice(0, 3).join("|"), "i").test(joined);

  const base = Math.min(78, 42 + Math.round(words / 9));
  const communication = Math.min(92, base + (hasStructure ? 10 : 0));
  const technical = Math.min(90, base + (hasNumbers ? 7 : 0) + (hasRoleTerms ? 5 : 0));
  const confidence = Math.min(88, base + (answers.filter((a) => norm(a.answer).length > 140).length * 3));
  const roleFit = Math.min(90, base + (hasRoleTerms ? 10 : 0));
  const overall = Math.round((communication + technical + confidence + roleFit) / 4);
  const verdict = overall >= 78 ? "ready" : overall >= 62 ? "almost_ready" : "needs_practice";

  const feedback = [
    "AI INTERVIEW SCORECARD",
    `Role: ${role}`,
    `Round: ${round}`,
    "",
    `Overall readiness: ${overall}/100`,
    `Communication: ${communication}/100`,
    `Technical/domain depth: ${technical}/100`,
    `Confidence: ${confidence}/100`,
    `Role fit: ${roleFit}/100`,
    "",
    "STRENGTHS",
    "• You attempted the questions with relevant context.",
    hasStructure ? "• Your answers show some structure and reasoning." : "• You have a starting point for clearer answer structure.",
    hasNumbers ? "• Some answers include measurable impact or concrete details." : "• You can improve by adding measurable impact.",
    "",
    "TOP IMPROVEMENTS",
    "• Use STAR format: Situation, Task, Action, Result.",
    "• Add numbers, scale, tools, constraints, and tradeoffs.",
    "• End each answer with the business or user impact.",
    "",
    "NEXT PRACTICE PLAN",
    "• Rewrite your weakest 2 answers in 6-8 lines each.",
    "• Record yourself once and remove filler words.",
    "• Do one mentor mock if your score is below 70.",
  ].join("\n");

  return {
    text: feedback,
    scorecard: {
      overall,
      communication,
      technical,
      confidence,
      roleFit,
      verdict,
      strengths: [
        "Relevant attempt across interview questions.",
        hasStructure ? "Some structured reasoning is visible." : "Clear opportunity to build stronger structure.",
        hasNumbers ? "Includes concrete impact signals." : "Answers can become stronger with numbers.",
      ],
      improvements: [
        "Use STAR format for behavioral and project answers.",
        "Add metrics, tools, constraints, and tradeoffs.",
        "Make answers specific to the target role.",
      ],
      nextSteps: [
        "Rewrite the weakest two answers.",
        "Practice one timed mock interview.",
        overall < 70 ? "Book a mentor mock interview for targeted feedback." : "Apply this structure to company-specific rounds.",
      ],
    },
  };
}

export function generateLiteResumeRewrite(args: { intake?: Intake; resumeText?: string }) {
  const intake = args.intake || {};
  const role = norm(intake.targetRole) || "your target role";
  const resume = norm(args.resumeText) || "";

  const lines: string[] = [];
  lines.push("RESUME REWRITE STARTER", `Target role: ${role}`, "");
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
