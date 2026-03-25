import { ArrowUpRight, Bell, CalendarDays, ChevronRight, Crown, Download, Medal, Rocket, ShieldCheck, Sparkles, Star, Target, Trophy, Users, Zap } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type CampusAnnouncement,
  createCampusTaskSubmission,
  getCampusAmbassadorByEmail,
  getCampusAmbassadorMembers,
  subscribeToCampusAnnouncements,
  subscribeToCampusAmbassadorTasks,
  subscribeToCampusTaskSubmissions,
  type CampusAmbassadorMember,
  type CampusAmbassadorTask,
  type CampusTaskSubmission,
  updateCampusAmbassadorMember,
} from "../lib/campus-firestore";
import { useCampusAuth } from "../hooks/useCampusAuth";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import FirebaseFileUpload from "../components/firebase-file-upload";
import { campusAuth, campusStorage } from "../lib/campus-firebase";
import { useToast } from "../hooks/use-toast";

const rewardMilestones = [
  {
    points: 200,
    title: "Campus Ambassador Certificate",
    description: "Unlock your official ReferralMe campus ambassador certificate.",
    accent: "from-[#eef4ff] via-[#dbeafe] to-[#ffffff]",
    kind: "certificate" as const,
  },
  {
    points: 500,
    title: "ReferralMe T-Shirt",
    description: "Claim a branded ReferralMe t-shirt after consistent performance.",
    accent: "from-[#eff6ff] via-[#dbeafe] to-[#c7d2fe]",
    kind: "tshirt" as const,
  },
  {
    points: 1000,
    title: "ReferralMe Kit",
    description: "Unlock the full ambassador kit with premium recognition rewards.",
    accent: "from-[#f8fbff] via-[#e0ecff] to-[#e8fff5]",
    kind: "kit" as const,
  },
];

