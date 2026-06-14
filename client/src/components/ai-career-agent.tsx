import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Bot,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Copy,
  FileText,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { useToast } from "../hooks/use-toast";
import type {
  CareerInterviewPrep,
  CareerReferralKit,
  CareerReferralKitStatus,
  FirestoreUser,
  JobPosting,
  ReferralRequest,
} from "../lib/firestore";
import {
  isJobAtCapacity,
  isJobExpired,
  subscribeToActiveMentors,
  subscribeToCareerReferralKits,
  updateCareerReferralKit,
  upsertCareerReferralKit,
} from "../lib/firestore";

type AgentJobMatch = {
  job: JobPosting;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
  recommendation: string;
};

type MentorRecommendation = {
  mentor: FirestoreUser;
  score: number;
  reasons: string[];
  bestService?: string;
};

type ReferralKitDraft = Omit<CareerReferralKit, "id" | "createdAt" | "updatedAt">;

const normalizeWords = (value?: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)));

const tokenSet = (value: string) => new Set(normalizeWords(value));

function dateAfterDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function scoreJob(job: JobPosting, user: FirestoreUser, latestAtsScore?: number | null): AgentJobMatch {
  const userSkills = (user.skills || []).map((skill) => skill.toLowerCase().trim()).filter(Boolean);
  const userText = normalizeWords(`${user.designation || ""} ${user.experience || ""} ${user.bio || ""} ${user.skills?.join(" ") || ""}`);
  const jobSkillWords = unique([
    ...(job.skills || []).map((skill) => skill.toLowerCase().trim()),
    ...normalizeWords(`${job.title} ${job.description} ${job.requirements} ${job.niceToHave || ""}`).slice(0, 40),
  ]);

  const matchedSkills = unique(
    jobSkillWords.filter((skill) => userSkills.some((userSkill) => userSkill.includes(skill) || skill.includes(userSkill)) || userText.includes(skill)),
  ).slice(0, 6);
  const missingSkills = unique(
    jobSkillWords.filter((skill) => !matchedSkills.includes(skill) && skill.length > 3),
  ).slice(0, 5);

  const skillScore = Math.min(45, matchedSkills.length * 9);
  const atsScore = latestAtsScore ? Math.min(25, latestAtsScore * 0.25) : 8;
  const roleText = `${user.designation || ""} ${user.bio || ""}`.toLowerCase();
  const roleScore = normalizeWords(job.title).some((word) => roleText.includes(word)) ? 15 : 6;
  const profileScore = user.profileCompleted ? 10 : 4;
  const urgencyBoost = job.urgency === "high" ? 5 : job.urgency === "medium" ? 3 : 0;
  const score = Math.max(35, Math.min(96, Math.round(skillScore + atsScore + roleScore + profileScore + urgencyBoost)));

  const reasons = [
    matchedSkills.length ? `${matchedSkills.length} matching skill signals found` : "Profile is broad enough for an initial review",
    latestAtsScore ? `Latest ATS score is ${latestAtsScore}/100` : "Run ATS scan to improve confidence before applying",
    job.applicationMode === "platform_request" ? "ReferralMe request flow is available" : "Direct application path is available",
  ];

  const recommendation =
    score >= 75
      ? "Strong fit. Apply now and use a focused referral message."
      : score >= 60
        ? "Good potential. Improve missing keywords before applying."
        : "Needs preparation. Run ATS scan or book mentor review first.";

  return { job, score, matchedSkills, missingSkills, reasons, recommendation };
}

function referralDraft(user: FirestoreUser, match: AgentJobMatch) {
  const name = user.displayName || user.firstName || "Candidate";
  const skills = match.matchedSkills.slice(0, 3).join(", ") || "relevant skills";
  return [
    `Hi ${match.job.referrerName || "there"},`,
    "",
    `I am ${name}, and I am interested in the ${match.job.title} role at ${match.job.company}.`,
    `I noticed this role aligns with my background in ${skills}.`,
    "",
    "Quick fit:",
    `- Match score on ReferralMe: ${match.score}/100`,
    `- Relevant skills: ${skills}`,
    "- I can share my resume and project details for review.",
    "",
    "Would you be open to reviewing my profile for this opportunity?",
    "Thank you.",
  ].join("\n");
}

