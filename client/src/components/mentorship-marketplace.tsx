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
import { createMentorshipSession, getUserATSAnalysisHistory, subscribeToActiveMentors, subscribeToMentorshipSessions } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import { sendMentorshipBookedEmails } from "../lib/emailService";

function fmtInr(amount: number) {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(safe);
}

const PLATFORM_FEE_PERCENT = 20;
const MANUAL_UPI_ID = "8510840825@ptsbi";

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
  const [autoSearch, setAutoSearch] = useState<string>("");

  const [selected, setSelected] = useState<{ mentor: FirestoreUser; service: MentorshipService } | null>(null);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofNote, setPaymentProofNote] = useState("");
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
    // Use latest ATS analysis keywords to improve recommendations automatically.
    let cancelled = false;
    getUserATSAnalysisHistory(user.uid)
      .then((items) => {
        if (cancelled) return;
        const latest = items[0];
        if (!latest) return;
        const tokens = [
          latest.jobTitle,
          latest.company,
          ...(latest.missingKeywords || []),
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (tokens) setAutoSearch(tokens);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
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

  const effectiveQuery = useMemo(() => (search.trim() ? search : autoSearch), [search, autoSearch]);

  const rankedMentors = useMemo(() => {
    const list = filtered.slice();
    list.sort((a, b) => computeMentorMatchScore(b, user, effectiveQuery) - computeMentorMatchScore(a, user, effectiveQuery));
    return list;
  }, [filtered, effectiveQuery, user]);

  const topRecommended = useMemo(() => rankedMentors.slice(0, 3), [rankedMentors]);

  const activeSessions = useMemo(() => {
    return sessions.filter((s) => ["pending", "confirmed", "in_progress"].includes(s.status));
  }, [sessions]);

  const completedSessions = useMemo(() => {
    return sessions.filter((s) => ["completed", "cancelled"].includes(s.status));
  }, [sessions]);

  const closeRequestDialog = () => {
    setSelected(null);
    setPaymentReference("");
    setPaymentProofNote("");
  };

  const handleSubmitManualPayment = async () => {
    if (!selected) return;
    const ts = toTimestampFromLocalInput(scheduledAt);
    if (!ts) {
      toast({ title: "Pick a date/time", description: "Please select a valid schedule time." });
      return;
    }
    const ref = paymentReference.trim();
    if (ref.length < 6) {
      toast({ title: "Add payment reference", description: "Enter the UPI UTR/reference number after payment." });
      return;
    }

    setSubmitting(true);
    try {
      const platformFeeAmount = Math.max(0, Math.round((selected.service.price * PLATFORM_FEE_PERCENT) / 100));
      const mentorPayoutAmount = Math.max(0, selected.service.price - platformFeeAmount);

      // Create the session pending admin payment verification.
      const sessionId = await createMentorshipSession({
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
        paymentStatus: "pending",
        paymentProvider: "manual_upi",
        manualUpiId: MANUAL_UPI_ID,
        manualPaymentReference: ref,
        manualPaymentProofNote: paymentProofNote.trim() || undefined,
        manualPaymentSubmittedAt: Timestamp.now(),
        platformFeePercent: PLATFORM_FEE_PERCENT,
        platformFeeAmount,
        mentorPayoutAmount,
        payoutStatus: "unpaid",
        notes: notes.trim() || undefined,
      } as any);

      // Fire-and-forget emails (do not block user flow)
      sendMentorshipBookedEmails({
        sessionId,
        menteeName: user.displayName || "Mentee",
        menteeEmail: user.email || "",
        mentorName: selected.mentor.displayName || "Mentor",
        mentorEmail: selected.mentor.email || "",
        title: selected.service.title,
        scheduledAt: ts.toDate().toISOString(),
        duration: selected.service.duration,
        price: selected.service.price,
        paymentMode: "manual_upi",
        upiId: MANUAL_UPI_ID,
        paymentReference: ref,
        paymentProofNote: paymentProofNote.trim() || undefined,
      }).catch(() => {});

      toast({ title: "Payment proof submitted", description: "Admin will verify the UPI payment, then the mentor can confirm." });
      setSelected(null);
      setScheduledAt("");
      setNotes("");
      setPaymentReference("");
      setPaymentProofNote("");
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
                                  if (!open) closeRequestDialog();
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
                                      Pay by UPI, submit the reference, and admin will verify before mentor confirmation.
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

                                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <div className="text-sm font-semibold text-blue-950">Manual UPI payment</div>
                                          <p className="mt-1 text-xs text-blue-800">
                                            Pay the full session amount to ReferralMe. Admin verifies it before mentor confirmation.
                                          </p>
                                        </div>
                                        <Badge variant="secondary">UPI</Badge>
                                      </div>
                                      <div className="mt-3 grid gap-2 text-sm">
                                        <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
                                          <span className="text-slate-600">UPI ID</span>
                                          <span className="font-semibold text-slate-950">{MANUAL_UPI_ID}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2">
                                          <span className="text-slate-600">Amount</span>
                                          <span className="font-semibold text-slate-950">₹{fmtInr(svc.price)}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <Label>UPI reference / UTR number</Label>
                                      <Input
                                        value={paymentReference}
                                        onChange={(e) => setPaymentReference(e.target.value)}
                                        placeholder="Example: 412345678901"
                                      />
                                    </div>

                                    <div className="space-y-2">
                                      <Label>Payment proof note (optional)</Label>
                                      <Textarea
                                        value={paymentProofNote}
                                        onChange={(e) => setPaymentProofNote(e.target.value)}
                                        placeholder="Paste screenshot link or add payment details if needed."
                                        className="min-h-[70px]"
                                      />
                                    </div>

                                    <div className="flex justify-end gap-2">
                                      <Button variant="outline" onClick={closeRequestDialog} disabled={submitting}>
                                        Cancel
                                      </Button>
                                      <Button onClick={handleSubmitManualPayment} disabled={submitting}>
                                        {submitting ? "Submitting..." : "Submit Payment Proof"}
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
                        {s.paymentProvider === "manual_upi" && s.paymentStatus !== "paid" ? (
                          <Badge variant="outline" className="text-xs">
                            Payment verification pending
                          </Badge>
                        ) : null}
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
