import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Award,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Github,
  Globe,
  IndianRupee,
  Linkedin,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  Share2,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useToast } from "../hooks/use-toast";
import ApplicationFormModal from "../components/application-form-modal";
import {
  getJobPostingsByReferrer,
  getMentorshipSessions,
  getReferralRequestsByReferrer,
  getUserProfile,
} from "../lib/firestore";
import type { FirestoreUser, MentorshipSession, ReferralRequest } from "../lib/firestore";
import { getProfileBadge, getProfileCompletionScore, getUserDisplayName, parseSkills } from "../lib/publicRanking";

interface PublicReferrerProfileProps {
  referrerId?: string;
}

export default function PublicReferrerProfile({ referrerId }: PublicReferrerProfileProps) {
  const [, setLocation] = useLocation();
  const { user, firebaseUser } = useFirebaseAuth();
  const { toast } = useToast();
  const [referrerData, setReferrerData] = useState<FirestoreUser | null>(null);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [requests, setRequests] = useState<ReferralRequest[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);

  useEffect(() => {
    const loadReferrerData = async () => {
      if (!referrerId) {
        setIsLoading(false);
        return;
      }

      try {
        const [profile, jobs, referralRequests, mentorshipSessions] = await Promise.all([
          getUserProfile(referrerId),
          getJobPostingsByReferrer(referrerId),
          getReferralRequestsByReferrer(referrerId),
          getMentorshipSessions(referrerId, "mentor"),
        ]);

        setReferrerData(profile);
        setJobPostings(jobs.filter((job) => job.isActive));
        setRequests(referralRequests);
        setSessions(mentorshipSessions);
      } catch (error) {
        console.error("Error loading referrer public profile:", error);
        toast({
          title: "Profile could not load",
          description: "Please try opening the profile again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReferrerData();
  }, [referrerId, toast]);

  const stats = useMemo(() => {
    if (!referrerData) {
      return {
        acceptedReferrals: 0,
        completedSessions: 0,
        paidSessions: 0,
        profileCompletion: 0,
        score: 0,
        badge: "Trusted Referrer",
      };
    }

    const acceptedReferrals = requests.filter((request) => request.status === "accepted").length;
    const completedSessions = sessions.filter((session) => session.status === "completed").length;
    const paidSessions = sessions.filter((session) => session.paymentStatus === "paid").length;
    const profileCompletion = getProfileCompletionScore(referrerData);
    const score =
      profileCompletion +
      acceptedReferrals * 35 +
      requests.length * 8 +
      completedSessions * 45 +
      paidSessions * 15 +
      Math.round((referrerData.mentorshipRating || 0) * 10);

    return {
      acceptedReferrals,
      completedSessions,
      paidSessions,
      profileCompletion,
      score,
      badge: getProfileBadge(score, referrerData.isMentorshipEnabled ? "mentor" : "referrer"),
    };
  }, [referrerData, requests, sessions]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Profile link copied",
        description: "Share this referrer profile with students or your network.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the URL from your browser.",
        variant: "destructive",
      });
    }
  };

  const handleApplyToJob = (job: any) => {
    if (!firebaseUser) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      setLocation(`/?returnTo=${returnUrl}`);
      return;
    }

    if (!user?.role) {
      setLocation("/role-selection");
      return;
    }

    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  const handleBookMentorship = () => {
    if (!firebaseUser) {
      const returnUrl = encodeURIComponent(window.location.pathname);
      setLocation(`/?returnTo=${returnUrl}`);
      return;
    }

    try {
      localStorage.setItem(`referralme:openTab:${firebaseUser.uid}`, "mentorship");
      if (referrerId) {
        localStorage.setItem(`referralme:mentorshipSearch:${firebaseUser.uid}`, getUserDisplayName(referrerData));
      }
    } catch {
      // Non-blocking: navigation still works without localStorage.
    }

    setLocation(user?.role === "seeker" ? "/seeker-dashboard" : "/dashboard");
    toast({
      title: "Open mentorship marketplace",
      description: "Go to the Mentorship tab and select this mentor from the marketplace.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading referrer profile...
        </div>
      </div>
    );
  }

  if (!referrerData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-slate-900">Referrer not found</h1>
            <p className="mt-2 text-slate-600">This public referrer profile is not available.</p>
            <Button className="mt-5" onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = getUserDisplayName(referrerData);
  const skills = parseSkills(referrerData.skills);
  const activeServices = (referrerData.mentorshipServices || []).filter((service) => service.isActive);
  const rating = referrerData.mentorshipRating || 0;
  const ratingCount = referrerData.mentorshipRatingCount || 0;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1,transparent_30%),radial-gradient(circle_at_top_right,#dbeafe,transparent_34%),linear-gradient(180deg,#f8fafc,#eef2ff)]">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Separator orientation="vertical" className="h-6 hidden sm:block" />
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <img src="/logo.png" alt="ReferralMe" className="h-7 w-7" />
              Referrer Profile
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setLocation("/leaderboard")}>
              <Trophy className="mr-2 h-4 w-4" />
              Leaderboard
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
          <section className="space-y-6">
            <Card className="overflow-hidden border-white/70 shadow-sm">
              <div className="h-36 bg-gradient-to-r from-slate-950 via-teal-950 to-blue-900" />
              <CardContent className="-mt-16 p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
                      <AvatarImage src={referrerData.profileImageUrl || referrerData.photoURL || ""} />
                      <AvatarFallback className="bg-teal-700 text-2xl text-white">{displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="pb-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge className="bg-emerald-100 text-emerald-800">
                          <Award className="mr-1 h-3 w-3" />
                          {stats.badge}
                        </Badge>
                        {referrerData.isMentorshipEnabled ? <Badge variant="outline">Mentorship Open</Badge> : null}
                        {rating ? (
                          <Badge className="bg-amber-100 text-amber-800">
                            <Star className="mr-1 h-3 w-3 fill-amber-500" />
                            {rating.toFixed(1)} ({ratingCount})
                          </Badge>
                        ) : null}
                      </div>
                      <h1 className="text-3xl font-bold text-slate-950">{displayName}</h1>
                      <p className="mt-1 text-slate-600">
                        {referrerData.designation && referrerData.company
                          ? `${referrerData.designation} at ${referrerData.company}`
                          : referrerData.designation || referrerData.company || "ReferralMe professional"}
                      </p>
                      {referrerData.location ? (
                        <p className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          {referrerData.location}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {referrerData.linkedinUrl || referrerData.linkedin ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(referrerData.linkedinUrl || referrerData.linkedin, "_blank")}>
                        <Linkedin className="mr-2 h-4 w-4" />
                        LinkedIn
                      </Button>
                    ) : null}
                    {referrerData.githubUrl ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(referrerData.githubUrl, "_blank")}>
                        <Github className="mr-2 h-4 w-4" />
                        GitHub
                      </Button>
                    ) : null}
                    {referrerData.websiteUrl ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(referrerData.websiteUrl, "_blank")}>
                        <Globe className="mr-2 h-4 w-4" />
                        Website
                      </Button>
                    ) : null}
                  </div>
                </div>
                {referrerData.bio || referrerData.mentorshipBio ? (
                  <p className="mt-6 max-w-3xl text-slate-700">{referrerData.mentorshipBio || referrerData.bio}</p>
                ) : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Profile Score" value={stats.profileCompletion} suffix="%" icon={<Target className="h-5 w-5" />} />
              <MetricCard label="Accepted Referrals" value={stats.acceptedReferrals} icon={<CheckCircle2 className="h-5 w-5" />} />
              <MetricCard label="Mentorship Done" value={stats.completedSessions} icon={<Sparkles className="h-5 w-5" />} />
              <MetricCard label="Active Jobs" value={jobPostings.length} icon={<Briefcase className="h-5 w-5" />} />
            </div>

            {activeServices.length ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-teal-700" />
                    Mentorship Services
                  </CardTitle>
                  <CardDescription>Services and pricing are set by the mentor.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {activeServices.map((service) => (
                    <div key={service.id} className="rounded-2xl border bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-950">{service.title}</h3>
                          <p className="mt-1 text-sm text-slate-600">{service.description}</p>
                        </div>
                        <Badge className="bg-teal-100 text-teal-800">
                          <IndianRupee className="mr-1 h-3 w-3" />
                          {service.price}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
                        <span>{service.duration} minutes</span>
                        <Button size="sm" onClick={handleBookMentorship}>Book</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-blue-700" />
                  Current Job Openings ({jobPostings.length})
                </CardTitle>
                <CardDescription>Request referrals for active roles shared by this referrer.</CardDescription>
              </CardHeader>
              <CardContent>
                {jobPostings.length ? (
                  <div className="space-y-4">
                    {jobPostings.map((job) => (
                      <div key={job.id} className="rounded-2xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-sm">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-semibold text-slate-950">{job.title}</h3>
                            <p className="text-sm text-slate-600">{job.company} • {job.location}</p>
                            {job.quickSummary || job.description ? (
                              <p className="mt-2 line-clamp-2 text-sm text-slate-600">{job.quickSummary || job.description}</p>
                            ) : null}
                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                              {job.experienceLevel || job.experience ? <Badge variant="outline">{job.experienceLevel || job.experience}</Badge> : null}
                              {job.minAtsScore ? <Badge variant="outline">ATS {job.minAtsScore}+</Badge> : null}
                              {job.createdAt ? (
                                <Badge variant="outline">
                                  <Calendar className="mr-1 h-3 w-3" />
                                  Posted {new Date(job.createdAt.seconds ? job.createdAt.seconds * 1000 : job.createdAt.toDate?.()).toLocaleDateString()}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 sm:w-40">
                            <Button size="sm" onClick={() => handleApplyToJob(job)}>
                              {firebaseUser ? <Send className="mr-2 h-4 w-4" /> : <ExternalLink className="mr-2 h-4 w-4" />}
                              {firebaseUser ? "Request Referral" : "Sign in"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setLocation(`/job/${job.id}`)}>
                              View Job
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border bg-slate-50 p-8 text-center">
                    <Briefcase className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                    <p className="font-medium text-slate-700">No active job openings right now.</p>
                    <p className="mt-1 text-sm text-slate-500">You can still follow this profile or check back later.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  Public Ranking
                </CardTitle>
                <CardDescription>Based on real ReferralMe activity.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-amber-50 p-4 text-center">
                  <p className="text-sm text-amber-700">Reputation score</p>
                  <p className="text-4xl font-black text-amber-900">{stats.score}</p>
                  <Badge className="mt-2 bg-amber-200 text-amber-900">{stats.badge}</Badge>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Profile completeness</span>
                    <span className="text-slate-500">{stats.profileCompletion}%</span>
                  </div>
                  <Progress value={stats.profileCompletion} />
                </div>
                <Button className="w-full" variant="outline" onClick={() => setLocation("/leaderboard")}>
                  View full leaderboard
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {skills.length ? (
              <Card>
                <CardHeader>
                  <CardTitle>Expertise</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {skills.slice(0, 12).map((skill) => (
                    <Badge key={skill} variant="secondary">{skill}</Badge>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>How scoring works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-600">
                <ScoreLine text="Profile completion improves trust and discoverability." />
                <ScoreLine text="Accepted referrals increase referrer ranking." />
                <ScoreLine text="Completed mentorship sessions and ratings improve mentor ranking." />
                <ScoreLine text="Scores are guidance signals, not guaranteed outcomes." />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      {selectedJob && (
        <ApplicationFormModal
          isOpen={isApplicationModalOpen}
          onClose={() => {
            setIsApplicationModalOpen(false);
            setSelectedJob(null);
          }}
          job={selectedJob}
          onApplicationSubmitted={() => {
            setIsApplicationModalOpen(false);
            setSelectedJob(null);
            toast({
              title: "Application submitted",
              description: "Your referral request has been submitted successfully.",
            });
          }}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, suffix = "" }: { label: string; value: number; icon: React.ReactNode; suffix?: string }) {
  return (
    <Card className="border-white/70">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}{suffix}</p>
        </div>
        <div className="rounded-2xl bg-teal-50 p-3 text-teal-700">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ScoreLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
      <p>{text}</p>
    </div>
  );
}
