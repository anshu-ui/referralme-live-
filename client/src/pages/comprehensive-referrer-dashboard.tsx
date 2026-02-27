import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { useJobPostings, useReferralRequests } from "../hooks/useFirestore";
import { Button } from "../components/ui/button";
import { Link, useLocation } from "wouter";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import ProfileEditModal from "../components/profile-edit-modal";
import { Label } from "../components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { ScrollArea } from "../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

import { 
  Plus, MapPin, IndianRupee, Calendar, Users, CheckCircle, XCircle, Clock, 
  Eye, MessageCircle, TrendingUp, Award, Download, Star, Trophy, 
  FileText, Bell, Activity, BarChart3, Settings, User, Briefcase,
  Building, Globe, Linkedin, Github, Camera, Edit3, Send, Filter,
  ThumbsUp, ThumbsDown, AlertCircle, ChevronRight, ExternalLink,
  Video, Phone, UserPlus, Search, Tag, BookOpen, Edit, Trash2,
  Shield, Target, Zap, Sparkles, Medal, Gift, ArrowRight,
  CheckCircle2, BadgeCheck, Flame, Crown, Bot, Brain, Users2, CreditCard, Share2
} from "lucide-react";

import ApplicationDetailsModal from "../components/application-details-modal";
import EnhancedRequestDetails from "../components/enhanced-request-details";
import ReferralSystem from "../components/referral-system";
import ComingSoonBadge from "../components/coming-soon-badge";
import RealTimeGamification from "../components/real-time-gamification";
import DashboardFooter from "../components/dashboard-footer";
import AutoAchievementSystem from "../components/auto-achievement-system";
import { 
  trackEvent, 
  trackTabSwitch, 
  trackJobPosting, 
  trackApplicationStatusChange,
  trackProfileView,
  trackButtonClick 
} from "../lib/analytics";
import { sendApplicationStatusUpdate } from "../lib/emailService";
import { useToast } from "../hooks/use-toast";
import { updateReferralRequestStatus, deleteJobPosting } from "../lib/firestore";
// import MentorAccountSetup from "../components/mentor-account-setup";
// import DualPaymentSetup from "../components/dual-payment-setup";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";

// Helper function to get status badge styling
const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "pending": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "accepted": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "rejected": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    case "sent_to_hr": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "interview_scheduled": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "completed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
};