function buildInterviewPrep(match: AgentJobMatch): CareerInterviewPrep {
  const role = match.job.title;
  const company = match.job.company;
  const topSkills = match.matchedSkills.slice(0, 3);
  const weakSkills = match.missingSkills.slice(0, 3);
  const skillText = topSkills.join(", ") || "your strongest role-relevant skills";
  const weakText = weakSkills.join(", ") || "the role requirements you have not shown clearly yet";

  return {
    roleFocus: `${role} at ${company}`,
    technicalQuestions: [
      `Explain one project where you used ${skillText}. What was your exact contribution and result?`,
      `If the interviewer asks about ${weakText}, how will you connect it to your current experience honestly?`,
      `Walk through a technical decision you made, the tradeoffs, and what you would improve now.`,
      `Describe how you debug a production or project issue from first signal to final fix.`,
    ],
    hrQuestions: [
      `Why are you interested in ${company} and this ${role} role specifically?`,
      "Tell me about a time you learned a new skill quickly for a project or deadline.",
      "What is your biggest gap for this role, and what are you doing this week to close it?",
    ],
    projectQuestions: [
      "Prepare a 90-second explanation of your strongest project: problem, users, stack, impact.",
      "Prepare one deep-dive answer about architecture, database, API, or performance decisions.",
      "Prepare one failure/learning story from the project and how you improved after it.",
    ],
    prepPlan: [
      "Day 1: Rewrite resume bullets to mirror the job description truthfully.",
      "Day 2: Prepare project story and measurable outcomes.",
      "Day 3: Practice technical fundamentals from missing skill areas.",
      "Day 4: Record answers for HR questions and tighten weak points.",
      "Day 5: Do one mock interview or mentor review.",
      "Day 6: Finalize referral request, resume, and application answers.",
      "Day 7: Apply, send referral request, and schedule follow-up.",
    ],
    generatedAt: Date.now(),
  };
}

function buildReferralKit(user: FirestoreUser, match: AgentJobMatch): ReferralKitDraft {
  const name = user.displayName || user.firstName || "Candidate";
  const skills = match.matchedSkills.slice(0, 4);
  const skillText = skills.join(", ") || "role-relevant skills";
  const missingText = match.missingSkills.slice(0, 3).join(", ");
  const intro = `${name} for ${match.job.title} at ${match.job.company} - ${match.score}% ReferralMe match.`;
  const fitBullets = [
    `Relevant skills: ${skillText}.`,
    `Profile fit: ${match.reasons[0] || "Relevant profile signals found."}.`,
    match.score >= 75
      ? "Ready to apply with a focused referral request."
      : "Improving missing keywords before applying will strengthen the request.",
  ];

  return {
    userId: user.uid,
    jobId: match.job.id || `${match.job.company}-${match.job.title}`,
    jobTitle: match.job.title,
    company: match.job.company,
    referrerId: match.job.referrerId,
    referrerName: match.job.referrerName || "Referrer",
    matchScore: match.score,
    intro,
    referralMessage: referralDraft(user, match),
    followUpMessage: [
      `Hi ${match.job.referrerName || "there"},`,
      "",
      `Just following up on my request for the ${match.job.title} role at ${match.job.company}.`,
      "I understand you may be busy, so no worries if now is not the right time.",
      "If helpful, I can share a shorter resume summary or project details.",
      "",
      "Thank you again.",
    ].join("\n"),
    fitBullets,
    resumeNotes: [
      missingText ? `Add truthful JD keywords if relevant: ${missingText}.` : "Keep resume tightly aligned to the job description.",
      "Put the most relevant project or work experience in the top half of the resume.",
      "Use impact bullets: action + tool/skill + measurable outcome.",
    ],
    interviewPrep: buildInterviewPrep(match),
    status: "draft",
    followUpDate: dateAfterDays(3),
  };
}

