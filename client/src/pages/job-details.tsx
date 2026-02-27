import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { getJobPosting, getUserProfile } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import ApplicationFormModal from "../components/application-form-modal";

import { 
  ArrowLeft, MapPin, IndianRupee, Calendar, Users, Clock, 
  Building, Star, Share2, Bookmark, Send, Edit, Trash2,
  Eye, MessageCircle, ExternalLink, Briefcase, Target,
  Loader2, LogIn
} from "lucide-react";


interface JobDetailsProps {
  jobId?: string;
}

export default function JobDetails({ jobId }: JobDetailsProps) {
  const [, setLocation] = useLocation();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [jobData, setJobData] = useState<any>(null);
  const [referrerData, setReferrerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const { user, firebaseUser } = useFirebaseAuth();
  const { toast } = useToast();

  useEffect(() => {
    const loadJobData = async () => {
      if (!jobId) {
        setIsLoading(false);
        return;
      }

      try {
        const job = await getJobPosting(jobId);
        if (job) {
          setJobData(job);
          
          // Load referrer profile data if available
          if (job.referrerId) {
            const referrerProfile = await getUserProfile(job.referrerId);
            setReferrerData(referrerProfile);
          }
        } else {
          toast({
            title: "Job not found",
            description: "The job posting you're looking for doesn't exist or has been removed.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error loading job data:", error);
        toast({
          title: "Error loading job",
          description: "Failed to load job details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadJobData();
  }, [jobId, toast]);

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link copied!",
        description: "Job link has been copied to clipboard.",
      });
    });
  };

  const handleApply = () => {
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
    setIsApplicationModalOpen(true);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading job details...</span>
        </div>
      </div>
    );
  }

  // Show error state if job not found
  if (!jobData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-4">The job posting you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => setLocation("/")}>
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/")}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
                data-testid="button-back-dashboard"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Back to Dashboard</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Separator orientation="vertical" className="h-4 sm:h-6" />
              <div className="flex items-center gap-1 sm:gap-2">
                <img src={"/logo.png"} alt="ReferralMe" className="h-6 w-6 sm:h-8 sm:w-8" />
                <span className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">ReferralMe</span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleShare}
                className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                data-testid="button-share-job"
              >
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                Share
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleBookmark}
                className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm"
                data-testid="button-bookmark-job"
              >
                <Bookmark className={`h-3 w-3 sm:h-4 sm:w-4 ${isBookmarked ? "fill-current" : ""}`} />
                <span className="hidden sm:inline">{isBookmarked ? "Saved" : "Save"}</span>
                <span className="sm:hidden">{isBookmarked ? "Saved" : "Save"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Job Header */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg sm:text-xl lg:text-2xl break-words">{jobData.title}</CardTitle>
                      <CardDescription className="text-sm sm:text-base lg:text-lg mt-1 break-words">
                        {jobData.company} • {jobData.location}
                      </CardDescription>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-3">
                        <Badge variant="default" className="text-xs sm:text-sm">
                          {jobData.jobType || jobData.type || 'Full-time'}
                        </Badge>
                        <Badge variant="outline" className="text-xs sm:text-sm">{jobData.experienceLevel || jobData.experience}</Badge>
                        <Badge variant="outline" className="text-xs sm:text-sm">Active</Badge>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-6">
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <IndianRupee className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    <span className="break-words">
                      {jobData.salaryMin && jobData.salaryMax 
                        ? `₹${jobData.salaryMin} - ₹${jobData.salaryMax}`
                        : jobData.salary || 'Competitive salary'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                    <span className="break-words">{jobData.experienceLevel || jobData.experience || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                    <span className="break-words">
                      Posted {jobData.createdAt ? 
                        new Date(jobData.createdAt.seconds * 1000).toLocaleDateString() : 
                        'Recently'}
                    </span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Job Details Tabs */}
            <Tabs defaultValue="description" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="description" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Description</TabsTrigger>
                <TabsTrigger value="requirements" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Requirements</TabsTrigger>
                <TabsTrigger value="benefits" className="text-xs sm:text-sm px-2 sm:px-4 py-2">Benefits</TabsTrigger>
              </TabsList>
              
              <TabsContent value="description">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Description</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                        {jobData.description}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="requirements">
                <Card>
                  <CardHeader>
                    <CardTitle>Requirements & Skills</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Requirements</h4>
                      <div className="prose dark:prose-invert max-w-none">
                        <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                          {jobData.requirements || 'No specific requirements listed.'}
                        </div>
                      </div>
                    </div>
                    
                    {jobData.niceToHave && (
                      <div>
                        <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Nice to Have</h4>
                        <div className="prose dark:prose-invert max-w-none">
                          <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                            {jobData.niceToHave}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {jobData.skills && jobData.skills.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(jobData.skills) ? jobData.skills : jobData.skills.split(',').map((s: string) => s.trim())).map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="benefits">
                <Card>
                  <CardHeader>
                    <CardTitle>Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {jobData.niceToHave ? (
                      <div>
                        <h4 className="font-semibold mb-3 text-gray-900 dark:text-white">Nice to Have</h4>
                        <div className="prose dark:prose-invert max-w-none">
                          <div className="whitespace-pre-line text-gray-700 dark:text-gray-300">
                            {jobData.niceToHave}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-500">Additional benefits and information will be shared during the application process.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6">
            {/* Apply Section */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg sm:text-xl">Apply for this Position</CardTitle>
                <CardDescription className="text-sm sm:text-base">
                  Get referred through ReferralMe
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <Button 
                  onClick={handleApply} 
                  className="w-full text-sm sm:text-base" 
                  size="lg"
                  data-testid="button-apply-job"
                >
                  {!firebaseUser ? (
                    <>
                      <LogIn className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Sign in to Apply</span>
                      <span className="sm:hidden">Sign in</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Request Referral</span>
                      <span className="sm:hidden">Apply</span>
                    </>
                  )}
                </Button>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    {jobData.createdAt ? `Posted ${new Date(jobData.createdAt.seconds * 1000).toLocaleDateString()}` : 'Recently posted'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Referrer Info */}
            {referrerData && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Referrer</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <Avatar>
                      <AvatarImage src={referrerData.profileImageUrl || referrerData.photoURL} />
                      <AvatarFallback>
                        {referrerData.firstName?.charAt(0) || referrerData.displayName?.charAt(0) || referrerData.email?.charAt(0) || "R"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {referrerData.firstName && referrerData.lastName 
                          ? `${referrerData.firstName} ${referrerData.lastName}`
                          : referrerData.displayName || "Referrer"}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {referrerData.jobTitle || referrerData.bio || "Professional Referrer"}
                      </p>
                      {referrerData.company && (
                        <p className="text-xs text-gray-500 mt-1">
                          at {referrerData.company}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Job Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Job Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Posted</span>
                  <span className="text-sm font-semibold">
                    {jobData.createdAt ? 
                      new Date(jobData.createdAt.seconds * 1000).toLocaleDateString() : 
                      'Recently'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <span className="text-sm font-semibold text-green-600">
                    {jobData.isActive ? 'Active' : 'Closed'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Job Type</span>
                  <span className="text-sm font-semibold">{jobData.jobType || 'Full-time'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      <ApplicationFormModal
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        job={jobData}
        onApplicationSubmitted={() => {
          setIsApplicationModalOpen(false);
          toast({
            title: "Application Submitted!",
            description: "Your referral request has been submitted successfully.",
          });
        }}
      />
    </div>
  );
}