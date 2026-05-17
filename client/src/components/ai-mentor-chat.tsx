import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Loader2, Send, Sparkles, ArrowRight, Wand2, Target, CheckCircle2, AlertTriangle } from "lucide-react";
import type { FirestoreUser } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import { analyzeResumeWithGemini } from "../lib/gemini-ats";

type ChatMsg = { role: "user" | "assistant"; content: string; ts: number };

function getInitials(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

function keyFor(uid: string) {
  return `referralme:ai-mentor:${uid}`;
}

export default function AiMentorChat({
  user,
  onBookMentor,
}: {
  user: FirestoreUser;
  onBookMentor?: (prefill?: { search?: string }) => void;
}) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"intake" | "chat">("intake");
  const [step, setStep] = useState(1);
  const [planText, setPlanText] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
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
        "Tell me what you’re aiming for (role + company type) and share your current status (experience, resume, interviews). I’ll give you a tight plan.",
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

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
    // Keep resume coach prefilled from intake.
    setResumeCoach((p) => ({
      ...p,
      resumeText: intake.resumeText || p.resumeText,
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

  const trimmed = input.trim();
  const canSend = trimmed.length > 0 && !sending;

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
      `Resume: ${intake.resumeText ? `${Math.min(intake.resumeText.length, 4000)} chars provided` : user.linkedinUrl ? `LinkedIn: ${user.linkedinUrl}` : "-"}`,
    ].join("\n");
  }, [intake, user.linkedinUrl]);

  const generatePlan = async () => {
    if (!intakeComplete) {
      toast({ title: "Complete the intake", description: "Fill the role, status, and add resume text (or LinkedIn link) first." });
      return;
    }
    setPlanLoading(true);
    try {
      const resp = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "plan",
          intake,
          profile,
        }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.message || "Plan generation failed");

      const text = String(data?.text || "").trim();
      if (!text) throw new Error("Empty plan response");
      setPlanText(text);
      try {
        localStorage.setItem(`${keyFor(user.uid)}:plan`, text);
      } catch {
        // ignore
      }
      setMode("chat");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `${data?.offline ? "OFFLINE MODE (AI limited):\n\n" : ""}Here’s your 7-day plan based on your intake.\n\n${text}`,
          ts: Date.now(),
        },
      ]);
    } catch (e: any) {
      toast({
        title: "AI mentor unavailable",
        description: e?.message || "Please try again.",
      });
    } finally {
      setPlanLoading(false);
    }
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

  const bookMentor = () => {
    onBookMentor?.({ search: handoffSearch });
  };

  const startChatFromIntake = async () => {
    if (!intakeComplete) {
      toast({ title: "Complete the intake", description: "Fill the role, status, and add resume text (or LinkedIn link) first." });
      return;
    }
    setMode("chat");
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: `Context for mentoring:\n${intakeSummary}\n\nPlease ask me 3 clarifying questions first, then give me a plan.`,
        ts: Date.now(),
      },
    ]);
  };

  const send = async () => {
    if (!canSend) return;
    const userMsg: ChatMsg = { role: "user", content: trimmed.slice(0, 4000), ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const resp = await fetch("/api/ai/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          intake,
          messages: [...messages, userMsg].slice(-20).map((m) => ({ role: m.role, content: m.content })),
          profile,
        }),
      });

      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(data?.message || "AI mentor failed");
      }

      const text = String(data?.text || "").trim();
      if (!text) throw new Error("AI mentor returned empty response");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `${data?.offline ? "OFFLINE MODE (AI limited):\n\n" : ""}${text}`, ts: Date.now() },
      ]);
    } catch (e: any) {
      toast({ title: "AI mentor unavailable", description: e?.message || "Please try again." });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn’t respond right now. Please try again in a moment.",
          ts: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="border-slate-200/80">
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-blue-600" />
              AI Mentor (Text)
              <Badge variant="secondary" className="ml-1">
                Beta
              </Badge>
            </CardTitle>
            <CardDescription>
              Ask questions and get a practical plan for resume, referrals etiquette, and interviews.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {mode === "chat" ? (
              <Button variant="outline" onClick={() => setMode("intake")}>
                Edit intake
              </Button>
            ) : null}
            <Button onClick={bookMentor} disabled={!onBookMentor || !intakeComplete}>
              Book a mentor
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "intake" ? (
          <div className="space-y-4">
            <div className="rounded-xl border bg-slate-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium text-slate-900">Career Intake</div>
                <Badge variant={intakeComplete ? "default" : "secondary"}>{intakeComplete ? "Ready" : "In progress"}</Badge>
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Answer these once. Then the AI will generate a 7-day plan and you can chat.
              </p>
            </div>

            <Card className="border-slate-200/80">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Step {step} of 4</CardTitle>
                <CardDescription>Short answers are fine. This improves recommendations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {step === 1 ? (
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
                      <Label>Dream companies or company type</Label>
                      <Input
                        value={intake.dreamCompanies}
                        onChange={(e) => setIntake((p) => ({ ...p, dreamCompanies: e.target.value }))}
                        placeholder="Razorpay, Swiggy, GCCs, startups..."
                      />
                    </div>
                  </div>
                ) : null}

                {step === 2 ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Experience (your current level)</Label>
                      <Input
                        value={intake.experience}
                        onChange={(e) => setIntake((p) => ({ ...p, experience: e.target.value }))}
                        placeholder="Student / Fresher / 2 yrs / 5 yrs..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location preference</Label>
                      <Input
                        value={intake.location}
                        onChange={(e) => setIntake((p) => ({ ...p, location: e.target.value }))}
                        placeholder="Bangalore / Remote / Any..."
                      />
                    </div>
                  </div>
                ) : null}

                {step === 3 ? (
                  <div className="space-y-2">
                    <Label>Current status</Label>
                    <Textarea
                      value={intake.currentStatus}
                      onChange={(e) => setIntake((p) => ({ ...p, currentStatus: e.target.value }))}
                      placeholder="Example: Final-year student. Projects in React + Firebase. No interviews yet. Applying for frontend roles."
                      className="min-h-[110px]"
                    />
                    <div className="text-xs text-slate-500">
                      Tip: include interview stage, gaps, and what you’ve already tried.
                    </div>
                  </div>
                ) : null}

                {step === 4 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Biggest blocker (optional)</Label>
                      <Input
                        value={intake.biggestBlocker}
                        onChange={(e) => setIntake((p) => ({ ...p, biggestBlocker: e.target.value }))}
                        placeholder="Resume not shortlisted / Interview fear / No referrals..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Resume text (paste) or keep empty if your LinkedIn is updated</Label>
                      <Textarea
                        value={intake.resumeText}
                        onChange={(e) => setIntake((p) => ({ ...p, resumeText: e.target.value }))}
                        placeholder="Paste your resume text (recommended)."
                        className="min-h-[160px]"
                      />
                      <div className="text-xs text-slate-500">
                        We use this to suggest keyword improvements and a weekly plan. (You can paste only the important sections.)
                      </div>
                    </div>
                  </div>
                ) : null}

                <Separator />

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Button variant="outline" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>
                    Back
                  </Button>
                  <div className="flex flex-wrap items-center gap-2">
                    {step < 4 ? (
                      <Button onClick={() => setStep((s) => Math.min(4, s + 1))} className="gap-2">
                        Next <ArrowRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <Button variant="outline" onClick={startChatFromIntake} disabled={!intakeComplete}>
                          Start chat
                        </Button>
                        <Button onClick={generatePlan} disabled={!intakeComplete || planLoading} className="gap-2">
                          {planLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                          Generate 7-day plan
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {planText ? (
              <Card className="border-slate-200/80">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Saved plan</CardTitle>
                  <CardDescription>We keep this on your device so you can come back later.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap text-sm text-slate-800 leading-relaxed">{planText}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setMode("chat")}>
                      Continue in chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {mode === "chat" ? (
          <>
        <Card className="border-slate-200/80">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              Resume Coach (ATS + Tailoring)
            </CardTitle>
            <CardDescription>
              Paste resume text and optionally a job description. Get concrete fixes you can apply today.
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
                <Label>Target job description (optional)</Label>
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
              ) : (
                <div className="text-xs text-slate-500">
                  Tip: add a JD to get better missing-keywords suggestions.
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
                        <span
                          key={k}
                          className="rounded-full border bg-slate-50 px-3 py-1 text-xs text-slate-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIntake((p) => ({ ...p, resumeText: resumeCoach.resumeText }))}
                  >
                    Use this resume for plan
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

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
                      m.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-50 text-slate-900 border",
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
      </CardContent>
    </Card>
  );
}
