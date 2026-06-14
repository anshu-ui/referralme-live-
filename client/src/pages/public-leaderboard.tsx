import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Award, Briefcase, Crown, Loader2, Medal, Search, Share2, Sparkles, Star, Target, Trophy, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import {
  getAllMentorshipSessions,
  getAllReferralRequests,
  getAllUsers,
  getUserATSAnalysisHistory,
} from "../lib/firestore";
import type { ATSAnalysisHistory, FirestoreUser, MentorshipSession, ReferralRequest } from "../lib/firestore";
import { buildPublicLeaderboard, getUserDisplayName, parseSkills, type PublicRankCategory, type PublicRankEntry } from "../lib/publicRanking";

const categoryLabels: Record<PublicRankCategory | "all", string> = {
  all: "All",
  referrer: "Referrers",
  mentor: "Mentors",
  seeker: "Seekers",
};

export default function PublicLeaderboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [requests, setRequests] = useState<ReferralRequest[]>([]);
  const [sessions, setSessions] = useState<MentorshipSession[]>([]);
  const [atsHistoryByUser, setAtsHistoryByUser] = useState<Record<string, ATSAnalysisHistory[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const loadLeaderboard = async () => {
      try {
        const [allUsers, allRequests, allSessions] = await Promise.all([
          getAllUsers(),
          getAllReferralRequests(),
          getAllMentorshipSessions(),
        ]);

        const seekerUsers = allUsers.filter((user) => user.role === "seeker").slice(0, 40);
        const atsPairs = await Promise.all(
          seekerUsers.map(async (user) => [user.uid, await getUserATSAnalysisHistory(user.uid)] as const),
        );

        setUsers(allUsers);
        setRequests(allRequests);
        setSessions(allSessions);
        setAtsHistoryByUser(Object.fromEntries(atsPairs));
      } catch (error) {
        console.error("Error loading public leaderboard:", error);
        toast({
          title: "Leaderboard could not load",
          description: "Please refresh and try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadLeaderboard();
  }, [toast]);

  const leaderboard = useMemo(
    () => buildPublicLeaderboard({ users, requests, sessions, atsHistoryByUser }),
    [atsHistoryByUser, requests, sessions, users],
  );

  const searchedLeaderboard = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return leaderboard;
    return leaderboard.filter((entry) => {
      const name = getUserDisplayName(entry.user).toLowerCase();
      const subtitle = entry.subtitle.toLowerCase();
      const skills = parseSkills(entry.user.skills).join(" ").toLowerCase();
      return name.includes(normalized) || subtitle.includes(normalized) || skills.includes(normalized);
    });
  }, [leaderboard, query]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Leaderboard link copied",
        description: "Share it with your community to drive healthy competition.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy the URL from your browser.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Building leaderboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1e3a8a,transparent_36%),linear-gradient(180deg,#020617,#0f172a_45%,#f8fafc_45%)]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 text-white">
        <Button variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setLocation("/")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Home
        </Button>
        <Button variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white" onClick={handleShare}>
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-12">
        <section className="py-8 text-white">
          <Badge className="mb-4 bg-cyan-300 text-slate-950">ReferralMe Rankings</Badge>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
                Public profiles, visible progress, real competition.
              </h1>
              <p className="mt-4 max-w-2xl text-lg text-blue-100">
                Rankings are built from real ReferralMe activity: referrals, mentorship sessions, profile completion, ratings, and seeker readiness.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Members" value={leaderboard.length} icon={<Users className="h-5 w-5" />} />
              <HeroMetric label="Referrals" value={requests.length} icon={<Briefcase className="h-5 w-5" />} />
              <HeroMetric label="Sessions" value={sessions.length} icon={<Sparkles className="h-5 w-5" />} />
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/70 bg-white p-4 shadow-2xl sm:p-6">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">Leaderboard</h2>
              <p className="text-sm text-slate-500">Updated from live platform data when the page loads.</p>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by name, company, skill..."
                className="pl-9"
              />
            </div>
          </div>

          <TopThree entries={searchedLeaderboard.slice(0, 3)} />

          <Card className="mt-6 border-blue-100 bg-blue-50/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-slate-950">
                <Target className="h-5 w-5 text-blue-700" />
                How ranking works
              </CardTitle>
              <CardDescription>
                Ranking uses real ReferralMe activity. It is a visibility and progress signal, not a job or referral guarantee.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm text-slate-700 md:grid-cols-4">
              <div className="rounded-xl border border-blue-100 bg-white p-3">Profile completion builds baseline trust.</div>
              <div className="rounded-xl border border-blue-100 bg-white p-3">Accepted referral requests increase referrer score.</div>
              <div className="rounded-xl border border-blue-100 bg-white p-3">Completed mentorship and ratings increase mentor score.</div>
              <div className="rounded-xl border border-blue-100 bg-white p-3">ATS readiness and applications increase seeker progress.</div>
            </CardContent>
          </Card>

          <Tabs defaultValue="all" className="mt-8">
            <TabsList className="grid w-full grid-cols-4">
              {(["all", "referrer", "mentor", "seeker"] as const).map((category) => (
                <TabsTrigger key={category} value={category}>{categoryLabels[category]}</TabsTrigger>
              ))}
            </TabsList>
            {(["all", "referrer", "mentor", "seeker"] as const).map((category) => {
              const entries = category === "all"
                ? searchedLeaderboard
                : searchedLeaderboard.filter((entry) => entry.category === category);
              return (
                <TabsContent key={category} value={category} className="mt-6">
                  <div className="space-y-3">
                    {entries.slice(0, 50).map((entry) => (
                      <LeaderboardRow key={`${entry.category}-${entry.user.uid}`} entry={entry} onOpen={() => {
                        setLocation(entry.user.role === "seeker" ? `/seeker/${entry.user.uid}` : `/referrer/${entry.user.uid}`);
                      }} />
                    ))}
                    {!entries.length ? (
                      <div className="rounded-2xl border bg-slate-50 p-8 text-center text-slate-500">
                        No profiles found for this filter yet.
                      </div>
                    ) : null}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </section>
      </main>
    </div>
  );
}

function HeroMetric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
      <div className="mb-3 text-cyan-200">{icon}</div>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-sm text-blue-100">{label}</p>
    </div>
  );
}

function TopThree({ entries }: { entries: PublicRankEntry[] }) {
  if (!entries.length) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {entries.map((entry, index) => {
        const icons = [Crown, Trophy, Medal];
        const Icon = icons[index] || Award;
        return (
          <Card key={entry.user.uid} className={index === 0 ? "border-amber-200 bg-amber-50" : ""}>
            <CardContent className="p-5 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white">
                <Icon className="h-6 w-6" />
              </div>
              <Avatar className="mx-auto h-16 w-16">
                <AvatarImage src={entry.user.profileImageUrl || entry.user.photoURL || ""} />
                <AvatarFallback>{getUserDisplayName(entry.user).charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="mt-3 font-bold text-slate-950">{getUserDisplayName(entry.user)}</h3>
              <p className="text-sm text-slate-500">{entry.subtitle}</p>
              <Badge className="mt-3">{entry.badge}</Badge>
              <p className="mt-3 text-2xl font-black text-slate-950">{entry.score}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function LeaderboardRow({ entry, onOpen }: { entry: PublicRankEntry; onOpen: () => void }) {
  const name = getUserDisplayName(entry.user);
  const skills = parseSkills(entry.user.skills);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-white p-4 transition hover:border-blue-200 hover:shadow-md md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
          #{entry.rank}
        </div>
        <Avatar className="h-12 w-12">
          <AvatarImage src={entry.user.profileImageUrl || entry.user.photoURL || ""} />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-slate-950">{name}</h3>
            <Badge variant="secondary">{categoryLabels[entry.category]}</Badge>
            <Badge variant="outline">{entry.badge}</Badge>
          </div>
          <p className="text-sm text-slate-500">{entry.subtitle}</p>
          {skills.length ? (
            <p className="mt-1 text-xs text-slate-400">{skills.slice(0, 4).join(" • ")}</p>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 md:justify-end">
        <MiniStat label="Score" value={entry.score} />
        <MiniStat label="Referrals" value={entry.metrics.acceptedReferrals || 0} />
        <MiniStat label="Sessions" value={entry.metrics.completedMentorships || 0} />
        {entry.category === "seeker" ? <MiniStat label="ATS" value={entry.metrics.atsScore || 0} /> : null}
        {entry.metrics.averageRating ? (
          <div className="flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
            <Star className="h-4 w-4 fill-amber-400" />
            {entry.metrics.averageRating.toFixed(1)}
          </div>
        ) : null}
        <Button size="sm" onClick={onOpen}>
          View Profile
          <Target className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
      <p className="text-sm font-bold text-slate-950">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
    </div>
  );
}
