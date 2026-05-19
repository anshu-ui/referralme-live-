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
import { Calendar, Clock, IndianRupee, Search, Sparkles, Users } from "lucide-react";
import type { FirestoreUser, MentorshipService, MentorshipSession } from "../lib/firestore";
import { createMentorshipSession, subscribeToActiveMentors, subscribeToMentorshipSessions } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import { openCashfreeCheckout } from "../lib/cashfree";

function fmtInr(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(safe);
}

const PLATFORM_FEE_PERCENT = 20;

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

function tokensFromText(text: string) {
  return new Set(
    String(text || "")
      .toLowerCase()
      .replace(/[^a-z0-9+.#\s]/g, " ")
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3),
  );
}

function mentorSearchBlob(m: FirestoreUser) {
  const services = (m.mentorshipServices || []).filter((s) => s.isActive);
  return [
    m.displayName,
    m.company,
    m.designation,
    m.location,
    m.mentorshipBio,
    ...(services.map((s) => `${s.title} ${s.description}`) || []),
    ...(m.skills || []),
  ]
    .filter(Boolean)
    .join(" ");
}

function computeMentorMatchScore(mentor: FirestoreUser, seeker: FirestoreUser, queryText: string) {
  const q = queryText.trim();
  const qTokens = q ? tokensFromText(q) : null;

  const seekerTokens = tokensFromText(
    [seeker.designation, seeker.experience, seeker.location, ...(seeker.skills || [])].filter(Boolean).join(" "),
  );
  const targetTokens = qTokens && qTokens.size ? qTokens : seekerTokens;

  const mentorTokens = tokensFromText(mentorSearchBlob(mentor));

  let overlap = 0;
  // Avoid TS downlevel iteration diagnostics by not relying on Set iteration.
  Array.from(targetTokens).forEach((t) => {
    if (mentorTokens.has(t)) overlap += 1;
  });

  // A tiny boost for mentors who look more established (optional field).
  const rating = Number(mentor.mentorshipRating || 0);
  const sessionCount = Number(mentor.totalMentorshipSessions || 0);
  const authorityBoost = Math.min(10, Math.round(rating * 2) + Math.round(Math.log10(sessionCount + 1) * 4));

  return overlap * 6 + authorityBoost;
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

  useEffect(() => {
    // Optional handoff from AI Mentor tab.
    const k = `referralme:mentorshipSearch:${user.uid}`;
    try {
      const v = localStorage.getItem(k);
      if (v && v.trim()) {
        setSearch(v);
        localStorage.removeItem(k);
      }
    } catch {
      // ignore
    }
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

  const rankedMentors = useMemo(() => {
    const list = filtered.slice();
    list.sort((a, b) => computeMentorMatchScore(b, user, search) - computeMentorMatchScore(a, user, search));
    return list;
  }, [filtered, search, user]);

  const topRecommended = useMemo(() => rankedMentors.slice(0, 3), [rankedMentors]);

  const activeSessions = useMemo(() => {
    return sessions.filter((s) => ["pending", "confirmed", "in_progress"].includes(s.status));
  }, [sessions]);

  const completedSessions = useMemo(() => {
    return sessions.filter((s) => ["completed", "cancelled"].includes(s.status));
  }, [sessions]);

  const handlePayAndRequest = async () => {
    if (!selected) return;
    const ts = toTimestampFromLocalInput(scheduledAt);
    if (!ts) {
      toast({ title: "Pick a date/time", description: "Please select a valid schedule time." });
      return;
    }

    setSubmitting(true);
    try {
      const platformFeeAmount = Math.max(0, Math.round((selected.service.price * PLATFORM_FEE_PERCENT) / 100));
      const mentorPayoutAmount = Math.max(0, selected.service.price - platformFeeAmount);

      // 1) Create Cashfree order on server
      const orderResp = await fetch("/api/cashfree/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selected.service.price,
          currency: "INR",
          mentorId: selected.mentor.uid,
          customer: {
            id: user.uid,
            name: user.displayName || user.firstName || "Customer",
            email: user.email,
            phone: user.phoneNumber || "",
          },
        }),
      });
      if (!orderResp.ok) {
        const msg = (await orderResp.json().catch(() => null))?.message || "Failed to create payment order.";
        throw new Error(msg);
      }
      const order = await orderResp.json();
      if (!order?.paymentSessionId || !order?.orderId) {
        throw new Error("Payment session not created. Please try again.");
      }

      // 2) Open Cashfree checkout (modal)
      const checkoutResult = await openCashfreeCheckout({
        mode: order?.env === "production" ? "production" : "sandbox",
        paymentSessionId: order.paymentSessionId,
      });
      if (checkoutResult?.error?.message) {
        throw new Error(checkoutResult.error.message);
      }

      // 3) Verify payment by checking order status from server
      const verifyResp = await fetch("/api/cashfree/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.orderId,
        }),
      });
      const verify = await verifyResp.json().catch(() => null);
      if (!verifyResp.ok || !verify?.verified) {
        throw new Error(verify?.message || "Payment not confirmed yet. If money was deducted, it will auto-refund or you can retry later.");
      }

      // 4) Create the session as paid + pending mentor confirmation
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
        price: selected.service.price,
        scheduledAt: ts,
        status: "pending",
        paymentStatus: "paid",
        paymentProvider: "cashfree",
        cashfreeOrderId: order.orderId,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        platformFeeAmount,
        mentorPayoutAmount,
        payoutStatus: "unpaid",
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
            <div className="space-y-4">
              {topRecommended.length ? (
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    Recommended for you
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    We rank mentors using your profile (skills, role, location) and what you search for.
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {topRecommended.map((mentor) => {
                      const services = (mentor.mentorshipServices || []).filter((s) => s.isActive && s.title.trim());
                      if (services.length === 0) return null;
                      const best = services[0];
                      return (
                        <div key={mentor.uid} className="rounded-lg border bg-white p-3">
                          <div className="flex items-start gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={mentor.profileImageUrl || mentor.photoURL} alt={mentor.displayName} />
                              <AvatarFallback>{getInitials(mentor.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold truncate">{mentor.displayName || "Mentor"}</div>
                              <div className="text-xs text-slate-600 truncate">
                                {[mentor.designation, mentor.company].filter(Boolean).join(" • ") || "Referrer"}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 rounded-md border bg-slate-50 p-2">
                            <div className="text-xs font-medium text-slate-900 truncate">{best.title}</div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {best.duration}m
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <IndianRupee className="h-3 w-3" />
                                {fmtInr(best.price)}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="mt-3 w-full"
                            onClick={() => {
                              setSearch(mentor.displayName || "");
                              setSelected({ mentor, service: best });
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-2">
              {rankedMentors.map((mentor) => {
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
                                      <Button onClick={handlePayAndRequest} disabled={submitting}>
                                        {submitting ? "Processing..." : "Pay & Send Request"}
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
