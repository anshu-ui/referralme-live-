import { useState } from "react";
import { Link } from "wouter";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, IndianRupee, Calendar, CircleDot, Settings, User, ListChecks, ChevronDown, ChevronUp, Brain } from "lucide-react";
import ReferralRequestModal from "../components/referral-request-modal";
import ApplicationTracker from "../components/application-tracker";
import ResumeAnalysisHistory from "../components/resume-analysis-history";
import { motion, AnimatePresence } from "framer-motion";

export default function SeekerDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [selectedReferral, setSelectedReferral] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTrackerOpen, setIsTrackerOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<number>>(new Set());

  // Fetch available referrals
  const { data: referrals = [], isLoading: referralsLoading } = useQuery({
    queryKey: ["/api/job-postings", { 
      search: searchQuery || undefined, 
      company: companyFilter === "all" ? undefined : companyFilter, 
      location: locationFilter === "all" ? undefined : locationFilter 
    }],
    retry: false,
  });

  // Fetch my requests
  const { data: myRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ["/api/referral-requests/my"],
    retry: false,
  });

  const handleRequestReferral = (referral: any) => {
    setSelectedReferral(referral);
    setIsModalOpen(true);
  };

  const toggleJobExpanded = (jobId: number) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Under Review</Badge>;
      case 'accepted':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Accepted</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-800">Rejected</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "Posted yesterday";
    if (diffDays < 7) return `Posted ${diffDays} days ago`;
    if (diffDays < 30) return `Posted ${Math.ceil(diffDays / 7)} weeks ago`;
    return `Posted ${Math.ceil(diffDays / 30)} months ago`;
  };

  return (
    <div>
      <div className="mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Find Your Next Opportunity</h2>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button
              onClick={() => setIsTrackerOpen(true)}
              className="bg-primary hover:bg-blue-700 text-white flex-1 md:flex-initial"
              data-testid="button-track-applications"
            >
              <ListChecks className="h-4 w-4 mr-2" />
              Track Applications
            </Button>
            <Button
              onClick={() => setIsHistoryOpen(true)}
              variant="outline"
              className="flex-1 md:flex-initial border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50"
              data-testid="button-resume-history"
            >
              <Brain className="h-4 w-4 mr-2" />
              Resume Analysis
            </Button>
            <Link href="/profile-edit" className="flex-1 md:flex-initial">
              <Button variant="outline" size="default" className="w-full">
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Search and Filter Bar */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Jobs</label>
                <div className="relative">
                  <Input
                    type="text"
                    className="pl-10"
                    placeholder="Software Engineer, Product Manager..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                <Select value={companyFilter} onValueChange={setCompanyFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    <SelectItem value="Google">Google</SelectItem>
                    <SelectItem value="Meta">Meta</SelectItem>
                    <SelectItem value="Amazon">Amazon</SelectItem>
                    <SelectItem value="Microsoft">Microsoft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Locations" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="San Francisco">San Francisco</SelectItem>
                    <SelectItem value="New York">New York</SelectItem>
                    <SelectItem value="Seattle">Seattle</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Referrals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {referralsLoading ? (
          <div className="col-span-2 text-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">Loading referrals...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="col-span-2 text-center py-8 text-gray-600">
            No referrals found. Try adjusting your search criteria.
          </div>
        ) : (
          referrals.map((referral: any) => (
            <Card key={referral.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl font-bold text-primary">
                        {referral.company?.[0]?.toUpperCase() || 'C'}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{referral.title}</h3>
                      <p className="text-sm text-gray-600">{referral.company}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    <CircleDot className="w-3 h-3 mr-1" />
                    Active
                  </Badge>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{referral.location}</span>
                  </div>
                  {referral.salary && (
                    <div className="flex items-center text-sm text-gray-600">
                      <IndianRupee className="w-4 h-4 mr-2" />
                      <span>{referral.salary?.replace(/\$/g, '₹')}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{formatDate(referral.createdAt)}</span>
                  </div>
                </div>

                {/* Expandable Job Description */}
                <div className="mb-4">
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Job Description</h4>
                    <AnimatePresence mode="wait">
                      {expandedJobs.has(referral.id) ? (
                        <motion.div
                          key="expanded"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {referral.description || "No description provided."}
                          </p>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="collapsed"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <p className="text-sm text-gray-700 line-clamp-2 leading-relaxed">
                            {referral.description || "No description provided."}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Always show Read More button */}
                    <button
                      onClick={() => toggleJobExpanded(referral.id)}
                      className="mt-3 text-sm text-white bg-primary hover:bg-blue-700 font-medium px-4 py-2 rounded-md flex items-center gap-1 transition-all w-full justify-center"
                      data-testid={`button-toggle-description-${referral.id}`}
                    >
                      {expandedJobs.has(referral.id) ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Show Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Read More About This Job
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {referral.referrer?.profileImageUrl ? (
                      <img 
                        className="h-6 w-6 rounded-full object-cover" 
                        src={referral.referrer.profileImageUrl} 
                        alt="Referrer" 
                      />
                    ) : (
                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {referral.referrer?.firstName?.[0] || referral.referrer?.email?.[0] || 'R'}
                        </span>
                      </div>
                    )}
                    <span className="text-sm text-gray-600">
                      {referral.referrer?.firstName} {referral.referrer?.lastName} 
                      {!referral.referrer?.firstName && referral.referrer?.email}
                    </span>
                  </div>
                  <Button 
                    className="bg-primary text-white hover:bg-blue-700"
                    onClick={() => handleRequestReferral(referral)}
                  >
                    Request Referral
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* My Requests Status */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">My Referral Requests</h3>
          </div>
          {requestsLoading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Loading requests...</p>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="p-6 text-center text-gray-600">
              No referral requests yet. Start by requesting referrals for positions that interest you!
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {myRequests.map((request: any) => (
                <div key={request.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {request.jobPosting?.title} - {request.jobPosting?.company}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Referrer: {request.jobPosting?.referrer?.firstName} {request.jobPosting?.referrer?.lastName}
                        {!request.jobPosting?.referrer?.firstName && request.jobPosting?.referrer?.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        Submitted {formatDate(request.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(request.status)}
                      <p className="text-xs text-gray-500 mt-1">
                        {request.status === 'pending' && "Expected response in 2-3 days"}
                        {request.status === 'accepted' && "Referral submitted to company"}
                        {request.status === 'rejected' && "Request was declined"}
                        {request.status === 'completed' && "Process completed"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Referral Request Modal */}
      <ReferralRequestModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        referral={selectedReferral}
      />

      {/* Application Tracker Modal */}
      <ApplicationTracker
        isOpen={isTrackerOpen}
        onClose={() => setIsTrackerOpen(false)}
      />

      {/* Resume Analysis History Modal */}
      <ResumeAnalysisHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
