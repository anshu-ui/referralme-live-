import { useEffect, useMemo, useState } from "react";
import { Timestamp } from "firebase/firestore";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Calendar, Clock, IndianRupee, Search, Users } from "lucide-react";
import type { FirestoreUser, MentorshipService, MentorshipSession } from "../lib/firestore";
import { createMentorshipSession, subscribeToActiveMentors, subscribeToMentorshipSessions } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";

function fmtInr(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(safe);
}

function getInitials(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

function toTimestampFromLocalInput(value: string) {
  // value comes like "2026-05-10T18:30"
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Timestamp.fromDate(date);
}

export default function MentorshipMarketplace({ user }: { user: FirestoreUser }) {
  const { toast } = useToast();
  const [mentors, setMentors] = useState<FirestoreUser[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<{ mentor: FirestoreUser; service: MentorshipService } | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubMentors = subscribeToActiveMentors(setMentors);
    const unsubSessions = subscribeToMentorshipSessions(user.uid, "mentee", setSessions);
    return () => {
      unsubMentors?.();
      unsubSessions?.();
    };
  }, [user.uid]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter((m) => {
      const blob = [
        m.displayName,
        m.company,
        m.designation,
        m.location,
        m.mentorshipBio,
        ...(m.mentorshipServices?.map((s) => s.title) || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [mentors, search]);

  const activeSessions = useMemo(() => {
    return sessions.filter((s) => ["pending", "confirmed", "in_progress"].includes(s.status));
  }, [sessions]);

  const completedSessions = useMemo(() => {
    return sessions.filter((s) => ["completed", "cancelled"].includes(s.status));
  }, [sessions]);

  const handleRequest = async () => {
    if (!selected) return;
    const ts = toTimestampFromLocalInput(scheduledAt);
    if (!ts) {
      toast({ title: "Pick a date/time", description: "Please select a valid schedule time." });
      return;
    }

    setSubmitting(true);
    try {
      await createMentorshipSession({
        mentorId: selected.mentor.uid,
        mentorName: selected.mentor.displayName || "Mentor",
        mentorEmail: selected.mentor.email || "",
        menteeId: user.uid,
        menteeName: user.displayName || "Mentee",
        menteeEmail: user.email || "",
        title: selected.service.title,
        description: selected.service.description,
        duration: selected.service.duration,
        // Keep the schema as-is; UI and pricing are INR for now.
        price: selected.service.price,
        scheduledAt: ts,
        status: "pending",
        paymentStatus: "pending",
        notes: notes.trim() || undefined,
      } as any);

      toast({ title: "Request sent", description: "Your mentorship request is created. The mentor will confirm." });
      setSelected(null);
      setScheduledAt("");
      setNotes("");
    } catch (e: any) {
      toast({ title: "Could not create request", description: e?.message || "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-xl flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Mentorship
              </CardTitle>
              <CardDescription>Book 1:1 sessions with active referrers who have mentorship enabled.</CardDescription>
            </div>
            <div className="w-full sm:w-[360px]">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search mentors, roles, topics..."
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">No mentors found yet. Try a different search or check back later.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filtered.map((mentor) => {
                const services = (mentor.mentorshipServices || []).filter((s) => s.isActive && s.title.trim());
                if (services.length === 0) return null;
                return (
                  <Card key={mentor.uid} className="border-slate-200/80">
                    <CardHeader className="pb-3">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={mentor.profileImageUrl || mentor.photoURL} alt={mentor.displayName} />
                          <AvatarFallback>{getInitials(mentor.displayName)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <CardTitle className="text-base leading-tight truncate">{mentor.displayName || "Mentor"}</CardTitle>
                            <Badge variant="secondary" className="text-xs">
                              Active mentor
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {[mentor.designation, mentor.company].filter(Boolean).join(" • ") || "Referrer"}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {mentor.mentorshipBio ? (
                        <p className="text-sm text-slate-700 leading-relaxed">{mentor.mentorshipBio}</p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Mentor bio not added yet.</p>
                      )}

                      <Separator />

                      <div className="space-y-3">
                        {services.slice(0, 3).map((svc) => (
                          <div key={svc.id} className="rounded-lg border bg-white p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-medium text-sm text-slate-900 truncate">{svc.title}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3.5 w-3.5" />
                                    {svc.duration} min
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <IndianRupee className="h-3.5 w-3.5" />
                                    {fmtInr(svc.price)}
                                  </span>
                                </div>
                              </div>
                              <Dialog
                                open={selected?.mentor.uid === mentor.uid && selected?.service.id === svc.id}
                                onOpenChange={(open) => {
                                  if (!open) setSelected(null);
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelected({ mentor, service: svc });
                                      // Default: tomorrow 11:00 local time if empty
                                      if (!scheduledAt) {
                                        const d = new Date();
                                        d.setDate(d.getDate() + 1);
                                        d.setHours(11, 0, 0, 0);
                                        const isoLocal = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
                                          .toISOString()
                                          .slice(0, 16);
                                        setScheduledAt(isoLocal);
                                      }
                                    }}
                                  >
                                    Request
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>Request Session</DialogTitle>
                                    <DialogDescription>
                                      Pick a time. The mentor will confirm and share meeting details.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div className="rounded-lg border bg-slate-50 p-3">
                                      <div className="text-sm font-medium">{svc.title}</div>
                                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                                        <span className="inline-flex items-center gap-1">
                                          <Users className="h-3.5 w-3.5" />
                                          {mentor.displayName || "Mentor"}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          <Clock className="h-3.5 w-3.5" />
                                          {svc.duration} min
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                          <IndianRupee className="h-3.5 w-3.5" />
                                          {fmtInr(svc.price)}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4" />
                                          Schedule
                                        </Label>
                                        <Input
                                          type="datetime-local"
                                          value={scheduledAt}
                                          onChange={(e) => setScheduledAt(e.target.value)}
                                        />
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Context (optional)</Label>
                                      <Textarea
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Share role target, current level, links, or questions."
                                        className="min-h-[90px]"
                                      />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={() => setSelected(null)} disabled={submitting}>
                                        Cancel
                                      </Button>
                                      <Button onClick={handleRequest} disabled={submitting}>
                                        {submitting ? "Sending..." : "Send Request"}
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        ))}
                        {services.length > 3 ? (
                          <div className="text-xs text-muted-foreground">+ {services.length - 3} more services</div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming</CardTitle>
            <CardDescription>Your pending/confirmed mentorship sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeSessions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No upcoming sessions yet.
              </div>
            ) : (
              activeSessions.map((s) => (
                <div key={s.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{s.title}</div>
                      <div className="mt-1 text-xs text-slate-600 truncate">with {s.mentorName}</div>
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
                    {s.meetingUrl ? (
                      <Button asChild size="sm" variant="outline">
                        <a href={s.meetingUrl} target="_blank" rel="noreferrer">
                          Join
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
            <CardDescription>Completed and cancelled sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedSessions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No history yet.
              </div>
            ) : (
              completedSessions.slice(0, 6).map((s) => (
                <div key={s.id} className="rounded-lg border p-3">
                  <div className="font-medium text-sm truncate">{s.title}</div>
                  <div className="mt-1 text-xs text-slate-600 truncate">with {s.mentorName}</div>
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
    </div>
  );
}
