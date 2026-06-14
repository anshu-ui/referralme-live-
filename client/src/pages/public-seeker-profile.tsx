import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Award, Briefcase, CheckCircle2, ExternalLink, FileText, Github, Linkedin, Loader2, MapPin, Share2, Sparkles, Target, Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { useToast } from "../hooks/use-toast";
import { getReferralRequestsBySeeker, getUserATSAnalysisHistory, getUserProfile } from "../lib/firestore";
import type { ATSAnalysisHistory, FirestoreUser, ReferralRequest } from "../lib/firestore";
import { getProfileCompletionScore, getUserDisplayName, parseSkills } from "../lib/publicRanking";

interface PublicSeekerProfileProps {
  seekerId?: string;
}

export default function PublicSeekerProfile({ seekerId }: PublicSeekerProfileProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [profile, setProfile] = useState<FirestoreUser | null>(null);
  const [requests, setRequests] = useState<ReferralRequest[]>([]);
  const [atsHistory, setAtsHistory] = useState<ATSAnalysisHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!seekerId) {
        setIsLoading(false);
        return;
      }

      try {
        const [userProfile, referralRequests, analyses] = await Promise.all([
          getUserProfile(seekerId),
          getReferralRequestsBySeeker(seekerId),
          getUserATSAnalysisHistory(seekerId),
        ]);

        setProfile(userProfile);
        setRequests(referralRequests);
        setAtsHistory(analyses);
      } catch (error) {
        console.error("Error loading seeker public profile:", error);
        toast({
          title: "Profile could not load",
          description: "Please try opening the profile again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [seekerId, toast]);

  const profileStats = useMemo(() => {
    const latestAts = atsHistory[0];
    const profileCompletion = profile ? getProfileCompletionScore(profile) : 0;
    const acceptedRequests = requests.filter((request) => request.status === "accepted").length;
    const readinessScore = Math.min(
      100,
      Math.round(((latestAts?.overallScore || 0) * 0.45) + (profileCompletion * 0.35) + Math.min(20, requests.length * 4)),
    );

    return {
      latestAts,
      profileCompletion,
      acceptedRequests,
      readinessScore,
      badge: getSeekerBadge(readinessScore + acceptedRequests * 20),
    };
  }, [atsHistory, profile, requests]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Profile link copied",
        description: "You can share this public profile on LinkedIn, WhatsApp, or with mentors.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the profile link from your browser.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading public profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <Card className="max-w-md text-center">
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-slate-900">Profile not found</h1>
            <p className="mt-2 text-slate-600">This seeker profile is not available.</p>
            <Button className="mt-5" onClick={() => setLocation("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const skills = parseSkills(profile.skills);
  const displayName = getUserDisplayName(profile);
  const title = profile.designation || profile.experience || "Career seeker";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(180deg,#f8fafc,#eef2ff)]">
      <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <img src="/logo.png" alt="ReferralMe" className="h-7 w-7" />
              ReferralMe Profile
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.75fr]">
          <section className="space-y-6">
            <Card className="overflow-hidden border-white/70 shadow-sm">
              <div className="h-32 bg-gradient-to-r from-slate-950 via-blue-950 to-cyan-800" />
              <CardContent className="-mt-14 p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <Avatar className="h-28 w-28 border-4 border-white shadow-lg">
                      <AvatarImage src={profile.profileImageUrl || profile.photoURL || ""} />
                      <AvatarFallback className="bg-blue-600 text-2xl text-white">{displayName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="pb-1">
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge className="bg-emerald-100 text-emerald-800">
                          <Trophy className="mr-1 h-3 w-3" />
                          {profileStats.badge}
                        </Badge>
                        <Badge variant="outline">Public Seeker Profile</Badge>
                      </div>
                      <h1 className="text-3xl font-bold text-slate-950">{displayName}</h1>
                      <p className="mt-1 text-slate-600">{title}</p>
                      {profile.location ? (
                        <p className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                          <MapPin className="h-4 w-4" />
                          {profile.location}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {profile.linkedinUrl || profile.linkedin ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(profile.linkedinUrl || profile.linkedin, "_blank")}>
                        <Linkedin className="mr-2 h-4 w-4" />
                        LinkedIn
                      </Button>
                    ) : null}
                    {profile.githubUrl ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(profile.githubUrl, "_blank")}>
                        <Github className="mr-2 h-4 w-4" />
                        GitHub
                      </Button>
                    ) : null}
                  </div>
                </div>
                {profile.bio ? <p className="mt-6 max-w-3xl text-slate-700">{profile.bio}</p> : null}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Placement Readiness" value={`${profileStats.readinessScore}%`} icon={<Sparkles className="h-5 w-5" />} />
              <MetricCard label="Latest ATS Score" value={profileStats.latestAts ? `${profileStats.latestAts.overallScore}%` : "Not run"} icon={<FileText className="h-5 w-5" />} />
              <MetricCard label="Referral Progress" value={`${profileStats.acceptedRequests}/${requests.length}`} icon={<Briefcase className="h-5 w-5" />} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Career Snapshot
                </CardTitle>
                <CardDescription>Public summary of readiness, skills, and referral journey.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-700">Profile completion</span>
                    <span className="text-slate-500">{profileStats.profileCompletion}%</span>
                  </div>
                  <Progress value={profileStats.profileCompletion} />
                </div>
                {skills.length ? (
                  <div>
                    <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {skills.slice(0, 14).map((skill) => (
                        <Badge key={skill} variant="secondary">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {profileStats.latestAts ? (
                  <div className="rounded-2xl border bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Latest resume review: {profileStats.latestAts.jobTitle || "General role"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Score {profileStats.latestAts.overallScore}% with {profileStats.latestAts.suggestions?.length || 0} improvement suggestions.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-500" />
                  Public Badges
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Badge className="w-full justify-center bg-blue-100 py-2 text-blue-800">{profileStats.badge}</Badge>
                {profileStats.latestAts?.overallScore && profileStats.latestAts.overallScore >= 70 ? (
                  <Badge className="w-full justify-center bg-emerald-100 py-2 text-emerald-800">ATS Ready</Badge>
                ) : null}
                {profileStats.acceptedRequests > 0 ? (
                  <Badge className="w-full justify-center bg-violet-100 py-2 text-violet-800">Referral Progress</Badge>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Referral Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.slice(0, 5).map((request) => (
                  <div key={request.id} className="rounded-xl border bg-white p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{request.jobTitle || "Referral request"}</p>
                      <Badge variant="outline">{request.status?.replace("_", " ") || "pending"}</Badge>
                    </div>
                    <p className="mt-1 text-slate-500">{(request as any).company || (request as any).job?.company || "Company"}</p>
                  </div>
                ))}
                {!requests.length ? (
                  <p className="rounded-xl border bg-slate-50 p-4 text-center text-sm text-slate-500">
                    No public referral activity yet.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            <Button className="w-full bg-slate-950 hover:bg-slate-800" onClick={() => setLocation("/leaderboard")}>
              View Leaderboard
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </aside>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="border-white/70">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">{icon}</div>
      </CardContent>
    </Card>
  );
}

function getSeekerBadge(score: number) {
  if (score >= 160) return "Placement Ready";
  if (score >= 90) return "Rising Candidate";
  return "Profile Starter";
}
