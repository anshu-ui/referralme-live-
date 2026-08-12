import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Copy,
  FileText,
  History,
  ListChecks,
  Loader2,
  MessageSquareText,
  Mic2,
  RefreshCcw,
  Save,
  Send,
  Sparkles,
  Target,
  Wand2,
} from "lucide-react";
import type {
  AiInterviewQuestion,
  AiInterviewScorecard,
  AiInterviewSession,
  FirestoreUser,
  PlacementPlan,
  PlacementPlanTask,
} from "../lib/firestore";
import {
  getLatestPlacementPlan,
  saveAiInterviewSession,
  savePlacementPlan,
  subscribeToAiInterviewSessions,
  updateAiInterviewSession,
  updatePlacementPlan,
} from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import { analyzeResumeWithGemini } from "../lib/gemini-ats";

type ChatMsg = { role: "user" | "assistant"; content: string; ts: number };
type Tab = "chat" | "plan" | "resume" | "interview" | "rewrite";
type AiUsage = { count: number; limit: number } | null;

const ROUND_TYPES = [
  { id: "technical", label: "Technical" },
  { id: "hr", label: "HR" },
  { id: "manager", label: "Manager" },
  { id: "system-design", label: "System Design" },
  { id: "case-study", label: "Case Study" },
];

const DIFFICULTIES = [
  { id: "fresher", label: "Fresher" },
  { id: "intermediate", label: "Intermediate" },
  { id: "experienced", label: "Experienced" },
] as const;