export default function CampusAmbassadorDashboard() {
  const { toast } = useToast();
  const { campusUser, isLoading, signInWithGoogle, logout } = useCampusAuth();
  const [member, setMember] = useState<CampusAmbassadorMember | null>(null);
  const [loadingMember, setLoadingMember] = useState(true);
  const [tasks, setTasks] = useState<CampusAmbassadorTask[]>([]);
  const [submissions, setSubmissions] = useState<CampusTaskSubmission[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [proofText, setProofText] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [proofImageUrl, setProofImageUrl] = useState("");
  const [submittingProof, setSubmittingProof] = useState(false);
  const [leaderboard, setLeaderboard] = useState<CampusAmbassadorMember[]>([]);
  const [announcements, setAnnouncements] = useState<CampusAnnouncement[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [activityStatusFilter, setActivityStatusFilter] = useState("all");
  const [profileForm, setProfileForm] = useState({
    phoneNumber: "",
    linkedinUrl: "",
    instagramHandle: "",
    city: "",
    bio: "",
    profileImageUrl: "",
  });

  useEffect(() => {
    let cancelled = false;

    if (!campusUser?.email) {
      setMember(null);
      setLoadingMember(false);
      return;
    }

    setLoadingMember(true);
    getCampusAmbassadorByEmail(campusUser.email)
      .then((result) => {
        if (!cancelled) setMember(result);
      })
      .finally(() => {
        if (!cancelled) setLoadingMember(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campusUser?.email]);

  useEffect(() => {
    if (!member?.email) {
      setTasks([]);
      setSubmissions([]);
      setAnnouncements([]);
      return;
    }
    const unsubTasks = subscribeToCampusAmbassadorTasks((allTasks) => {
      const visibleTasks = allTasks.filter((task) => {
        if (task.status !== "active") return false;
        if (task.audience === "all") return true;
        return task.audienceCollege?.trim().toLowerCase() === member.collegeName?.trim().toLowerCase();
      });
      setTasks(visibleTasks);
    });
    const unsubSubmissions = subscribeToCampusTaskSubmissions((allSubmissions) => {
      setSubmissions(allSubmissions.filter((entry) => entry.ambassadorEmail?.toLowerCase() === member.email.toLowerCase()));
    });
    const unsubAnnouncements = subscribeToCampusAnnouncements((allAnnouncements) => {
      setAnnouncements(
        allAnnouncements.filter((entry) => {
          if (!entry.isActive) return false;
          if (entry.audience === "all") return true;
          return entry.audienceCollege?.trim().toLowerCase() === member.collegeName?.trim().toLowerCase();
        }),
      );
    });
    return () => {
      unsubTasks();
      unsubSubmissions();
      unsubAnnouncements();
    };
  }, [member?.email, member?.collegeName]);

  useEffect(() => {
    let cancelled = false;
    getCampusAmbassadorMembers()
      .then((members) => {
        if (!cancelled) setLeaderboard([...members].sort((a, b) => Number(b.points || 0) - Number(a.points || 0)));
      })
      .catch((error) => console.error("Error loading campus leaderboard:", error));
    return () => {
      cancelled = true;
    };
  }, [member?.email, submissions.length]);

  useEffect(() => {
    if (!member) return;
    setProfileForm({
      phoneNumber: member.phoneNumber || "",
      linkedinUrl: member.linkedinUrl || "",
      instagramHandle: member.instagramHandle || "",
      city: member.city || "",
      bio: member.bio || "",
      profileImageUrl: member.profileImageUrl || "",
    });
  }, [member]);

  const availableTasks = tasks.filter((task) => !submissions.some((submission) => submission.taskId === task.id));
  const pendingCount = submissions.filter((submission) => submission.status === "pending").length;
  const approvedCount = submissions.filter((submission) => submission.status === "approved").length;
  const totalEarnedPoints = submissions
    .filter((submission) => submission.status === "approved")
    .reduce((sum, submission) => sum + (submission.pointsAwarded || 0), 0);
  const completionRate = submissions.length ? Math.round((approvedCount / submissions.length) * 100) : 0;
  const nextDueTask = useMemo(
    () =>
      [...tasks]
        .filter((task) => task.dueDate)
        .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))[0] || null,
    [tasks],
  );
  const levelLabel = (member?.points || totalEarnedPoints || 0) >= 500 ? "Elite" : (member?.points || totalEarnedPoints || 0) >= 250 ? "Builder" : "Starter";
  const profileCompletion = useMemo(() => {
    const fields = [
      member?.phoneNumber,
      member?.linkedinUrl,
      member?.instagramHandle,
      member?.city,
      member?.bio,
      member?.profileImageUrl,
    ];
    const done = fields.filter((value) => Boolean(String(value || "").trim())).length;
    return Math.round((done / fields.length) * 100);
  }, [member]);
  const myRank = useMemo(() => leaderboard.findIndex((entry) => entry.email === member?.email) + 1, [leaderboard, member?.email]);
  const currentPoints = member?.points || totalEarnedPoints || 0;
  const displayName = (member?.fullName || campusUser?.displayName || "Ambassador").toUpperCase();
  const streakCount = useMemo(() => {
    const approvedWeeks = new Set(
      submissions
        .filter((entry) => entry.status === "approved" && entry.submittedAt?.toDate)
        .map((entry) => {
          const date = entry.submittedAt.toDate();
          const weekStart = new Date(date);
          const day = weekStart.getDay();
          const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
          weekStart.setDate(diff);
          weekStart.setHours(0, 0, 0, 0);
          return weekStart.toISOString().slice(0, 10);
        }),
    );
    return approvedWeeks.size;
  }, [submissions]);
  const nextReward = rewardMilestones.find((reward) => reward.points > currentPoints) || null;
  const spotlightCopy = nextReward
    ? `${Math.max(nextReward.points - currentPoints, 0)} more points to unlock ${nextReward.title}.`
    : "You have unlocked every active reward tier. Keep pushing for leaderboard visibility.";
  const filteredSubmissions = useMemo(() => {
    if (activityStatusFilter === "all") return submissions;
    return submissions.filter((entry) => entry.status === activityStatusFilter);
  }, [submissions, activityStatusFilter]);
  const notifications = useMemo(() => {
    const next: Array<{ title: string; body: string; tone: "info" | "success" | "warning" }> = [];
    if (pendingCount > 0) {
      next.push({
        title: "Proof under review",
        body: `${pendingCount} submission${pendingCount > 1 ? "s are" : " is"} waiting for admin review.`,
        tone: "info",
      });
    }
    if (nextDueTask) {
      next.push({
        title: "Upcoming deadline",
        body: `${nextDueTask.title}${nextDueTask.dueDate ? ` is due ${nextDueTask.dueDate}` : " is now live"}.`,
        tone: "warning",
      });
    }
    if (nextReward) {
      next.push({
        title: "Reward progress",
        body: spotlightCopy,
        tone: "success",
      });
    }
    announcements.slice(0, 2).forEach((entry) =>
      next.push({
        title: entry.title,
        body: entry.message,
        tone: entry.tone,
      }),
    );
    return next.slice(0, 5);
  }, [pendingCount, nextDueTask, nextReward, spotlightCopy, announcements]);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".dashboard-reveal"));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index * 55, 240)}ms`;
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [member, tasks.length, submissions.length, leaderboard.length, profileCompletion, activeTab]);

  const handleSubmitProof = async () => {
    if (!member || !selectedTaskId) {
      toast({
        title: "Select a task first",
        description: "Choose the task you want to submit proof for.",
        variant: "destructive",
      });
      return;
    }

    const task = tasks.find((entry) => entry.id === selectedTaskId);
    if (!task) return;

    if (!proofText.trim() && !proofLink.trim() && !proofImageUrl.trim()) {
      toast({
        title: "Add proof",
        description: "Share a summary, link, or screenshot before submitting.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingProof(true);
    try {
      await createCampusTaskSubmission({
        taskId: task.id as string,
        taskTitle: task.title,
        ambassadorEmail: member.email,
        ambassadorName: member.fullName,
        ambassadorCollege: member.collegeName,
        proofText: proofText.trim() || undefined,
        proofLink: proofLink.trim() || undefined,
        proofImageUrl: proofImageUrl.trim() || undefined,
        pointsAwarded: task.points,
      });

      toast({ title: "Proof submitted" });
      setSelectedTaskId("");
      setProofText("");
      setProofLink("");
      setProofImageUrl("");
    } catch (error) {
      console.error("Error submitting campus proof:", error);
      toast({
        title: "Submission failed",
        description: "The proof could not be submitted.",
        variant: "destructive",
      });
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!member) return;
    setSavingProfile(true);
    try {
      await updateCampusAmbassadorMember(member.email, {
        phoneNumber: profileForm.phoneNumber.trim() || undefined,
        linkedinUrl: profileForm.linkedinUrl.trim() || undefined,
        instagramHandle: profileForm.instagramHandle.trim() || undefined,
        city: profileForm.city.trim() || undefined,
        bio: profileForm.bio.trim() || undefined,
        profileImageUrl: profileForm.profileImageUrl.trim() || undefined,
      });
      const refreshed = await getCampusAmbassadorByEmail(member.email);
      setMember(refreshed);
      toast({ title: "Profile updated" });
    } catch (error) {
      console.error("Error updating campus profile:", error);
      toast({
        title: "Profile update failed",
        description: "The profile could not be updated.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  if (isLoading || loadingMember) {
    return (
      <div className="min-h-screen bg-[#f8fbff] px-4 py-16">
        <div className="mx-auto max-w-4xl rounded-[36px] border border-[#0a2222]/10 bg-white/88 p-16 shadow-[0_30px_90px_rgba(10,34,34,0.08)] backdrop-blur">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-[#0a2222]/15 border-t-[#0a2222]" />
            <p className="mt-4 text-sm font-medium text-[#0a2222]/62">Loading ambassador access...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!campusUser) {
    return (
      <CenteredPanel
        eyebrow="Campus Dashboard"
        title="Sign in to continue"
        description="Use the same Google email you used in your campus ambassador application."
        primaryLabel="Sign In with Google"
        onPrimary={() => signInWithGoogle()}
        secondaryLabel="Back to Program Page"
        secondaryHref="/campus-ambassador"
      />
    );
  }

  if (!member || (member.status !== "accepted" && member.status !== "active")) {
    return (
      <CenteredPanel
        eyebrow="Access Pending"
        title="Your dashboard access is not unlocked yet"
        description="If you were shortlisted, wait for the acceptance email. Once accepted, sign in with the same email and this dashboard will open."
        primaryLabel="Back to Program Page"
        primaryHref="/campus-ambassador"
        secondaryLabel="Switch Account"
        onSecondary={() => logout()}
      />
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8fbff] px-4 py-6 sm:px-6 sm:py-8">
      <style>{`
        @keyframes campusFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes campusGlow {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 0.78; transform: scale(1.04); }
        }
        @keyframes campusPulseLine {
          0%, 100% { transform: scaleX(0.96); opacity: 0.6; }
          50% { transform: scaleX(1); opacity: 1; }
        }
        .campus-float {
          animation: campusFloat 6s ease-in-out infinite;
        }
        .campus-glow {
          animation: campusGlow 7s ease-in-out infinite;
        }
        .campus-pulse-line {
          animation: campusPulseLine 3.2s ease-in-out infinite;
          transform-origin: left;
        }
        .campus-grid {
          background-image:
            linear-gradient(rgba(10,34,34,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(10,34,34,0.08) 1px, transparent 1px);
          background-size: 34px 34px;
        }
        .dashboard-reveal {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
          transition:
            opacity .8s cubic-bezier(.19,1,.22,1),
            transform .9s cubic-bezier(.19,1,.22,1);
        }
        .dashboard-reveal.is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0) scale(1);
        }
        .dashboard-card {
          position: relative;
          overflow: hidden;
          transition:
            transform .38s cubic-bezier(.19,1,.22,1),
            box-shadow .38s cubic-bezier(.19,1,.22,1),
            border-color .25s ease,
            background-color .25s ease;
        }
        .dashboard-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background: transparent;
          opacity: 0;
          transition: opacity .28s ease;
          pointer-events: none;
        }
        .dashboard-card:hover {
          transform: translateY(-5px);
          border-color: rgba(29,78,216,0.20);
          background-color: rgba(255,255,255,1) !important;
          opacity: 1;
          box-shadow: 0 22px 55px rgba(29,78,216,0.10);
        }
        .dashboard-card:hover::before {
          opacity: 0;
        }
        .dashboard-soft:hover {
          transform: translateY(-3px) scale(1.01);
        }
        .dashboard-card:hover > *,
        .dashboard-card:hover [class*="bg-white/"],
        .dashboard-card:hover [class*="bg-["],
        .dashboard-card:hover [class*="from-"],
        .dashboard-card:hover [class*="to-"] {
          opacity: 1;
        }
        .campus-kicker {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
        }
        .campus-display {
          font-weight: 400;
          letter-spacing: -0.06em;
          line-height: 0.94;
          color: #020617;
        }
        .campus-heading {
          font-weight: 400;
          letter-spacing: -0.045em;
          line-height: 1;
          color: #020617;
        }
        .campus-copy {
          line-height: 1.85;
          color: rgba(10, 34, 34, 0.7);
        }
        .campus-shell-title {
          font-size: 15px;
          font-weight: 800;
          letter-spacing: -0.015em;
          color: #1d4ed8;
        }
        .campus-shell-subtitle {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: rgba(10, 34, 34, 0.46);
        }
      `}</style>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[30rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_35%),radial-gradient(circle_at_85%_10%,_rgba(16,185,129,0.12),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.92),_rgba(248,251,255,0))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30" />

      <div className="relative mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <div className="dashboard-reveal relative overflow-hidden rounded-[40px] border border-[#0a2222]/10 bg-white/88 shadow-[0_25px_80px_rgba(10,34,34,0.08)]">
          <div className="absolute inset-0 campus-grid opacity-25" />
          <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-[#dffb57]/22 blur-3xl campus-glow" />
          <div className="absolute right-4 top-4 h-36 w-36 rounded-full bg-[#bdd3ff]/48 blur-3xl campus-glow" />
          <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(223,251,87,0.20),_transparent_28%),radial-gradient(circle_at_80%_10%,_rgba(160,189,255,0.34),_transparent_24%),linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div>
                <div className="flex flex-col items-start gap-2.5">
                  <div className="inline-flex items-center gap-3 rounded-[22px] border border-[#0a2222]/10 bg-white/88 px-3.5 py-2.5 shadow-sm">
                    <img src="/logo.png" alt="ReferralMe" className="h-10 w-10 rounded-2xl" />
                    <div>
                      <p className="campus-shell-title">ReferralMe</p>
                      <p className="campus-shell-subtitle">Campus Ambassador</p>
                    </div>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-[#f3f8ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#1d4ed8]">
                    <ShieldCheck className="h-3 w-3" />
                    Campus Dashboard
                  </div>
                </div>
                <h1 className="campus-display mt-6 max-w-5xl text-5xl sm:text-7xl lg:text-[6.35rem]">
                  Welcome back,
                  <span className="mt-2 block text-[#1e3a8a]">{displayName}</span>
                </h1>
                <p className="campus-copy mt-5 max-w-2xl text-[15px] sm:text-[17px]">
                  Track missions, submit proof, build recognition, and manage your campus presence from one cleaner workspace designed for real execution.
                </p>
                <div className="mt-5 h-1 w-40 rounded-full bg-gradient-to-r from-[#1d4ed8] via-[#7fa7ff] to-transparent campus-pulse-line" />
                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/88 px-4 py-3 text-sm font-semibold text-[#0a2222] shadow-sm">
                    <Users className="h-4 w-4 text-[#1d4ed8]" />
                    {member.collegeName}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white/88 px-4 py-3 text-sm font-semibold text-[#0a2222] shadow-sm">
                    <Medal className="h-4 w-4 text-[#1d4ed8]" />
                    Code {member.ambassadorCode}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-[#eff6ff] px-4 py-3 text-sm font-semibold text-[#1e3a8a] shadow-sm">
                    <Sparkles className="h-4 w-4 text-[#1e3a8a]" />
                    {member.status === "active" ? "Active ambassador" : member.status}
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <SpotlightPanel
                    eyebrow="Next unlock"
                    title={nextReward ? nextReward.title : "All rewards unlocked"}
                    body={spotlightCopy}
                    tone="blue"
                  />
                  <SpotlightPanel
                    eyebrow="Program rhythm"
                    title={nextDueTask?.dueDate ? `Due ${nextDueTask.dueDate}` : "No deadline set"}
                    body={nextDueTask ? nextDueTask.title : "Your next mission deadline will appear here."}
                    tone="green"
                  />
                  <SpotlightPanel
                    eyebrow="Your position"
                    title={myRank ? `#${myRank}` : "Unranked"}
                    body="Keep approved missions flowing to climb faster."
                    tone="dark"
                  />
                </div>
              </div>
              <div className="rounded-[30px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(244,248,255,0.94)_100%)] p-6 text-[#0a2222] shadow-[0_20px_60px_rgba(10,34,34,0.08)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="campus-kicker text-[#0a2222]/45">Performance profile</p>
                    <p className="mt-4 text-5xl font-normal tracking-[-0.1em] text-[#1e3a8a]">{currentPoints}</p>
                    <p className="mt-2 text-sm text-[#0a2222]/58">current points</p>
                  </div>
                  <div className="campus-float flex h-12 w-12 items-center justify-center rounded-2xl border border-[#0a2222]/10 bg-[#1d4ed8] text-white">
                    <Crown className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#0a2222]/10 bg-white px-4 py-4">
                  <div>
                    <p className="campus-kicker text-[#0a2222]/45">Recognition level</p>
                    <p className="mt-1 text-xl font-normal tracking-[-0.05em] text-slate-950">{levelLabel}</p>
                  </div>
                  <div className="rounded-full border border-blue-100 bg-[#eff6ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1e3a8a]">
                    {completionRate}% quality
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <HeroMiniStat label="Pending" value={String(pendingCount)} />
                  <HeroMiniStat label="Approved" value={String(approvedCount)} />
                </div>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <a href="/campus-ambassador" className="sm:flex-1">
                    <Button className="w-full bg-[#1d4ed8] text-white hover:bg-[#1e40af]">
                      View Program
                    </Button>
                  </a>
                  <Button
                    variant="outline"
                    className="border-[#0a2222]/15 bg-white text-[#0a2222] hover:bg-[#f8f6f0] sm:flex-1"
                    onClick={() => logout()}
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-reveal grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="College" value={member.collegeName} icon={<Users className="h-5 w-5" />} accent="from-[#1e293b] to-[#334155]" />
          <StatCard label="Ambassador Code" value={member.ambassadorCode} icon={<Medal className="h-5 w-5" />} accent="from-[#0f172a] to-[#1d4ed8]" />
          <StatCard label="Live Tasks" value={String(tasks.length)} icon={<Rocket className="h-5 w-5" />} accent="from-[#111827] to-[#1f2937]" />
          <StatCard label="Points" value={String(currentPoints)} icon={<Crown className="h-5 w-5" />} accent="from-[#172554] to-[#1d4ed8]" />
        </div>

        <div className="dashboard-reveal grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-[linear-gradient(135deg,#ffffff_0%,#f6f4ee_100%)] text-[#0a2222] shadow-[0_20px_60px_rgba(10,34,34,0.06)]">
              <CardContent className="p-6">
                <div className="campus-kicker inline-flex items-center gap-2 rounded-full border border-[#0a2222]/10 bg-white px-3 py-1 text-[#0a2222]/55">
                  <Sparkles className="h-3.5 w-3.5" />
                  Your momentum
                </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <QuickMetric label="Pending review" value={String(pendingCount)} />
                <QuickMetric label="Approved tasks" value={String(approvedCount)} />
                <QuickMetric label="Points earned" value={String(totalEarnedPoints)} />
              </div>
            </CardContent>
          </Card>

          <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
              <CardContent className="p-6">
              <p className="campus-kicker text-[#0a2222]/45">Current status</p>
              <p className="mt-3 text-3xl font-normal tracking-[-0.06em] text-slate-950 capitalize">{member.status}</p>
              <p className="campus-copy mt-3 text-sm">
                Stay active, complete weekly missions, and submit proof on time to keep your profile strong inside the program.
              </p>
              <div className="mt-5 space-y-3">
                <StatusLine icon={<Target className="h-4 w-4" />} label="Open missions" value={String(availableTasks.length)} />
                <StatusLine icon={<CalendarDays className="h-4 w-4" />} label="Next deadline" value={nextDueTask?.dueDate || "No due date"} />
                <StatusLine icon={<ChevronRight className="h-4 w-4" />} label="Review cadence" value="Admin approval based" />
                <StatusLine icon={<Trophy className="h-4 w-4" />} label="Weekly streak" value={`${streakCount} week${streakCount === 1 ? "" : "s"}`} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="sticky top-3 z-20 h-auto flex-wrap justify-start gap-2 rounded-[24px] border border-[#0a2222]/10 bg-white/84 p-2 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md">
            <TabsTrigger value="overview" className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/65 data-[state=active]:bg-[#1d4ed8] data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/65 data-[state=active]:bg-[#1d4ed8] data-[state=active]:text-white">Tasks</TabsTrigger>
            <TabsTrigger value="submit" className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/65 data-[state=active]:bg-[#1d4ed8] data-[state=active]:text-white">Submit Proof</TabsTrigger>
            <TabsTrigger value="activity" className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/65 data-[state=active]:bg-[#1d4ed8] data-[state=active]:text-white">Activity</TabsTrigger>
            <TabsTrigger value="leaderboard" className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/65 data-[state=active]:bg-[#1d4ed8] data-[state=active]:text-white">Leaderboard</TabsTrigger>
            <TabsTrigger value="profile" className="rounded-full px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/65 data-[state=active]:bg-[#1d4ed8] data-[state=active]:text-white">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.4rem]">Reward ladder</CardTitle>
                  <p className="text-sm text-[#0a2222]/55">Every milestone unlocks a real ReferralMe reward.</p>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                  {rewardMilestones.map((reward) => (
                    <RewardRow
                      key={reward.points}
                      points={reward.points}
                      title={reward.title}
                      description={reward.description}
                      unlocked={currentPoints >= reward.points}
                      accent={reward.accent}
                      kind={reward.kind}
                    />
                  ))}
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                  <CardHeader>
                    <CardTitle className="campus-heading text-3xl sm:text-[2.15rem]">Announcements</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {announcements.length === 0 ? (
                      <EmptyBlock>No active announcements. New updates from admin will appear here.</EmptyBlock>
                    ) : (
                      announcements.slice(0, 3).map((announcement) => (
                        <AnnouncementRow
                          key={announcement.id}
                          title={announcement.title}
                          body={announcement.message}
                          tone={announcement.tone}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                  <CardHeader>
                    <CardTitle className="campus-heading text-3xl sm:text-[2.15rem]">Mission board</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {tasks.slice(0, 3).map((task) => (
                      <MissionPreview
                        key={task.id}
                        title={task.title}
                        subtitle={task.dueDate ? `Due ${task.dueDate}` : "No due date set"}
                        points={task.points}
                      />
                    ))}
                    {tasks.length === 0 ? <EmptyBlock>No mission is live yet. Your next assignment will show up here.</EmptyBlock> : null}
                  </CardContent>
                </Card>

                <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                  <CardHeader>
                    <CardTitle className="campus-heading text-3xl sm:text-[2.15rem]">Progress snapshot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <SnapshotRow label="Current rank" value={myRank ? `#${myRank}` : "Not ranked"} />
                    <SnapshotRow label="Current level" value={levelLabel} />
                    <SnapshotRow label="Profile completion" value={`${profileCompletion}%`} />
                    <SnapshotRow label="Tasks available" value={String(availableTasks.length)} />
                    <SnapshotRow label="Approved proof" value={String(approvedCount)} />
                    <SnapshotRow label="Weekly streak" value={`${streakCount} week${streakCount === 1 ? "" : "s"}`} />
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.15rem]">Notification center</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notifications.length === 0 ? (
                    <EmptyBlock>No active updates. Your dashboard is clear right now.</EmptyBlock>
                  ) : (
                    notifications.map((entry, index) => (
                      <NotificationRow key={`${entry.title}-${index}`} title={entry.title} body={entry.body} tone={entry.tone} />
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.15rem]">Downloads</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rewardMilestones.map((reward) => {
                    const unlocked = currentPoints >= reward.points;
                    const href =
                      reward.kind === "certificate"
                        ? "/reward-certificate.png"
                        : reward.kind === "tshirt"
                          ? "/reward-shirt.png"
                          : "/reward-kit.png";
                    return (
                      <div key={reward.points} className="dashboard-card dashboard-soft flex items-center justify-between rounded-[24px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-3">
                        <div>
                          <p className="text-base font-normal tracking-[-0.04em] text-slate-950">{reward.title}</p>
                          <p className="mt-1 text-xs text-[#0a2222]/50">{unlocked ? "Download unlocked reward preview" : `Unlocks at ${reward.points} points`}</p>
                        </div>
                        {unlocked ? (
                          <a href={href} download className="inline-flex">
                            <Button size="sm" className="bg-[#1d4ed8] text-white hover:bg-[#1e40af]">
                              <Download className="mr-2 h-4 w-4" />
                              Download
                            </Button>
                          </a>
                        ) : (
                          <Button size="sm" variant="outline" disabled>
                            Locked
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.4rem]">Live tasks</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {tasks.length === 0 ? (
                    <EmptyBlock>No active tasks yet. Your first mission will show up here.</EmptyBlock>
                  ) : (
                    tasks.map((task) => {
                      const alreadySubmitted = submissions.some((submission) => submission.taskId === task.id);
                      return (
                        <div key={task.id} className="group dashboard-card dashboard-soft rounded-[30px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 sm:p-5 shadow-sm">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-2xl font-normal tracking-[-0.06em] text-slate-950">{task.title}</p>
                                <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
                                  {task.points} pts
                                </span>
                                {alreadySubmitted ? (
                                  <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                                    Submitted
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm leading-7 text-[#0a2222]/66">{task.description}</p>
                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#0a2222]/62">
                                  <CalendarDays className="h-3.5 w-3.5" />
                                  {task.dueDate ? `Due ${task.dueDate}` : "No due date set"}
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-[#dff0ff] px-3 py-1 text-xs font-medium text-[#1d4ed8]">
                                  <Rocket className="h-3.5 w-3.5" />
                                  Mission live
                                </span>
                              </div>
                            </div>
                            <Button
                              variant={alreadySubmitted ? "outline" : "default"}
                              className={alreadySubmitted ? "border-[#0a2222]/10 bg-white text-[#0a2222]" : "bg-[#1d4ed8] text-white hover:bg-[#1e40af]"}
                              onClick={() => setSelectedTaskId(task.id || "")}
                            >
                              {alreadySubmitted ? "Update proof" : "Submit proof"}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="submit">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.4rem]">Submit task proof</CardTitle>
                  <p className="text-sm leading-6 text-[#0a2222]/55">Keep submissions clear, verifiable, and professionally documented.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {availableTasks.length === 0 ? (
                    <div className="rounded-[24px] border border-blue-100 bg-blue-50/60 px-4 py-4 text-sm leading-6 text-[#0a2222]/66">
                      No unsubmitted task is available right now. If you already submitted everything, wait for the next mission or update an existing proof from the tasks tab.
                    </div>
                  ) : null}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">Task</p>
                    <select
                      value={selectedTaskId}
                      onChange={(event) => setSelectedTaskId(event.target.value)}
                      className="w-full rounded-2xl border border-[#0a2222]/10 bg-[#fbfaf6] px-4 py-3 text-sm text-[#0a2222] outline-none transition focus:border-[#7fa7ff] focus:ring-4 focus:ring-[#7fa7ff]/20"
                    >
                      <option value="">Select a task</option>
                      {tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">What did you do?</p>
                    <textarea
                      value={proofText}
                      onChange={(event) => setProofText(event.target.value)}
                      className="min-h-[140px] w-full rounded-2xl border border-[#0a2222]/10 bg-[#fbfbff] px-4 py-3 text-sm text-[#0a2222] outline-none transition focus:border-[#7fa7ff] focus:ring-4 focus:ring-[#7fa7ff]/20"
                      placeholder="Write a short summary of what you executed, where you posted, or what happened on campus."
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">Proof link</p>
                    <Input className="border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222]" value={proofLink} onChange={(event) => setProofLink(event.target.value)} placeholder="Google Drive, LinkedIn post, Instagram story link, etc." />
                  </div>

                  <FirebaseFileUpload
                    label="Upload proof screenshot"
                    description="Optional, but useful for faster approval."
                    acceptedTypes=".jpg,.jpeg,.png,.pdf"
                    maxSizeMB={8}
                    currentFile={proofImageUrl}
                    storageOverride={campusStorage}
                    authOverride={campusAuth}
                    pathPrefix="campus-ambassador/proof"
                    onFileUploaded={(fileUrl) => setProofImageUrl(fileUrl)}
                  />

                  <Button className="bg-[#1d4ed8] text-white hover:bg-[#1e40af]" onClick={handleSubmitProof} disabled={submittingProof}>
                    {submittingProof ? "Submitting..." : "Submit Proof"}
                  </Button>
                </CardContent>
              </Card>

              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.15rem]">Submission tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm leading-7 text-[#0a2222]/66">
                  <TipRow title="Lead with outcome" body="Start with the campus result, not just the action you took." />
                  <TipRow title="Attach real proof" body="One clear screenshot plus one link usually speeds up review." />
                  <TipRow title="Keep it professional" body="Structured proof gets approved faster and keeps your point flow smooth." />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
              <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.4rem]">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {["all", "pending", "approved", "rejected"].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={activityStatusFilter === status ? "default" : "outline"}
                      className={activityStatusFilter === status ? "bg-[#1d4ed8] text-white hover:bg-[#1e40af]" : "border-[#0a2222]/10 bg-white text-[#0a2222]"}
                      onClick={() => setActivityStatusFilter(status)}
                    >
                      {status}
                    </Button>
                  ))}
                </div>
                {filteredSubmissions.length === 0 ? (
                  <EmptyBlock>No submissions yet. Start with your first live task.</EmptyBlock>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <div key={submission.id} className="dashboard-card dashboard-soft rounded-[24px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xl font-normal tracking-[-0.05em] text-slate-950">{submission.taskTitle}</p>
                            <StatusBadge status={submission.status} />
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#0a2222]/66">{submission.proofText || "Proof submitted."}</p>
                          {submission.reviewNote ? (
                            <div className="mt-3 rounded-2xl border border-[#0a2222]/10 bg-white px-4 py-3 text-sm leading-6 text-[#0a2222]/66">
                              <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">Admin note</span>
                              <span className="mt-1 block">{submission.reviewNote}</span>
                            </div>
                          ) : null}
                        </div>
                        <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#0a2222]/45">{submission.pointsAwarded} pts</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard">
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.4rem]">Top ambassadors</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {leaderboard.length === 0 ? (
                    <EmptyBlock>No leaderboard data yet.</EmptyBlock>
                  ) : (
                    leaderboard.slice(0, 10).map((entry, index) => (
                      <div key={entry.email} className="dashboard-card dashboard-soft flex items-center justify-between rounded-[24px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0a2222] text-sm font-black text-white">
                            #{index + 1}
                          </div>
                          <div>
                            <p className="text-lg font-normal tracking-[-0.05em] text-slate-950">{entry.fullName}</p>
                            <p className="text-xs text-[#0a2222]/48">{entry.collegeName}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700">
                          {entry.points || 0} pts
                        </Badge>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.15rem]">Your rank</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SnapshotRow label="Current rank" value={myRank ? `#${myRank}` : "Not ranked"} />
                  <SnapshotRow label="Recognition level" value={levelLabel} />
                  <SnapshotRow label="Current points" value={String(member.points || totalEarnedPoints || 0)} />
                  <p className="text-sm leading-7 text-[#0a2222]/66">
                    Keep finishing approved missions and submitting clean proof to climb the leaderboard faster.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-white/84 shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.4rem]">Complete your profile</CardTitle>
                  <p className="text-sm leading-6 text-[#0a2222]/55">Your dashboard, missions, and recognition all work better with a complete profile.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">Phone number</p>
                      <Input className="border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222]" value={profileForm.phoneNumber} onChange={(event) => setProfileForm((current) => ({ ...current, phoneNumber: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">City</p>
                      <Input className="border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222]" value={profileForm.city} onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">LinkedIn</p>
                      <Input className="border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222]" value={profileForm.linkedinUrl} onChange={(event) => setProfileForm((current) => ({ ...current, linkedinUrl: event.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">Instagram</p>
                      <Input className="border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222]" value={profileForm.instagramHandle} onChange={(event) => setProfileForm((current) => ({ ...current, instagramHandle: event.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">Short bio</p>
                    <textarea
                      value={profileForm.bio}
                      onChange={(event) => setProfileForm((current) => ({ ...current, bio: event.target.value }))}
                      className="min-h-[120px] w-full rounded-2xl border border-[#0a2222]/10 bg-[#fbfbff] px-4 py-3 text-sm text-[#0a2222] outline-none transition focus:border-[#7fa7ff] focus:ring-4 focus:ring-[#7fa7ff]/20"
                      placeholder="Tell ReferralMe about your campus presence, strengths, and what kind of ambassador you want to be."
                    />
                  </div>
                  <FirebaseFileUpload
                    label="Profile photo"
                    description="Add a proper profile image for your ambassador identity."
                    acceptedTypes=".jpg,.jpeg,.png"
                    maxSizeMB={6}
                    currentFile={profileForm.profileImageUrl}
                    storageOverride={campusStorage}
                    authOverride={campusAuth}
                    pathPrefix="campus-ambassador/profile"
                    onFileUploaded={(fileUrl) => setProfileForm((current) => ({ ...current, profileImageUrl: fileUrl }))}
                  />
                  <Button className="bg-[#1d4ed8] text-white hover:bg-[#1e40af]" onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? "Saving..." : "Save Profile"}
                  </Button>
                </CardContent>
              </Card>
              <Card className="dashboard-reveal dashboard-card border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f6faff_100%)] shadow-sm">
                <CardHeader>
                  <CardTitle className="campus-heading text-3xl sm:text-[2.15rem]">Profile strength</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SnapshotRow label="Completion" value={`${profileCompletion}%`} />
                  <SnapshotRow label="Recognition level" value={levelLabel} />
                  <SnapshotRow label="Current rank" value={myRank ? `#${myRank}` : "Not ranked"} />
                  <p className="text-sm leading-7 text-[#0a2222]/66">
                    A complete profile makes the program feel more real, helps with recognition, and makes your ambassador identity stronger.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function CenteredPanel({
  eyebrow,
  title,
  description,
  primaryLabel,
  primaryHref,
  onPrimary,
  secondaryLabel,
  secondaryHref,
  onSecondary,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f8fbff] px-4 py-8 sm:py-10">
      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-[#dffb57]/22 blur-3xl" />
      <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-[#bdd3ff]/35 blur-3xl" />
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[40px] border border-[#0a2222]/10 bg-white/90 shadow-[0_35px_100px_rgba(10,34,34,0.08)] backdrop-blur">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative border-b border-[#0a2222]/10 p-6 sm:p-8 lg:border-b-0 lg:border-r lg:p-10">
            <div className="inline-flex items-center gap-3 text-left">
              <img src="/logo.png" alt="ReferralMe" className="h-12 w-12 rounded-2xl" />
              <div>
                <p className="text-sm font-bold tracking-tight text-[#1d4ed8]">ReferralMe</p>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#0a2222]/48">Campus Ambassador</p>
              </div>
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#0a2222]/10 bg-white px-3 py-1 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[#0a2222]/55">
              {eyebrow}
            </div>
            <h1 className="campus-display mt-4 max-w-xl text-left text-4xl sm:text-6xl lg:text-[5.3rem]">{title}</h1>
            <p className="campus-copy mt-4 max-w-lg text-left text-sm sm:text-base">{description}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {primaryHref ? (
                <a href={primaryHref}>
                  <Button size="lg" className="w-full bg-[#1d4ed8] text-white hover:bg-[#1e40af] sm:w-auto">{primaryLabel}</Button>
                </a>
              ) : (
                <Button size="lg" className="w-full bg-[#1d4ed8] text-white hover:bg-[#1e40af] sm:w-auto" onClick={onPrimary}>
                  {primaryLabel}
                </Button>
              )}
              {secondaryLabel && secondaryHref ? (
                <a href={secondaryHref}>
                  <Button size="lg" variant="outline" className="w-full border-[#0a2222]/10 bg-white text-[#0a2222] hover:bg-[#f8f6f0] sm:w-auto">
                    {secondaryLabel}
                  </Button>
                </a>
              ) : null}
              {secondaryLabel && onSecondary ? (
                <Button size="lg" variant="outline" className="w-full border-[#0a2222]/10 bg-white text-[#0a2222] hover:bg-[#f8f6f0] sm:w-auto" onClick={onSecondary}>
                  {secondaryLabel}
                </Button>
              ) : null}
            </div>

            <p className="mt-4 text-left text-sm font-medium text-[#0a2222]/50">Use your accepted Google email.</p>
          </div>

          <div className="relative bg-[radial-gradient(circle_at_top_left,_rgba(223,251,87,0.24),_transparent_26%),radial-gradient(circle_at_85%_10%,_rgba(160,189,255,0.28),_transparent_24%),linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] p-6 sm:p-8 lg:p-10">
            <div className="relative overflow-hidden rounded-[32px] border border-[#0a2222]/10 bg-white/88 p-6 text-[#0a2222] shadow-[0_20px_60px_rgba(10,34,34,0.08)]">
              <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-[#dffb57]/25 blur-2xl" />
              <div className="absolute bottom-0 left-0 h-28 w-28 rounded-full bg-[#bdd3ff]/35 blur-2xl" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0a2222]/10 bg-[#fbfaf6] px-3 py-1 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/55">
                  <Sparkles className="h-3.5 w-3.5" />
                  ReferralMe Campus
                </div>
                <h2 className="campus-heading mt-4 max-w-sm text-left text-3xl sm:text-[2.8rem]">A sharper way into the program.</h2>
                <p className="campus-copy mt-4 max-w-sm text-left text-sm">
                  Approved access, cleaner identity, and a dedicated surface for every mission you complete.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <HighlightPill icon={<ShieldCheck className="h-4 w-4" />} label="Verified access" />
                  <HighlightPill icon={<Users className="h-4 w-4" />} label="Campus identity" />
                  <HighlightPill icon={<Star className="h-4 w-4" />} label="Recognition" />
                  <HighlightPill icon={<Zap className="h-4 w-4" />} label="Weekly missions" />
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <MiniShowcaseCard accent="from-[#dffb57] to-[#b7ee57]" title="Top performer" subtitle="Badges and spotlight" />
              <MiniShowcaseCard accent="from-[#dbe7ff] to-[#89acff]" title="Campus lead" subtitle="Your college identity" />
              <MiniShowcaseCard accent="from-[#ffe4ce] to-[#ffb47e]" title="Leaderboard" subtitle="Points and progress" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Card className="dashboard-card dashboard-soft overflow-hidden border border-[#0a2222]/10 bg-white/84 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="campus-kicker text-[#0a2222]/45">{label}</p>
            <p className="mt-3 text-3xl font-normal tracking-[-0.07em] text-slate-950">{value}</p>
          </div>
          <div className={`campus-float flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function HeroMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#0a2222]/10 bg-white p-4 backdrop-blur">
      <p className="campus-kicker text-[#0a2222]/45">{label}</p>
      <p className="mt-2 text-2xl font-normal tracking-[-0.06em] text-slate-950">{value}</p>
    </div>
  );
}

function HighlightPill({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex w-full items-center gap-2 rounded-2xl border border-[#0a2222]/10 bg-white px-3 py-3 text-left text-sm font-semibold text-[#0a2222] backdrop-blur">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function MiniShowcaseCard({
  accent,
  title,
  subtitle,
}: {
  accent: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="dashboard-card rounded-[24px] border border-[#0a2222]/10 bg-white/84 p-4 shadow-sm">
      <div className={`h-24 rounded-[20px] bg-gradient-to-br ${accent}`} />
      <p className="mt-4 text-left text-xl font-normal tracking-[-0.05em] text-slate-950">{title}</p>
      <p className="mt-1 text-left text-xs leading-5 text-[#0a2222]/52">{subtitle}</p>
    </div>
  );
}

function QuickMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-[#0a2222]/10 bg-white p-4 backdrop-blur">
      <p className="campus-kicker text-[#0a2222]/45">{label}</p>
      <p className="mt-2 text-2xl font-normal tracking-[-0.06em] text-slate-950">{value}</p>
    </div>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-3">
      <p className="text-sm font-medium text-[#0a2222]/66">{label}</p>
      <p className="text-base font-normal tracking-[-0.04em] text-slate-950">{value}</p>
    </div>
  );
}

function EmptyBlock({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#0a2222]/10 bg-[#fbfaf6] p-6 text-sm text-[#0a2222]/55">
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: CampusTaskSubmission["status"] }) {
  const tone =
    status === "approved"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : status === "rejected"
        ? "border-red-100 bg-red-50 text-red-700"
        : "border-amber-100 bg-amber-50 text-amber-700";

  return <span className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${tone}`}>{status}</span>;
}

function StatusLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-[#0a2222]/66">
        <span className="text-[#1d4ed8]">{icon}</span>
        {label}
      </div>
      <span className="text-sm font-semibold text-[#0a2222]">{value}</span>
    </div>
  );
}

function MissionPreview({
  title,
  subtitle,
  points,
}: {
  title: string;
  subtitle: string;
  points: number;
}) {
  return (
    <div className="dashboard-card dashboard-soft rounded-[24px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-normal tracking-[-0.05em] text-slate-950">{title}</p>
          <p className="mt-1 text-xs font-medium text-[#0a2222]/52">{subtitle}</p>
        </div>
        <span className="rounded-full border border-[#0a2222]/10 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1d4ed8]">
          {points} pts
        </span>
      </div>
    </div>
  );
}

function RewardRow({
  points,
  title,
  description,
  unlocked,
  accent,
  kind,
}: {
  points: number;
  title: string;
  description: string;
  unlocked: boolean;
  accent: string;
  kind: "certificate" | "tshirt" | "kit";
}) {
  return (
    <div className={`dashboard-card dashboard-soft overflow-hidden rounded-[28px] border ${unlocked ? "border-[#7fa7ff] bg-[#eef4ff] shadow-lg shadow-[rgba(10,34,34,0.08)]" : "border-[#0a2222]/10 bg-white/84 shadow-sm"}`}>
      <div className={`relative h-52 bg-gradient-to-br ${accent} p-4 sm:h-56`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.55),_transparent_32%)]" />
        <div className="relative flex h-full items-center justify-center overflow-hidden rounded-[22px]">
          <RewardVisual kind={kind} />
        </div>
      </div>
        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xl font-normal tracking-[-0.05em] text-slate-950">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[#0a2222]/55">{description}</p>
            </div>
            <Badge variant="outline" className={unlocked ? "border-[#7fa7ff] bg-white text-[#1d4ed8]" : "border-[#0a2222]/10 bg-white text-[#0a2222]/66"}>
              {points} pts
            </Badge>
          </div>
        <div className="flex items-center justify-between rounded-2xl bg-white px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0a2222]/45">Status</span>
          <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${unlocked ? "text-[#1d4ed8]" : "text-[#0a2222]/66"}`}>
            {unlocked ? "Unlocked" : "Locked"}
          </span>
        </div>
      </div>
    </div>
  );
}

function RewardVisual({ kind }: { kind: "certificate" | "tshirt" | "kit" }) {
  if (kind === "certificate") {
    return (
      <img
        src="/reward-certificate.png"
        alt="ReferralMe campus ambassador certificate"
        className="h-full w-full rounded-[20px] object-cover shadow-[0_18px_40px_-20px_rgba(37,99,235,0.28)]"
      />
    );
  }

  if (kind === "tshirt") {
    return (
      <img
        src="/reward-shirt.png"
        alt="ReferralMe reward t-shirt"
        className="h-full w-full rounded-[20px] object-contain drop-shadow-[0_24px_28px_rgba(37,99,235,0.15)]"
      />
    );
  }

  return (
    <img
      src="/reward-kit.png"
      alt="ReferralMe ambassador reward kit"
      className="h-full w-full rounded-[20px] object-contain drop-shadow-[0_24px_28px_rgba(37,99,235,0.15)]"
    />
  );
}

function AnnouncementRow({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "info" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-100 bg-emerald-50/60 text-emerald-800"
      : tone === "warning"
        ? "border-amber-100 bg-amber-50/70 text-amber-800"
        : "border-blue-100 bg-blue-50/60 text-blue-800";

  return (
    <div className={`dashboard-card dashboard-soft rounded-[24px] border px-4 py-4 ${toneClass}`}>
      <div className="flex items-start gap-3">
        <Bell className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-base font-normal tracking-[-0.04em] text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#0a2222]/66">{body}</p>
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  title,
  body,
  tone,
}: {
  title: string;
  body: string;
  tone: "info" | "success" | "warning";
}) {
  const dotClass =
    tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="dashboard-card dashboard-soft rounded-[24px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4">
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
        <div>
          <p className="text-base font-normal tracking-[-0.04em] text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-6 text-[#0a2222]/62">{body}</p>
        </div>
      </div>
    </div>
  );
}

function LockedPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card className="dashboard-reveal border border-[#0a2222]/10 bg-white/84 shadow-sm">
      <CardContent className="p-8">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-dashed border-[#0a2222]/10 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">Locked for now</p>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-[#0a2222]">{title}</h3>
          <p className="mt-3 text-sm leading-7 text-[#0a2222]/66">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SpotlightPanel({
  eyebrow,
  title,
  body,
  tone,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tone: "blue" | "green" | "dark";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f0fff7_100%)]"
      : tone === "dark"
        ? "border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fb_100%)]"
        : "border-blue-100 bg-[linear-gradient(180deg,#ffffff_0%,#f3f8ff_100%)]";

  return (
    <div className={`dashboard-card rounded-[24px] border p-4 shadow-sm ${toneClass}`}>
      <p className="campus-kicker text-[#1d4ed8]">{eyebrow}</p>
      <p className="mt-2 text-2xl font-normal tracking-[-0.06em] text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#0a2222]/62">{body}</p>
    </div>
  );
}

function TipRow({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[22px] border border-[#0a2222]/10 bg-white/90 px-4 py-3 shadow-sm">
      <p className="text-lg font-normal tracking-[-0.05em] text-slate-950">{title}</p>
      <p className="mt-1 text-sm leading-6 text-[#0a2222]/62">{body}</p>
    </div>
  );
}
