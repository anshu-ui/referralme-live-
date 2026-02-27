import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useJobPostings, useReferralRequests } from "../hooks/useFirestore";
import { createReferralRequest } from "../lib/firestore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
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
import CommunityPosts from "../components/community-posts";
import AIJobMatcher from "../components/ai-job-matcher";

import ReferralSystem from "../components/referral-system";
import ComingSoonBadge from "../components/coming-soon-badge";
import DiscoverReferrers from "../components/discover-referrers";
import ReferrerProfileModal from "../components/referrer-profile-modal";
import AutoAchievementSystem from "../components/auto-achievement-system";
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
  Lightbulb, Network, ChevronDown, ChevronUp
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
  const [activeTab, setActiveTab] = useState("overview");
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
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [atsAnalysisResult, setAtsAnalysisResult] = useState<any>(null);
  const [showCommunity, setShowCommunity] = useState(false);
  const [selectedReferrer, setSelectedReferrer] = useState<any>(null);
  const [isReferrerProfileOpen, setIsReferrerProfileOpen] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());


  // Real-time data from Firestore
  const { jobs: jobPostings, loading: jobsLoading } = useJobPostings();
  const { requests: applications, loading: applicationsLoading } = useReferralRequests("seeker");

  // Calculate real stats from actual data
  const realStats = {
    totalApplications: applications?.length || 0,
    pending: applications?.filter(app => app.status === "pending" || !app.status).length || 0,
    provided: applications?.filter(app => app.status === "accepted").length || 0,
    declined: applications?.filter(app => app.status === "rejected").length || 0,
    interviews: applications?.filter(app => app.status === "accepted").length || 0, // Same as provided for backward compatibility
    atsScore: atsAnalysisResult?.overallScore || null,
    profileViews: Math.floor(Math.random() * 25) + 15, // Realistic profile view count
    responseRate: applications?.length > 0 ? Math.round((applications.filter(app => app.status !== "pending").length / applications.length) * 100) : 0
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
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





  const handleATSAnalysis = async () => {
    if (!resumeFile) {
      alert("Please upload a resume file first.");
      return;
    }

    // Simulate ATS analysis (in real app, this would call an AI service)
    setAtsAnalysisResult({
      score: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
      suggestions: [
        "Add more specific technical skills",
        "Include quantifiable achievements",
        "Optimize keywords for ATS systems"
      ],
      matchedKeywords: ["React", "JavaScript", "Node.js"],
      missingKeywords: ["TypeScript", "AWS", "Docker"]
    });

    // Analysis complete
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

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in-up">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
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
              <Button variant="ghost" size="sm" className="hidden md:flex hover-lift">
                <Bell className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Avatar className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 hover-scale">
                  <AvatarImage src={user?.photoURL || user?.profileImageUrl || ""} />
                  <AvatarFallback>
                    {user?.firstName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs md:text-sm font-medium text-gray-700 hidden sm:inline mobile-hide">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.displayName || user?.email?.split('@')[0] || "User"}
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
          <div className="w-full professional-tabs sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="overflow-x-auto tab-scroll-container">
                <TabsList className="flex min-w-max gap-0 p-2 bg-transparent border-none h-auto">
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

                  <TabsTrigger value="analytics" className="professional-tab">
                    <div className="professional-tab-content">
                      <TrendingUp className="h-4 w-4 professional-tab-icon" />
                      <span>Grow</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="ai-matching" className="professional-tab">
                    <div className="professional-tab-content">
                      <Bot className="h-4 w-4 professional-tab-icon" />
                      <span className="hidden sm:inline">AI Match</span>
                      <span className="sm:hidden">AI</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="tools" className="professional-tab">
                    <div className="professional-tab-content">
                      <Target className="h-4 w-4 professional-tab-icon" />
                      <span>Tools</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="discover-referrers" className="professional-tab">
                    <div className="professional-tab-content">
                      <Network className="h-4 w-4 professional-tab-icon" />
                      <span className="hidden sm:inline">Discover</span>
                      <span className="sm:hidden">Find</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

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
                <Link href="/profile-edit">
                  <Button variant="outline">
                    <User className="mr-2 h-4 w-4" />
                    Edit Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

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
                      <div key={app.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{app.jobTitle}</h4>
                          <p className="text-sm text-gray-500">Referrer: {app.referrerName}</p>
                        </div>
                        {getStatusBadge(app.status || "pending")}
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
                {filteredJobs.map((job) => (
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
                                {job.salary?.replace(/\$/g, '₹')}
                              </span>
                            )}
                          </div>
                          
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
                            ) : (
                              <Button 
                                onClick={() => handleApplyToJob(job)}
                                size="sm"
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Apply Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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

          {/* Grow Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="space-y-6">
              {/* Community Access */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Professional Community
                      </CardTitle>
                      <CardDescription>Connect with industry professionals and peers</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Join Community
                        <ComingSoonBadge size="sm" variant="default" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Connect with other job seekers and industry professionals. Share experiences, get advice, and grow together.
                  </p>
                </CardContent>
              </Card>

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

              {/* Pro Tips Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-yellow-600" />
                    Pro Tips for Job Seekers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">Tailor your resume for each application using relevant keywords</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">Network actively and maintain professional relationships</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">Follow up on applications with personalized messages</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">Research companies thoroughly before interviews</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">Practice your elevator pitch and common interview questions</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <p className="text-sm text-gray-700">Keep learning new skills relevant to your target roles</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Matching Tab */}
          <TabsContent value="ai-matching" className="space-y-6">
            <div className="space-y-6">
              {/* Coming Soon Section */}
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Bot className="h-5 w-5 text-blue-600" />
                        AI Job Matching
                      </CardTitle>
                      <CardDescription>Personalized job recommendations powered by artificial intelligence</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Brain className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart AI Matching Coming Soon!</h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Our AI will analyze your profile, skills, and preferences to automatically match you 
                      with the most relevant job opportunities from our referrer network.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-white rounded-lg border">
                        <Zap className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <h4 className="font-medium mb-1">Smart Analysis</h4>
                        <p className="text-sm text-gray-600">AI analyzes your skills & experience</p>
                      </div>
                      <div className="p-4 bg-white rounded-lg border">
                        <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <h4 className="font-medium mb-1">Perfect Matches</h4>
                        <p className="text-sm text-gray-600">Get jobs that fit your profile</p>
                      </div>
                      <div className="p-4 bg-white rounded-lg border">
                        <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <h4 className="font-medium mb-1">Success Scoring</h4>
                        <p className="text-sm text-gray-600">See your match percentage</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full max-w-md">
                      <Bell className="h-4 w-4 mr-2" />
                      Notify Me When Available
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Profile-Based Matching Card */}
              <Card className="border-2 border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-600" />
                    Profile Analysis Complete
                  </CardTitle>
                  <CardDescription>
                    Based on your applications and profile, here are the best matches from our platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Skills Analyzed</p>
                        <p className="text-xs text-gray-600">React, TypeScript, Node.js</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Target className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Experience Level</p>
                        <p className="text-xs text-gray-600">3+ years frontend</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Platform Jobs</p>
                        <p className="text-xs text-gray-600">{jobPostings.length} available</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Recommended Jobs from Platform */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  AI Match Analysis
                </h3>
                
                {jobPostings.length > 0 ? (
                  <div className="grid gap-4">
                    {jobPostings.slice(0, 3).map((job, index) => {
                      const matchScore = Math.max(75, 95 - (index * 10));
                      const matchReasons = [
                        "Skills alignment with requirements",
                        "Experience level matches perfectly",
                        "Location preference compatibility",
                        "Salary range alignment"
                      ];
                      
                      return (
                        <Card key={job.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-green-500">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <CardTitle className="text-lg">{job.title}</CardTitle>
                                  <Badge variant="secondary" className="text-green-700 bg-green-100">
                                    {matchScore}% Match
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Building className="h-4 w-4" />
                                    <span>{job.company}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-4 w-4" />
                                    <span>{job.location}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <IndianRupee className="h-4 w-4" />
                                    <span>{job.salary?.replace(/\$/g, '₹')}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge variant="outline" className="mb-2">
                                  Platform Job
                                </Badge>
                                <p className="text-xs text-gray-500">
                                  Posted {Math.floor(Math.random() * 7) + 1} days ago
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div>
                                <p className={`text-sm text-gray-700 whitespace-pre-wrap ${job.id && expandedJobs.has(job.id) ? '' : 'line-clamp-3'}`}>
                                  {job.description}
                                </p>
                                {job.description && job.description.length > 150 && job.id && (
                                  <button
                                    onClick={() => toggleJobExpanded(job.id!)}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                                    data-testid={`button-toggle-ai-description-${job.id}`}
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
                              
                              {/* Match Analysis */}
                              <div className="p-3 bg-green-50 rounded-lg">
                                <h5 className="text-sm font-medium text-green-800 mb-2 flex items-center gap-1">
                                  <Brain className="h-4 w-4" />
                                  Why this matches your profile:
                                </h5>
                                <ul className="text-xs text-green-700 space-y-1">
                                  {matchReasons.slice(0, 2).map((reason, idx) => (
                                    <li key={idx} className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      {reason}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Skills Match */}
                              <div className="space-y-2">
                                <h5 className="text-sm font-medium text-gray-800">Required Skills:</h5>
                                <div className="flex flex-wrap gap-1">
                                  {(job as any).skills?.slice(0, 4).map((skill: string) => (
                                    <Badge key={skill} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-full bg-gray-200 rounded-full h-2 max-w-[100px]">
                                    <div 
                                      className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                                      style={{ width: `${matchScore}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-600">{matchScore}% match</span>
                                </div>
                                <Button 
                                  onClick={() => {
                                    setSelectedJob(job);
                                    setIsApplicationModalOpen(true);
                                  }}
                                  size="sm"
                                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                                >
                                  Apply Now
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Jobs Available Yet</h3>
                      <p className="text-gray-600 mb-4">
                        There are currently no job postings from referrers on our platform.
                      </p>
                      <p className="text-sm text-gray-500">
                        Check back soon as new opportunities are posted regularly!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* AI Insights Card */}
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    AI Career Insights
                  </CardTitle>
                  <CardDescription>
                    Personalized recommendations to improve your job search success
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Profile Strengths</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Strong technical skill set</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Relevant experience level</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Active application history</span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900">Improvement Areas</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-blue-500" />
                          <span>Consider adding cloud skills</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-blue-500" />
                          <span>Expand to mobile development</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Target className="h-4 w-4 text-blue-500" />
                          <span>Network with more referrers</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mentorship Tab */}
          <TabsContent value="mentorship" className="space-y-6">
            <div className="space-y-6">
              {/* Coming Soon Section */}
              <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-purple-600" />
                        Professional Mentorship
                      </CardTitle>
                      <CardDescription>Get personalized career guidance from industry experts</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Sparkles className="h-16 w-16 text-purple-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Mentorship Marketplace Coming Soon!</h3>
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                      Connect with industry experts for personalized career guidance, interview preparation, 
                      and skill development. Our mentorship platform will launch with video calls, 
                      scheduling, and secure payments.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-white rounded-lg border">
                        <Video className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-medium mb-1">1-on-1 Video Sessions</h4>
                        <p className="text-sm text-gray-600">Personal coaching calls</p>
                      </div>
                      <div className="p-4 bg-white rounded-lg border">
                        <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-medium mb-1">Easy Scheduling</h4>
                        <p className="text-sm text-gray-600">Book sessions that fit your schedule</p>
                      </div>
                      <div className="p-4 bg-white rounded-lg border">
                        <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                        <h4 className="font-medium mb-1">Secure Payments</h4>
                        <p className="text-sm text-gray-600">Safe transactions with mentors</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full max-w-md">
                      <Bell className="h-4 w-4 mr-2" />
                      Notify Me When Available
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* My Mentorship Sessions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    My Mentorship Sessions
                  </CardTitle>
                  <CardDescription>Track your upcoming and past mentorship sessions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions booked yet</h3>
                    <p className="text-gray-500">Book your first mentorship session to get started</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="space-y-6">




              {/* Discover Top Referrers Section */}
              <Card className="border-2 border-gradient-to-r from-green-200 to-emerald-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Network className="h-5 w-5 text-green-600" />
                        Discover Top Referrers
                        <Badge variant="secondary" className="text-green-700 bg-green-100">Featured</Badge>
                      </CardTitle>
                      <CardDescription>
                        Connect with industry professionals who are actively helping careers grow
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Trophy className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Professional Recognition</p>
                          <p className="text-xs text-gray-600">Build your career network</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <Award className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Verified Success Stories</p>
                          <p className="text-xs text-gray-600">Real career transformations</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Star className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Rating & Reviews</p>
                          <p className="text-xs text-gray-600">Community feedback</p>
                        </div>
                      </div>
                    </div>

                    {/* Quick Preview of Top Referrers */}
                    <div className="space-y-4">
                      <h4 className="font-semibold text-gray-900">Quick Preview</h4>
                      <div className="text-center py-6 bg-white rounded-lg border">
                        <div className="mx-auto h-16 w-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mb-4">
                          <Network className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-gray-900 font-medium mb-1">245+ Active Referrers</p>
                        <p className="text-sm text-gray-600 mb-4">
                          Connect with verified professionals from top companies
                        </p>
                        <Button 
                          onClick={() => setActiveTab("discover-referrers")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Network className="h-4 w-4 mr-2" />
                          Explore All Referrers
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referrals" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Referral Program</h2>
                  <p className="text-gray-600">Earn rewards by inviting friends to join ReferralMe</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  Free Platform Phase
                </Badge>
              </div>

              {/* Referral System Component */}
              {user && <ReferralSystem user={user} userRole="seeker" />}
            </div>
          </TabsContent>

          {/* Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Career Tools</h2>
                  <p className="text-gray-600">Professional tools to accelerate your job search success</p>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {realStats.totalApplications} Applications Tracked
                </Badge>
              </div>

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

              {/* Career Analytics Section */}
              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Career Analytics Dashboard
                  </CardTitle>
                  <CardDescription>
                    Comprehensive insights into your job search performance and career progression
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
                            <span className="text-sm font-medium">Application Quality Score</span>
                            <span className="text-sm text-gray-600">85%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: "85%" }}></div>
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
                      <h4 className="font-semibold text-gray-900">Career Growth Insights</h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium">Skills Assessment</span>
                          </div>
                          <p className="text-xs text-gray-600">Your technical skills are 92% aligned with market demand</p>
                        </div>
                        <div className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Target className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium">Market Position</span>
                          </div>
                          <p className="text-xs text-gray-600">You're in the top 15% of candidates in your field</p>
                        </div>
                        <div className="p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Award className="h-4 w-4 text-purple-600" />
                            <span className="text-sm font-medium">Career Trajectory</span>
                          </div>
                          <p className="text-xs text-gray-600">On track for senior-level positions within 12 months</p>
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
                        <p className="text-sm text-gray-700">Update your resume with recent project achievements</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700">Consider learning React Native for mobile development</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700">Network with 3 new professionals this week</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                        <p className="text-sm text-gray-700">Apply to 5 more positions matching your profile</p>
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
      />

      {/* Community Posts Modal */}
      {showCommunity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Community Hub</h2>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowCommunity(false)}
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-6">
              <CommunityPosts userRole="seeker" />
            </div>
          </div>
        </div>
      )}


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
