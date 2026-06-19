import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useJobPostings, useReferralRequests } from "../hooks/useFirestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { isJobAtCapacity, isJobExpired } from "../lib/firestore";
import { Link } from "wouter";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import ApplicationFormModal from "../components/application-form-modal";
import ATSAnalyzer from "../components/ats-analyzer";
import ApplicationTrendsChart from "../components/application-trends-chart";
import AiCareerAgent from "../components/ai-career-agent";
import MentorshipMarketplace from "../components/mentorship-marketplace";
import AiMentorChat from "../components/ai-mentor-chat";

import DiscoverReferrers from "../components/discover-referrers";
import ReferrerProfileModal from "../components/referrer-profile-modal";
import AutoAchievementSystem from "../components/auto-achievement-system";
import { useToast } from "../hooks/use-toast";
import { 
  Search, MapPin, IndianRupee, Calendar, Building, Send, 
  MessageCircle, FileText, TrendingUp, Target, Star, 
  Clock, CheckCircle, XCircle, Upload, Download, Bell, 
  Activity, BarChart3, Award, Filter, Settings, User,
  Briefcase, Globe, Linkedin, Github, Camera, Edit3,
  ThumbsUp, ThumbsDown, AlertCircle, ChevronRight, ExternalLink,
  Video, Phone, UserPlus, Tag, BookOpen, Plus, Eye,
  Users, Trophy, Zap, Brain, TrendingDown, LogOut, Bot,
  PieChart, LineChart, ArrowUp, ArrowDown, Percent, 
  Sparkles, Flame, Medal, Gift, Crown, Shield, CheckCircle2,
  Lightbulb, Network, ChevronDown, ChevronUp, Copy
} from "lucide-react";
import { 
  trackEvent, 
  trackTabSwitch, 
  trackJobApplication, 
  trackProfileView, 
  trackButtonClick,
  trackSearchQuery,
  trackFilterUsage 
} from "../lib/analytics";


