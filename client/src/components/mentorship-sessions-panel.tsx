import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Calendar, CheckCircle2, Clock, Link as LinkIcon } from "lucide-react";
import type { FirestoreUser, MentorshipSession } from "../lib/firestore";
import { subscribeToMentorshipSessions, updateMentorshipSession } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";

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

  useEffect(() => {
    const unsub = subscribeToMentorshipSessions(user.uid, role, setSessions);
    return () => unsub?.();
  }, [role, user.uid]);

  const active = useMemo(() => sessions.filter((s) => ["pending", "confirmed", "in_progress"].includes(s.status)), [sessions]);
  const history = useMemo(() => sessions.filter((s) => ["completed", "cancelled"].includes(s.status)), [sessions]);

  const saveMeetingUrl = async (sessionId: string) => {
    const url = (meetingUrlDraft[sessionId] || "").trim();
    if (!url) {
      toast({ title: "Add a meeting link", description: "Paste a Google Meet / Zoom link first." });
      return;
    }
    setSavingId(sessionId);
    try {
      await updateMentorshipSession(sessionId, { meetingUrl: url, status: "confirmed" } as any);
      toast({ title: "Updated", description: "Meeting link saved and session confirmed." });
    } catch (e: any) {
      toast({ title: "Could not update session", description: e?.message || "Please try again." });
    } finally {
      setSavingId(null);
    }
  };

  const markCompleted = async (sessionId: string) => {
    setSavingId(sessionId);
    try {
      await updateMentorshipSession(sessionId, { status: "completed" } as any);
      toast({ title: "Marked completed" });
    } catch (e: any) {
      toast({ title: "Could not update session", description: e?.message || "Please try again." });
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
                        <Button size="sm" onClick={() => saveMeetingUrl(String(s.id))} disabled={savingId === s.id} className="gap-2">
                          <CheckCircle2 className="h-4 w-4" />
                          {savingId === s.id ? "Saving..." : "Confirm"}
                        </Button>
                      </div>
                    ) : null}

                    {role === "mentor" && s.status !== "completed" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markCompleted(String(s.id))}
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
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

