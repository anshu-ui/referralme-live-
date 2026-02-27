import { useState } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { Button } from "../components/ui/button";
import { Link } from "wouter";
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
import { 
  Search, MapPin, DollarSign, Calendar, Building, Send, 
  MessageCircle, FileText, TrendingUp, Target, Star, 
  Clock, CheckCircle, XCircle, Upload, Download, Bell, 
  Activity, BarChart3, Award, Filter, Settings, User,
  Briefcase, Globe, Linkedin, Github, Camera, Edit3,
  ThumbsUp, ThumbsDown, AlertCircle, ChevronRight, ExternalLink,
  Video, Phone, UserPlus, Tag, BookOpen, Plus, Eye,
  Users, Trophy, Zap, Brain, TrendingDown, ArrowRight
} from "lucide-react";

import StatusUpdateModal from "../components/status-update-modal";
import { useJobPostings, useReferralRequests } from "../hooks/useFirestore";

export default function ComprehensiveSeekerDashboard() {
  const { user, logout } = useFirebaseAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
  const [isATSAnalyzerOpen, setIsATSAnalyzerOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    company: "all",
    location: "all",
    experience: "all"
  });

  // Get real data from Firestore
  const { data: jobPostings = [] } = useJobPostings();
  const { data: referralRequests = [] } = useReferralRequests("seeker");

  // Mock data for comprehensive dashboard
  const mockStats = {
    totalApplications: 23,
    pending: 8,
    interviews: 3,
    accepted: 2,
    atsScore: 78,
    profileViews: 156,
    responseRate: 34
  };

  const mockJobPostings = [
    {
      id: 1,
      title: "Senior Frontend Developer",
      company: "TechCorp Inc",
      location: "San Francisco, CA",
      salary: "₹90L - ₹1.2Cr",
      description: "Join our dynamic frontend team building next-gen web applications with React, TypeScript, and modern tools...",
      requirements: "React, TypeScript, 5+ years experience, Team leadership",
      posted: "2 days ago",
      applicants: 47,
      matchScore: 92,
      referrerName: "Alex Johnson",
      referrerTitle: "Senior Engineering Manager",
      referrerCompany: "TechCorp Inc",
      tags: ["Remote", "Senior", "Frontend", "React"],
      urgency: "high",
      featured: true
    },
    {
      id: 2,
      title: "Product Manager",
      company: "StartupXYZ",
      location: "New York, NY",
      salary: "₹82L - ₹1.05Cr",
      description: "Lead product strategy and development for our B2B platform serving 10M+ users...",
      requirements: "3+ years PM experience, Technical background, B2B SaaS",
      posted: "4 days ago",
      applicants: 31,
      matchScore: 85,
      referrerName: "Sarah Chen",
      referrerTitle: "VP of Product",
      referrerCompany: "StartupXYZ",
      tags: ["Hybrid", "Mid-level", "Product", "B2B"],
      urgency: "medium"
    },
    {
      id: 3,
      title: "Full Stack Engineer",
      company: "InnovateLabs",
      location: "Austin, TX",
      salary: "₹71L - ₹97L",
      description: "Build scalable applications using modern technologies in a fast-paced startup environment...",
      requirements: "Node.js, React, PostgreSQL, 3+ years experience",
      posted: "1 week ago",
      applicants: 28,
      matchScore: 79,
      referrerName: "Mike Rodriguez",
      referrerTitle: "CTO",
      referrerCompany: "InnovateLabs",
      tags: ["On-site", "Full-stack", "Startup", "Node.js"],
      urgency: "low"
    }
  ];

  const mockApplications = [
    {
      id: 1,
      jobTitle: "Senior Frontend Developer",
      company: "TechCorp Inc",
      appliedDate: "2024-01-08",
      status: "interview_scheduled",
      referrerName: "Alex Johnson",
      feedback: "Strong technical background, interview scheduled for next week",
      nextStep: "Technical interview scheduled for Jan 15",
      atsScore: 92
    },
    {
      id: 2,
      jobTitle: "Product Manager",
      company: "StartupXYZ",
      appliedDate: "2024-01-05",
      status: "sent_to_hr",
      referrerName: "Sarah Chen",
      feedback: "Excellent product sense, forwarded to HR team",
      nextStep: "HR will schedule initial screening",
      atsScore: 88
    },
    {
      id: 3,
      jobTitle: "Full Stack Engineer",
      company: "InnovateLabs", 
      appliedDate: "2024-01-03",
      status: "pending",
      referrerName: "Mike Rodriguez",
      feedback: null,
      nextStep: "Waiting for initial review",
      atsScore: 79
    }
  ];

  const mockCommunityPosts = [
    {
      id: 1,
      author: "Career Coach Linda",
      content: "Top 5 interview tips for software engineers: 1) Practice coding on a whiteboard 2) Prepare STAR method examples...",
      type: "tip",
      likes: 156,
      comments: 23,
      timeAgo: "3 hours ago"
    },
    {
      id: 2,
      author: "Tech Recruiter John",
      content: "Remote-first company hiring across all levels! Great benefits and startup equity. Comment if interested!",
      type: "job_posting",
      likes: 89,
      comments: 45,
      timeAgo: "5 hours ago"
    }
  ];

  const mockMentors = [
    {
      id: 1,
      name: "David Kim",
      title: "Senior Software Architect",
      company: "Meta",
      expertise: ["System Design", "Career Growth", "Technical Leadership"],
      rating: 4.9,
      sessions: 127,
      available: true,
      nextSlot: "Tomorrow 2:00 PM"
    },
    {
      id: 2,
      name: "Jennifer Wu",
      title: "VP of Engineering",
      company: "Stripe",
      expertise: ["Leadership", "Scaling Teams", "Interview Prep"],
      rating: 5.0,
      sessions: 89,
      available: true,
      nextSlot: "Friday 10:00 AM"
    }
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: { variant: "secondary" as const, icon: <Clock className="h-3 w-3 mr-1" />, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
      under_review: { variant: "outline" as const, icon: <Eye className="h-3 w-3 mr-1" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      accepted: { variant: "default" as const, icon: <CheckCircle className="h-3 w-3 mr-1" />, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
      sent_to_hr: { variant: "outline" as const, icon: <Building className="h-3 w-3 mr-1" />, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
      interview_scheduled: { variant: "outline" as const, icon: <Calendar className="h-3 w-3 mr-1" />, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
      rejected: { variant: "destructive" as const, icon: <XCircle className="h-3 w-3 mr-1" />, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
      completed: { variant: "outline" as const, icon: <Award className="h-3 w-3 mr-1" />, color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return (
      <Badge className={`flex items-center ${config.color}`}>
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getMatchScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-700 border-green-300">Excellent Match</Badge>;
    if (score >= 80) return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Good Match</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Fair Match</Badge>;
    return <Badge className="bg-gray-100 text-gray-700 border-gray-300">Potential Match</Badge>;
  };

  const handleSignOut = async () => {
    await logout();
  };

  const handleApplyToJob = (job: any) => {
    setSelectedJob(job);
    setIsApplyDialogOpen(true);
  };

  const filteredJobs = mockJobPostings.filter((job) => {
    const matchesSearch = searchQuery === "" || 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCompany = filters.company === "all" || job.company === filters.company;
    const matchesLocation = filters.location === "all" || job.location.includes(filters.location);
    
    return matchesSearch && matchesCompany && matchesLocation;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={"/logo.png"} alt="ReferralMe" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Job Seeker Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Welcome back, {user?.displayName || user?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm">
                <Bell className="h-5 w-5" />
                <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">5</span>
              </Button>
              <Dialog open={isProfileEditOpen} onOpenChange={setIsProfileEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Edit Profile
                    </DialogTitle>
                    <DialogDescription>
                      Update your profile to attract better opportunities
                    </DialogDescription>
                  </DialogHeader>
                  <ProfileEditForm user={user} onClose={() => setIsProfileEditOpen(false)} />
                </DialogContent>
              </Dialog>
              <Avatar className="cursor-pointer">
                <AvatarImage src={user?.photoURL || ""} />
                <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Debug Info */}
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="bg-blue-100 p-2 rounded text-sm">
          Debug: Current tab = {activeTab} | Applications count = {referralRequests?.length || 0}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Browse Jobs
            </TabsTrigger>
            <TabsTrigger value="applications" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              My Applications ({referralRequests?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Community
            </TabsTrigger>
            <TabsTrigger value="mentorship" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Mentorship
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Career Tools
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewSection stats={mockStats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity applications={referralRequests.slice(0, 5)} getStatusBadge={getStatusBadge} />
              <QuickActions 
                onEditProfile="navigate" 
                onATSAnalyzer={() => setIsATSAnalyzerOpen(true)}
              />
            </div>
          </TabsContent>

          {/* Browse Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <JobSearchSection 
              jobs={filteredJobs}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filters={filters}
              setFilters={setFilters}
              onApply={handleApplyToJob}
              getMatchScoreBadge={getMatchScoreBadge}
            />
          </TabsContent>

          {/* My Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <div className="bg-yellow-100 p-4 rounded mb-4 border-2 border-yellow-500">
              <h3 className="font-bold text-lg">🟡 DEBUG: Applications Tab</h3>
              <p>✓ Tab content loaded successfully</p>
              <p>✓ Applications count: {referralRequests?.length || 0}</p>
              <p>✓ Sample status: {JSON.stringify(referralRequests?.[0]?.status || "no status")}</p>
              <p>✓ Active tab: {activeTab}</p>
            </div>
            
            {referralRequests && referralRequests.length > 0 ? (
              <ApplicationsSection 
                applications={referralRequests} 
                getStatusBadge={getStatusBadge}
                onStatusUpdate={(application) => {
                  console.log("🔵 Status update button clicked:", application);
                  setSelectedApplication(application);
                  setIsStatusUpdateOpen(true);
                }}
              />
            ) : (
              <div className="bg-red-100 p-4 rounded border-2 border-red-500">
                <p className="text-red-700">❌ No applications data available</p>
              </div>
            )}
          </TabsContent>

          {/* Community Tab */}
          <TabsContent value="community" className="space-y-6">
            <CommunitySection posts={mockCommunityPosts} />
          </TabsContent>

          {/* Mentorship Tab */}
          <TabsContent value="mentorship" className="space-y-6">
            <MentorshipSection mentors={mockMentors} />
          </TabsContent>

          {/* Career Tools Tab */}
          <TabsContent value="tools" className="space-y-6">
            <CareerToolsSection onATSAnalyzer={() => setIsATSAnalyzerOpen(true)} />
          </TabsContent>
        </Tabs>

        {/* Apply Dialog */}
        <Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Apply for Position</DialogTitle>
              <DialogDescription>
                {selectedJob && `Apply for ${selectedJob.title} at ${selectedJob.company}`}
              </DialogDescription>
            </DialogHeader>
            {selectedJob && (
              <ApplyJobForm 
                job={selectedJob} 
                onClose={() => setIsApplyDialogOpen(false)} 
              />
            )}
          </DialogContent>
        </Dialog>

        {/* ATS Analyzer Dialog */}
        <Dialog open={isATSAnalyzerOpen} onOpenChange={setIsATSAnalyzerOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                ATS Resume Analyzer
              </DialogTitle>
              <DialogDescription>
                Get instant feedback on how your resume performs against Applicant Tracking Systems
              </DialogDescription>
            </DialogHeader>
            <ATSAnalyzerForm onClose={() => setIsATSAnalyzerOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Status Update Modal */}
        <StatusUpdateModal
          isOpen={isStatusUpdateOpen}
          onClose={() => setIsStatusUpdateOpen(false)}
          application={selectedApplication}
          onStatusUpdate={(requestId, status) => {
            console.log("Status updated:", requestId, status);
          }}
        />
      </main>
    </div>
  );
}

// Component Sections
function OverviewSection({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Applications Sent"
        value={stats.totalApplications}
        icon={<Send className="h-5 w-5" />}
        color="text-blue-600"
        bgColor="bg-blue-50"
        trend="+3 this week"
      />
      <StatCard
        title="In Progress"
        value={stats.pending}
        icon={<Clock className="h-5 w-5" />}
        color="text-yellow-600"
        bgColor="bg-yellow-50"
        trend="2 interviews"
      />
      <StatCard
        title="Response Rate"
        value={`${stats.responseRate}%`}
        icon={<TrendingUp className="h-5 w-5" />}
        color="text-green-600"
        bgColor="bg-green-50"
        trend="+5% this month"
      />
      <StatCard
        title="ATS Score"
        value={`${stats.atsScore}%`}
        icon={<Target className="h-5 w-5" />}
        color="text-purple-600"
        bgColor="bg-purple-50"
        trend="Good"
      />
    </div>
  );
}

function StatCard({ title, value, icon, color, bgColor, trend }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`${bgColor} ${color} p-2 rounded-lg`}>
            {icon}
          </div>
          <span className="text-xs text-gray-500">{trend}</span>
        </div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ applications, getStatusBadge }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Applications
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {applications.slice(0, 5).map((app: any) => (
              <div key={app.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{app.jobTitle}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{app.company}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusBadge(app.status)}
                    <span className="text-xs text-gray-400">Applied {app.appliedDate}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function QuickActions({ onEditProfile, onATSAnalyzer }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {onEditProfile === "navigate" ? (
          <Link href="/profile-edit">
            <Button className="w-full justify-start">
              <User className="h-4 w-4 mr-2" />
              Update Profile
            </Button>
          </Link>
        ) : (
          <Button onClick={onEditProfile} className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Update Profile
          </Button>
        )}
        <Button onClick={onATSAnalyzer} variant="outline" className="w-full justify-start">
          <Brain className="h-4 w-4 mr-2" />
          Analyze Resume
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <MessageCircle className="h-4 w-4 mr-2" />
          Browse Community
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <BookOpen className="h-4 w-4 mr-2" />
          Find Mentor
        </Button>
      </CardContent>
    </Card>
  );
}

function JobSearchSection({ jobs, searchQuery, setSearchQuery, filters, setFilters, onApply, getMatchScoreBadge }: any) {
  return (
    <div className="space-y-6">
      {/* Search & Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search jobs, companies, or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <Select value={filters.location} onValueChange={(value) => setFilters({...filters, location: value})}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="San Francisco">San Francisco</SelectItem>
                <SelectItem value="New York">New York</SelectItem>
                <SelectItem value="Austin">Austin</SelectItem>
                <SelectItem value="Remote">Remote</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.company} onValueChange={(value) => setFilters({...filters, company: value})}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                <SelectItem value="TechCorp Inc">TechCorp Inc</SelectItem>
                <SelectItem value="StartupXYZ">StartupXYZ</SelectItem>
                <SelectItem value="InnovateLabs">InnovateLabs</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              More Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Job Results */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {jobs.length} Jobs Found
          </h2>
          <Select defaultValue="match">
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Best Match</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="salary">Highest Salary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {jobs.map((job: any) => (
            <JobCard key={job.id} job={job} onApply={() => onApply(job)} getMatchScoreBadge={getMatchScoreBadge} />
          ))}
        </div>
      </div>
    </div>
  );
}

function JobCard({ job, onApply, getMatchScoreBadge }: any) {
  return (
    <Card className={`hover:shadow-lg transition-shadow ${job.featured ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-6">
        {job.featured && (
          <Badge className="mb-3 bg-blue-100 text-blue-700 border-blue-300">
            <Star className="h-3 w-3 mr-1" />
            Featured
          </Badge>
        )}
        
        <div className="space-y-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
            <span className="text-sm text-gray-500">{job.posted}</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Building className="h-4 w-4" />
              {job.company}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {job.location}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              {job.salary?.replace(/\$/g, '₹')}
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {getMatchScoreBadge(job.matchScore)}
            <Badge variant="outline">{job.matchScore}% match</Badge>
          </div>
          
          <div className="flex justify-end">
            <Button 
              onClick={onApply} 
              size="sm"
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Apply Now
            </Button>
          </div>
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">{job.description}</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {job.tags.map((tag: string, index: number) => (
            <Badge key={index} variant="secondary">{tag}</Badge>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="text-xs">{job.referrerName[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{job.referrerName}</p>
              <p className="text-xs text-gray-500">{job.referrerTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            {job.applicants} applicants
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationsSection({ applications, getStatusBadge, onStatusUpdate }: any) {
  console.log("Applications data:", applications);
  console.log("Applications count:", applications?.length);
  
  // Check each application status
  applications?.forEach((app: any, index: number) => {
    console.log(`Application ${index}:`, {
      id: app.id,
      jobTitle: app.jobTitle,
      status: app.status,
      hasStatus: app.hasOwnProperty('status'),
      allKeys: Object.keys(app)
    });
  });
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Applications ({applications?.length || 0})</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {applications.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-gray-500">No applications found.</p>
            </CardContent>
          </Card>
        ) : (
          applications.map((application: any) => (
            <Card key={application.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{application.jobTitle || 'Job Title'}</h3>
                  <p className="text-gray-600 dark:text-gray-400">Company Information</p>
                  <p className="text-sm text-gray-500">Applied on {application.createdAt?.toDate ? application.createdAt.toDate().toLocaleDateString() : 'Date not available'}</p>
                </div>
                <div className="text-right">
                  {getStatusBadge(application.status)}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm text-gray-500">Status:</span>
                    <Badge variant="outline">
                      {application.status?.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Referrer:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{application.referrerName || 'Not specified'}</p>
                </div>

                {application.coverLetter && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Cover Letter:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{application.coverLetter}</p>
                  </div>
                )}

                {/* Progress Timeline */}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Application Progress:</p>
                  <div className="flex items-center space-x-2 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span>Applied</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <div className={`flex items-center space-x-1 ${
                      ['accepted', 'referral_confirmed', 'sent_to_hr', 'interview_scheduled', 'completed'].includes(application.status) 
                        ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        ['accepted', 'referral_confirmed', 'sent_to_hr', 'interview_scheduled', 'completed'].includes(application.status) 
                          ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span>Accepted</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <div className={`flex items-center space-x-1 ${
                      ['sent_to_hr', 'interview_scheduled', 'completed'].includes(application.status) 
                        ? 'text-blue-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        ['sent_to_hr', 'interview_scheduled', 'completed'].includes(application.status) 
                          ? 'bg-blue-500' : 'bg-gray-300'
                      }`}></div>
                      <span>Sent to HR</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <div className={`flex items-center space-x-1 ${
                      ['interview_scheduled', 'completed'].includes(application.status) 
                        ? 'text-purple-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        ['interview_scheduled', 'completed'].includes(application.status) 
                          ? 'bg-purple-500' : 'bg-gray-300'
                      }`}></div>
                      <span>Interview</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-gray-400" />
                    <div className={`flex items-center space-x-1 ${
                      application.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                    }`}>
                      <div className={`w-3 h-3 rounded-full ${
                        application.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                      }`}></div>
                      <span>Complete</span>
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Resume:</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{application.resumeFileName || 'Resume uploaded'}</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t mt-4">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Message Referrer
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4 mr-1" />
                    View Details
                  </Button>
                </div>
                {/* Show status update button for eligible statuses */}
                {["accepted", "referral_confirmed", "sent_to_hr", "interview_scheduled", "completed"].includes(application.status) && (
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => {
                      console.log("Status update button clicked for:", application);
                      onStatusUpdate && onStatusUpdate(application);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Got Email? Update Status
                  </Button>
                )}
                
                {/* Debug: Always show a test button */}
                <Button 
                  size="sm" 
                  variant="outline"
                  className="ml-2"
                  onClick={() => console.log("Test button clicked", application)}
                >
                  Test (Status: {application.status || 'none'})
                </Button>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  );
}

function CommunitySection({ posts }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Community Feed</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Post
        </Button>
      </div>

      <div className="grid gap-4">
        {posts.map((post: any) => (
          <Card key={post.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Avatar>
                  <AvatarFallback>{post.author[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 dark:text-white">{post.author}</h4>
                    <Badge variant="outline">{post.type}</Badge>
                    <span className="text-sm text-gray-500">{post.timeAgo}</span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300">{post.content}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button variant="ghost" size="sm">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  {post.likes}
                </Button>
                <Button variant="ghost" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  {post.comments}
                </Button>
                <Button variant="ghost" size="sm">
                  <Send className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function MentorshipSection({ mentors }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Find Mentors</h2>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Become a Mentor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mentors.map((mentor: any) => (
          <Card key={mentor.id}>
            <CardContent className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback>{mentor.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">{mentor.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{mentor.title}</p>
                  <p className="text-sm text-gray-500">{mentor.company}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium">{mentor.rating}</span>
                    </div>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">{mentor.sessions} sessions</span>
                  </div>
                </div>
                <Badge variant={mentor.available ? "default" : "secondary"}>
                  {mentor.available ? "Available" : "Busy"}
                </Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Expertise:</p>
                  <div className="flex flex-wrap gap-1">
                    {mentor.expertise.map((skill: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                </div>

                {mentor.available && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Next Available:</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{mentor.nextSlot}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t mt-4">
                <Button size="sm" className="flex-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Book Session
                </Button>
                <Button variant="outline" size="sm">
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Message
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CareerToolsSection({ onATSAnalyzer }: any) {
  const tools = [
    {
      title: "ATS Resume Analyzer",
      description: "Get instant feedback on how your resume performs against Applicant Tracking Systems",
      icon: <Brain className="h-8 w-8" />,
      color: "bg-blue-50 text-blue-600",
      action: onATSAnalyzer,
      buttonText: "Analyze Resume"
    },
    {
      title: "Interview Prep Assistant",
      description: "Practice common interview questions and get AI-powered feedback",
      icon: <Video className="h-8 w-8" />,
      color: "bg-green-50 text-green-600",
      action: () => {},
      buttonText: "Start Practice",
      comingSoon: true
    },
    {
      title: "Salary Negotiation Guide",
      description: "Learn how to research and negotiate competitive compensation packages",
      icon: <DollarSign className="h-8 w-8" />,
      color: "bg-yellow-50 text-yellow-600",
      action: () => {},
      buttonText: "View Guide",
      comingSoon: true
    },
    {
      title: "Career Path Planner",
      description: "Map out your career progression and identify skill gaps",
      icon: <TrendingUp className="h-8 w-8" />,
      color: "bg-purple-50 text-purple-600",
      action: () => {},
      buttonText: "Plan Career",
      comingSoon: true
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Career Tools</h2>
        <Badge variant="outline">4 Tools Available</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tools.map((tool, index) => (
          <Card key={index} className="relative">
            <CardContent className="p-6">
              {tool.comingSoon && (
                <Badge className="absolute top-4 right-4 bg-yellow-100 text-yellow-700 border-yellow-300">
                  Coming Soon
                </Badge>
              )}
              <div className={`${tool.color} p-3 rounded-lg w-fit mb-4`}>
                {tool.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{tool.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{tool.description}</p>
              <Button 
                onClick={tool.action} 
                disabled={tool.comingSoon}
                className="w-full"
                variant={tool.comingSoon ? "outline" : "default"}
              >
                {tool.buttonText}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Form Components
function ProfileEditForm({ user, onClose }: any) {
  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={user?.photoURL || ""} />
          <AvatarFallback className="text-2xl">{user?.displayName?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <Button variant="outline" size="sm">
          <Camera className="h-4 w-4 mr-2" />
          Change Photo
        </Button>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input id="firstName" defaultValue={user?.displayName?.split(' ')[0] || ""} />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input id="lastName" defaultValue={user?.displayName?.split(' ')[1] || ""} />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" defaultValue={user?.email || ""} disabled />
      </div>

      {/* Professional Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="currentTitle">Current Job Title</Label>
          <Input id="currentTitle" placeholder="e.g. Software Engineer" />
        </div>
        <div>
          <Label htmlFor="experience">Years of Experience</Label>
          <Select defaultValue="">
            <SelectTrigger>
              <SelectValue placeholder="Select experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">0-2 years</SelectItem>
              <SelectItem value="mid">3-5 years</SelectItem>
              <SelectItem value="senior">6-10 years</SelectItem>
              <SelectItem value="lead">10+ years</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="location">Preferred Location</Label>
        <Input id="location" placeholder="e.g. San Francisco, CA or Remote" />
      </div>

      <div>
        <Label htmlFor="bio">Professional Summary</Label>
        <Textarea id="bio" placeholder="Brief summary of your background and career goals..." rows={3} />
      </div>

      {/* Skills */}
      <div>
        <Label htmlFor="skills">Skills (comma-separated)</Label>
        <Input id="skills" placeholder="React, Python, Machine Learning, Product Management..." />
      </div>

      {/* Social Links */}
      <div className="space-y-4">
        <h4 className="font-medium">Social Links</h4>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="linkedin">LinkedIn URL</Label>
            <Input id="linkedin" placeholder="https://linkedin.com/in/yourprofile" />
          </div>
          <div>
            <Label htmlFor="github">GitHub URL</Label>
            <Input id="github" placeholder="https://github.com/yourusername" />
          </div>
          <div>
            <Label htmlFor="portfolio">Portfolio URL</Label>
            <Input id="portfolio" placeholder="https://yourportfolio.com" />
          </div>
        </div>
      </div>

      {/* Job Preferences */}
      <div className="space-y-4">
        <h4 className="font-medium">Job Preferences</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="jobType">Job Type</Label>
            <Select defaultValue="">
              <SelectTrigger>
                <SelectValue placeholder="Select job type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time</SelectItem>
                <SelectItem value="part-time">Part-time</SelectItem>
                <SelectItem value="contract">Contract</SelectItem>
                <SelectItem value="freelance">Freelance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="workStyle">Work Style</Label>
            <Select defaultValue="">
              <SelectTrigger>
                <SelectValue placeholder="Select work style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onClose}>Save Changes</Button>
      </div>
    </div>
  );
}

function ApplyJobForm({ job, onClose }: any) {
  return (
    <div className="space-y-6">
      {/* Job Summary */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 dark:text-white">{job.title}</h3>
        <p className="text-gray-600 dark:text-gray-400">{job.company} • {job.location}</p>
        <p className="text-sm text-green-600 font-medium">{job.salary?.replace(/\$/g, '₹')}</p>
      </div>

      {/* Personal Information */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fullName">Full Name *</Label>
          <Input id="fullName" placeholder="Your full name" required />
        </div>
        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Input id="phone" placeholder="(555) 123-4567" required />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" placeholder="your.email@example.com" required />
      </div>

      {/* Experience Level */}
      <div>
        <Label htmlFor="experienceLevel">Experience Level *</Label>
        <Select defaultValue="">
          <SelectTrigger>
            <SelectValue placeholder="Select your experience level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
            <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
            <SelectItem value="senior">Senior Level (6-10 years)</SelectItem>
            <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Resume Upload */}
      <div>
        <Label htmlFor="resume">Resume *</Label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">Upload your resume (PDF, DOC, DOCX)</p>
          <Button variant="outline" size="sm">
            Choose File
          </Button>
        </div>
      </div>

      {/* Cover Letter */}
      <div>
        <Label htmlFor="motivation">Why are you interested in this role? *</Label>
        <Textarea 
          id="motivation" 
          placeholder="Tell the referrer why you're excited about this opportunity and how you'd be a great fit..."
          rows={4}
          required
        />
      </div>

      {/* Additional Information */}
      <div>
        <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
        <Textarea 
          id="additionalInfo" 
          placeholder="Any additional information you'd like to share..."
          rows={3}
        />
      </div>

      {/* LinkedIn Profile */}
      <div>
        <Label htmlFor="linkedinProfile">LinkedIn Profile (Optional)</Label>
        <Input id="linkedinProfile" placeholder="https://linkedin.com/in/yourprofile" />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={onClose}>
          <Send className="h-4 w-4 mr-2" />
          Submit Application
        </Button>
      </div>
    </div>
  );
}

function ATSAnalyzerForm({ onClose }: any) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const mockAnalysis = {
    overallScore: 78,
    skillsScore: 85,
    experienceScore: 72,
    formatScore: 80,
    keywordsScore: 75,
    suggestions: [
      "Add more quantified achievements (e.g., 'Increased efficiency by 25%')",
      "Include relevant keywords from job descriptions",
      "Optimize formatting for ATS compatibility",
      "Add missing technical skills mentioned in target roles"
    ],
    strengths: [
      "Clear professional summary",
      "Well-structured work experience",
      "Relevant technical skills listed"
    ],
    improvements: [
      "Add more industry-specific keywords",
      "Include measurable results and achievements",
      "Expand technical skills section"
    ]
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      setAnalysis(mockAnalysis);
      setIsAnalyzing(false);
    }, 3000);
  };

  if (analysis) {
    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full border-8 border-blue-500 mb-4">
            <span className="text-2xl font-bold text-blue-600">{analysis.overallScore}%</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Overall ATS Score</h3>
          <p className="text-gray-600 dark:text-gray-400">Good score! Your resume is likely to pass most ATS systems.</p>
        </div>

        {/* Detailed Scores */}
        <div className="grid grid-cols-2 gap-4">
          <ScoreCard title="Skills Match" score={analysis.skillsScore} />
          <ScoreCard title="Experience" score={analysis.experienceScore} />
          <ScoreCard title="Format" score={analysis.formatScore} />
          <ScoreCard title="Keywords" score={analysis.keywordsScore} />
        </div>

        {/* Strengths */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Strengths
          </h4>
          <ul className="space-y-2">
            {analysis.strengths.map((strength: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Suggestions */}
        <div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Suggestions for Improvement
          </h4>
          <ul className="space-y-2">
            {analysis.suggestions.map((suggestion: string, index: number) => (
              <li key={index} className="flex items-start gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setAnalysis(null)}>
            Analyze Another Resume
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isAnalyzing ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analyzing Your Resume</h3>
          <p className="text-gray-600 dark:text-gray-400">This may take a few moments...</p>
        </div>
      ) : (
        <>
          <div className="text-center">
            <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">ATS Resume Analyzer</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Upload your resume to get instant feedback on ATS compatibility and optimization suggestions.
            </p>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Upload Your Resume</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Supported formats: PDF, DOC, DOCX (Max 5MB)
            </p>
            <Button onClick={handleAnalyze}>
              Choose File & Analyze
            </Button>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">What you'll get:</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Overall ATS compatibility score</li>
              <li>• Keyword optimization analysis</li>
              <li>• Formatting recommendations</li>
              <li>• Specific improvement suggestions</li>
              <li>• Industry-specific insights</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

function ScoreCard({ title, score }: { title: string, score: number }) {
  const getColor = (score: number) => {
    if (score >= 80) return "text-green-600 border-green-300 bg-green-50";
    if (score >= 60) return "text-yellow-600 border-yellow-300 bg-yellow-50";
    return "text-red-600 border-red-300 bg-red-50";
  };

  return (
    <div className={`p-4 rounded-lg border ${getColor(score)}`}>
      <div className="flex justify-between items-center">
        <span className="font-medium">{title}</span>
        <span className="text-lg font-bold">{score}%</span>
      </div>
      <div className="mt-2 bg-white rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
}