function getInitials(name?: string) {
  const parts = (name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

function keyFor(uid: string) {
  return `referralme:ai-mentor:${uid}`;
}

function extractJsonObject(text: string) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function clampScore(value: unknown, fallback = 60) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function normalizeScorecard(raw: any): AiInterviewScorecard {
  const overall = clampScore(raw?.overall);
  const verdict =
    raw?.verdict === "ready" || raw?.verdict === "almost_ready" || raw?.verdict === "needs_practice"
      ? raw.verdict
      : overall >= 78
        ? "ready"
        : overall >= 62
          ? "almost_ready"
          : "needs_practice";

  return {
    overall,
    communication: clampScore(raw?.communication, overall),
    technical: clampScore(raw?.technical, overall),
    confidence: clampScore(raw?.confidence, overall),
    roleFit: clampScore(raw?.roleFit, overall),
    verdict,
    strengths: Array.isArray(raw?.strengths) ? raw.strengths.map(String).slice(0, 4) : ["You completed a structured mock interview."],
    improvements: Array.isArray(raw?.improvements) ? raw.improvements.map(String).slice(0, 4) : ["Add more structure, examples, and measurable impact."],
    nextSteps: Array.isArray(raw?.nextSteps) ? raw.nextSteps.map(String).slice(0, 4) : ["Rewrite weak answers and practice one timed mock."],
  };
}

function fallbackQuestions(targetRole: string, roundType: string): AiInterviewQuestion[] {
  const role = targetRole || "your target role";
  const isHr = roundType.includes("hr");
  const questions = isHr
    ? [
        `Tell me about yourself for a ${role} opportunity.`,
        "Why are you interested in this role and company type?",
        "Tell me about a difficult situation and how you handled it.",
        "What is one strength and one area you are actively improving?",
        "Why should we select you over another candidate?",
      ]
    : [
        `Walk me through your strongest ${role} project end-to-end.`,
        "Describe a difficult problem you solved and the tradeoffs you considered.",
        "How would you debug a production issue in your work?",
        "What skills from your resume are strongest for this role? Give proof.",
        "What would you improve if you rebuilt your best project today?",
      ];

  return questions.map((question, index) => ({
    id: `q${index + 1}`,
    question,
    focus: `${roundType || "interview"} readiness`,
  }));
}

function buildPlacementTasks(intake: {
  targetRole: string;
  dreamCompanies: string;
  biggestBlocker: string;
}): PlacementPlanTask[] {
  const role = intake.targetRole.trim() || "target role";
  const targets = intake.dreamCompanies.trim() || "target companies";
  const blocker = intake.biggestBlocker.trim() || "your biggest blocker";

  return [
    {
      id: "week1-resume",
      week: 1,
      title: "Fix resume positioning",
      description: `Rewrite the top resume section for ${role}: headline, skills, and 3 impact bullets.`,
      done: false,
    },
    {
      id: "week1-ats",
      week: 1,
      title: "Run ATS gap check",
      description: "Compare your resume with 2 target JDs and add only truthful missing keywords.",
      done: false,
    },
    {
      id: "week1-profile",
      week: 1,
      title: "Clean LinkedIn/profile proof",
      description: `Update headline, About, and project links so ${targets} can understand your fit quickly.`,
      done: false,
    },
    {
      id: "week2-skill",
      week: 2,
      title: "Close the biggest skill gap",
      description: `Spend 5 focused sessions on the blocker: ${blocker}. Track mistakes and fixes.`,
      done: false,
    },
    {
      id: "week2-project",
      week: 2,
      title: "Create proof of work",
      description: `Ship or polish one ${role} project/case study with problem, approach, stack, and outcome.`,
      done: false,
    },
    {
      id: "week2-keywords",
      week: 2,
      title: "Build target keyword map",
      description: "Collect 10 JDs and list repeated skills, tools, responsibilities, and interview themes.",
      done: false,
    },
    {
      id: "week3-technical",
      week: 3,
      title: "Round-wise interview prep",
      description: "Prepare technical/domain, project, HR, and manager-round answers separately.",
      done: false,
    },
    {
      id: "week3-mock",
      week: 3,
      title: "Do two mock interviews",
      description: "Record answers, note weak points, and rewrite your project explanation.",
      done: false,
    },
    {
      id: "week3-stories",
      week: 3,
      title: "Prepare 6 STAR stories",
      description: "Ownership, conflict, failure, leadership, learning, and measurable impact.",
      done: false,
    },
    {
      id: "week4-applications",
      week: 4,
      title: "Apply with a focused pipeline",
      description: "Apply to 20 high-fit roles, track every application, and follow up professionally.",
      done: false,
    },
    {
      id: "week4-network",
      week: 4,
      title: "Use ReferralMe network",
      description: "Shortlist mentors/referrers that match your role, company type, and skill gaps.",
      done: false,
    },
    {
      id: "week4-review",
      week: 4,
      title: "Review and upgrade",
      description: "Measure response rate, interview calls, ATS score, and decide the next 30-day focus.",
      done: false,
    },
  ];
}

export default function AiMentorChat({
  user,
  onBookMentor,
}: {
  user: FirestoreUser;
  onBookMentor?: (prefill?: { search?: string }) => void;
}) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("chat");
  const [planStep, setPlanStep] = useState(1);

  const [planText, setPlanText] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [savedPlacementPlan, setSavedPlacementPlan] = useState<PlacementPlan | null>(null);
  const [placementTasks, setPlacementTasks] = useState<PlacementPlanTask[]>([]);

  const [intake, setIntake] = useState({
    targetRole: "",
    dreamCompanies: "",
    experience: user.experience || "",
    location: user.location || "",
    currentStatus: "",
    biggestBlocker: "",
    resumeText: "",
  });

  const [resumeCoach, setResumeCoach] = useState({
    resumeText: "",
    jobDescription: "",
  });
  const [atsResult, setAtsResult] = useState<any>(null);
  const [atsLoading, setAtsLoading] = useState(false);
  const [atsError, setAtsError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        "Tell me your target role and where you’re stuck. I’ll ask a few clarifying questions and then give you a clear plan.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [aiUsage, setAiUsage] = useState<AiUsage>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [interviewPack, setInterviewPack] = useState({
    roundType: "technical",
    out: null as string | null,
    loading: false,
  });
  const [interviewPractice, setInterviewPractice] = useState<{
    targetRole: string;
    roundType: string;
    difficulty: "fresher" | "intermediate" | "experienced";
    questionCount: number;
    questions: AiInterviewQuestion[];
    answers: Record<string, string>;
    scorecard: AiInterviewScorecard | null;
    feedback: string | null;
    sessionId: string | null;
    generating: boolean;
    evaluating: boolean;
  }>({
    targetRole: intake.targetRole || user.designation || "",
    roundType: "technical",
    difficulty: "fresher",
    questionCount: 5,
    questions: [],
    answers: {},
    scorecard: null,
    feedback: null,
    sessionId: null,
    generating: false,
    evaluating: false,
  });
  const [interviewHistory, setInterviewHistory] = useState<AiInterviewSession[]>([]);
  const [interviewFeedback, setInterviewFeedback] = useState({
    useful: null as boolean | null,
    rating: 0,
    wantsMentorHelp: false,
    comment: "",
    saving: false,
    submitted: false,
  });
  const [resumeRewrite, setResumeRewrite] = useState({
    resumeText: "",
    out: null as string | null,
    loading: false,
  });

  const profile = useMemo(() => {
    return {
      name: user.displayName,
      role: user.role,
      experience: user.experience,
      designation: user.designation,
      location: user.location,
      skills: user.skills?.slice?.(0, 12),
      linkedinUrl: user.linkedinUrl,
    };
  }, [user]);

  const intakeComplete =
    intake.targetRole.trim().length > 1 &&
    intake.experience.trim().length > 0 &&
    intake.currentStatus.trim().length > 3 &&
    (intake.resumeText.trim().length > 50 || (user.linkedinUrl || "").trim().length > 5);

  const intakeSummary = useMemo(() => {
    return [
      `Target role: ${intake.targetRole || "-"}`,
      `Dream companies/type: ${intake.dreamCompanies || "-"}`,
      `Experience: ${intake.experience || "-"}`,
      `Location: ${intake.location || "-"}`,
      `Current status: ${intake.currentStatus || "-"}`,
      `Biggest blocker: ${intake.biggestBlocker || "-"}`,
      `Resume: ${
        intake.resumeText
          ? `${Math.min(intake.resumeText.length, 4000)} chars provided`
          : user.linkedinUrl
            ? `LinkedIn: ${user.linkedinUrl}`
            : "-"
      }`,
    ].join("\n");
  }, [intake, user.linkedinUrl]);

  const canSend = input.trim().length > 0 && !sending;

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied" });
    } catch {
      toast({ title: "Copy failed", description: "Your browser blocked clipboard access." });
    }
  };

  const mentorRequest = async (payload: any) => {
    const resp = await fetch("/api/ai/mentor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, userId: user.uid }),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error(data?.message || "AI mentor failed");
    if (data?.usage && Number.isFinite(Number(data.usage.count)) && Number.isFinite(Number(data.usage.limit))) {
      setAiUsage({ count: Number(data.usage.count), limit: Number(data.usage.limit) });
    }
    if (data?.usageLimited) {
      toast({
        title: "Daily AI limit reached",
        description: "Using offline guidance so you can continue without extra AI cost.",
      });
    }
    const text = String(data?.text || "").trim();
    if (!text) throw new Error("AI mentor returned empty response");
    return { text, offline: Boolean(data?.offline) };
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(user.uid));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed.slice(-50));
    } catch {
      // ignore
    }
  }, [user.uid]);

  useEffect(() => {
    const k = `${keyFor(user.uid)}:intake`;
    const kp = `${keyFor(user.uid)}:plan`;
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setIntake((prev) => ({ ...prev, ...parsed }));
      }
      const rawPlan = localStorage.getItem(kp);
      if (rawPlan) setPlanText(rawPlan);
    } catch {
      // ignore
    }
  }, [user.uid]);

  useEffect(() => {
    let cancelled = false;

    const loadPlan = async () => {
      const latestPlan = await getLatestPlacementPlan(user.uid);
      if (cancelled || !latestPlan) return;

      setSavedPlacementPlan(latestPlan);
      setPlanText(latestPlan.planText);
      setPlacementTasks(Array.isArray(latestPlan.tasks) ? latestPlan.tasks : []);
    };

    loadPlan();

    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  useEffect(() => {
    const unsubscribe = subscribeToAiInterviewSessions(
      user.uid,
      setInterviewHistory,
      () => toast({ title: "Interview history unavailable", description: "Could not load saved mock interviews." }),
    );

    return unsubscribe;
  }, [toast, user.uid]);

  useEffect(() => {
    if (!intake.targetRole.trim()) return;
    setInterviewPractice((prev) => (
      prev.targetRole.trim() ? prev : { ...prev, targetRole: intake.targetRole.trim() }
    ));
  }, [intake.targetRole]);

  useEffect(() => {
    // Keep resume coach prefilled from intake, but do not overwrite edits.
    setResumeCoach((p) => ({
      ...p,
      resumeText: p.resumeText.trim() ? p.resumeText : intake.resumeText || p.resumeText,
    }));
    setResumeRewrite((p) => ({
      ...p,
      resumeText: p.resumeText.trim() ? p.resumeText : intake.resumeText || p.resumeText,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intake.resumeText]);

  useEffect(() => {
    try {
      localStorage.setItem(keyFor(user.uid), JSON.stringify(messages.slice(-50)));
    } catch {
      // ignore
    }
  }, [messages, user.uid]);

  useEffect(() => {
    try {
      localStorage.setItem(`${keyFor(user.uid)}:intake`, JSON.stringify(intake));
    } catch {
      // ignore
    }
  }, [intake, user.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const generatePlan = async () => {
    if (!intakeComplete) {
      toast({
        title: "Complete the intake",
        description: "Fill the role, status, and add resume text (or LinkedIn link) first.",
      });
      return;
    }
    setPlanLoading(true);
    try {
      const { text, offline } = await mentorRequest({
        mode: "plan",
        intake,
        profile,
        timeline: "30-day-placement-roadmap",
      });
      if (offline) toast({ title: "AI is busy", description: "Using offline guidance for now." });
      const tasks = buildPlacementTasks(intake);
      setPlanText(text);
      setPlacementTasks(tasks);
      try {
        localStorage.setItem(`${keyFor(user.uid)}:plan`, text);
      } catch {
        // ignore
      }
      try {
        const planId = await savePlacementPlan({
          userId: user.uid,
          targetRole: intake.targetRole.trim(),
          dreamCompanies: intake.dreamCompanies.trim() || undefined,
          experience: intake.experience.trim() || undefined,
          location: intake.location.trim() || undefined,
          currentStatus: intake.currentStatus.trim() || undefined,
          biggestBlocker: intake.biggestBlocker.trim() || undefined,
          resumeTextPreview: intake.resumeText.trim().slice(0, 1200) || undefined,
          planText: text,
          tasks,
        });
        setSavedPlacementPlan({
          id: planId,
          userId: user.uid,
          targetRole: intake.targetRole.trim(),
          dreamCompanies: intake.dreamCompanies.trim() || undefined,
          experience: intake.experience.trim() || undefined,
          location: intake.location.trim() || undefined,
          currentStatus: intake.currentStatus.trim() || undefined,
          biggestBlocker: intake.biggestBlocker.trim() || undefined,
          resumeTextPreview: intake.resumeText.trim().slice(0, 1200) || undefined,
          planText: text,
          tasks,
          createdAt: new Date() as any,
          updatedAt: new Date() as any,
        });
        toast({ title: "Placement plan saved" });
      } catch {
        toast({ title: "Plan generated", description: "Saved locally. Cloud save failed, please try again later." });
      }
    } catch (e: any) {
      toast({ title: "AI mentor unavailable", description: e?.message || "Please try again." });
    } finally {
      setPlanLoading(false);
    }
  };

  const sendChat = async (content: string) => {
    const userMsg: ChatMsg = { role: "user", content: content.slice(0, 4000), ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const { text, offline } = await mentorRequest({
        mode: "chat",
        intake,
        messages: [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content })),
        profile,
      });
      if (offline) toast({ title: "AI is busy", description: "Using offline guidance for now." });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: text, ts: Date.now() },
      ]);
    } catch (e: any) {
      toast({ title: "AI mentor unavailable", description: e?.message || "Please try again." });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I couldn’t respond right now. Please try again in a moment.", ts: Date.now() },
      ]);
    } finally {
      setSending(false);
    }
  };

  const startChatFromIntake = async () => {
    if (!intakeComplete) {
      toast({
        title: "Complete the intake",
        description: "Fill the role, status, and add resume text (or LinkedIn link) first.",
      });
      return;
    }
    setTab("chat");
    await sendChat(`Context:\n${intakeSummary}\n\nPlease ask 3 clarifying questions first, then give me next steps.`);
  };

  const send = async () => {
    if (!canSend) return;
    const msg = input.trim();
    setInput("");
    await sendChat(msg);
  };

  const runAts = async () => {
    const resumeText = resumeCoach.resumeText.trim();
    if (resumeText.length < 120) {
      setAtsError("Paste at least a few sections of your resume (120+ characters) for an accurate scan.");
      return;
    }
    setAtsError(null);
    setAtsLoading(true);
    try {
      const result = await analyzeResumeWithGemini(resumeText, resumeCoach.jobDescription || "", {
        jobTitle: intake.targetRole || undefined,
      });
      setAtsResult(result);
    } catch (e: any) {
      setAtsError(e?.message || "Could not analyze resume right now.");
    } finally {
      setAtsLoading(false);
    }
  };

  const handoffSearch = useMemo(() => {
    const parts = [intake.targetRole, intake.dreamCompanies].map((v) => v.trim()).filter(Boolean);
    return parts.join(" ").trim();
  }, [intake.dreamCompanies, intake.targetRole]);

  const planProgress = useMemo(() => {
    if (!placementTasks.length) return { done: 0, total: 0, percent: 0 };
    const done = placementTasks.filter((task) => task.done).length;
    return {
      done,
      total: placementTasks.length,
      percent: Math.round((done / placementTasks.length) * 100),
    };
  }, [placementTasks]);

  const tasksByWeek = useMemo(() => {
    return [1, 2, 3, 4].map((week) => ({
      week,
      tasks: placementTasks.filter((task) => task.week === week),
    }));
  }, [placementTasks]);

  const bookMentor = () => {
    onBookMentor?.({ search: handoffSearch });
  };

  const togglePlacementTask = async (taskId: string) => {
    const nextTasks = placementTasks.map((task) =>
      task.id === taskId ? { ...task, done: !task.done } : task,
    );
    setPlacementTasks(nextTasks);
    setSavedPlacementPlan((prev) => (prev ? { ...prev, tasks: nextTasks } : prev));

    if (!savedPlacementPlan?.id) return;

    try {
      await updatePlacementPlan(savedPlacementPlan.id, { tasks: nextTasks });
    } catch {
      toast({ title: "Progress not saved", description: "Please try again in a moment." });
    }
  };

  const generateInterviewPractice = async () => {
    const targetRole = interviewPractice.targetRole.trim() || intake.targetRole.trim();
    if (!targetRole) {
      toast({ title: "Add target role", description: "Choose the role you want to practice for first." });
      return;
    }

    setInterviewPractice((p) => ({
      ...p,
      generating: true,
      scorecard: null,
      feedback: null,
      sessionId: null,
    }));

    try {
      const { text, offline } = await mentorRequest({
        mode: "interview-questions",
        intake: { ...intake, targetRole },
        profile,
        roundType: interviewPractice.roundType,
        difficulty: interviewPractice.difficulty,
        questionCount: interviewPractice.questionCount,
      });
      if (offline) toast({ title: "AI is busy", description: "Using offline interview questions for now." });
      const parsed = extractJsonObject(text);
      const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
      const questions = rawQuestions
        .map((q: any, index: number) => ({
          id: String(q?.id || `q${index + 1}`),
          question: String(q?.question || "").trim(),
          focus: String(q?.focus || `${interviewPractice.roundType} readiness`).trim(),
        }))
        .filter((q: AiInterviewQuestion) => q.question)
        .slice(0, 8);

      const nextQuestions = questions.length ? questions : fallbackQuestions(targetRole, interviewPractice.roundType);
      const sessionId = await saveAiInterviewSession({
        userId: user.uid,
        targetRole,
        roundType: interviewPractice.roundType,
        difficulty: interviewPractice.difficulty,
        questions: nextQuestions,
        answers: [],
        status: "draft",
      });

      setInterviewPractice((p) => ({
        ...p,
        targetRole,
        questions: nextQuestions,
        answers: {},
        sessionId,
      }));
      toast({ title: "Mock interview ready", description: "Answer each question, then generate your scorecard." });
    } catch (e: any) {
      const fallback = fallbackQuestions(targetRole, interviewPractice.roundType);
      setInterviewPractice((p) => ({
        ...p,
        targetRole,
        questions: fallback,
        answers: {},
      }));
      toast({ title: "Using offline questions", description: e?.message || "AI question generation was unavailable." });
    } finally {
      setInterviewPractice((p) => ({ ...p, generating: false }));
    }
  };

  const evaluateInterviewPractice = async () => {
    if (!interviewPractice.questions.length) return;
    const answers = interviewPractice.questions.map((question) => ({
      questionId: question.id,
      question: question.question,
      answer: (interviewPractice.answers[question.id] || "").trim(),
    }));
    const answered = answers.filter((answer) => answer.answer.length >= 30);
    if (answered.length < Math.min(3, interviewPractice.questions.length)) {
      toast({ title: "Answer more questions", description: "Write at least 3 meaningful answers before evaluation." });
      return;
    }

    setInterviewPractice((p) => ({ ...p, evaluating: true }));
    try {
      const { text, offline } = await mentorRequest({
        mode: "interview-evaluate",
        intake: { ...intake, targetRole: interviewPractice.targetRole },
        profile,
        roundType: interviewPractice.roundType,
        difficulty: interviewPractice.difficulty,
        answers,
      });
      if (offline) toast({ title: "AI is busy", description: "Using offline scorecard for now." });
      const parsed = extractJsonObject(text);
      const scorecard = normalizeScorecard(parsed?.scorecard);
      const feedback = String(parsed?.text || text || "").trim();
      const sessionPayload = {
        answers,
        scorecard,
        aiFeedback: feedback,
        status: "completed" as const,
      };

      if (interviewPractice.sessionId) {
        await updateAiInterviewSession(interviewPractice.sessionId, sessionPayload);
      } else {
        const sessionId = await saveAiInterviewSession({
          userId: user.uid,
          targetRole: interviewPractice.targetRole,
          roundType: interviewPractice.roundType,
          difficulty: interviewPractice.difficulty,
          questions: interviewPractice.questions,
          ...sessionPayload,
        });
        setInterviewPractice((p) => ({ ...p, sessionId }));
      }

      setInterviewPractice((p) => ({ ...p, scorecard, feedback }));
      setInterviewFeedback({
        useful: null,
        rating: 0,
        wantsMentorHelp: scorecard.overall < 70,
        comment: "",
        saving: false,
        submitted: false,
      });
      toast({ title: "Scorecard generated", description: `Interview readiness: ${scorecard.overall}/100` });
    } catch (e: any) {
      toast({ title: "Evaluation failed", description: e?.message || "Please try again." });
    } finally {
      setInterviewPractice((p) => ({ ...p, evaluating: false }));
    }
  };

  const submitInterviewFeedback = async () => {
    if (!interviewPractice.sessionId || interviewFeedback.useful === null || !interviewFeedback.rating) {
      toast({ title: "Add quick feedback", description: "Select usefulness and a 1-5 rating first." });
      return;
    }

    setInterviewFeedback((p) => ({ ...p, saving: true }));
    try {
      await updateAiInterviewSession(interviewPractice.sessionId, {
        userFeedbackUseful: interviewFeedback.useful,
        userFeedbackRating: interviewFeedback.rating,
        userWantsMentorHelp: interviewFeedback.wantsMentorHelp,
        userFeedbackComment: interviewFeedback.comment.trim() || undefined,
        userFeedbackAt: new Date() as any,
      });
      setInterviewFeedback((p) => ({ ...p, saving: false, submitted: true }));
      toast({ title: "Feedback saved", description: "This helps improve ReferralMe interview scoring." });
    } catch (e: any) {
      setInterviewFeedback((p) => ({ ...p, saving: false }));
      toast({ title: "Feedback not saved", description: e?.message || "Please try again." });
    }
  };

  const sectionTabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: "chat", label: "Chat", icon: MessageSquareText },
    { id: "plan", label: "Placement Plan", icon: CalendarDays },
    { id: "resume", label: "Resume Coach", icon: Target },
    { id: "interview", label: "AI Interview", icon: Mic2 },
    { id: "rewrite", label: "Resume Rewrite", icon: RefreshCcw },
  ];

  return (
    <Card className="border-slate-200/80">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Mentor
              <Badge variant="secondary" className="ml-1">
                Beta
              </Badge>
            </CardTitle>
            <CardDescription>Chat with a career mentor, build a placement plan, review resumes, and prepare round-wise.</CardDescription>
            {aiUsage ? (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                AI requests today: {aiUsage.count}/{aiUsage.limit}
              </div>
            ) : (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                Daily AI usage is protected with automatic fallback.
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setTab("plan");
                setPlanStep(1);
              }}
            >
              Placement plan
            </Button>
            <Button onClick={bookMentor} disabled={!onBookMentor || !intakeComplete}>
              Book a mentor
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {sectionTabs.map((t) => {
            const Icon = t.icon;
            return (
              <Button
                key={t.id}
                variant={tab === t.id ? "default" : "outline"}
                size="sm"
                onClick={() => setTab(t.id)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {tab === "chat" ? (
          <>
            {!intakeComplete ? (
              <div className="rounded-xl border bg-slate-50 p-4">
                <div className="text-sm font-medium text-slate-900">For better answers</div>
                <p className="mt-1 text-sm text-slate-600">
                  Fill the intake once (role, status, resume). The chat will still work, but your guidance will be more specific.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setTab("plan")} className="gap-2">
                    <FileText className="h-4 w-4" /> Open intake
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="h-[420px] overflow-auto rounded-xl border bg-white p-3">
              <div className="space-y-3">
                {messages.map((m, idx) => (
                  <div key={idx} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div className="flex max-w-[92%] items-start gap-2">
                      {m.role === "assistant" ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="/logo.png" alt="ReferralMe" />
                          <AvatarFallback>R</AvatarFallback>
                        </Avatar>
                      ) : null}
                      <div
                        className={[
                          "rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                          m.role === "user" ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-900 border",
                        ].join(" ")}
                      >
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      </div>
                      {m.role === "user" ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profileImageUrl || user.photoURL} alt={user.displayName} />
                          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                      ) : null}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask: resume improvements, outreach message, interview plan..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button onClick={send} disabled={!canSend} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send
              </Button>
            </div>
          </>
        ) : null}

        {tab === "plan" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-5 text-white shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-200">AI Placement Plan</div>
                  <h3 className="mt-1 text-xl font-semibold">Build a clear 30-day path to interviews.</h3>
                </div>
                <Badge variant={intakeComplete ? "default" : "secondary"} className="w-fit">
                  {savedPlacementPlan ? "Saved" : intakeComplete ? "Ready" : "Intake needed"}
                </Badge>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-slate-200">
                Answer once, then ReferralMe creates a structured plan for resume, ATS, interview prep, applications, and mentor handoff.
              </p>
            </div>

            <Card className="border-slate-200/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Career intake · Step {planStep} of 4</CardTitle>
                <CardDescription>Short answers are fine. Better context creates better guidance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {planStep === 1 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Target role</Label>
                      <Input
                        value={intake.targetRole}
                        onChange={(e) => setIntake((p) => ({ ...p, targetRole: e.target.value }))}
                        placeholder="SDE-1, Data Analyst, Product Intern..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dream companies or type</Label>
                      <Input
                        value={intake.dreamCompanies}
                        onChange={(e) => setIntake((p) => ({ ...p, dreamCompanies: e.target.value }))}
                        placeholder="Google, Flipkart, startups, fintech..."
                      />
                    </div>
                  </div>
                ) : null}

                {planStep === 2 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Experience</Label>
                      <Input
                        value={intake.experience}
                        onChange={(e) => setIntake((p) => ({ ...p, experience: e.target.value }))}
                        placeholder="Fresher, 1 year, 3 years..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={intake.location}
                        onChange={(e) => setIntake((p) => ({ ...p, location: e.target.value }))}
                        placeholder="Delhi, Bangalore, Remote..."
                      />
                    </div>
                  </div>
                ) : null}

                {planStep === 3 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Current status</Label>
                      <Textarea
                        value={intake.currentStatus}
                        onChange={(e) => setIntake((p) => ({ ...p, currentStatus: e.target.value }))}
                        placeholder="What are you doing right now? How many interviews, projects, applications?"
                        className="min-h-[120px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Biggest blocker</Label>
                      <Textarea
                        value={intake.biggestBlocker}
                        onChange={(e) => setIntake((p) => ({ ...p, biggestBlocker: e.target.value }))}
                        placeholder="Where are you stuck? Resume? DSA? referrals? confidence?"
                        className="min-h-[120px]"
                      />
                    </div>
                  </div>
                ) : null}

                {planStep === 4 ? (
                  <div className="space-y-2">
                    <Label>Resume text (recommended)</Label>
                    <Textarea
                      value={intake.resumeText}
                      onChange={(e) => setIntake((p) => ({ ...p, resumeText: e.target.value }))}
                      placeholder="Paste resume text (or key sections)."
                      className="min-h-[160px]"
                    />
                    <div className="text-xs text-slate-500">
                      Tip: Without resume text, the plan will be more general. You can also paste only Experience + Projects + Skills.
                    </div>
                  </div>
                ) : null}

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button variant="outline" onClick={() => setPlanStep((s) => Math.max(1, s - 1))} disabled={planStep === 1}>
                    Back
                  </Button>
                  <div className="flex flex-wrap items-center gap-2">
                    {planStep < 4 ? (
                      <Button onClick={() => setPlanStep((s) => Math.min(4, s + 1))} className="gap-2">
                        Next <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={startChatFromIntake} disabled={!intakeComplete}>
                          Start chat
                        </Button>
                        <Button onClick={generatePlan} disabled={!intakeComplete || planLoading} className="gap-2">
                          {planLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                          Generate 30-day plan
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {planText ? (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Card className="border-slate-200/80">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <Target className="h-4 w-4 text-blue-600" />
                        Target
                      </div>
                      <div className="mt-2 text-sm text-slate-600">{intake.targetRole || savedPlacementPlan?.targetRole || "Not set"}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-200/80">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <ListChecks className="h-4 w-4 text-blue-600" />
                        Progress
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {planProgress.done}/{planProgress.total} roadmap actions complete
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${planProgress.percent}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-slate-200/80">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <Save className="h-4 w-4 text-blue-600" />
                        Saved plan
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {savedPlacementPlan?.id ? "Saved to your ReferralMe profile." : "Saved locally on this device."}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {placementTasks.length ? (
                  <Card className="border-slate-200/80">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">30-day roadmap</CardTitle>
                      <CardDescription>Track the few actions that actually move placement outcomes.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-3 lg:grid-cols-2">
                      {tasksByWeek.map((group) => (
                        <div key={group.week} className="rounded-xl border bg-slate-50/70 p-3">
                          <div className="mb-3 text-sm font-semibold text-slate-900">Week {group.week}</div>
                          <div className="space-y-2">
                            {group.tasks.map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => togglePlacementTask(task.id)}
                                className="flex w-full gap-3 rounded-lg border bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
                              >
                                <CheckCircle2
                                  className={[
                                    "mt-0.5 h-4 w-4 shrink-0",
                                    task.done ? "text-emerald-600" : "text-slate-300",
                                  ].join(" ")}
                                />
                                <span>
                                  <span className="block text-sm font-medium text-slate-900">{task.title}</span>
                                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">{task.description}</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}

                <Card className="border-slate-200/80">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">AI mentor guidance</CardTitle>
                    <CardDescription>Use this as your detailed playbook, then continue in chat for follow-up questions.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="whitespace-pre-wrap rounded-xl border bg-white p-4 text-sm leading-relaxed text-slate-900">{planText}</div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setTab("chat")}>
                        Continue in chat
                      </Button>
                      <Button variant="outline" onClick={() => planText && copyText(planText)} className="gap-2">
                        <Copy className="h-4 w-4" />
                        Copy plan
                      </Button>
                      <Button onClick={bookMentor} disabled={!onBookMentor || !intakeComplete}>
                        Book mentor review
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === "resume" ? (
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                Resume Coach (ATS + Tailoring)
              </CardTitle>
              <CardDescription>
                Paste resume text and optionally a job description. Keyword matching is most accurate when you add a JD.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Resume text</Label>
                  <Textarea
                    value={resumeCoach.resumeText}
                    onChange={(e) => setResumeCoach((p) => ({ ...p, resumeText: e.target.value }))}
                    placeholder="Paste your resume sections: Summary, Experience, Projects, Skills."
                    className="min-h-[140px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target job description (optional, recommended)</Label>
                  <Textarea
                    value={resumeCoach.jobDescription}
                    onChange={(e) => setResumeCoach((p) => ({ ...p, jobDescription: e.target.value }))}
                    placeholder="Paste the JD (Responsibilities + Requirements) for keyword matching."
                    className="min-h-[140px]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {atsError ? (
                  <div className="text-sm text-red-600 inline-flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {atsError}
                  </div>
                ) : resumeCoach.jobDescription.trim() ? (
                  <div className="text-xs text-slate-500">JD detected: keyword score + missing keywords will be more accurate.</div>
                ) : (
                  <div className="text-xs text-slate-500">
                    Without a JD, the “Keywords” score is only a rough estimate. Add a JD for real keyword matching.
                  </div>
                )}
                <Button onClick={runAts} disabled={atsLoading} className="gap-2">
                  {atsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Analyze
                </Button>
              </div>

              {atsResult ? (
                <div className="rounded-xl border bg-white p-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    {[
                      ["Overall", atsResult.overallScore],
                      ["Skills", atsResult.skillsScore],
                      ["Keywords", atsResult.keywordsScore],
                      ["Format", atsResult.formatScore],
                    ].map(([label, value]: any) => (
                      <div key={label} className="rounded-lg border bg-slate-50 p-3">
                        <div className="text-xs text-slate-600">{label}</div>
                        <div className="text-2xl font-semibold text-slate-900">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">Top fixes</div>
                      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                        {(atsResult.suggestions || []).slice(0, 6).map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">Strong points</div>
                      <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
                        {(atsResult.strongPoints || []).slice(0, 6).map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {(atsResult.missingKeywords || []).length ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-slate-900">Missing keywords (add naturally)</div>
                      <div className="flex flex-wrap gap-2">
                        {(atsResult.missingKeywords || []).slice(0, 16).map((k: string) => (
                          <span key={k} className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-700">
                            {k}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIntake((p) => ({ ...p, resumeText: resumeCoach.resumeText }));
                        setTab("plan");
                        setPlanStep(4);
                        toast({ title: "Saved to plan", description: "Your resume text is now attached to your intake." });
                      }}
                    >
                      Use this resume for plan
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        {tab === "interview" ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-3xl border bg-slate-950 text-white shadow-sm">
              <div className="grid gap-4 p-5 lg:grid-cols-[1.3fr_0.7fr]">
                <div>
                  <Badge className="bg-blue-500/20 text-blue-100 hover:bg-blue-500/20">AI Interview Arena</Badge>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">Practice like a real hiring round.</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                    Generate role-specific questions, write your answers, and get a hiring-style scorecard for communication,
                    technical depth, confidence, and role fit. Weak scores flow naturally into mentor booking.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="text-xs text-slate-300">Best score</div>
                    <div className="mt-2 text-3xl font-bold">
                      {interviewHistory.find((s) => s.scorecard)?.scorecard?.overall || 0}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="text-xs text-slate-300">Mocks saved</div>
                    <div className="mt-2 text-3xl font-bold">{interviewHistory.length}</div>
                  </div>
                </div>
              </div>
            </div>

            <Card className="border-slate-200/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mic2 className="h-4 w-4 text-blue-600" />
                  Mock interview setup
                </CardTitle>
                <CardDescription>Choose a role and round. ReferralMe will create questions and evaluate your answers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr]">
                  <div className="space-y-2">
                    <Label>Target role</Label>
                    <Input
                      value={interviewPractice.targetRole}
                      onChange={(e) => setInterviewPractice((p) => ({ ...p, targetRole: e.target.value }))}
                      placeholder="SDE-1, Data Analyst, Product Intern..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Questions</Label>
                    <Input
                      type="number"
                      min={3}
                      max={8}
                      value={interviewPractice.questionCount}
                      onChange={(e) =>
                        setInterviewPractice((p) => ({
                          ...p,
                          questionCount: Math.max(3, Math.min(8, Number(e.target.value || 5))),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Round type</Label>
                    <div className="flex flex-wrap gap-2">
                      {ROUND_TYPES.map((round) => (
                        <Button
                          key={round.id}
                          type="button"
                          size="sm"
                          variant={interviewPractice.roundType === round.id ? "default" : "outline"}
                          onClick={() => setInterviewPractice((p) => ({ ...p, roundType: round.id }))}
                        >
                          {round.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <div className="flex flex-wrap gap-2">
                      {DIFFICULTIES.map((difficulty) => (
                        <Button
                          key={difficulty.id}
                          type="button"
                          size="sm"
                          variant={interviewPractice.difficulty === difficulty.id ? "default" : "outline"}
                          onClick={() => setInterviewPractice((p) => ({ ...p, difficulty: difficulty.id }))}
                        >
                          {difficulty.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap justify-between gap-2 border-t pt-4">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setInterviewPack((p) => ({ ...p, loading: true, roundType: interviewPractice.roundType }));
                      try {
                        const { text, offline } = await mentorRequest({
                          mode: "interview-pack",
                          intake: { ...intake, targetRole: interviewPractice.targetRole || intake.targetRole },
                          profile,
                          roundType: interviewPractice.roundType,
                        });
                        if (offline) toast({ title: "AI is busy", description: "Using offline prep pack for now." });
                        setInterviewPack((p) => ({ ...p, out: text }));
                      } catch (e: any) {
                        toast({ title: "Prep pack unavailable", description: e?.message || "Please try again." });
                      } finally {
                        setInterviewPack((p) => ({ ...p, loading: false }));
                      }
                    }}
                    disabled={interviewPack.loading}
                    className="gap-2"
                  >
                    {interviewPack.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
                    Generate prep guide
                  </Button>
                  <Button onClick={generateInterviewPractice} disabled={interviewPractice.generating} className="gap-2">
                    {interviewPractice.generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Start AI mock interview
                  </Button>
                </div>
              </CardContent>
            </Card>

            {interviewPractice.questions.length ? (
              <Card className="border-slate-200/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Answer the interview</CardTitle>
                  <CardDescription>Write naturally. Strong answers include context, action, tradeoffs, and measurable result.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {interviewPractice.questions.map((question, index) => (
                    <div key={question.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <Badge variant="outline">Question {index + 1}</Badge>
                          <h4 className="mt-2 font-semibold leading-snug text-slate-950">{question.question}</h4>
                          <p className="mt-1 text-xs text-slate-500">Focus: {question.focus}</p>
                        </div>
                        <div className="text-xs text-slate-400">
                          {(interviewPractice.answers[question.id] || "").trim().split(/\s+/).filter(Boolean).length} words
                        </div>
                      </div>
                      <Textarea
                        value={interviewPractice.answers[question.id] || ""}
                        onChange={(e) =>
                          setInterviewPractice((p) => ({
                            ...p,
                            answers: { ...p.answers, [question.id]: e.target.value },
                          }))
                        }
                        placeholder="Answer in 6-10 lines. Include situation, action, tools/skills, result, and learning."
                        className="mt-3 min-h-[120px]"
                      />
                    </div>
                  ))}

                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-slate-50 p-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        Ready for scorecard?
                      </div>
                      <div className="text-xs text-slate-500">ReferralMe will score this like a hiring-readiness review.</div>
                    </div>
                    <Button onClick={evaluateInterviewPractice} disabled={interviewPractice.evaluating} className="gap-2">
                      {interviewPractice.evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                      Generate scorecard
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {interviewPractice.scorecard ? (
              <Card className="border-slate-200/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Hiring readiness scorecard</CardTitle>
                  <CardDescription>
                    Honest guidance only. This score helps preparation and does not guarantee interviews or hiring.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-5">
                    {[
                      ["Overall", interviewPractice.scorecard.overall],
                      ["Communication", interviewPractice.scorecard.communication],
                      ["Technical", interviewPractice.scorecard.technical],
                      ["Confidence", interviewPractice.scorecard.confidence],
                      ["Role Fit", interviewPractice.scorecard.roleFit],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="rounded-2xl border bg-slate-50 p-4">
                        <div className="text-xs text-slate-500">{label}</div>
                        <div className="mt-2 text-2xl font-bold text-slate-950">{String(value)}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    <div className="rounded-2xl border bg-emerald-50 p-4">
                      <div className="font-semibold text-emerald-950">Strengths</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
                        {interviewPractice.scorecard.strengths.map((item, index) => <li key={index}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-2xl border bg-amber-50 p-4">
                      <div className="font-semibold text-amber-950">Improve next</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                        {interviewPractice.scorecard.improvements.map((item, index) => <li key={index}>{item}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-2xl border bg-blue-50 p-4">
                      <div className="font-semibold text-blue-950">Next steps</div>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-900">
                        {interviewPractice.scorecard.nextSteps.map((item, index) => <li key={index}>{item}</li>)}
                      </ul>
                    </div>
                  </div>

                  {interviewPractice.feedback ? (
                    <div className="rounded-2xl border bg-white p-4">
                      <div className="mb-2 text-sm font-semibold text-slate-900">AI feedback</div>
                      <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{interviewPractice.feedback}</div>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => interviewPractice.feedback && copyText(interviewPractice.feedback)} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy feedback
                    </Button>
                    {interviewPractice.scorecard.overall < 70 ? (
                      <Button onClick={bookMentor} disabled={!onBookMentor} className="gap-2">
                        <CalendarDays className="h-4 w-4" />
                        Book mentor mock
                      </Button>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">Was this scorecard useful?</div>
                        <p className="mt-1 text-xs text-slate-500">
                          Your feedback helps improve ReferralMe&apos;s interview guidance and mentor handoff.
                        </p>
                      </div>
                      {interviewFeedback.submitted ? (
                        <Badge className="w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Feedback saved</Badge>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_1fr]">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={interviewFeedback.useful === true ? "default" : "outline"}
                            onClick={() => setInterviewFeedback((p) => ({ ...p, useful: true }))}
                          >
                            Useful
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={interviewFeedback.useful === false ? "default" : "outline"}
                            onClick={() => setInterviewFeedback((p) => ({ ...p, useful: false }))}
                          >
                            Needs work
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Button
                              key={rating}
                              type="button"
                              size="sm"
                              variant={interviewFeedback.rating === rating ? "default" : "outline"}
                              onClick={() => setInterviewFeedback((p) => ({ ...p, rating }))}
                            >
                              {rating}
                            </Button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={interviewFeedback.wantsMentorHelp}
                            onChange={(event) => setInterviewFeedback((p) => ({ ...p, wantsMentorHelp: event.target.checked }))}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                          I want mentor help for this round
                        </label>
                      </div>
                      <div className="space-y-3">
                        <Textarea
                          value={interviewFeedback.comment}
                          onChange={(event) => setInterviewFeedback((p) => ({ ...p, comment: event.target.value }))}
                          placeholder="Optional: what felt useful or confusing?"
                          className="min-h-[92px] bg-white"
                        />
                        <div className="flex justify-end">
                          <Button
                            onClick={submitInterviewFeedback}
                            disabled={interviewFeedback.saving || interviewFeedback.submitted}
                            className="gap-2"
                          >
                            {interviewFeedback.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                            Submit feedback
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {interviewPack.out ? (
              <Card className="border-slate-200/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Round prep guide</CardTitle>
                  <CardDescription>Use this before the mock or before a real interview.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="whitespace-pre-wrap rounded-xl border bg-white p-4 text-sm leading-relaxed text-slate-900">{interviewPack.out}</div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => interviewPack.out && copyText(interviewPack.out)} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy guide
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            <Card className="border-slate-200/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-blue-600" />
                  Interview history
                </CardTitle>
                <CardDescription>Saved attempts from this account. New scorecards appear here automatically.</CardDescription>
              </CardHeader>
              <CardContent>
                {interviewHistory.length ? (
                  <div className="space-y-2">
                    {interviewHistory.slice(0, 6).map((session) => (
                      <button
                        key={session.id}
                        type="button"
                        onClick={() => {
                          setInterviewPractice((p) => ({
                            ...p,
                            targetRole: session.targetRole,
                            roundType: session.roundType,
                            difficulty: session.difficulty,
                            questions: session.questions || [],
                            answers: Object.fromEntries((session.answers || []).map((answer) => [answer.questionId, answer.answer])),
                            scorecard: session.scorecard || null,
                            feedback: session.aiFeedback || null,
                            sessionId: session.id || null,
                          }));
                          setInterviewFeedback({
                            useful: typeof session.userFeedbackUseful === "boolean" ? session.userFeedbackUseful : null,
                            rating: Number(session.userFeedbackRating || 0),
                            wantsMentorHelp: Boolean(session.userWantsMentorHelp),
                            comment: session.userFeedbackComment || "",
                            saving: false,
                            submitted: Boolean(session.userFeedbackRating),
                          });
                        }}
                        className="flex w-full flex-col gap-2 rounded-2xl border bg-white p-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span>
                          <span className="block font-medium text-slate-950">{session.targetRole}</span>
                          <span className="text-sm text-slate-500">
                            {session.roundType} · {session.difficulty} · {session.answers?.length || 0} answers
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          <Badge variant={session.status === "completed" ? "default" : "outline"}>
                            {session.status === "completed" ? `${session.scorecard?.overall || 0}/100` : "Draft"}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-slate-400" />
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed bg-slate-50 p-6 text-center">
                    <div className="font-medium text-slate-900">No mock interviews yet</div>
                    <p className="mt-1 text-sm text-slate-500">Start your first AI mock interview to build a hiring-readiness history.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {tab === "rewrite" ? (
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Resume Rewrite</CardTitle>
              <CardDescription>Rewrite your bullets to be clearer, quantified, and role-specific.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Resume text</Label>
                <Textarea value={resumeRewrite.resumeText} onChange={(e) => setResumeRewrite((p) => ({ ...p, resumeText: e.target.value }))} className="min-h-[180px]" placeholder="Paste your resume text" />
                <div className="text-xs text-slate-500">Tip: include Experience + Projects + Skills for best results.</div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    const textIn = resumeRewrite.resumeText.trim();
                    if (textIn.length < 120) return;
                    setResumeRewrite((p) => ({ ...p, loading: true }));
                    try {
                      const { text, offline } = await mentorRequest({ mode: "resume-rewrite", intake, profile, resumeText: textIn });
                      if (offline) toast({ title: "AI is busy", description: "Using offline guidance for now." });
                      setResumeRewrite((p) => ({ ...p, out: text }));
                    } catch (e: any) {
                      toast({ title: "AI mentor unavailable", description: e?.message || "Please try again." });
                    } finally {
                      setResumeRewrite((p) => ({ ...p, loading: false }));
                    }
                  }}
                  disabled={resumeRewrite.loading || resumeRewrite.resumeText.trim().length < 120}
                  className="gap-2"
                >
                  {resumeRewrite.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Rewrite
                </Button>
              </div>

              {resumeRewrite.out ? (
                <div className="rounded-xl border bg-white p-4 space-y-3">
                  <div className="whitespace-pre-wrap text-sm text-slate-900 leading-relaxed">{resumeRewrite.out}</div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => resumeRewrite.out && copyText(resumeRewrite.out)} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </CardContent>
    </Card>
  );
}
