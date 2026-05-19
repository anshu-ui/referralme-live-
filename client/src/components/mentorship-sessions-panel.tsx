import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Calendar, CheckCircle2, Clock, Link as LinkIcon } from "lucide-react";
import type { FirestoreUser, MentorshipSession } from "../lib/firestore";
import { markMentorshipSessionCompleted, subscribeToMentorshipSessions, submitMentorshipRating, updateMentorshipSession } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import { sendMentorshipCompletedEmail, sendMentorshipConfirmedEmail, sendMentorshipRatingReceivedEmail } from "../lib/emailService";

export default function MentorshipSessionsPanel({
  user,
  role,
}: {
  user: FirestoreUser;
  role: "mentor" | "mentee";
}) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [meetingUrlDraft, setMeetingUrlDraft] = useState<Record<string, string>>({});
  const [ratingDraft, setRatingDraft] = useState<Record<string, number>>({});
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = subscribeToMentorshipSessions(user.uid, role, setSessions);
    return () => unsub?.();
  }, [role, user.uid]);

  const active = useMemo(() => sessions.filter((s) => ["pending", "confirmed", "in_progress"].includes(s.status)), [sessions]);
  const history = useMemo(() => sessions.filter((s) => ["completed", "cancelled"].includes(s.status)), [sessions]);

  const saveMeetingUrl = async (session: MentorshipSession) => {
    const sessionId = String(session.id || "");
    const url = (meetingUrlDraft[sessionId] || "").trim();
    if (!url) {
      toast({ title: "Add a meeting link", description: "Paste a Google Meet / Zoom link first." });
      return;
    }
    setSavingId(sessionId);
    try {
      await updateMentorshipSession(sessionId, { meetingUrl: url, status: "confirmed" } as any);
      toast({ title: "Updated", description: "Meeting link saved and session confirmed." });

      // Fire-and-forget confirmation email to mentee (+ admin on server)
      if (session.menteeEmail) {
        sendMentorshipConfirmedEmail({
          sessionId,
          menteeName: session.menteeName,
          menteeEmail: session.menteeEmail,
          mentorName: session.mentorName,
          mentorEmail: session.mentorEmail,
          title: session.title,
          scheduledAt: session.scheduledAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          meetingUrl: url,
        }).catch(() => {});
      }
    } catch (e: any) {
      toast({ title: "Could not update session", description: e?.message || "Please try again." });
    } finally {
      setSavingId(null);
    }
  };

  const markCompleted = async (session: MentorshipSession) => {
    const sessionId = String(session.id || "");
    setSavingId(sessionId);
    try {
      await markMentorshipSessionCompleted({ sessionId, mentorId: user.uid });
      toast({ title: "Marked completed" });

      if (session.menteeEmail) {
        sendMentorshipCompletedEmail({
          sessionId,
          menteeName: session.menteeName,
          menteeEmail: session.menteeEmail,
          mentorName: session.mentorName,
          mentorEmail: session.mentorEmail,
          title: session.title,
        }).catch(() => {});
      }
    } catch (e: any) {
      toast({ title: "Could not update session", description: e?.message || "Please try again." });
    } finally {
      setSavingId(null);
    }
  };

  const submitRating = async (session: MentorshipSession) => {
    const sessionId = String(session.id || "");
    const rating = Number(ratingDraft[sessionId] || 0);
    const feedback = (feedbackDraft[sessionId] || "").trim();
    if (!sessionId) return;
    if (!rating || rating < 1 || rating > 5) {
      toast({ title: "Select a rating", description: "Choose 1 to 5 stars." });
      return;
    }
    setSavingId(sessionId);
    try {
      await submitMentorshipRating({
        sessionId,
        mentorId: session.mentorId,
        rating,
        feedback: feedback || undefined,
      });
      toast({ title: "Thanks for the rating" });

      if (session.mentorEmail) {
        sendMentorshipRatingReceivedEmail({
          sessionId,
          mentorName: session.mentorName,
          mentorEmail: session.mentorEmail,
          menteeName: session.menteeName,
          menteeEmail: session.menteeEmail,
          title: session.title,
          rating,
        }).catch(() => {});
      }
    } catch (e: any) {
      toast({ title: "Could not submit rating", description: e?.message || "Please try again." });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{role === "mentor" ? "Mentor Sessions" : "My Sessions"}</CardTitle>
          <CardDescription>
            {role === "mentor"
              ? "Confirm requests by adding a meeting link."
              : "Track requests and join confirmed meetings."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {active.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No active sessions yet.
            </div>
          ) : (
            active.map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.title}</div>
                    <div className="mt-1 text-xs text-slate-600 truncate">
                      {role === "mentor" ? `mentee: ${s.menteeName}` : `mentor: ${s.mentorName}`}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {s.scheduledAt?.toDate?.()?.toLocaleString?.() || "TBD"}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {s.duration} min
                      </span>
                      {Number.isFinite(s.price) ? (
                        <span className="inline-flex items-center gap-1">
                          ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(s.price || 0))}
                          {role === "mentor" && Number.isFinite(s.mentorPayoutAmount)
                            ? ` (you earn ₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(s.mentorPayoutAmount || 0))})`
                            : ""}
                        </span>
                      ) : null}
                      <Badge variant="secondary" className="text-xs capitalize">
                        {s.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {s.meetingUrl ? (
                      <Button asChild size="sm" variant="outline" className="gap-2">
                        <a href={s.meetingUrl} target="_blank" rel="noreferrer">
                          <LinkIcon className="h-4 w-4" />
                          Join
                        </a>
                      </Button>
                    ) : null}

                    {role === "mentor" ? (
                      <div className="flex items-end gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Meeting link</Label>
                          <Input
                            value={meetingUrlDraft[s.id || ""] ?? s.meetingUrl ?? ""}
                            onChange={(e) => setMeetingUrlDraft((prev) => ({ ...prev, [s.id || ""]: e.target.value }))}
                            placeholder="https://meet.google.com/..."
                            className="w-[240px]"
                          />
                        </div>
                        <Button size="sm" onClick={() => saveMeetingUrl(s)} disabled={savingId === s.id} className="gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {savingId === s.id ? "Saving..." : "Confirm"}
                        </Button>
                      </div>
                    ) : null}

                    {role === "mentor" && s.status !== "completed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markCompleted(s)}
                        disabled={savingId === s.id}
                      >
                        Mark done
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
          <CardDescription>Past sessions.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {history.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No history yet.
            </div>
          ) : (
            history.slice(0, 8).map((s) => (
              <div key={s.id} className="rounded-lg border p-3">
                <div className="font-medium text-sm truncate">{s.title}</div>
                <div className="mt-1 text-xs text-slate-600 truncate">
                  {role === "mentor" ? `mentee: ${s.menteeName}` : `mentor: ${s.mentorName}`}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {s.scheduledAt?.toDate?.()?.toLocaleString?.() || "TBD"}
                  </span>
                  <Badge variant="secondary" className="text-xs capitalize">
                    {s.status}
                  </Badge>
                </div>

                {role === "mentee" && s.status === "completed" ? (
                  <div className="mt-3 rounded-lg border bg-slate-50 p-3">
                    {s.rating ? (
                      <div className="text-xs text-slate-700">
                        Your rating: <span className="font-semibold">{s.rating}/5</span>
                        {s.feedback ? <span className="text-slate-600"> • {s.feedback}</span> : null}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-slate-900">Rate this session</div>
                        <div className="flex flex-wrap gap-2">
                          {[1, 2, 3, 4, 5].map((v) => (
                            <Button
                              key={v}
                              size="sm"
                              type="button"
                              variant={(ratingDraft[String(s.id || "")] || 0) === v ? "default" : "outline"}
                              onClick={() => setRatingDraft((p) => ({ ...p, [String(s.id || "")]: v }))}
                            >
                              {v}
                            </Button>
                          ))}
                        </div>
                        <Input
                          value={feedbackDraft[String(s.id || "")] || ""}
                          onChange={(e) => setFeedbackDraft((p) => ({ ...p, [String(s.id || "")]: e.target.value }))}
                          placeholder="Optional feedback (1 line)"
                        />
                        <div className="flex justify-end">
                          <Button size="sm" onClick={() => submitRating(s)} disabled={savingId === s.id}>
                            {savingId === s.id ? "Submitting..." : "Submit rating"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
