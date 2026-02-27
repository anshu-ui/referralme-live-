import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Button } from "./ui/button";
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Building2, 
  Clock,
  CheckCircle2,
  XCircle,
  Clock4,
  Send,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

interface ApplicationTrackerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApplicationTracker({ isOpen, onClose }: ApplicationTrackerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch my applications/referral requests
  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["/api/referral-requests/my"],
    retry: false,
  });

  // Filter applications based on search and status
  const filteredApplications = applications.filter((app: any) => {
    const matchesSearch = searchQuery === "" || 
      app.jobPosting?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobPosting?.company?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || app.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: applications.length,
    pending: applications.filter((app: any) => app.status === "pending").length,
    accepted: applications.filter((app: any) => app.status === "accepted" || app.status === "sent_to_hr").length,
    interview: applications.filter((app: any) => 
      app.status === "interview_scheduled" || app.status === "interview_completed"
    ).length,
    rejected: applications.filter((app: any) => app.status === "rejected").length,
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: "Under Review",
          color: "bg-yellow-100 text-yellow-800 border-yellow-200",
          icon: <Clock4 className="w-4 h-4" />,
          description: "Referrer is reviewing your application"
        };
      case 'under_review':
        return {
          label: "Under Review",
          color: "bg-blue-100 text-blue-800 border-blue-200",
          icon: <Clock className="w-4 h-4" />,
          description: "Application being evaluated"
        };
      case 'accepted':
        return {
          label: "Accepted",
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <CheckCircle2 className="w-4 h-4" />,
          description: "Referral accepted! Next steps coming soon"
        };
      case 'sent_to_hr':
        return {
          label: "Sent to HR",
          color: "bg-purple-100 text-purple-800 border-purple-200",
          icon: <Send className="w-4 h-4" />,
          description: "Your application has been forwarded to HR"
        };
      case 'interview_scheduled':
        return {
          label: "Interview Scheduled",
          color: "bg-indigo-100 text-indigo-800 border-indigo-200",
          icon: <Calendar className="w-4 h-4" />,
          description: "Interview scheduled - prepare well!"
        };
      case 'interview_completed':
        return {
          label: "Interview Done",
          color: "bg-teal-100 text-teal-800 border-teal-200",
          icon: <CheckCircle2 className="w-4 h-4" />,
          description: "Interview completed - awaiting feedback"
        };
      case 'rejected':
        return {
          label: "Declined",
          color: "bg-red-100 text-red-800 border-red-200",
          icon: <XCircle className="w-4 h-4" />,
          description: "Not selected this time - keep trying!"
        };
      case 'completed':
        return {
          label: "Completed",
          color: "bg-green-100 text-green-800 border-green-200",
          icon: <CheckCircle2 className="w-4 h-4" />,
          description: "Application process completed"
        };
      default:
        return {
          label: status,
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: <Clock className="w-4 h-4" />,
          description: ""
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const getDaysAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl font-bold">Application Tracker</DialogTitle>
          <DialogDescription>
            Track all your job applications in one place
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-2 border-gray-200 hover:border-primary/50 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <BarChart3 className="w-8 h-8 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="border-2 border-yellow-200 hover:border-yellow-400 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-yellow-700 mb-1">Pending</p>
                      <p className="text-2xl font-bold text-yellow-800">{stats.pending}</p>
                    </div>
                    <Clock4 className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-2 border-green-200 hover:border-green-400 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-green-700 mb-1">Accepted</p>
                      <p className="text-2xl font-bold text-green-800">{stats.accepted}</p>
                    </div>
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-2 border-purple-200 hover:border-purple-400 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-purple-700 mb-1">Interview</p>
                      <p className="text-2xl font-bold text-purple-800">{stats.interview}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card className="border-2 border-red-200 hover:border-red-400 transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-700 mb-1">Declined</p>
                      <p className="text-2xl font-bold text-red-800">{stats.rejected}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Search and Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by job title or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-application-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger data-testid="select-status-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="sent_to_hr">Sent to HR</SelectItem>
                <SelectItem value="interview_scheduled">Interview Scheduled</SelectItem>
                <SelectItem value="rejected">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications List */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No applications found</p>
              <p className="text-sm text-gray-500">
                {searchQuery || statusFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Start applying to jobs to see them here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredApplications.map((app: any, index: number) => {
                  const statusInfo = getStatusInfo(app.status);
                  const daysAgo = getDaysAgo(app.createdAt);

                  return (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <Card className="hover:shadow-lg transition-all border-2 hover:border-primary/30">
                        <CardContent className="p-4 md:p-6">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Building2 className="w-6 h-6 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-lg font-semibold text-gray-900 truncate">
                                    {app.jobPosting?.title || "Position"}
                                  </h4>
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Building2 className="w-3 h-3" />
                                    {app.jobPosting?.company || "Company"}
                                  </p>
                                  {app.jobPosting?.location && (
                                    <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                      <MapPin className="w-3 h-3" />
                                      {app.jobPosting.location}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Applied {formatDate(app.createdAt)}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span>{daysAgo} {daysAgo === 1 ? 'day' : 'days'} ago</span>
                                {app.atsScore && (
                                  <>
                                    <span className="text-gray-300">•</span>
                                    <span className="flex items-center gap-1">
                                      ATS Score: <strong className="text-primary">{app.atsScore}%</strong>
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex md:flex-col items-start md:items-end gap-2 md:min-w-[180px]">
                              <Badge className={`${statusInfo.color} border flex items-center gap-1.5 px-3 py-1.5`}>
                                {statusInfo.icon}
                                {statusInfo.label}
                              </Badge>
                              {statusInfo.description && (
                                <p className="text-xs text-gray-500 text-right hidden md:block">
                                  {statusInfo.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Mobile description */}
                          {statusInfo.description && (
                            <p className="text-xs text-gray-500 mt-2 md:hidden">
                              {statusInfo.description}
                            </p>
                          )}

                          {app.interviewDate && (
                            <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <p className="text-sm font-medium text-purple-900 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Interview: {formatDate(app.interviewDate)}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t bg-gray-50">
          <Button
            onClick={onClose}
            className="w-full md:w-auto"
            variant="outline"
            data-testid="button-close-tracker"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