function mentorBlob(mentor: FirestoreUser) {
  return [
    mentor.displayName,
    mentor.company,
    mentor.designation,
    mentor.location,
    mentor.mentorshipBio,
    ...(mentor.skills || []),
    ...(mentor.mentorshipServices || []).map((service) => `${service.title} ${service.description}`),
  ]
    .filter(Boolean)
    .join(" ");
}

function scoreMentor(mentor: FirestoreUser, user: FirestoreUser, matches: AgentJobMatch[], latestAtsScore?: number | null): MentorRecommendation {
  const topMatch = matches[0];
  const seekerTokens = tokenSet(
    [
      user.designation,
      user.experience,
      user.bio,
      ...(user.skills || []),
      topMatch?.job.title,
      topMatch?.job.company,
      ...(topMatch?.missingSkills || []),
      ...(topMatch?.matchedSkills || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
  const mentorTokens = tokenSet(mentorBlob(mentor));
  const overlap = Array.from(seekerTokens).filter((token) => mentorTokens.has(token));
  const services = (mentor.mentorshipServices || []).filter((service) => service.isActive);
  const serviceText = services.map((service) => service.title.toLowerCase()).join(" ");
  const atsBoost = latestAtsScore !== undefined && latestAtsScore !== null && latestAtsScore < 60 && /resume|ats|career|review/.test(serviceText) ? 16 : 0;
  const interviewBoost = topMatch?.score && topMatch.score < 65 && /interview|mock|career|guidance/.test(serviceText) ? 12 : 0;
  const ratingBoost = Math.round(Number(mentor.mentorshipRating || 0) * 2);
  const sessionBoost = Math.min(8, Math.round(Math.log10(Number(mentor.totalMentorshipSessions || 0) + 1) * 5));
  const score = Math.min(98, Math.max(35, overlap.length * 7 + atsBoost + interviewBoost + ratingBoost + sessionBoost + 28));

  const reasons = [
    overlap.length ? `${overlap.slice(0, 4).join(", ")} profile overlap` : "Good general career guidance fit",
    atsBoost ? "Recommended because ATS score needs improvement" : "Can help improve positioning before applying",
    interviewBoost ? "Useful for weak job-fit or interview preparation" : "Relevant referrer/mentor profile",
  ];

  return {
    mentor,
    score,
    reasons,
    bestService: services[0]?.title,
  };
}

export default function AiCareerAgent({
  user,
  jobs,
  applications,
  jobsLoading,
  latestAtsScore,
  onRunAts,
  onOpenAiMentor,
  onOpenMentorship,
  onApplyToJob,
}: {
  user: FirestoreUser;
  jobs: JobPosting[];
  applications: ReferralRequest[];
  jobsLoading: boolean;
  latestAtsScore?: number | null;
  onRunAts: () => void;
  onOpenAiMentor: () => void;
  onOpenMentorship: () => void;
  onApplyToJob: (job: JobPosting) => void;
}) {
  const { toast } = useToast();
  const [referralKits, setReferralKits] = useState<Record<string, CareerReferralKit>>({});
  const [mentors, setMentors] = useState<FirestoreUser[]>([]);
  const [kitsLoading, setKitsLoading] = useState(true);
  const [busyKitId, setBusyKitId] = useState<string | null>(null);
  const openJobs = useMemo(
    () =>
      (jobs || []).filter(
        (job) => job.isActive !== false && job.isArchived !== true && !isJobExpired(job) && !(job.autoCloseOnCap && isJobAtCapacity(job)),
      ),
    [jobs],
  );
  const matches = useMemo(
    () =>
      openJobs
        .map((job) => scoreJob(job, user, latestAtsScore))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
    [latestAtsScore, openJobs, user],
  );
  const appliedJobIds = useMemo(() => new Set((applications || []).map((app) => app.jobPostingId).filter(Boolean)), [applications]);
  const readinessScore = Math.round(
    Math.min(
      100,
      (user.profileCompleted ? 25 : 10) +
        (latestAtsScore ? latestAtsScore * 0.35 : 10) +
        Math.min(20, (user.skills?.length || 0) * 3) +
        Math.min(20, applications.length * 4),
    ),
  );
  const needsMentor = readinessScore < 65 || (latestAtsScore !== null && latestAtsScore !== undefined && latestAtsScore < 60);

  useEffect(() => {
    const unsubscribe = subscribeToActiveMentors((items) => {
      setMentors(items.filter((mentor) => mentor.uid !== user.uid));
    });
    return unsubscribe;
  }, [user.uid]);

  useEffect(() => {
    setKitsLoading(true);
    const unsubscribe = subscribeToCareerReferralKits(
      user.uid,
      (kits) => {
        setReferralKits(Object.fromEntries(kits.map((kit) => [kit.jobId, kit])));
        setKitsLoading(false);
      },
      () => {
        setKitsLoading(false);
        toast({
          title: "Career Agent sync blocked",
          description: "Please check Firestore rules for careerReferralKits.",
        });
      },
    );

    return unsubscribe;
  }, [user.uid]);

  const copyReferralDraft = async (match: AgentJobMatch) => {
    try {
      await navigator.clipboard.writeText(referralDraft(user, match));
      toast({ title: "Referral draft copied", description: "Review and personalize it before sending." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access." });
    }
  };

  const copyText = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied`, description: "Review and personalize before sending." });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access." });
    }
  };

  const generateReferralKit = async (match: AgentJobMatch) => {
    const kit = buildReferralKit(user, match);
    setBusyKitId(kit.jobId);
    try {
      await upsertCareerReferralKit(kit);
      toast({ title: "Referral kit generated", description: "Saved live with DM, follow-up, resume notes, and interview prep." });
    } catch {
      toast({ title: "Could not save kit", description: "Please check your connection and Firestore permissions." });
    } finally {
      setBusyKitId(null);
    }
  };

  const updateKitStatus = async (jobId: string, status: CareerReferralKitStatus) => {
    const kit = referralKits[jobId];
    if (!kit?.id) return;
    setBusyKitId(jobId);
    try {
      await updateCareerReferralKit(kit.id, { status });
      toast({
        title: status === "sent" ? "Marked as sent" : status === "replied" ? "Marked as replied" : "Moved back to draft",
      });
    } catch {
      toast({ title: "Could not update kit", description: "Please try again." });
    } finally {
      setBusyKitId(null);
    }
  };

  const referralKitList = useMemo(
    () =>
      Object.values(referralKits).sort((a, b) => {
        const aTime = a.updatedAt?.toDate?.()?.getTime?.() || 0;
        const bTime = b.updatedAt?.toDate?.()?.getTime?.() || 0;
        return bTime - aTime;
      }),
    [referralKits],
  );

  const mentorRecommendations = useMemo(
    () =>
      mentors
        .map((mentor) => scoreMentor(mentor, user, matches, latestAtsScore))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
    [latestAtsScore, matches, mentors, user],
  );

  const careerTimeline = useMemo(() => {
    const kitEvents = referralKitList.slice(0, 5).map((kit) => ({
      id: `kit-${kit.id || kit.jobId}`,
      title: `${kit.jobTitle} kit ${kit.status}`,
      meta: `${kit.company} • ${kit.matchScore}% match`,
      tone: kit.status === "replied" ? "green" : kit.status === "sent" ? "blue" : "slate",
    }));
    const applicationEvents = (applications || []).slice(0, 5).map((application) => ({
      id: `app-${application.id || application.jobPostingId}`,
      title: `${application.jobTitle || "Referral request"} submitted`,
      meta: `${application.status || "pending"} • ${application.referrerName || "Referrer"}`,
      tone: "amber",
    }));
    const mentorEvents = mentorRecommendations.slice(0, 3).map((recommendation) => ({
      id: `mentor-${recommendation.mentor.uid}`,
      title: `${recommendation.mentor.displayName || "Mentor"} recommended`,
      meta: `${recommendation.score}% fit${recommendation.bestService ? ` • ${recommendation.bestService}` : ""}`,
      tone: "violet",
    }));

    return [...kitEvents, ...applicationEvents, ...mentorEvents].slice(0, 8);
  }, [applications, mentorRecommendations, referralKitList]);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-100">
                <Sparkles className="h-3.5 w-3.5" />
                AI Career Agent
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Resume to referral, in one guided workflow.</h2>
              <p className="mt-3 text-sm leading-6 text-blue-100">
                Start with resume readiness, generate a placement plan, match with live jobs, draft referral messages, and get mentor help when the signal is weak.
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 text-center">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Readiness</div>
              <div className="mt-2 text-4xl font-bold">{readinessScore}</div>
              <div className="mt-1 text-xs text-blue-100">career agent score</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <AgentStepCard title="1. Resume" value={latestAtsScore ? `${latestAtsScore}/100` : "Not scanned"} hint="Run ATS and improve weak areas." icon={FileText} action="Run ATS" onClick={onRunAts} />
        <AgentStepCard title="2. Plan" value="30 days" hint="Create/refine your placement roadmap." icon={Bot} action="Open AI Mentor" onClick={onOpenAiMentor} />
        <AgentStepCard title="3. Jobs" value={matches.length} hint="AI-ranked jobs from ReferralMe network." icon={Briefcase} action="View matches" onClick={() => document.getElementById("career-agent-matches")?.scrollIntoView({ behavior: "smooth" })} />
        <AgentStepCard title="4. Mentor" value={needsMentor ? "Recommended" : "Optional"} hint="Human review when ATS or readiness is low." icon={Users} action="Find mentor" onClick={onOpenMentorship} />
      </div>

      {needsMentor ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Lightbulb className="mt-1 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <div className="font-semibold text-slate-950">Mentor review recommended before heavy applying</div>
                <p className="text-sm text-slate-700">Your readiness signal suggests resume or interview positioning can improve before requesting referrals.</p>
              </div>
            </div>
            <Button onClick={onOpenMentorship} className="bg-amber-600 hover:bg-amber-700">Book mentor</Button>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            AI Mentor & Referrer Suggestions
          </CardTitle>
          <CardDescription>
            Auto-ranked from your profile, latest ATS signal, weak job-fit areas, and active mentor/referrer services.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mentorRecommendations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
              <Users className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-950">No active mentors yet</h3>
              <p className="mt-1 text-sm text-slate-500">When referrers enable mentorship, AI will suggest the best 3 here.</p>
            </div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-3">
              {mentorRecommendations.map((recommendation) => (
                <div key={recommendation.mentor.uid} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-slate-950">{recommendation.mentor.displayName || "Mentor"}</div>
                      <div className="text-sm text-slate-600">
                        {[recommendation.mentor.designation, recommendation.mentor.company].filter(Boolean).join(" • ") || "ReferralMe mentor"}
                      </div>
                    </div>
                    <Badge className={recommendation.score >= 75 ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}>
                      {recommendation.score}% fit
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {Number(recommendation.mentor.mentorshipRating || 0).toFixed(1)} rating • {recommendation.mentor.mentorshipRatingCount || 0} reviews
                  </div>
                  {recommendation.bestService ? (
                    <Badge variant="outline" className="mt-3 border-blue-100 bg-blue-50 text-blue-700">
                      {recommendation.bestService}
                    </Badge>
                  ) : null}
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {recommendation.reasons.map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                  <Button onClick={onOpenMentorship} className="mt-4 w-full">
                    View mentor
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="career-agent-matches" className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            AI Job Matches
          </CardTitle>
          <CardDescription>Ranked from live ReferralMe jobs using profile, skills, ATS signal, and job requirements.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-600">Loading job matches...</div>
          ) : matches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <Briefcase className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-950">No active jobs to match yet</h3>
              <p className="mt-1 text-sm text-slate-500">When referrers post active roles, the Career Agent will rank them here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const alreadyApplied = Boolean(match.job.id && appliedJobIds.has(match.job.id));
                const jobId = match.job.id || `${match.job.company}-${match.job.title}`;
                const kit = referralKits[jobId];
                return (
                  <div key={match.job.id || match.job.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-950">{match.job.title}</h3>
                          <Badge className={match.score >= 75 ? "bg-green-100 text-green-800" : match.score >= 60 ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}>
                            {match.score}% match
                          </Badge>
                          <Badge variant="outline">{match.job.company}</Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{match.job.quickSummary || match.job.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {match.matchedSkills.slice(0, 5).map((skill) => (
                            <Badge key={skill} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                              {skill}
                            </Badge>
                          ))}
                          {match.missingSkills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                              add {skill}
                            </Badge>
                          ))}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                          {match.reasons.map((reason) => (
                            <div key={reason} className="flex gap-2 rounded-xl bg-slate-50 p-2 text-xs text-slate-600">
                              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-sm font-medium text-slate-900">{match.recommendation}</p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                        <Button disabled={alreadyApplied} onClick={() => onApplyToJob(match.job)} className="gap-2">
                          {alreadyApplied ? "Applied" : "Apply / Request"}
                          {!alreadyApplied ? <ArrowRight className="h-4 w-4" /> : null}
                        </Button>
                        <Button
                          variant={kit ? "secondary" : "outline"}
                          onClick={() => generateReferralKit(match)}
                          disabled={busyKitId === jobId}
                          className="gap-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          {busyKitId === jobId ? "Saving..." : kit ? "Regenerate kit" : "Generate kit"}
                        </Button>
                        <Button variant="outline" onClick={() => copyReferralDraft(match)} className="gap-2">
                          <Copy className="h-4 w-4" />
                          Draft message
                        </Button>
                      </div>
                    </div>
                    {kit ? (
                      <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold text-slate-950">Referral kit ready</h4>
                              <Badge variant="outline" className="capitalize">
                                {kit.status}
                              </Badge>
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                Live saved
                              </Badge>
                              <Badge variant="outline" className="gap-1">
                                <CalendarClock className="h-3.5 w-3.5" />
                                Follow up {kit.followUpDate}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{kit.intro}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button size="sm" variant="outline" onClick={() => copyText("Referral message", kit.referralMessage)} className="gap-2">
                              <Copy className="h-4 w-4" />
                              Copy DM
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => copyText("Follow-up", kit.followUpMessage)} className="gap-2">
                              <Bell className="h-4 w-4" />
                              Copy follow-up
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateKitStatus(kit.jobId, "sent")}
                              disabled={busyKitId === kit.jobId || kit.status === "sent" || kit.status === "replied"}
                            >
                              Mark sent
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => updateKitStatus(kit.jobId, "replied")}
                              disabled={busyKitId === kit.jobId || kit.status === "replied"}
                            >
                              Mark replied
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <div className="rounded-xl bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Fit bullets</div>
                            <ul className="mt-2 space-y-1 text-sm text-slate-700">
                              {kit.fitBullets.map((bullet) => (
                                <li key={bullet}>• {bullet}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Resume notes</div>
                            <ul className="mt-2 space-y-1 text-sm text-slate-700">
                              {kit.resumeNotes.map((note) => (
                                <li key={note}>• {note}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        {kit.interviewPrep ? (
                          <div className="mt-3 rounded-xl bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Interview prep</div>
                                <div className="mt-1 text-sm font-semibold text-slate-950">{kit.interviewPrep.roleFocus}</div>
                              </div>
                              <Badge variant="outline">Round-wise guide</Badge>
                            </div>
                            <div className="mt-3 grid gap-3 lg:grid-cols-3">
                              <PrepList title="Technical" items={kit.interviewPrep.technicalQuestions} />
                              <PrepList title="HR / Culture" items={kit.interviewPrep.hrQuestions} />
                              <PrepList title="Project Deep Dive" items={kit.interviewPrep.projectQuestions} />
                            </div>
                            <div className="mt-3 rounded-xl bg-slate-50 p-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">7-day prep plan</div>
                              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                {kit.interviewPrep.prepPlan.map((item) => (
                                  <div key={item} className="text-sm text-slate-700">• {item}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            Referral Kits & Follow-ups
          </CardTitle>
          <CardDescription>Track messages you plan to send, messages already sent, and follow-ups that need attention.</CardDescription>
        </CardHeader>
        <CardContent>
          {kitsLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-slate-600">Syncing saved referral kits...</div>
          ) : referralKitList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
              <MessageSquareText className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-950">No referral kits yet</h3>
              <p className="mt-1 text-sm text-slate-500">Generate a kit from any matched job to create a DM, follow-up, and resume notes.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {referralKitList.map((kit) => (
                <div key={kit.jobId} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-semibold text-slate-950">{kit.jobTitle}</div>
                      <Badge variant="outline">{kit.company}</Badge>
                      <Badge className={kit.status === "replied" ? "bg-green-100 text-green-800" : kit.status === "sent" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"}>
                        {kit.status}
                      </Badge>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {kit.matchScore}% match • Follow-up target: {kit.followUpDate} • Referrer: {kit.referrerName}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyText("Referral message", kit.referralMessage)}>
                      Copy DM
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyText("Follow-up", kit.followUpMessage)}>
                      Copy follow-up
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => updateKitStatus(kit.jobId, "draft")} disabled={busyKitId === kit.jobId}>
                      Reset
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Career Agent Timeline
          </CardTitle>
          <CardDescription>Your live history across referral kits, applications, mentor suggestions, and interview prep.</CardDescription>
        </CardHeader>
        <CardContent>
          {careerTimeline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center">
              <CalendarClock className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-950">No career activity yet</h3>
              <p className="mt-1 text-sm text-slate-500">Run ATS, generate a kit, apply to jobs, or book a mentor to build your timeline.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {careerTimeline.map((event) => (
                <div key={event.id} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${event.tone === "green" ? "bg-green-500" : event.tone === "blue" ? "bg-blue-500" : event.tone === "amber" ? "bg-amber-500" : event.tone === "violet" ? "bg-violet-500" : "bg-slate-400"}`} />
                  <div>
                    <div className="font-semibold text-slate-950">{event.title}</div>
                    <div className="mt-1 text-sm text-slate-600">{event.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-blue-600" />
            What the agent does next
          </CardTitle>
          <CardDescription>Phase 1 + Phase 2 connects existing ReferralMe features into a single operating flow.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <NextAction title="Resume improvement" description="Use ATS score and missing keywords to improve the profile before applying." />
          <NextAction title="Job discovery" description="Rank live jobs by fit and show missing skills before referral requests." />
          <NextAction title="Referral + interview prep" description="Save live referral kits with follow-ups and role-specific interview practice." />
        </CardContent>
      </Card>
    </div>
  );
}

function AgentStepCard({
  title,
  value,
  hint,
  icon: Icon,
  action,
  onClick,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: typeof FileText;
  action: string;
  onClick: () => void;
}) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="rounded-2xl bg-blue-50 p-2 text-blue-600">
            <Icon className="h-4 w-4" />
          </div>
          <Badge variant="outline">{title}</Badge>
        </div>
        <div className="text-2xl font-bold text-slate-950">{value}</div>
        <p className="mt-1 min-h-[38px] text-xs leading-5 text-slate-500">{hint}</p>
        <Button variant="outline" size="sm" onClick={onClick} className="mt-3 w-full">
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}

function PrepList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="font-semibold text-slate-950">{title}</div>
      <ul className="mt-2 space-y-2 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function NextAction({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-semibold text-slate-950">{title}</div>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
