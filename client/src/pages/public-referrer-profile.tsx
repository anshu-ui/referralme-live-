import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { getUserProfile, getJobPostingsByReferrer } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import ApplicationFormModal from "../components/application-form-modal";

import { 
  ArrowLeft, MapPin, DollarSign, Calendar, Users, Clock, 
  Building, Star, Share2, Bookmark, Send, Edit, Trash2,
  Eye, MessageCircle, ExternalLink, Briefcase, Target,
  Loader2, LogIn, Linkedin, Github, Globe, Trophy, Crown, Shield, Award
} from "lucide-react";

interface PublicReferrerProfileProps {
  referrerId?: string;
}

const REPUTATION_CONFIG = {
  newcomer: { 
    label: 'Newcomer', 
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300', 
    icon: Users 
  },
  helper: { 
    label: 'Helper', 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', 
    icon: Shield 
  },
  expert: { 
    label: 'Expert', 
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', 
    icon: Award 
  },
  legend: { 
    label: 'Legend', 
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', 
    icon: Crown 
  }
};

export default function PublicReferrerProfile({ referrerId }: PublicReferrerProfileProps) {
  const [, setLocation] = useLocation();
  const [referrerData, setReferrerData] = useState<any>(null);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const { user, firebaseUser } = useFirebaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadReferrerData = async () => {
      if (!referrerId) {
        setIsLoading(false);
        return;
      }

      try {
        // Load referrer profile data
        const profile = await getUserProfile(referrerId);
        if (profile) {
          setReferrerData(profile);
          
          // Load their job postings
          const jobs = await getJobPostingsByReferrer(referrerId);
          const activeJobs = jobs.filter(job => job.isActive);
          setJobPostings(activeJobs);
        } else {
          toast({
            title: "Referrer not found",
            description: "The referrer profile you're looking for doesn't exist.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error loading referrer data:", error);
        toast({
          title: "Error loading profile",
          description: "Failed to load referrer profile. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReferrerData();
  }, [referrerId, toast]);

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Referrer profile link has been copied to clipboard.",
      });
    }).catch(() => {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      toast({
        title: "Link copied!",
        description: "Referrer profile link has been copied to clipboard.",
      });
    });
  };

  const handleApplyToJob = (job: any) => {
    // Check if user is authenticated
    if (!firebaseUser) {
      toast({
        title: "Login required",
        description: "Please sign in to apply for this job.",
        variant: "destructive"
      });
      // Redirect to landing page with return URL
      const returnUrl = encodeURIComponent(window.location.pathname);
      setLocation(`/?returnTo=${returnUrl}`);
      return;
    }

    // Check if user has a role
    if (!user?.role) {
      toast({
        title: "Profile setup required",
        description: "Please complete your profile setup to apply.",
        variant: "destructive"
      });
      setLocation("/role-selection");
      return;
    }

    // Open application modal
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  const handleViewJobDetails = (jobId: string) => {
    setLocation(`/job/${jobId}`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading referrer profile...</span>
        </div>
      </div>
    );
  }

  // Show error state if referrer not found
  if (!referrerData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Referrer Not Found</h1>
          <p className="text-gray-600 mb-4">The referrer profile you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/")}>
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  const reputationLevel = (referrerData.reputationLevel as keyof typeof REPUTATION_CONFIG) || 'newcomer';
  const reputationConfig = REPUTATION_CONFIG[reputationLevel];
  const ReputationIcon = reputationConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/")}
                className="flex items-center gap-1 sm:gap-2"
                data-testid="button-back-home"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="flex items-center gap-2">
                <img src={"/logo.png"} alt="ReferralMe" className="h-6 w-6 sm:h-8 sm:w-8" />
                <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">ReferralMe</span>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                data-testid="button-share-profile"
              >
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Share Profile</span>
                <span className="sm:hidden">Share</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    <Avatar className="h-16 w-16 sm:h-20 sm:w-20 mx-auto sm:mx-0">
                      <AvatarImage src={referrerData.profileImageUrl || referrerData.photoURL} />
                      <AvatarFallback className="text-lg sm:text-xl">
                        {referrerData.firstName?.charAt(0) || referrerData.displayName?.charAt(0) || referrerData.email?.charAt(0) || "R"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-center sm:text-left">
                      <CardTitle className="text-xl sm:text-2xl lg:text-3xl">
                        {referrerData.firstName && referrerData.lastName 
                          ? `${referrerData.firstName} ${referrerData.lastName}`
                          : referrerData.displayName || "Professional Referrer"}
                      </CardTitle>
                      <CardDescription className="text-base sm:text-lg mt-1">
                        {referrerData.designation && referrerData.company 
                          ? `${referrerData.designation} at ${referrerData.company}`
                          : referrerData.designation || referrerData.company || "Professional"}
                      </CardDescription>
                      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 mt-3">
                        <Badge className={`${reputationConfig.color} flex items-center gap-1 text-xs sm:text-sm`}>
                          <ReputationIcon className="h-3 w-3" />
                          {reputationConfig.label}
                        </Badge>
                        {referrerData.location && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                            {referrerData.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              {referrerData.bio && (
                <CardContent>
                  <p className="text-gray-700 dark:text-gray-300">{referrerData.bio}</p>
                </CardContent>
              )}
            </Card>

            {/* Social Links */}
            {(referrerData.linkedinUrl || referrerData.githubUrl || referrerData.websiteUrl) && (
              <Card>
                <CardHeader>
                  <CardTitle>Connect with {referrerData.firstName || "them"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                    {referrerData.linkedinUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(referrerData.linkedinUrl, '_blank')}
                        className="flex items-center justify-center gap-2 text-xs sm:text-sm"
                        data-testid="button-linkedin"
                      >
                        <Linkedin className="h-3 w-3 sm:h-4 sm:w-4" />
                        LinkedIn
                      </Button>
                    )}
                    {referrerData.githubUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(referrerData.githubUrl, '_blank')}
                        className="flex items-center justify-center gap-2 text-xs sm:text-sm"
                        data-testid="button-github"
                      >
                        <Github className="h-3 w-3 sm:h-4 sm:w-4" />
                        GitHub
                      </Button>
                    )}
                    {referrerData.websiteUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(referrerData.websiteUrl, '_blank')}
                        className="flex items-center justify-center gap-2 text-xs sm:text-sm"
                        data-testid="button-website"
                      >
                        <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                        Website
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Postings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Current Job Openings ({jobPostings.length})
                </CardTitle>
                <CardDescription>
                  Apply for these positions and get referred by {referrerData.firstName || "this professional"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobPostings.length > 0 ? (
                  <div className="space-y-4">
                    {jobPostings.map((job) => (
                      <div key={job.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg sm:text-xl">{job.title}</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">{job.company} • {job.location}</p>
                            {job.description && (
                              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                                {job.description.substring(0, 150)}...
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-3 text-sm">
                              {job.salaryMin && job.salaryMax && (
                                <div className="flex items-center gap-1 text-green-600">
                                  <DollarSign className="h-4 w-4" />
                                  ₹{job.salaryMin} - ₹{job.salaryMax}
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-orange-600">
                                <Clock className="h-4 w-4" />
                                {job.experienceLevel || 'Not specified'}
                              </div>
                              <div className="flex items-center gap-1 text-blue-600">
                                <Calendar className="h-4 w-4" />
                                Posted {job.createdAt ? 
                                  new Date(job.createdAt.seconds * 1000).toLocaleDateString() : 
                                  'Recently'}
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-col gap-2 sm:ml-4 w-full sm:w-auto">
                            <Button 
                              onClick={() => handleApplyToJob(job)}
                              size="sm"
                              data-testid={`button-apply-job-${job.id}`}
                              className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                              {!firebaseUser ? (
                                <>
                                  <LogIn className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Sign in to Apply</span>
                                  <span className="sm:hidden">Sign in</span>
                                </>
                              ) : (
                                <>
                                  <Send className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Request Referral</span>
                                  <span className="sm:hidden">Apply</span>
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline"
                              onClick={() => handleViewJobDetails(job.id)}
                              size="sm"
                              data-testid={`button-view-job-${job.id}`}
                              className="w-full sm:w-auto text-xs sm:text-sm"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">View Details</span>
                              <span className="sm:hidden">Details</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No active job openings at the moment.</p>
                    <p className="text-sm text-gray-400 mt-1">Check back later for new opportunities!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Stats & Info */}
          <div className="space-y-6">
            {/* Referrer Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Referrer Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {jobPostings.length}
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Active Job Postings</div>
                </div>
                
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {referrerData.experience || 'Professional'}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Experience Level</div>
                </div>

                {referrerData.skills && (
                  <div>
                    <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(referrerData.skills) ? referrerData.skills : JSON.parse(referrerData.skills || '[]')).slice(0, 6).map((skill: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>Get Referred</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connect with {referrerData.firstName || "this referrer"} to get referred to amazing job opportunities.
                  </p>
                  <div className="text-xs text-gray-500">
                    Joined {referrerData.createdAt ? 
                      new Date(referrerData.createdAt.seconds * 1000).getFullYear() : 
                      'Recently'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Application Modal */}
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
              title: "Application Submitted!",
              description: "Your referral request has been submitted successfully.",
            });
          }}
        />
      )}
    </div>
  );
}