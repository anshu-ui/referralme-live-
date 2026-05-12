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
    "Hi {Name} — I’m {YourName}. I’m targeting {Role} roles.",
    "I noticed you’re at {Company}/work in {Domain}.",
    "Would you be open to referring me for this role? {JobLink}",
    "Quick fit:",
    "- {Bullet 1: impact + stack}",
    "- {Bullet 2: impact + stack}",
    "Resume: {Link}  |  Thanks!",
  ].join("\n");

  const output = [
    "# Goal",
    `Target role: **${targetRole}**`,
    dream ? `Targets: **${dream}**` : "",
    exp ? `Experience: **${exp}**` : "",
    loc ? `Location: **${loc}**` : "",
    "",
    "# Current Snapshot",
    status ? limitedText(status, 900) : "Not provided.",
    blocker ? `Biggest blocker: ${limitedText(blocker, 240)}` : "",
    resumeNote,
    "",
    "# 7-Day Plan",
    ...week.map((d) => [`## ${d.day}`, ...d.tasks.map((t) => `- ${t}`), ""].join("\n")),
    "# Resume / ATS Fixes (Top 8)",
    "- Ensure each role has 3-5 bullets with impact + tools.",
    "- Add numbers: users, latency, revenue, cost saved, time saved.",
    "- Add a Skills section with the exact keywords from your target roles.",
    "- Keep resume 1 page (0-3 YoE) / 2 pages (3+ YoE) and readable.",
    "- Remove vague lines like 'hardworking' and replace with proof.",
    "- Put your best project first; include links.",
    "- Make titles consistent: Company, Role, Dates, Location.",
    "- Tailor the top 1/3 of resume per role type.",
    "",
    "# Referral Outreach Plan",
    "- Start with warm nodes: alumni, seniors, college groups, mutuals.",
    "- Ask for 1 role at a time with a job link and 2 fit bullets.",
    "- Follow up once after 48 hours (short, polite).",
    "",
    "### Outreach Template",
    "```",
    outreachTemplate,
    "```",
    "",
    "# Interview Prep Plan",
    `- Focus area: **${track}** basics + role-specific questions.`,
    "- Do 1 mock/day (self-recorded).",
    "- Keep a 'mistakes doc' and revise weekly.",
    "",
    "# Checkpoints",
    "- Response rate (replies / messages sent)",
    "- Interview rate (interviews / applications)",
    "- Weak topics list (top 5) and improvement per week",
    "",
    "If you want human help, book a mentor session in the Mentorship tab.",
  ]
    .filter(Boolean)
    .join("\n");

  return output;
}