export default function ComprehensiveReferrerDashboard() {
  const { user, firebaseUser, logout, refreshUser } = useFirebaseAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  const [isMyJobsOpen, setIsMyJobsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isApplicationDetailsOpen, setIsApplicationDetailsOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [isMentorAccountSetupOpen, setIsMentorAccountSetupOpen] = useState(false);
  const [isDualPaymentSetupOpen, setIsDualPaymentSetupOpen] = useState(false);

  // Real data from Firebase using the subscription-based hooks
  const { jobs: allJobPostings, loading: jobsLoading, createJob, updateJob, deleteJob } = useJobPostings();
  const { requests, loading: requestsLoading } = useReferralRequests("referrer");

  // Filter job postings to only show those created by this user
  const myJobPostings = allJobPostings?.filter(job => job.referrerId === user?.uid) || [];

  // Calculate real stats from Firebase data
  const realStats = {
    activePosts: myJobPostings.filter(job => job.isActive).length,
    totalApplications: requests?.length || 0,
    pendingRequests: requests?.filter(req => req.status === "pending").length || 0,
    acceptedRequests: requests?.filter(req => req.status === "accepted").length || 0,
    successfulReferrals: requests?.filter(req => req.status === "accepted").length || 0,
    responseRate: requests?.length ? Math.round((requests.filter(req => req.status !== "pending").length / requests.length) * 100) : 0,
    averageTime: "2.3 days" // This would need more complex calculation
  };

  // Achievement stats for the Auto Achievement System
  const stats = {
    totalJobsPosted: myJobPostings.length,
    successfulPlacements: requests?.filter(req => req.status === "accepted").length || 0,
    impactScore: Math.min(100, (myJobPostings.length * 10) + (realStats.successfulReferrals * 25)),
    streakDays: Math.floor((Date.now() - (user?.createdAt ? (user.createdAt as any)?.toDate?.() ? (user.createdAt as any).toDate().getTime() : Date.now() : Date.now())) / (1000 * 60 * 60 * 24)),
    testimonialCount: 0 // This would be from a testimonials collection
  };

  const downloadResume = (resumeUrl: string, fullName: string) => {
    if (!resumeUrl) return;
    
    const triggerDownload = async () => {
      try {
        const response = await fetch(resumeUrl, { mode: 'cors' });
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        let filename = 'resume.pdf';
        try {
          const decodedUrl = decodeURIComponent(resumeUrl);
          const pathParts = decodedUrl.split('/');
          const fileWithParams = pathParts[pathParts.length - 1];
          filename = fileWithParams.split('?')[0] || 'resume.pdf';
        } catch (e) {
          filename = `${fullName || 'resume'}.pdf`;
        }
        
        if (!filename.includes('.')) filename += '.pdf';
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        console.error('Download failed, using fallback', err);
        const link = document.createElement('a');
        link.href = resumeUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    
    triggerDownload();
  };

  const getStatusBadge = (status: string) => {
    const downloadResume = async (resumeUrl: string, fullName: string) => {
      if (!resumeUrl) return;
      try {
        const response = await fetch(resumeUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        let filename = 'resume_file';
        try {
          const decodedUrl = decodeURIComponent(resumeUrl);
          const pathParts = decodedUrl.split('/');
          const fileWithParams = pathParts[pathParts.length - 1];
          filename = fileWithParams.split('?')[0];
        } catch (e) {
          filename = `${fullName || 'resume'}_original`;
        }
        
        if (!filename.includes('.')) {
          filename += '.pdf';
        }
        
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Download failed:", error);
        window.open(resumeUrl, '_blank');
      }
    };

    const variants = {
      pending: { variant: "secondary" as const, icon: <Clock className="h-3 w-3 mr-1" />, color: "text-yellow-600" },
      accepted: { variant: "default" as const, icon: <CheckCircle className="h-3 w-3 mr-1" />, color: "text-green-600" },
      rejected: { variant: "destructive" as const, icon: <XCircle className="h-3 w-3 mr-1" />, color: "text-red-600" }
    };
    
    const config = variants[status as keyof typeof variants] || variants.pending;
    return (
      <Badge variant={config.variant} className={`flex items-center ${config.color}`}>
        {config.icon}
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const handleViewApplication = (application: any) => {
    setSelectedApplication(application);
    setIsApplicationDetailsOpen(true);
  };

  const handleApplicationStatusUpdate = async (newStatus: string) => {
    if (!selectedApplication) return;
    
    try {
      await updateReferralRequestStatus(selectedApplication.id, newStatus as any);
      
      // Track the status change
      trackApplicationStatusChange(selectedApplication.id);
      
      // Send email notification to seeker about status change
      if (newStatus === 'accepted' || newStatus === 'rejected') {
        const seekerName = selectedApplication.fullName || selectedApplication.seeker?.name || 'Applicant';
        const seekerEmail = selectedApplication.email || selectedApplication.seeker?.email;
        const referrerName = user?.firstName && user?.lastName ? 
          `${user.firstName} ${user.lastName}` : 
          user?.displayName || 'Referrer';
        
        if (seekerEmail) {
          console.log("📧 Sending status update email to:", seekerEmail, "Status:", newStatus);
          const jobData = selectedApplication.job || {
            title: selectedApplication.jobTitle,
            company: selectedApplication.company || 'Company'
          };
          
          sendApplicationStatusUpdate(
            seekerName,
            seekerEmail,
            jobData,
            newStatus,
            referrerName
          ).then((result) => {
            if (result) {
              console.log("✅ Status update email sent successfully");
            } else {
              console.error("❌ Failed to send status update email");
            }
          }).catch((error) => {
            console.error("❌ Error sending status update email:", error);
          });
        }
      }
      
      // Close the modal - the real-time subscription will update the data
      setIsApplicationDetailsOpen(false);
      setSelectedApplication(null);
      
      // Status updated successfully - no automatic redirect
      console.log("Application status updated successfully");
      
    } catch (error) {
      console.error("Error updating application status:", error);
    }
  };

  const handleSignOut = async () => {
    await logout();
  };

  const handleShareProfile = async () => {
    console.log("🔗 Share Profile button clicked!");
    
    if (!firebaseUser?.uid) {
      console.error("❌ No user UID found for share profile");
      toast({
        title: "Error",
        description: "Unable to generate profile link.",
        variant: "destructive"
      });
      return;
    }

    const profileUrl = `${window.location.origin}/referrer/${firebaseUser.uid}`;
    console.log("📋 Copying profile URL:", profileUrl);
    
    try {
      await navigator.clipboard.writeText(profileUrl);
      console.log("✅ Profile URL copied to clipboard successfully");
      
      // Show immediate alert feedback
      alert(`✅ PROFILE LINK COPIED!\n\nYour profile link has been copied to clipboard:\n${profileUrl}\n\nAnyone can visit this link without logging in!`);
      
      toast({
        title: "✅ Profile Link Copied!",
        description: "Your public referrer profile link has been copied to clipboard. Anyone can view it without logging in!",
        duration: 6000,
        className: "border-green-200 bg-green-50"
      });
      trackButtonClick('share_profile', 'referrer_header');
    } catch (error) {
      console.log("⚠️ Clipboard API failed, using fallback:", error);
      // Fallback for browsers that don't support clipboard API
      try {
        const textArea = document.createElement("textarea");
        textArea.value = profileUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        console.log("✅ Profile URL copied via fallback method");
        
        // Show immediate alert feedback
        alert(`✅ PROFILE LINK COPIED!\n\nYour profile link has been copied to clipboard:\n${profileUrl}\n\nAnyone can visit this link without logging in!`);
        
        toast({
          title: "✅ Profile Link Copied!",
          description: "Your public referrer profile link has been copied to clipboard. Anyone can view it without logging in!",
          duration: 6000,
          className: "border-green-200 bg-green-50"
        });
        trackButtonClick('share_profile', 'referrer_header');
      } catch (fallbackError) {
        console.error("❌ Both clipboard methods failed:", fallbackError);
        toast({
          title: "Copy Failed",
          description: "Unable to copy link. Please copy this URL manually: " + profileUrl,
          variant: "destructive"
        });
      }
    }
  };

  const handleViewJob = (job: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJob(job);
    setIsViewModalOpen(true);
  };

  const handleEditJob = (job: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedJob(job);
    setIsEditModalOpen(true);
  };

  const handleDeleteJob = async (jobId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this job posting?")) {
      return;
    }

    try {
      await deleteJobPosting(jobId);
      console.log("Job posting deleted successfully");
    } catch (error) {
      console.error("Error deleting job:", error);
      console.error("Failed to delete job posting");
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

  // Enhanced generateLinkedInArticle function with comprehensive job details
  // Job sharing handler - generates public shareable links for individual jobs
  const handleShareJob = async (job: any) => {
    try {
      const jobUrl = `${window.location.origin}/job/${job.id}`;
      console.log('🔗 Share Job button clicked for:', job.title);
      console.log('📋 Copying job URL:', jobUrl);
      
      await navigator.clipboard.writeText(jobUrl);
      console.log('✅ Job URL copied to clipboard successfully');
      
      // Show immediate alert feedback
      alert(`✅ JOB LINK COPIED!\n\nJob "${job.title}" link has been copied to clipboard:\n${jobUrl}\n\nAnyone can visit this link without logging in!`);
      
      toast({
        title: "✅ Job Link Copied! 🔗",
        description: "Share this link with anyone - no login required to view!",
        duration: 6000,
        className: "border-green-200 bg-green-50"
      });
      
      // Track analytics
      trackEvent('job_shared', 'social_sharing', job.id);
    } catch (error) {
      console.error('❌ Error sharing job:', error);
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${window.location.origin}/job/${job.id}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "✅ Job Link Copied! 🔗",
        description: "Share this link with anyone - no login required to view!",
        duration: 6000,
        className: "border-green-200 bg-green-50"
      });
    }
  };

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src={"/logo.png"} alt="ReferralMe" className="h-10 w-10" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Referrer Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {user?.firstName && user?.lastName 
                    ? `${user.firstName} ${user.lastName}` 
                    : user?.displayName || user?.email?.split('@')[0] || "Referrer"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
              {/* User Profile Section */}
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.firstName && user?.lastName ? 
                      `${user.firstName} ${user.lastName}` : 
                      user?.displayName || 'User'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Referrer</span>
                </div>
                <Avatar 
                  className="cursor-pointer h-8 w-8 md:h-10 md:w-10 ring-2 ring-blue-100 hover:ring-blue-300 transition-all" 
                  onClick={() => setIsProfileEditOpen(true)}
                >
                  <AvatarImage src={user?.photoURL || user?.profileImageUrl || ""} />
                  <AvatarFallback className="bg-blue-500 text-white font-semibold">
                    {user?.firstName?.[0] || user?.displayName?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShareProfile}
                className="text-xs md:text-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                data-testid="button-share-profile"
              >
                <Share2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                <span className="hidden md:inline">Share Profile</span>
                <span className="md:hidden">Share</span>
              </Button>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="text-xs md:text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                <span className="hidden md:inline">Sign Out</span>
                <span className="md:hidden">Exit</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Payment Account Setup Notification */}
      {user && !(user as any).paymentSetupCompleted && (user as any).isMentorshipEnabled && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900">Complete payment setup to receive bookings</h3>
                  <p className="text-sm text-amber-700">
                    Choose between UPI (instant payments) or Razorpay (business accounts) to start receiving payments
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setIsDualPaymentSetupOpen(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Set up Payments
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(tab) => {
          setActiveTab(tab);
          trackTabSwitch(tab, 'referrer');
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
                  <TabsTrigger value="requests" className="professional-tab">
                    <div className="professional-tab-content">
                      <FileText className="h-4 w-4 professional-tab-icon" />
                      <span>Requests</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="professional-tab">
                    <div className="professional-tab-content">
                      <TrendingUp className="h-4 w-4 professional-tab-icon" />
                      <span>Analytics</span>
                    </div>
                  </TabsTrigger>

                  <TabsTrigger value="achievements" className="professional-tab">
                    <div className="professional-tab-content">
                      <Trophy className="h-4 w-4 professional-tab-icon" />
                      <span>Badges</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="earnings" className="professional-tab">
                    <div className="professional-tab-content">
                      <IndianRupee className="h-4 w-4 professional-tab-icon" />
                      <span>Earnings</span>
                    </div>
                  </TabsTrigger>



                  <TabsTrigger value="mentorship" className="professional-tab">
                    <div className="professional-tab-content">
                      <BookOpen className="h-4 w-4 professional-tab-icon" />
                      <span>Mentorship</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <OverviewSection stats={realStats} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentActivity jobs={myJobPostings} requests={requests} />
              <QuickActions 
                onCreateJob={() => navigate("/create-job")}
              />
            </div>
          </TabsContent>

          {/* My Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <MyJobsSection 
              jobPostings={myJobPostings} 
              onCreateJob={() => navigate("/create-job")}
              onViewJob={handleViewJob}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
              onShareToLinkedIn={handleShareToLinkedIn}
              onShareJob={handleShareJob}
            />
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <RequestsSection 
              requests={requests || []}
              onStatusUpdate={handleApplicationStatusUpdate}
              onViewRequest={handleViewApplication}
              getStatusBadge={getStatusBadge}
            />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsSection 
              jobs={myJobPostings} 
              requests={requests || []} 
              stats={realStats}
            />
          </TabsContent>





          {/* Achievements Tab */}
          <TabsContent value="achievements" className="space-y-6">
            <AchievementsSection stats={realStats} user={user} toast={toast} />
          </TabsContent>

          {/* Earnings Tab */}
          <TabsContent value="earnings" className="space-y-6">
            <EarningsSection />
          </TabsContent>






          {/* Mentorship Tab */}
          <TabsContent value="mentorship" className="space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mentorship Platform</h2>
                <ComingSoonBadge feature="Coming Soon" variant="sparkle" size="lg" />
              </div>

              <Card>
                <CardContent className="p-12 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                      <Users className="h-12 w-12 text-purple-600" />
                    </div>
                    <h3 className="text-xl font-semibold">Mentorship Feature Coming Soon!</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Offer paid mentorship sessions with video calls, payment integration, and scheduling. 
                      Earn extra income by sharing your expertise!
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Video className="h-4 w-4" />
                        <span>Video Call Integration</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <CreditCard className="h-4 w-4" />
                        <span>Payment Processing</span>
                      </div>
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Calendar className="h-4 w-4" />
                        <span>Session Scheduling</span>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full">
                      <Bell className="h-4 w-4 mr-2" />
                      Notify Me When Available
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            {/* <MentorshipSection 
              user={user} 
              isMentorAccountSetupOpen={isMentorAccountSetupOpen}
              setIsMentorAccountSetupOpen={setIsMentorAccountSetupOpen}
              isDualPaymentSetupOpen={isDualPaymentSetupOpen}
              setIsDualPaymentSetupOpen={setIsDualPaymentSetupOpen}
            /> */}
          </TabsContent>
        </Tabs>



        {/* View Job Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Job Details</DialogTitle>
              <DialogDescription>
                View complete job posting information
              </DialogDescription>
            </DialogHeader>
            {selectedJob && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-semibold">Job Title</Label>
                    <p>{selectedJob.title}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Company</Label>
                    <p>{selectedJob.company}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Location</Label>
                    <p>{selectedJob.location}</p>
                  </div>
                  <div>
                    <Label className="font-semibold">Salary</Label>
                    <p>{selectedJob.salary}</p>
                  </div>
                </div>
                <div>
                  <Label className="font-semibold">Description</Label>
                  <p className="text-gray-700 mt-1">{selectedJob.description}</p>
                </div>
                <div>
                  <Label className="font-semibold">Requirements</Label>
                  <p className="text-gray-700 mt-1">{selectedJob.requirements}</p>
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                  <Badge variant={selectedJob.isActive ? "default" : "secondary"}>
                    {selectedJob.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
                      Close
                    </Button>
                    <Button onClick={() => {
                      setIsViewModalOpen(false);
                      setIsEditModalOpen(true);
                    }}>
                      Edit Job
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Job Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Job Posting</DialogTitle>
              <DialogDescription>
                Update your job posting details
              </DialogDescription>
            </DialogHeader>
            {selectedJob && (
              <EditJobForm 
                job={selectedJob}
                onClose={() => setIsEditModalOpen(false)}
                onSave={() => setIsEditModalOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>

      {/* Enhanced Application Details Modal */}
      {selectedApplication && (
        <Dialog open={isApplicationDetailsOpen} onOpenChange={setIsApplicationDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Review complete application with ATS analysis and manage the referral process
              </DialogDescription>
            </DialogHeader>
            <EnhancedRequestDetails
              request={selectedApplication}
              onStatusChange={(requestId, newStatus) => {
                handleApplicationStatusUpdate(newStatus);
              }}
              onAddNotes={(requestId, notes) => {
                // Add notes functionality here
                console.log("Adding notes:", requestId, notes);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Profile Edit Modal */}
      {user && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          user={user}
          onUserUpdated={async (updatedUser) => {
            // Update user state after profile edit
            console.log("Profile updated:", updatedUser);
            // Refresh user data to show updated profile image
            await refreshUser();
            console.log("✅ User data refreshed - profile image should update");
          }}
        />
      )}
      
      {/* Footer */}
      {/* Auto Achievement System - Background component for automatic rewards */}
      <AutoAchievementSystem
        userStats={{
          totalJobsPosted: stats.totalJobsPosted,
          successfulPlacements: stats.successfulPlacements,
          impactScore: stats.impactScore,
          streakDays: stats.streakDays,
          testimonialCount: stats.testimonialCount
        }}
        onAchievementUnlocked={(achievement) => {
          // Silent achievement tracking - no toast notifications
          trackEvent('achievement_unlocked', 'gamification', achievement.id);
        }}
      />

      <DashboardFooter />
    </div>
  );
}

// Component Sections
function OverviewSection({ stats }: { stats: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Active Posts"
        value={stats.activePosts}
        icon={<Briefcase className="h-5 w-5" />}
        color="text-blue-600"
        bgColor="bg-blue-50"
      />
      <StatCard
        title="Total Applications"
        value={stats.totalApplications}
        icon={<Users className="h-5 w-5" />}
        color="text-green-600"
        bgColor="bg-green-50"
      />
      <StatCard
        title="Pending Reviews"
        value={stats.pendingRequests}
        icon={<Clock className="h-5 w-5" />}
        color="text-yellow-600"
        bgColor="bg-yellow-50"
      />
      <StatCard
        title="Success Rate"
        value={`${stats.responseRate}%`}
        icon={<TrendingUp className="h-5 w-5" />}
        color="text-purple-600"
        bgColor="bg-purple-50"
      />
    </div>
  );
}

function StatCard({ title, value, icon, color, bgColor }: any) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
          <div className={`${bgColor} ${color} p-2 rounded-lg`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivity({ jobs, requests }: { jobs?: any[], requests?: any[] }) {
  // Combine jobs and requests into activities
  const activities: Array<{
    action: string;
    detail: string;
    time: string;
    type: string;
  }> = [];
  
  // Add job postings
  if (jobs && jobs.length > 0) {
    jobs.slice(0, 2).forEach(job => {
      activities.push({
        action: "Job posted",
        detail: `${job.title} at ${job.company}`,
        time: job.createdAt ? new Date(job.createdAt.toDate()).toLocaleDateString() : "Recently",
        type: "posting"
      });
    });
  }
  
  // Add referral requests
  if (requests && requests.length > 0) {
    requests.slice(0, 2).forEach(request => {
      activities.push({
        action: "New application",
        detail: `${request.seekerName} applied for a position`,
        time: request.createdAt ? new Date(request.createdAt.toDate()).toLocaleDateString() : "Recently",
        type: "application"
      });
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-3">
            {activities.length > 0 ? activities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{activity.detail}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{activity.time}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Start by posting your first job!
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function QuickActions({ onCreateJob }: { onCreateJob: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={onCreateJob} className="w-full justify-start">
          <Plus className="h-4 w-4 mr-2" />
          Post New Job
        </Button>
        <Link href="/profile-edit">
          <Button variant="outline" className="w-full justify-start">
            <User className="h-4 w-4 mr-2" />
            Update Profile
          </Button>
        </Link>
        <Button variant="outline" className="w-full justify-start">
          <MessageCircle className="h-4 w-4 mr-2" />
          Create Community Post
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <Calendar className="h-4 w-4 mr-2" />
          Schedule Mentorship
        </Button>
        <Button variant="outline" className="w-full justify-start">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Analytics
        </Button>
      </CardContent>
    </Card>
  );
}

function MyJobsSection({ jobPostings, onCreateJob, onViewJob, onEditJob, onDeleteJob, onShareToLinkedIn, onShareJob }: any) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Job Postings</h2>
        <Button onClick={onCreateJob}>
          <Plus className="h-4 w-4 mr-2" />
          Post New Job
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {jobPostings && jobPostings.length > 0 ? jobPostings.map((job: any) => (
          <Card key={job.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{job.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400">{job.company}</p>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </div>
                
                {job.salary && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <IndianRupee className="h-4 w-4" />
                    {job.salary?.replace(/\$/g, '₹')}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Posted {job.createdAt ? new Date(job.createdAt.toDate()).toLocaleDateString() : "Recently"}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-3">
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => onViewJob(job, e)}
                    className="text-xs sm:text-sm"
                  >
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">View</span>
                    <span className="sm:hidden">View</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => onEditJob(job, e)}
                    className="text-xs sm:text-sm"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                  <Button 
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm col-span-2 sm:col-span-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareToLinkedIn(job);
                    }}
                  >
                    <Linkedin className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Share Article</span>
                    <span className="sm:hidden">LinkedIn</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShareJob(job);
                    }}
                    data-testid={`button-share-job-${job.id}`}
                    className="text-xs sm:text-sm"
                  >
                    <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Share Job</span>
                    <span className="sm:hidden">Share</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={(e) => onDeleteJob(job.id, e)}
                    className="text-xs sm:text-sm text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">Delete</span>
                    <span className="sm:hidden">Delete</span>
                  </Button>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <Badge variant={job.isActive ? "default" : "secondary"} className="text-xs">
                    {job.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="col-span-full text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No jobs posted yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Start by posting your first job to attract talented candidates
            </p>
            <Button onClick={onCreateJob}>
              <Plus className="h-4 w-4 mr-2" />
              Post Your First Job
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function RequestsSection({ requests, onStatusUpdate, onViewRequest, getStatusBadge }: any) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Referral Requests</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">Review and manage candidate applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-blue-600 border-blue-600 bg-blue-50">
            <Users className="h-3 w-3 mr-1" />
            {requests.length} Total
          </Badge>
          {requests.filter((r: any) => r.status === 'pending').length > 0 && (
            <Badge variant="secondary" className="text-orange-600 border-orange-600 bg-orange-50">
              <Clock className="h-3 w-3 mr-1" />
              {requests.filter((r: any) => r.status === 'pending').length} Pending
            </Badge>
          )}
        </div>
      </div>
      
      {/* Requests Grid */}
      <div className="grid gap-4 lg:gap-6">
        {requests && requests.length > 0 ? requests.map((request: any) => (
          <Card key={request.id} className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500 bg-gradient-to-r from-white to-blue-50/30 dark:from-gray-800 dark:to-blue-900/10">
            <CardContent className="p-4 md:p-6">
              {/* Mobile-first layout */}
              <div className="space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-10 w-10 md:h-12 md:w-12 ring-2 ring-blue-100">
                      <AvatarImage src={request.seeker?.photoURL || request.seeker?.profileImageUrl || ""} />
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-sm md:text-base">
                        {(request.fullName || request.seekerName || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base md:text-lg text-gray-900 dark:text-white truncate">
                        {request.fullName || request.seekerName || "Anonymous"}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Applied for: <span className="font-medium text-blue-600 dark:text-blue-400">{request.jobTitle || request.job?.title || "Position"}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-start sm:items-end gap-2">
                    {getStatusBadge(request.status)}
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {request.createdAt ? new Date(request.createdAt.toDate()).toLocaleDateString() : "Recently"}
                    </span>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Contact</p>
                    <p className="text-sm text-gray-900 dark:text-white font-medium">{request.seekerEmail || request.email}</p>
                    {(request.phoneNumber || request.seekerPhone) && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{request.phoneNumber || request.seekerPhone}</p>
                    )}
                  </div>
                  
                  {request.experienceLevel && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Experience</p>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {request.experienceLevel === 'entry' ? 'Entry Level (0-2 years)' : 
                         request.experienceLevel === 'mid' ? 'Mid Level (2-5 years)' : 
                         request.experienceLevel === 'senior' ? 'Senior Level (5-10 years)' : 
                         request.experienceLevel === 'lead' ? 'Lead/Principal (10+ years)' : request.experienceLevel}
                      </p>
                    </div>
                  )}
                  
                  {request.atsScore && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">ATS Score</p>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          request.atsScore >= 85 ? 'bg-green-500' : 
                          request.atsScore >= 75 ? 'bg-blue-500' : 
                          request.atsScore >= 65 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className={`text-sm font-bold ${
                          request.atsScore >= 85 ? 'text-green-600' : 
                          request.atsScore >= 75 ? 'text-blue-600' : 
                          request.atsScore >= 65 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {request.atsScore}%
                        </span>
                        {request.atsCompatibility && (
                          <span className="text-xs text-gray-500">({request.atsCompatibility})</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => onViewRequest(request)}
                      className="w-full sm:w-auto"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {request.resumeUrl ? (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full sm:w-auto bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                        onClick={() => {
                          const downloadResume = async (resumeUrl: string, fullName: string) => {
                            if (!resumeUrl) return;
                            try {
                              const response = await fetch(resumeUrl);
                              if (!response.ok) throw new Error('Network response was not ok');
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              
                              let filename = 'resume_file';
                              try {
                                const decodedUrl = decodeURIComponent(resumeUrl);
                                const pathParts = decodedUrl.split('/');
                                const fileWithParams = pathParts[pathParts.length - 1];
                                filename = fileWithParams.split('?')[0];
                              } catch (e) {
                                filename = `${fullName || 'resume'}_original`;
                              }
                              
                              if (!filename.includes('.')) {
                                filename += '.pdf';
                              }
                              
                              link.setAttribute('download', filename);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error("Download failed:", error);
                              window.open(resumeUrl, '_blank');
                            }
                          };
                          downloadResume(request.resumeUrl, request.fullName || request.seekerName);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download Resume
                      </Button>
                    ) : request.resumeText && (
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full sm:w-auto bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                        onClick={() => {
                          // Create a downloadable text file from resume text
                          const resumeContent = request.resumeText || '';
                          const blob = new Blob([resumeContent], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `${request.fullName || request.seekerName || 'Resume'}_Resume.txt`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download Resume (Text)
                      </Button>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Submitted {request.createdAt ? new Date(request.createdAt.toDate()).toLocaleDateString() : "Recently"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )) : (
          <div className="text-center py-12 md:py-16">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-full p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <MessageCircle className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No requests yet
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Referral requests will appear here when candidates apply to your job postings. Share your job postings to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function EditJobForm({ job, onClose, onSave }: { job: any, onClose: () => void, onSave: () => void }) {
  const { updateJob } = useJobPostings();
  const [formData, setFormData] = useState({
    title: job?.title || "",
    company: job?.company || "",
    location: job?.location || "",
    description: job?.description || "",
    requirements: job?.requirements || "",
    salary: job?.salary || "",
    isActive: job?.isActive || true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateJob(job.id, formData);
      onSave();
    } catch (error) {
      console.error("Error updating job:", error);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="title">Job Title</Label>
        <Input 
          id="title" 
          value={formData.title}
          onChange={(e) => handleChange("title", e.target.value)}
          placeholder="e.g. Senior Frontend Developer" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="company">Company</Label>
          <Input 
            id="company" 
            value={formData.company}
            onChange={(e) => handleChange("company", e.target.value)}
            placeholder="e.g. TechCorp Inc" 
          />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input 
            id="location" 
            value={formData.location}
            onChange={(e) => handleChange("location", e.target.value)}
            placeholder="e.g. San Francisco, CA" 
          />
        </div>
      </div>

      <div>
        <Label htmlFor="salary">Salary Range</Label>
        <Input 
          id="salary" 
          value={formData.salary}
          onChange={(e) => handleChange("salary", e.target.value)}
          placeholder="e.g. $120k - $160k" 
        />
      </div>

      <div>
        <Label htmlFor="description">Job Description</Label>
        <Textarea 
          id="description" 
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          placeholder="Describe the role, responsibilities, and what makes it exciting..." 
          rows={4} 
        />
      </div>

      <div>
        <Label htmlFor="requirements">Requirements</Label>
        <Textarea 
          id="requirements" 
          value={formData.requirements}
          onChange={(e) => handleChange("requirements", e.target.value)}
          placeholder="List required skills, experience, and qualifications..." 
          rows={3} 
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isActive"
          checked={formData.isActive}
          onChange={(e) => handleChange("isActive", e.target.checked)}
          className="rounded"
        />
        <Label htmlFor="isActive">Active Job Posting</Label>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit">Update Job</Button>
      </div>
    </form>
  );
}

function AnalyticsSection({ jobs, requests, stats }: { jobs: any[], requests: any[], stats: any }) {
  console.log("Analytics Section - Jobs:", jobs?.length || 0, "Requests:", requests?.length || 0, "Stats:", stats);
  
  // Check if we have data to display
  if (!jobs || !requests || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }
  
  // Generate real-time data for charts from actual requests
  const generateTrendData = () => {
    if (requests.length === 0) {
      // Show empty state if no requests
      return [
        { name: 'Current Month', applications: 0, accepted: 0, rejected: 0, pending: 0 }
      ];
    }

    // Group requests by month
    const monthlyData: Record<string, { applications: number, accepted: number, rejected: number, pending: number }> = {};
    
    requests.forEach(request => {
      const date = new Date(request.createdAt || Date.now());
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { applications: 0, accepted: 0, rejected: 0, pending: 0 };
      }
      
      monthlyData[monthKey].applications++;
      
      if (request.status === 'accepted') {
        monthlyData[monthKey].accepted++;
      } else if (request.status === 'rejected') {
        monthlyData[monthKey].rejected++;
      } else {
        monthlyData[monthKey].pending++;
      }
    });

    // Convert to array and sort by date
    const trendData = Object.entries(monthlyData).map(([name, data]) => ({
      name,
      ...data
    }));

    // Ensure we have at least current month
    if (trendData.length === 0) {
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      trendData.push({ name: currentMonth, applications: 0, accepted: 0, rejected: 0, pending: 0 });
    }

    return trendData.slice(-6); // Show last 6 months
  };

  const applicationTrendData = generateTrendData();

  // Calculate real-time metrics
  const calculateResponseTime = () => {
    const respondedRequests = requests.filter(r => r.status !== 'pending' && r.updatedAt);
    if (respondedRequests.length === 0) return "N/A";
    
    const avgTime = respondedRequests.reduce((sum, req) => {
      const created = new Date(req.createdAt || Date.now());
      const updated = new Date(req.updatedAt || Date.now());
      return sum + (updated.getTime() - created.getTime());
    }, 0) / respondedRequests.length;
    
    const days = Math.round(avgTime / (1000 * 60 * 60 * 24) * 10) / 10;
    return days > 0 ? `${days} days` : "Same day";
  };

  const avgResponseTime = calculateResponseTime();
  const totalApplications = requests.length;
  const successRate = totalApplications > 0 ? Math.round((requests.filter(r => r.status === 'accepted').length / totalApplications) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Select defaultValue="6months">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="1year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalApplications}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {totalApplications > 0 ? "Real-time data" : "No applications yet"}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{successRate}%</p>
                <p className="text-xs text-gray-600 mt-1">
                  {requests.filter(r => r.status === 'accepted').length} accepted applications
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgResponseTime}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {requests.filter(r => r.status !== 'pending').length} responded
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Job Posts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activePosts}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {jobs.filter(j => j.isActive).length} currently active
                </p>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-2 rounded-lg">
                <Briefcase className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Application Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Application Trends
            </CardTitle>
            <CardDescription>Monthly application activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={applicationTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="applications" stroke="#3B82F6" strokeWidth={2} />
                  <Line type="monotone" dataKey="accepted" stroke="#22C55E" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Job Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Job Performance
            </CardTitle>
            <CardDescription>Applications by job posting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {jobs.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={jobs.map(job => ({
                    name: job.title.substring(0, 15) + '...',
                    applications: requests.filter(r => r.jobPostingId === job.id).length,
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="applications" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No job postings yet</p>
                  <p className="text-sm">Create your first job to see analytics</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Job Performance Details
          </CardTitle>
          <CardDescription>Performance metrics for each job posting</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Job Title</th>
                    <th className="text-left py-2">Company</th>
                    <th className="text-left py-2">Applications</th>
                    <th className="text-left py-2">Accepted</th>
                    <th className="text-left py-2">Success Rate</th>
                    <th className="text-left py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => {
                    const jobRequests = requests.filter(r => r.jobPostingId === job.id);
                    const acceptedCount = jobRequests.filter(r => r.status === 'accepted').length;
                    const successRate = jobRequests.length > 0 ? Math.round((acceptedCount / jobRequests.length) * 100) : 0;
                    
                    return (
                      <tr key={job.id} className="border-b">
                        <td className="py-2 font-medium">{job.title}</td>
                        <td className="py-2">{job.company}</td>
                        <td className="py-2">{jobRequests.length}</td>
                        <td className="py-2">{acceptedCount}</td>
                        <td className="py-2">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            successRate >= 80 ? 'bg-green-100 text-green-800' :
                            successRate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {successRate}%
                          </span>
                        </td>
                        <td className="py-2">
                          <Badge variant={job.isActive ? "default" : "secondary"}>
                            {job.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No analytics data available</p>
              <p className="text-sm">Create job postings to see detailed analytics</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}





// Achievements Section with Real-Time Gamification
function AchievementsSection({ stats, user, toast }: { stats: any, user: any, toast: any }) {
  return (
    <div className="space-y-6">
      <RealTimeGamification 
        userId={user?.uid || ""} 
        onRewardEarned={(reward) => {
          // Achievement earned - no toast notification
          console.log("Achievement earned:", reward.title, reward.description);
        }}
      />
    </div>
  );
}

// Earnings Section
function EarningsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings Dashboard</h2>
        <Badge className="bg-blue-100 text-blue-800">Coming Soon</Badge>
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
              <IndianRupee className="h-12 w-12 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold">Earnings Feature Coming Soon!</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Track your referral bonuses, view payment history, and manage your rewards.
            </p>
            <Button variant="outline" className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              Notify Me When Available
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mentorship Section - Temporarily disabled for phased launch
interface MentorshipSectionProps {
  user: any;
  isMentorAccountSetupOpen: boolean;
  setIsMentorAccountSetupOpen: (open: boolean) => void;
  isDualPaymentSetupOpen: boolean;
  setIsDualPaymentSetupOpen: (open: boolean) => void;
}

function MentorshipSection({ user, isMentorAccountSetupOpen, setIsMentorAccountSetupOpen, isDualPaymentSetupOpen, setIsDualPaymentSetupOpen }: MentorshipSectionProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Mentorship Platform</h2>
        <ComingSoonBadge feature="Coming Soon" variant="sparkle" size="lg" />
      </div>

      <Card>
        <CardContent className="p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
              <Users className="h-12 w-12 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold">Mentorship Feature Coming Soon!</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Offer paid mentorship sessions with video calls, payment integration, and scheduling. 
              Earn extra income by sharing your expertise!
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Video className="h-4 w-4" />
                <span>Video Call Integration</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <CreditCard className="h-4 w-4" />
                <span>Payment Processing</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Calendar className="h-4 w-4" />
                <span>Session Scheduling</span>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <Bell className="h-4 w-4 mr-2" />
              Notify Me When Available
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
