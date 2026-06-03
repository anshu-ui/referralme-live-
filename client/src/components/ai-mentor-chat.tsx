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
  CalendarDays,
  CheckCircle2,
  Copy,
  FileText,
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
import type { FirestoreUser, PlacementPlan, PlacementPlanTask } from "../lib/firestore";
import { getLatestPlacementPlan, savePlacementPlan, updatePlacementPlan } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import { analyzeResumeWithGemini } from "../lib/gemini-ats";

type ChatMsg = { role: "user" | "assistant"; content: string; ts: number };
type Tab = "chat" | "plan" | "resume" | "interview" | "rewrite";

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
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const [interviewPack, setInterviewPack] = useState({
    roundType: "technical",
    out: null as string | null,
    loading: false,
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
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error(data?.message || "AI mentor failed");
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

  const sectionTabs: Array<{ id: Tab; label: string; icon: any }> = [
    { id: "chat", label: "Chat", icon: MessageSquareText },
    { id: "plan", label: "Placement Plan", icon: CalendarDays },
    { id: "resume", label: "Resume Coach", icon: Target },
    { id: "interview", label: "Interview Prep", icon: Mic2 },
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
          <Card className="border-slate-200/80">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Interview Prep Pack</CardTitle>
              <CardDescription>Get questions, a practice plan, and what to say in the interview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Round type</Label>
                <div className="flex flex-wrap gap-2">
                  {["technical", "hr", "manager", "system-design", "case-study"].map((t) => (
                    <Button key={t} type="button" size="sm" variant={interviewPack.roundType === t ? "default" : "outline"} onClick={() => setInterviewPack((p) => ({ ...p, roundType: t }))}>
                      {t.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={async () => {
                    setInterviewPack((p) => ({ ...p, loading: true }));
                    try {
                      const { text, offline } = await mentorRequest({ mode: "interview-pack", intake, profile, roundType: interviewPack.roundType });
                      if (offline) toast({ title: "AI is busy", description: "Using offline guidance for now." });
                      setInterviewPack((p) => ({ ...p, out: text }));
                    } catch (e: any) {
                      toast({ title: "AI mentor unavailable", description: e?.message || "Please try again." });
                    } finally {
                      setInterviewPack((p) => ({ ...p, loading: false }));
                    }
                  }}
                  disabled={interviewPack.loading}
                  className="gap-2"
                >
                  {interviewPack.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Generate pack
                </Button>
              </div>

              {interviewPack.out ? (
                <div className="rounded-xl border bg-white p-4 space-y-3">
                  <div className="whitespace-pre-wrap text-sm text-slate-900 leading-relaxed">{interviewPack.out}</div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => interviewPack.out && copyText(interviewPack.out)} className="gap-2">
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
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