export default function CleanSeekerDashboard() {
  const { user, logout } = useFirebaseAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      return user?.uid ? localStorage.getItem(`referralme:openTab:${user.uid}`) || "career-agent" : "career-agent";
    } catch {
      return "career-agent";
    }
  });
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isATSAnalyzerOpen, setIsATSAnalyzerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    company: "all",
    location: "all",
    experience: "all"
  });
  const [atsAnalysisResult, setAtsAnalysisResult] = useState<any>(null);
  const [selectedReferrer, setSelectedReferrer] = useState<any>(null);
  const [isReferrerProfileOpen, setIsReferrerProfileOpen] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());


  // Real-time data from Firestore
  const { jobs: jobPostings, loading: jobsLoading } = useJobPostings();
  const { requests: applications, loading: applicationsLoading } = useReferralRequests("seeker");

  useEffect(() => {
    if (!user?.uid) return;
    try {
      const requestedTab = localStorage.getItem(`referralme:openTab:${user.uid}`);
      if (requestedTab) {
        setActiveTab(requestedTab);
        localStorage.removeItem(`referralme:openTab:${user.uid}`);
      }
    } catch {
      // ignore localStorage issues
    }
  }, [user?.uid]);

  // Calculate real stats from actual data
  const realStats = {
    totalApplications: applications?.length || 0,
    pending: applications?.filter(app => app.status === "pending" || !app.status).length || 0,
    provided: applications?.filter(app => app.status === "accepted" || app.status === "referral_confirmed" || app.status === "sent_to_hr").length || 0,
    declined: applications?.filter(app => app.status === "rejected").length || 0,
    interviews: applications?.filter(app => app.status === "interview_scheduled" || app.status === "completed").length || 0,
    atsScore: atsAnalysisResult?.overallScore || null,
    profileViews: 0,
    responseRate: applications?.length > 0 ? Math.round((applications.filter(app => app.status !== "pending").length / applications.length) * 100) : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "referral_confirmed": return "bg-emerald-100 text-emerald-800";
      case "sent_to_hr": return "bg-sky-100 text-sky-800";
      case "interview_scheduled": return "bg-indigo-100 text-indigo-800";
      case "completed": return "bg-blue-100 text-blue-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getApplicationModeLabel = (mode?: string) => {
    switch (mode) {
      case "direct_internal_link":
        return "Direct internal link";
      case "email_resume":
        return "Email resume";
      case "platform_request":
      default:
        return "Platform request";
    }
  };

  const getTimelineStepStatus = (status?: string) => {
    switch (status) {
      case "accepted":
      case "referral_confirmed":
      case "sent_to_hr":
      case "interview_scheduled":
      case "completed":
        return 1;
      case "rejected":
        return -1;
      default:
        return 0;
    }
  };

  const getStatusBadge = (status: string) => {
    const colorClass = getStatusColor(status);
    return (
      <Badge className={`${colorClass} capitalize`}>
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const toggleJobExpanded = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleApplyToJob = (job: any) => {
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  const handleApplicationSubmitted = (application: any) => {
    // Track application with ATS data if available
    trackJobApplication(application.jobPostingId);
    
    // Refresh applications list
    // The useReferralRequests hook should automatically update
    setIsApplicationModalOpen(false);
    setSelectedJob(null);
    
    // Update ATS analysis result for dashboard display
    if (application.atsAnalysis) {
      setAtsAnalysisResult(application.atsAnalysis);
    }
  };

  const handleReferrerSelect = async (referrerId: string) => {
    try {
      // Fetch referrer data from Firebase
      const referrerDoc = await getDoc(doc(db, "users", referrerId));
      if (referrerDoc.exists()) {
        setSelectedReferrer({ id: referrerId, ...referrerDoc.data() });
        setIsReferrerProfileOpen(true);
      }
    } catch (error) {
      console.error("Error fetching referrer:", error);
      console.error("Failed to load referrer profile");
    }
  };

  // Filter job postings based on search and filters
  const filteredJobs = jobPostings?.filter(job => {
    // Safety checks for missing properties
    if (!job || !job.title || !job.company || !job.location) return false;
    
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompany = filters.company === "all" || job.company === filters.company;
    const matchesLocation = filters.location === "all" || job.location.includes(filters.location);
    return matchesSearch && matchesCompany && matchesLocation;
  }) || [];

  const seekerDisplayName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const seekerProfileImage = user?.profileImageUrl || user?.photoURL || "";
  const seekerRecord = (user || {}) as Record<string, any>;
  const profileSignals = [
    seekerRecord.displayName || seekerRecord.firstName || seekerRecord.lastName,
    seekerRecord.email,
    seekerRecord.role,
    seekerRecord.bio || seekerRecord.about || seekerRecord.headline,
    seekerRecord.skills?.length ? "skills" : null,
    seekerRecord.resumeUrl || seekerRecord.resumeText,
    seekerRecord.linkedinUrl || seekerRecord.githubUrl,
  ];
  const profileCompletion = Math.max(
    seekerRecord.profileCompleted ? 100 : 0,
    Math.round((profileSignals.filter(Boolean).length / profileSignals.length) * 100),
  );
  const atsShareUrl = typeof window !== "undefined" ? `${window.location.origin}/#resume-scan` : "/#resume-scan";
  const atsShareMessage =
    "Check your ATS score free on ReferralMe and improve your resume before applying: " + atsShareUrl;

  const handleShareATSScan = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Free ATS Resume Scan",
          text: "Check your ATS score free on ReferralMe and improve your resume before applying.",
          url: atsShareUrl,
        });
        return;
      }

      window.open(`https://wa.me/?text=${encodeURIComponent(atsShareMessage)}`, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error sharing ATS scan:", error);
      toast({
        title: "Share not completed",
        description: "You can still copy the ATS scan link below.",
      });
    }
  };

  const handleCopyATSLink = async () => {
    try {
      await navigator.clipboard.writeText(atsShareUrl);
      toast({
        title: "ATS scan link copied",
        description: "Share it with friends to bring more job seekers into ReferralMe.",
      });
    } catch (error) {
      console.error("Error copying ATS scan link:", error);
      toast({
        title: "Copy failed",
        description: "The ATS scan link could not be copied. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSharePublicProfile = async () => {
    if (!user?.uid) return;
    const profileUrl = `${window.location.origin}/seeker/${user.uid}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      toast({
        title: "Public profile copied",
        description: "Share this profile with mentors, referrers, and your network.",
      });
    } catch (error) {
      console.error("Error copying seeker public profile:", error);
      toast({
        title: "Copy failed",
        description: "Please copy the profile link from your browser.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="dashboard-surface dashboard-shell">
      {/* Header */}
      <header className="dashboard-glass-header sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center hover-scale">
              <img src={"/logo.png"} alt="ReferralMe" className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3" />
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">ReferralMe</h1>
                <span className="text-xs text-blue-600 font-medium -mt-1 hidden xs:inline">Seeker Dashboard</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
              <Link href="/leaderboard">
                <Button variant="outline" size="sm" className="hidden lg:flex hover-lift">
                  <Trophy className="h-4 w-4 mr-2" />
                  Leaderboard
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleSharePublicProfile} className="hidden md:flex hover-lift">
                <Copy className="h-4 w-4 mr-2" />
                Public Profile
              </Button>
              <Button variant="ghost" size="sm" className="hidden md:flex hover-lift">
                <Bell className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 hover-scale">
                  <AvatarImage src={seekerProfileImage} />
                  <AvatarFallback>
                    {seekerDisplayName.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs md:text-sm font-medium text-gray-700 hidden sm:inline mobile-hide">
                  {seekerDisplayName}
                </span>
              </div>
              
              <Button variant="ghost" size="sm" onClick={logout} className="hover-lift">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full">
        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          trackTabSwitch(tab, 'seeker');
        }} className="space-y-6">
          <div className="w-full professional-tabs sticky top-14 sm:top-16 z-30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="overflow-x-auto tab-scroll-container scrollbar-hide">
                <TabsList className="flex min-w-max gap-0 p-2 bg-transparent border-none h-auto">
                  <TabsTrigger value="career-agent" className="professional-tab">
                    <div className="professional-tab-content">
                      <Sparkles className="h-4 w-4 professional-tab-icon" />
                      <span className="hidden sm:inline">Career Agent</span>
                      <span className="sm:hidden">Agent</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="professional-tab">
                    <div className="professional-tab-content">
                      <BarChart3 className="h-4 w-4 professional-tab-icon" />
                      <span>Overview</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="jobs" className="professional-tab">
                    <div className="professional-tab-content">
                      <Briefcase className="h-4 w-4 professional-tab-icon" />
                      <span>Jobs</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="applications" className="professional-tab">
                    <div className="professional-tab-content">
                      <FileText className="h-4 w-4 professional-tab-icon" />
                      <span>Apps</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="mentorship" className="professional-tab">
                    <div className="professional-tab-content">
                      <Users className="h-4 w-4 professional-tab-icon" />
                      <span>Mentor</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="ai-mentor" className="professional-tab">
                    <div className="professional-tab-content">
                      <Brain className="h-4 w-4 professional-tab-icon" />
                      <span className="hidden sm:inline">AI Mentor</span>
                      <span className="sm:hidden">Mentor</span>
                    </div>
                  </TabsTrigger>

                  <TabsTrigger value="tools" className="professional-tab">
                    <div className="professional-tab-content">
                      <Target className="h-4 w-4 professional-tab-icon" />
                      <span>Tools</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 dashboard-section-enter">
            <Card className="dashboard-hero-strip mb-6 rounded-3xl">
              <CardContent className="relative z-10 p-6 sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <Badge className="mb-3 border border-white/20 bg-white/10 text-blue-100 hover:bg-white/10">
                      AI Career Workspace
                    </Badge>
                    <h2 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-4xl">
                      Build your placement path from real resume, referral, and mentorship signals.
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
                      Scores are calculated from your ATS result, profile completion, applications, and ReferralMe activity. They are guidance signals, not guaranteed outcomes.
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur">
                      <p className="text-2xl font-bold">{realStats.atsScore || 0}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-blue-100">ATS</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur">
                      <p className="text-2xl font-bold">{realStats.totalApplications}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-blue-100">Apps</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/10 p-3 text-center backdrop-blur">
                      <p className="text-2xl font-bold">{jobPostings?.length || 0}</p>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-blue-100">Jobs</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* AI Career Agent Tab */}
          <TabsContent value="career-agent" className="space-y-6">
            {user ? (
              <AiCareerAgent
                user={user as any}
                jobs={jobPostings || []}
                applications={applications || []}
                jobsLoading={jobsLoading}
                latestAtsScore={realStats.atsScore}
                onRunAts={() => setIsATSAnalyzerOpen(true)}
                onOpenAiMentor={() => setActiveTab("ai-mentor")}
                onOpenMentorship={() => setActiveTab("mentorship")}
                onApplyToJob={handleApplyToJob}
              />
            ) : null}
          </TabsContent>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
                  <Send className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{realStats.totalApplications}</div>
                  <p className="text-xs text-muted-foreground">
                    {realStats.totalApplications === 0 ? "Start applying to jobs!" : "Keep going!"}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{realStats.pending}</div>
                  <p className="text-xs text-muted-foreground">Awaiting review</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Referrals Provided</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{realStats.provided}</div>
                  <p className="text-xs text-muted-foreground">Successfully provided</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Referrals Declined</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{realStats.declined}</div>
                  <p className="text-xs text-muted-foreground">
                    {realStats.declined === 0 ? "No declines yet" : "Keep trying!"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Get started with your job search</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                <Button onClick={() => setActiveTab("jobs")}>
                  <Search className="mr-2 h-4 w-4" />
                  Browse Jobs
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("tools")}>
                  <Brain className="mr-2 h-4 w-4" />
                  ATS Analyzer
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("discover-referrers")}>
                  <Network className="mr-2 h-4 w-4" />
                  View Referrers
                </Button>
                <Link href="/profile-edit">
                  <Button variant="outline">
                    <User className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-3">
                      <Brain className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Improve Before You Apply</CardTitle>
                      <CardDescription>Check your ATS score before sending more applications.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-blue-100 bg-white px-4 py-3">
                    <span className="text-sm text-gray-600">Latest ATS score</span>
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      {realStats.atsScore ?? "--"}/100
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">
                    Stronger ATS performance usually means better referral readiness and fewer wasted applications.
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setIsATSAnalyzerOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Run ATS Scan
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-3">
                      <Users className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Share Free ATS Scan</CardTitle>
                      <CardDescription>Help a friend improve their resume before they apply.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Share ReferralMe&apos;s free ATS scan with friends who are applying right now.
                  </p>
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleShareATSScan}>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Share
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleCopyATSLink}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Best for WhatsApp groups, friends, and college or alumni circles.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-100 p-3">
                      <TrendingUp className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Referral Momentum</CardTitle>
                      <CardDescription>See where you are strong and what to improve next.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border bg-white p-3 text-center">
                      <p className="text-xs text-gray-500">Profile</p>
                      <p className="text-lg font-semibold text-gray-900">{profileCompletion}%</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3 text-center">
                      <p className="text-xs text-gray-500">Applied</p>
                      <p className="text-lg font-semibold text-gray-900">{realStats.totalApplications}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-3 text-center">
                      <p className="text-xs text-gray-500">Response</p>
                      <p className="text-lg font-semibold text-gray-900">{realStats.responseRate}%</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    {profileCompletion < 100
                      ? "Complete your profile and keep your ATS score strong to improve referral chances."
                      : "Your profile is in good shape. Keep applying to strong-fit roles and track your response rate."}
                  </p>
                  <div className="flex gap-3">
                    <Link href="/profile-edit" className="flex-1">
                      <Button variant="outline" className="w-full">
                        <User className="mr-2 h-4 w-4" />
                        Edit Profile
                      </Button>
                    </Link>
                    <Button className="flex-1" onClick={() => setActiveTab("jobs")}>
                      <Briefcase className="mr-2 h-4 w-4" />
                      Browse Jobs
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Empty State or Recent Activity */}
            {applications && applications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
                  <p className="text-gray-500 text-center mb-6">
                    Start your job search by browsing available opportunities and submitting applications.
                  </p>
                  <Button onClick={() => setActiveTab("jobs")}>
                    Browse Available Jobs
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {applications?.slice(0, 3).map((app) => (
                      <div key={app.id} className="rounded-lg border p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h4 className="font-medium">{app.jobTitle}</h4>
                            <p className="text-sm text-gray-500">Referrer: {app.referrerName}</p>
                          </div>
                          {getStatusBadge(app.status || "pending")}
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-500">
                          {["Applied", "Review", "Outcome"].map((label, index) => {
                            const stepStatus = getTimelineStepStatus(app.status || "pending");
                            const isActive = index === 0 || (index === 1 && stepStatus >= 0) || (index === 2 && stepStatus > 0);
                            const isRejected = index === 2 && stepStatus < 0;
                            return (
                              <div key={label} className={`rounded-full px-2 py-1 text-center ${isRejected ? "bg-red-100 text-red-700" : isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                {label}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            {/* Search and Filters */}
            <Card>
              <CardHeader>
                <CardTitle>Find Job Opportunities</CardTitle>
                <CardDescription>Discover jobs posted by industry professionals</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search jobs, companies, or keywords..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Filters
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Jobs List */}
            {jobsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-2">Loading opportunities...</span>
                </CardContent>
              </Card>
            ) : filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No job opportunities available</h3>
                  <p className="text-gray-500 text-center mb-6">
                    There are currently no job postings. Check back later or ask professionals to post opportunities.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredJobs.map((job) => {
                  const jobClosed = isJobExpired(job) || (job.autoCloseOnCap && isJobAtCapacity(job));
                  const screeningCount = (job.screeningQuestions || []).length;
                  return (
                  <Card key={job.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        <div>
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{job.title}</h3>
                              {job.isActive && (
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(job.createdAt?.toDate()).toLocaleDateString()}
                            </div>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                              <Building className="h-4 w-4" />
                              {job.company}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {job.location}
                            </span>
                            {job.salary && (
                              <span className="flex items-center gap-1">
                                <IndianRupee className="h-4 w-4" />
                                {job.salary?.replace(/\$/g, '₹').replace(/\s*INR\s*$/i, '')} INR
                              </span>
                            )}
                          </div>

                          <div className="mb-4 flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                              ATS cutoff {job.minAtsScore || 75}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {getApplicationModeLabel(job.applicationMode)}
                            </Badge>
                            {screeningCount ? (
                              <Badge variant="outline" className="border-slate-200 text-slate-700">
                                {screeningCount} screening question{screeningCount > 1 ? "s" : ""}
                              </Badge>
                            ) : null}
                            {jobClosed ? (
                              <Badge className="bg-red-100 text-red-800">
                                {isJobExpired(job) ? "Expired" : "Cap reached"}
                              </Badge>
                            ) : null}
                            {realStats.atsScore ? (
                              <Badge
                                className={
                                  realStats.atsScore >= Number(job.minAtsScore || 75)
                                    ? "bg-green-100 text-green-800"
                                    : "bg-amber-100 text-amber-800"
                                }
                              >
                                {realStats.atsScore >= Number(job.minAtsScore || 75) ? "You likely qualify" : "Improve ATS before apply"}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-200 text-slate-600">
                                Run ATS scan to check fit
                              </Badge>
                            )}
                          </div>

                          {job.quickSummary ? (
                            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-sm text-blue-900">
                              {job.quickSummary}
                            </div>
                          ) : null}
                          
                          <div className="mb-4">
                            <p className={`text-gray-700 whitespace-pre-wrap ${job.id && expandedJobs.has(job.id) ? '' : 'line-clamp-3'}`}>
                              {job.description}
                            </p>
                            {job.description && job.description.length > 150 && job.id && (
                              <button
                                onClick={() => toggleJobExpanded(job.id!)}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                data-testid={`button-toggle-description-${job.id}`}
                              >
                                {expandedJobs.has(job.id) ? (
                                  <>
                                    <ChevronUp className="w-4 h-4" />
                                    Show Less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-4 h-4" />
                                    Read More
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {job.referrerName?.charAt(0) || "R"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-gray-600">
                              Posted by {job.referrerName || "Referrer"}
                            </span>
                          </div>
                          
                          <div className="flex justify-end sm:justify-start">
                            {/* Check if user has already applied */}
                            {applications?.some(app => app.jobPostingId === job.id) ? (
                              <Button disabled variant="outline" size="sm" className="w-full sm:w-auto">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Applied
                              </Button>
                            ) : jobClosed ? (
                              <Button disabled variant="outline" size="sm" className="w-full sm:w-auto">
                                <Clock className="h-4 w-4 mr-2" />
                                Closed
                              </Button>
                            ) : (
                              <Button 
                                onClick={() => handleApplyToJob(job)}
                                size="sm"
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                {realStats.atsScore && realStats.atsScore < Number(job.minAtsScore || 75) ? "Review Before Apply" : "Apply Now"}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Provide Referrals Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Provide Referrals
                  </CardTitle>
                  <CardDescription>Applications where referrers provided referrals</CardDescription>
                </CardHeader>
                <CardContent>
                  {applicationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                      <span className="ml-2 text-sm">Loading...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications?.filter(app => app.status === "accepted")?.map((app) => (
                        <div key={app.id} className="border border-green-200 rounded-lg p-4 bg-green-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-base font-medium text-green-900">{app.jobTitle}</h4>
                              <p className="text-green-700 text-sm">Referrer: {app.referrerName}</p>
                            </div>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Provided
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-green-600">Applied:</span>
                              <p className="text-green-800">{new Date(app.createdAt?.toDate()).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="text-green-600">Contact:</span>
                              <p className="text-green-800">{app.referrerEmail}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                            <div className="rounded-full bg-blue-100 px-2 py-1 text-center text-blue-700">Applied</div>
                            <div className="rounded-full bg-blue-100 px-2 py-1 text-center text-blue-700">Reviewed</div>
                            <div className="rounded-full bg-green-100 px-2 py-1 text-center text-green-700">Referral given</div>
                            <div className="rounded-full bg-gray-100 px-2 py-1 text-center text-gray-500">Next update</div>
                          </div>
                        </div>
                      )) || []}
                      
                      {applications?.filter(app => app.status === "accepted")?.length === 0 && (
                        <div className="text-center py-8">
                          <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">No referrals provided yet</p>
                          <p className="text-gray-400 text-xs">Successful applications will appear here</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Decline Referrals Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Decline Referrals
                  </CardTitle>
                  <CardDescription>Applications where referrers declined to provide referrals</CardDescription>
                </CardHeader>
                <CardContent>
                  {applicationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                      <span className="ml-2 text-sm">Loading...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {applications?.filter(app => app.status === "rejected")?.map((app) => (
                        <div key={app.id} className="border border-red-200 rounded-lg p-4 bg-red-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h4 className="text-base font-medium text-red-900">{app.jobTitle}</h4>
                              <p className="text-red-700 text-sm">Referrer: {app.referrerName}</p>
                            </div>
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <XCircle className="h-3 w-3 mr-1" />
                              Declined
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-red-600">Applied:</span>
                              <p className="text-red-800">{new Date(app.createdAt?.toDate()).toLocaleDateString()}</p>
                            </div>
                            <div>
                              <span className="text-red-600">Contact:</span>
                              <p className="text-red-800">{app.referrerEmail}</p>
                            </div>
                          </div>
                          <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                            <div className="rounded-full bg-blue-100 px-2 py-1 text-center text-blue-700">Applied</div>
                            <div className="rounded-full bg-blue-100 px-2 py-1 text-center text-blue-700">Reviewed</div>
                            <div className="rounded-full bg-red-100 px-2 py-1 text-center text-red-700">Declined</div>
                            <div className="rounded-full bg-gray-100 px-2 py-1 text-center text-gray-500">Closed</div>
                          </div>
                        </div>
                      )) || []}
                      
                      {applications?.filter(app => app.status === "rejected")?.length === 0 && (
                        <div className="text-center py-8">
                          <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500 text-sm">No referrals declined</p>
                          <p className="text-gray-400 text-xs">Declined applications will appear here</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Pending Applications Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-600" />
                  Pending Review
                </CardTitle>
                <CardDescription>Applications awaiting referrer decision</CardDescription>
              </CardHeader>
              <CardContent>
                {applicationsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-500"></div>
                    <span className="ml-2 text-sm">Loading...</span>
                  </div>
                ) : applications && applications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No applications submitted</h3>
                    <p className="text-gray-500 text-center mb-6">
                      You haven't submitted any applications yet. Browse jobs and start applying!
                    </p>
                    <Button onClick={() => setActiveTab("jobs")}>
                      Browse Jobs
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications?.filter(app => app.status === "pending" || !app.status)?.map((app) => (
                      <div key={app.id} className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="text-base font-medium text-yellow-900">{app.jobTitle}</h4>
                            <p className="text-yellow-700 text-sm">Referrer: {app.referrerName}</p>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                          <div>
                            <span className="text-yellow-600">Applied:</span>
                            <p className="text-yellow-800">{new Date(app.createdAt?.toDate()).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <span className="text-yellow-600">Contact:</span>
                            <p className="text-yellow-800">{app.referrerEmail}</p>
                          </div>
                          <div>
                            <span className="text-yellow-600">Status:</span>
                            <p className="text-yellow-800">Awaiting Review</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-[11px]">
                          <div className="rounded-full bg-blue-100 px-2 py-1 text-center text-blue-700">Applied</div>
                          <div className="rounded-full bg-yellow-100 px-2 py-1 text-center text-yellow-700">With referrer</div>
                          <div className="rounded-full bg-gray-100 px-2 py-1 text-center text-gray-500">Outcome pending</div>
                          <div className="rounded-full bg-gray-100 px-2 py-1 text-center text-gray-500">Follow-up</div>
                        </div>
                        {app.coverLetter && (
                          <div className="mt-3">
                            <span className="text-yellow-600 text-xs">Cover Letter:</span>
                            <p className="text-yellow-800 text-xs mt-1 bg-yellow-100 p-2 rounded">
                              {app.coverLetter.length > 150 ? `${app.coverLetter.substring(0, 150)}...` : app.coverLetter}
                            </p>
                          </div>
                        )}
                      </div>
                    )) || []}
                    
                    {applications?.filter(app => app.status === "pending" || !app.status)?.length === 0 && applications.length > 0 && (
                      <div className="text-center py-8">
                        <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No pending applications</p>
                        <p className="text-gray-400 text-xs">All your applications have been reviewed</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mentorship Tab */}
          <TabsContent value="mentorship" className="space-y-6">
            {user ? <MentorshipMarketplace user={user as any} /> : null}
          </TabsContent>

          {/* AI Mentor Tab */}
          <TabsContent value="ai-mentor" className="space-y-6">
            {user ? (
              <AiMentorChat
                user={user as any}
                onBookMentor={(prefill) => {
                  try {
                    if (prefill?.search) {
                      localStorage.setItem(`referralme:mentorshipSearch:${(user as any).uid}`, prefill.search);
                    }
                  } catch {
                    // ignore
                  }
                  setActiveTab("mentorship");
                }}
              />
            ) : null}
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Career Utilities</h2>
                  <p className="text-gray-600">Quick actions for resume checks, AI guidance, mentor help, and application tracking.</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {realStats.totalApplications} Applications Tracked
                </Badge>
              </div>

              <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
                <CardContent className="p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <Badge className="mb-3 border border-white/20 bg-white/10 text-blue-100 hover:bg-white/10">
                        Recommended workflow
                      </Badge>
                      <h3 className="text-xl font-semibold">Use tools only when they move your next application forward.</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-100">
                        Run ATS first, let Career Agent match jobs and mentors, then use AI Mentor or human mentorship for the weak areas.
                      </p>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:w-[420px]">
                      <Button onClick={() => setActiveTab("career-agent")} className="bg-white text-slate-950 hover:bg-blue-50">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Open Career Agent
                      </Button>
                      <Button onClick={() => setIsATSAnalyzerOpen(true)} variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                        <FileText className="mr-2 h-4 w-4" />
                        Run ATS
                      </Button>
                      <Button onClick={() => setActiveTab("ai-mentor")} variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                        <Brain className="mr-2 h-4 w-4" />
                        Ask AI Mentor
                      </Button>
                      <Button onClick={() => setActiveTab("mentorship")} variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
                        <Users className="mr-2 h-4 w-4" />
                        Find Mentor
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Success Rate</p>
                        <p className="text-2xl font-bold text-green-600">
                          {realStats.totalApplications > 0 ? Math.round((realStats.interviews / realStats.totalApplications) * 100) : 0}%
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Response Rate</p>
                        <p className="text-2xl font-bold text-blue-600">{realStats.responseRate}%</p>
                      </div>
                      <MessageCircle className="h-8 w-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Interview Rate</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {realStats.totalApplications > 0 ? Math.round((realStats.interviews / realStats.totalApplications) * 100) : 0}%
                        </p>
                      </div>
                      <Video className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">ATS Score</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {atsAnalysisResult ? atsAnalysisResult.overallScore : '--'}
                        </p>
                      </div>
                      <FileText className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Career Tools Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* ATS Resume Analyzer */}
                <Card className="hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">ATS Resume Analyzer</CardTitle>
                        <CardDescription>AI-powered resume optimization</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Get instant feedback on your resume's ATS compatibility and receive personalized suggestions for improvement.
                    </p>
                    <Button 
                      className="w-full mb-3"
                      onClick={() => setIsATSAnalyzerOpen(true)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Analyze Resume
                    </Button>
                    {atsAnalysisResult && (
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Overall Score:</span>
                          <Badge variant="secondary" className="text-blue-700">
                            {atsAnalysisResult.overallScore}/100
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600">
                          Last analyzed: Just now
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Application Tracker */}
                <Card className="hover:shadow-lg transition-all duration-200 border-2 hover:border-green-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <BarChart3 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">Application Tracker</CardTitle>
                        <CardDescription>Track your job applications</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Monitor all your applications, response rates, and interview progress in one place.
                    </p>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Total Applications</span>
                        <Badge variant="outline">{realStats.totalApplications}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Pending</span>
                        <Badge variant="outline">{realStats.pending}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Interviews</span>
                        <Badge variant="outline">{realStats.interviews}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Success Rate</span>
                        <Badge variant="outline" className="text-green-600">
                          {realStats.totalApplications > 0 ? Math.round((realStats.interviews / realStats.totalApplications) * 100) : 0}%
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Career Utilities Summary */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Utility Summary
                  </CardTitle>
                  <CardDescription>
                    Real signals from your current ReferralMe activity.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Application Performance */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Application Performance</h4>
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">ATS Readiness</span>
                            <span className="text-sm text-gray-600">{realStats.atsScore || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${realStats.atsScore || 0}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Response Rate</span>
                            <span className="text-sm text-gray-600">{realStats.responseRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${realStats.responseRate}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium">Interview Conversion</span>
                            <span className="text-sm text-gray-600">
                              {realStats.totalApplications > 0 ? Math.round((realStats.interviews / realStats.totalApplications) * 100) : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ 
                              width: `${realStats.totalApplications > 0 ? Math.round((realStats.interviews / realStats.totalApplications) * 100) : 0}%` 
                            }}></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Career Insights */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Next Best Moves</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Resume Readiness</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {realStats.atsScore >= 70 ? "Your latest ATS signal is strong enough to apply with confidence." : "Run ATS and improve missing keywords before sending referral requests."}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Application Focus</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {realStats.totalApplications > 0 ? `You have ${realStats.totalApplications} tracked applications. Focus on follow-ups and interview prep.` : "Start with Career Agent matches before applying randomly."}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium">Mentor Signal</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {realStats.atsScore && realStats.atsScore < 60 ? "A mentor review is recommended before heavy applying." : "Use mentorship when you need role-specific feedback or mock interview practice."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Items */}
                  <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600" />
                      Recommended Actions
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700">Open Career Agent and generate a kit for your strongest job match.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700">Run ATS when you change your resume or target job description.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700">Use AI Mentor for a 7-day plan before applying to weak-fit roles.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700">Book human mentorship when ATS or job-fit score is low.</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Discover Referrers Tab */}
          <TabsContent value="discover-referrers" className="space-y-6">
            <DiscoverReferrers onReferrerSelect={handleReferrerSelect} />
          </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Auto Achievement System - Background component for automatic rewards */}
      <AutoAchievementSystem
        userStats={{
          totalJobsPosted: 0, // Seekers don't post jobs
          successfulPlacements: 0,
          impactScore: 0,
          streakDays: 0,
          testimonialCount: 0
        }}
        onAchievementUnlocked={(achievement) => {
          // Silent achievement tracking - no toast notifications
        }}
      />

      {/* Application Form Modal */}
      {selectedJob && (
        <ApplicationFormModal
          isOpen={isApplicationModalOpen}
          onClose={() => {
            setIsApplicationModalOpen(false);
            setSelectedJob(null);
          }}
          job={selectedJob}
          onApplicationSubmitted={() => handleApplicationSubmitted({})}
        />
      )}

      {/* ATS Analyzer Modal */}
      <ATSAnalyzer
        isOpen={isATSAnalyzerOpen}
        onClose={() => setIsATSAnalyzerOpen(false)}
        onAnalysisComplete={(result) => {
          setAtsAnalysisResult(result);
        }}
        onBookMentor={(prefill) => {
          try {
            if (prefill) {
              localStorage.setItem(`referralme:mentorshipSearch:${(user as any)?.uid || "anon"}`, prefill);
            }
          } catch {
            // ignore
          }
          setIsATSAnalyzerOpen(false);
          setActiveTab("mentorship");
        }}
      />

      {/* Referrer Profile Modal */}
      {selectedReferrer && (
        <ReferrerProfileModal
          isOpen={isReferrerProfileOpen}
          onClose={() => {
            setIsReferrerProfileOpen(false);
            setSelectedReferrer(null);
          }}
          referrer={selectedReferrer}
        />
      )}
    </div>
  );
}
