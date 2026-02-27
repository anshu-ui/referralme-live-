import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useJobPostings, useReferralRequests } from "../hooks/useFirestore";
import { updateReferralRequestStatus } from "../lib/firestore";
import { Link, useLocation } from "wouter";
import { Button } from "../components/ui/button";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

import { 
  Plus, Building, MapPin, DollarSign, Users, TrendingUp, 
  Clock, CheckCircle, XCircle, AlertCircle, Bell, Settings,
  User, Edit, Trash2, Eye, MessageCircle, FileText,
  Target, BarChart3, Activity, Calendar, Filter,
  ExternalLink, Send, LogOut, Briefcase, Search, Linkedin
} from "lucide-react";
import { trackEvent } from "../lib/analytics";




export default function CleanReferrerDashboard() {
  const { user, logout } = useFirebaseAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Real-time data from Firestore
  const { jobs: allJobPostings, loading: jobsLoading, deleteJob } = useJobPostings();
  const { requests, loading: requestsLoading } = useReferralRequests("referrer");

  // Filter job postings to only show those created by this user
  const myJobPostings = allJobPostings?.filter(job => job.referrerId === user?.uid) || [];

  // Calculate real stats from actual data
  const realStats = {
    activePosts: myJobPostings.filter(job => job.isActive).length,
    totalPosts: myJobPostings.length,
    pendingRequests: requests?.filter(req => req.status === "pending").length || 0,
    acceptedRequests: requests?.filter(req => req.status === "accepted").length || 0,
    totalRequests: requests?.length || 0
  };





  const handleRequestStatusUpdate = async (requestId: string, status: "accepted" | "rejected") => {
    try {
      await updateReferralRequestStatus(requestId, status);
      
    } catch (error) {
      console.error("Error updating request status:", error);
    }
  };

  // Handle job deletion
  const handleDeleteJob = async (jobId: string) => {
    if (window.confirm("Are you sure you want to delete this job posting? This action cannot be undone.")) {
      try {
        await deleteJob(jobId);
        console.log("Job deleted successfully");
      } catch (error) {
        console.error("Error deleting job:", error);
        alert("Failed to delete job posting. Please try again.");
      }
    }
  };

  // LinkedIn sharing handler with mobile-optimized pre-filled post
  const handleShareToLinkedIn = (job: any) => {
    console.log('🔗 LinkedIn Share clicked for job:', job.title);
    
    const referrerPublicLink = `${window.location.origin}/referrer/${user?.uid}`;
    console.log('📍 Referrer link:', referrerPublicLink);
    
    const linkedInArticle = generateLinkedInArticle(job, user, referrerPublicLink);
    console.log('📄 Generated article content:', linkedInArticle.content.substring(0, 100) + '...');
    
    // Mobile-friendly LinkedIn sharing approach
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // For mobile: Try LinkedIn app first, then web fallback
      const linkedInAppUrl = `linkedin://sharing/share-offsite/?text=${encodeURIComponent(linkedInArticle.content)}&url=${encodeURIComponent(referrerPublicLink)}`;
      const linkedInWebUrl = `https://www.linkedin.com/sharing/share-offsite/?text=${encodeURIComponent(linkedInArticle.content)}&url=${encodeURIComponent(referrerPublicLink)}`;
      
      // Copy content to clipboard for easy access
      navigator.clipboard.writeText(linkedInArticle.content).then(() => {
        console.log('✅ Complete job content copied to clipboard for mobile');
      }).catch(() => {
        console.log('Clipboard not available');
      });
      
      // Copy content and open LinkedIn with instructions
      navigator.clipboard.writeText(linkedInArticle.content).then(() => {
        console.log('✅ Complete job content copied to clipboard for mobile');
        
        // Try LinkedIn app with deep link for sharing
        const linkedInMobileUrl = `linkedin://sharing?text=${encodeURIComponent(linkedInArticle.content)}`;
        
        // Create invisible link to trigger app
        const link = document.createElement('a');
        link.href = linkedInMobileUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Fallback to web if app doesn't respond
        setTimeout(() => {
          window.open(linkedInWebUrl, '_blank');
        }, 1000);
        
        alert('📱 LinkedIn will open now!\n\n✅ Complete job post copied to clipboard\n• LinkedIn app will open (if installed)\n• Or web browser will open\n• Paste the content to share your job posting');
        
      }).catch(() => {
        // Fallback without clipboard
        window.open(linkedInWebUrl, '_blank');
        alert('📱 LinkedIn opened in browser with pre-filled job post!');
      });
    } else {
      // For desktop: use LinkedIn sharing with complete job content pre-filled in the main post
      const linkedInDesktopUrl = `https://www.linkedin.com/sharing/share-offsite/?text=${encodeURIComponent(linkedInArticle.content)}&url=${encodeURIComponent(referrerPublicLink)}`;
      
      // Copy to clipboard and open LinkedIn with full content
      navigator.clipboard.writeText(linkedInArticle.content).then(() => {
        console.log('✅ Complete job content with all details copied to clipboard for desktop');
        window.open(linkedInDesktopUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        setTimeout(() => {
          alert('✅ LinkedIn opened with complete job post pre-filled!\n\nThe post includes:\n• Job title & company details\n• Location & salary information\n• Full job description\n• Requirements & skills needed\n• Benefits & perks offered\n\nAll information is ready in the main post area. Just click "Post" to share!');
        }, 1000);
      }).catch(() => {
        window.open(linkedInDesktopUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        setTimeout(() => {
          alert('LinkedIn opened! The complete job post with all details is ready to be pasted for sharing.');
        }, 500);
      });
    }
    
    // Track analytics
    trackEvent('job_shared_linkedin', 'social_sharing', job.id);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "under_review": return "bg-blue-100 text-blue-800";
      case "accepted": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "completed": return "bg-purple-100 text-purple-800";
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

  // Enhanced generateLinkedInArticle function with comprehensive job details
  const generateLinkedInArticle = (job: any, user: any, referrerLink: string) => {
    const title = `🚀 Exciting ${job.title} Opportunity at ${job.company}!`;
    
    // Build skills section if available
    const skillsText = job.skills && job.skills.length > 0 
      ? `\n🔧 Key Skills Required:\n${job.skills.map((skill: string) => `• ${skill}`).join('\n')}`
      : '';
    
    // Build experience section if available
    const experienceText = job.experience 
      ? `\n📈 Experience Level: ${job.experience}`
      : '';
    
    // Build benefits section if available
    const benefitsText = job.benefits && job.benefits.length > 0
      ? `\n🎁 Benefits & Perks:\n${job.benefits.map((benefit: string) => `• ${benefit}`).join('\n')}`
      : '';
    
    const content = `🎯 I'm excited to share an amazing career opportunity that just opened up!

🚀 ROLE: ${job.title}
🏢 COMPANY: ${job.company}
📍 LOCATION: ${job.location}
💰 SALARY: ${(job.salaryRange || job.salary || 'Competitive package').replace(/\$/g, '₹')}
⏰ TYPE: ${job.type || 'Full-time'}${experienceText}

📝 WHAT YOU'LL BE DOING:
${job.description || 'Join an innovative team and make a real impact in your career! You\'ll be working on exciting projects that drive business growth and innovation.'}

🎯 WHAT WE'RE LOOKING FOR:
${job.requirements || 'Passionate individuals ready to take on new challenges and grow with our dynamic team.'}${skillsText}${benefitsText}

✨ WHY THIS IS A GREAT OPPORTUNITY:
✅ Work with cutting-edge technology and innovative solutions
✅ Collaborative and inclusive team environment
✅ Excellent growth and learning opportunities
✅ Competitive compensation and comprehensive benefits
✅ Opportunity to make a real impact in a growing company

🚀 READY TO TAKE THE NEXT STEP IN YOUR CAREER?

👉 Apply through my referral link: ${referrerLink}

As an industry professional${user?.company ? ` at ${user.company}` : ''}, I'm here to help connect talented individuals with great opportunities. Feel free to reach out if you have questions about this role or need career guidance.

${user?.firstName ? `Best regards,\n${user.firstName}` : ''}

#Hiring #JobOpportunity #CareerGrowth #${job.company?.replace(/\s+/g, '')} #Referral #${job.title?.replace(/\s+/g, '')} #Jobs #Career #Opportunity #ReferralMe

---
🔗 Shared via ReferralMe - Connecting talent with opportunity`;

    return { title, content };
  };

  return (
    <div className="min-h-screen bg-gray-50 animate-fade-in-up">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-14 sm:h-16">
            <div className="flex items-center hover-scale">
              <img src={"/logo.png"} alt="ReferralMe" className="h-6 w-6 sm:h-8 sm:w-8 mr-2 sm:mr-3" />
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">ReferralMe</h1>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button variant="ghost" size="sm" className="hidden sm:flex hover-lift">
                <Bell className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 hover-scale">
                  <AvatarImage src={user?.photoURL || user?.profileImageUrl || ""} />
                  <AvatarFallback>
                    {user?.firstName?.charAt(0) || user?.displayName?.charAt(0) || user?.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs sm:text-sm font-medium text-gray-700 hidden xs:inline mobile-hide">
                  {user?.displayName || user?.email || "User"}
                </span>
              </div>
              
              <Button variant="ghost" size="sm" onClick={logout} className="hover-lift">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Overview</TabsTrigger>
            <TabsTrigger value="jobs" className="text-xs sm:text-sm px-2 sm:px-4 py-2">My Jobs</TabsTrigger>
            <TabsTrigger value="applications" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Applications</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-fade-in-up">
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <Card className="card-animate hover-lift">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Active Posts</CardTitle>
                  <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold">{realStats.activePosts}</div>
                  <p className="text-xs text-muted-foreground">
                    {realStats.activePosts === 0 ? "Create your first job post!" : "Currently active"}
                  </p>
                </CardContent>
              </Card>

              <Card className="card-animate hover-lift animation-delay-100">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Pending Applications</CardTitle>
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold">{realStats.pendingRequests}</div>
                  <p className="text-xs text-muted-foreground">Awaiting your review</p>
                </CardContent>
              </Card>

              <Card className="card-animate hover-lift animation-delay-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Applications</CardTitle>
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold">{realStats.totalRequests}</div>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card className="card-animate hover-lift animation-delay-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
                  <CardTitle className="text-xs sm:text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="text-lg sm:text-2xl font-bold">
                    {realStats.totalRequests > 0 ? Math.round((realStats.acceptedRequests / realStats.totalRequests) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {realStats.acceptedRequests} accepted
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card className="card-animate hover-lift animation-delay-400">
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="text-lg sm:text-xl">Quick Actions</CardTitle>
                <CardDescription className="text-sm">Manage your referral activity</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 px-3 sm:px-6">
                <Button onClick={() => navigate("/create-job")} className="btn-animate hover-glow w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Post New Job</span>
                  <span className="sm:hidden">New Job</span>
                </Button>
                <Button variant="outline" onClick={() => setActiveTab("applications")} className="btn-animate w-full">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Review Applications</span>
                  <span className="sm:hidden">Applications</span>
                </Button>
                <Link href="/profile-edit">
                  <Button variant="outline" className="btn-animate w-full">
                    <User className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Edit Profile</span>
                    <span className="sm:hidden">Profile</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Empty State or Recent Activity */}
            {realStats.totalPosts === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Briefcase className="h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No job posts yet</h3>
                  <p className="text-gray-500 text-center mb-6">
                    Start by creating your first job posting to help connect talented professionals with opportunities.
                  </p>
                  <Button onClick={() => navigate("/create-job")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Job Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {requests?.slice(0, 3).map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{request.seekerName}</h4>
                          <p className="text-sm text-gray-500">Applied to {request.jobTitle || 'Job'}</p>
                        </div>
                        {getStatusBadge(request.status || "pending")}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* My Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>My Job Postings</CardTitle>
                  <CardDescription>Manage your job opportunities</CardDescription>
                </div>
                <Button onClick={() => navigate("/create-job")}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Job Post
                </Button>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading job posts...</span>
                  </div>
                ) : myJobPostings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Briefcase className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No job posts created</h3>
                    <p className="text-gray-500 text-center mb-6">
                      Create your first job posting to start receiving applications from job seekers.
                    </p>
                    <Button onClick={() => navigate("/create-job")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Job Post
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myJobPostings.map((job) => (
                      <Card key={job.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold">{job.title}</h3>
                                {job.isActive ? (
                                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                                ) : (
                                  <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
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
                                    <DollarSign className="h-4 w-4" />
                                    {job.salary?.replace(/\$/g, '₹')}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>
                              <div className="text-sm text-gray-500">
                                Posted on {new Date(job.createdAt?.toDate()).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="ml-6 flex flex-col gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                              <Button 
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareToLinkedIn(job);
                                }}
                              >
                                <Linkedin className="mr-2 h-4 w-4" />
                                Share
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => job.id && handleDeleteJob(job.id)}
                                className="text-red-600 hover:text-red-700 hover:border-red-300"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Application Requests</CardTitle>
                <CardDescription>Review and manage incoming applications</CardDescription>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-2">Loading applications...</span>
                  </div>
                ) : requests && requests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <MessageCircle className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No applications received</h3>
                    <p className="text-gray-500 text-center mb-6">
                      Once you post job opportunities, applications from job seekers will appear here.
                    </p>
                    <Button onClick={() => setActiveTab("jobs")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Post a Job
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests?.map((request) => (
                      <Card key={request.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                  <h3 className="text-lg font-semibold">{request.seekerName}</h3>
                                  {getStatusBadge(request.status || "pending")}
                                </div>
                                <div className="text-gray-600 mb-3">
                                  Applied for: <span className="font-medium">{request.jobTitle || 'Job'}</span>
                                </div>
                                <div className="text-sm text-gray-500 mb-4">
                                  Applied on {new Date(request.createdAt?.toDate()).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            
                            {request.coverLetter && (
                              <div className="bg-gray-50 p-3 rounded-lg">
                                <p className="text-sm">{request.coverLetter}</p>
                              </div>
                            )}
                            
                            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end pt-3 border-t border-gray-100">
                              {request.status === "pending" && (
                                <>
                                  <Button 
                                    size="sm"
                                    onClick={() => handleRequestStatusUpdate(request.id!, "accepted")}
                                    className="w-full sm:w-auto"
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Accept
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRequestStatusUpdate(request.id!, "rejected")}
                                    className="w-full sm:w-auto"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Decline
                                  </Button>
                                </>
                              )}
                              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Contact
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
                <CardDescription>Track your referral activity and success metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {realStats.totalPosts === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <BarChart3 className="h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No data available</h3>
                    <p className="text-gray-500 text-center mb-6">
                      Start posting jobs and receiving applications to see your performance analytics.
                    </p>
                    <Button onClick={() => setActiveTab("jobs")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Job Post
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Application Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>Total Applications:</span>
                            <span className="font-medium">{realStats.totalRequests}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Pending Review:</span>
                            <span className="font-medium">{realStats.pendingRequests}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Accepted:</span>
                            <span className="font-medium text-green-600">{realStats.acceptedRequests}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Success Rate:</span>
                            <span className="font-medium">
                              {realStats.totalRequests > 0 ? Math.round((realStats.acceptedRequests / realStats.totalRequests) * 100) : 0}%
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Job Post Metrics</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between">
                            <span>Total Posts:</span>
                            <span className="font-medium">{realStats.totalPosts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Active Posts:</span>
                            <span className="font-medium text-green-600">{realStats.activePosts}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg. Applications per Post:</span>
                            <span className="font-medium">
                              {realStats.totalPosts > 0 ? Math.round(realStats.totalRequests / realStats.totalPosts) : 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>


    </div>
  );
}