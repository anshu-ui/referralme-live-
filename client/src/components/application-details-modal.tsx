import { useState } from "react";
import { updateReferralRequestStatus } from "../lib/firestore";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { 
  Download, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Send, 
  Calendar,
  FileText,
  User,
  Mail,
  Phone,
  Linkedin,
  Eye,
  Building,
  Clock
} from "lucide-react";
import type { ReferralRequest } from "../lib/firestore";

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ReferralRequest | null;
  onStatusUpdate?: (requestId: string, status: ReferralRequest["status"]) => void;
}

export default function ApplicationDetailsModal({ 
  isOpen, 
  onClose, 
  application,
  onStatusUpdate 
}: ApplicationDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [notes, setNotes] = useState("");

  if (!application) return null;

  const getStatusColor = (status: string) => {
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

  const handleStatusUpdate = async (newStatus: ReferralRequest["status"]) => {
    if (!application.id) return;
    
    setIsUpdating(true);
    try {
      await updateReferralRequestStatus(application.id, newStatus);
      

      if (onStatusUpdate) {
        onStatusUpdate(application.id, newStatus);
      }
      
      onClose();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadResume = async () => {
    if (application.resumeUrl) {
      try {
        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = application.resumeUrl;
        link.download = application.resumeFileName || 'resume.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
      } catch (error) {
        console.error("Error downloading resume:", error);
      }
    } else {
    }
  };

  const openLinkedIn = () => {
    if (application.linkedinUrl) {
      window.open(application.linkedinUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Application Details
          </DialogTitle>
          <DialogDescription>
            Review and manage this referral application
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Candidate Header */}
          <div className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {application.seekerName}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Applied for: {application.jobTitle}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Submitted {application.createdAt ? new Date(application.createdAt.toDate()).toLocaleDateString() : "Recently"}
              </p>
            </div>
            <div className="text-right">
              <Badge className={`${getStatusColor(application.status)} capitalize`}>
                {application.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>

          {/* Contact Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">Contact Information</h4>
              
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{application.seekerEmail}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{application.seekerPhone}</span>
              </div>
              
              {application.linkedinUrl && (
                <div className="flex items-center gap-2 text-sm">
                  <Linkedin className="h-4 w-4 text-blue-600" />
                  <button
                    onClick={openLinkedIn}
                    className="text-blue-600 hover:underline flex items-center gap-1"
                  >
                    LinkedIn Profile
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Resume Section */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-white">Resume</h4>
              
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {application.resumeFileName || "Resume.pdf"}
                  </p>
                  <p className="text-sm text-gray-500">PDF Document</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (application.resumeUrl) {
                        window.open(application.resumeUrl, '_blank');
                      } else {
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadResume}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Letter */}
          {application.coverLetter && (
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Cover Letter</h4>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {application.coverLetter}
                </p>
              </div>
            </div>
          )}

          {/* Notes Section */}
          <div>
            <Label htmlFor="notes">Internal Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal notes about this application..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-4 pt-6 border-t">
            {application.status === "pending" && (
              <div className="flex flex-wrap gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h4 className="w-full font-semibold text-gray-900 dark:text-white mb-2">
                  Take Action
                </h4>
                
                <Button
                  onClick={() => handleStatusUpdate("accepted")}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accept for Referral
                </Button>
                

                
                <Button
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={isUpdating}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Application
                </Button>
              </div>
            )}
            
            {application.status === "accepted" && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-green-700 dark:text-green-300 font-medium">
                    ✅ Application Accepted for Referral
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    The seeker has been notified and will update their progress when they receive emails from the company
                  </p>
                </div>
              </div>
            )}

            {application.status === "sent_to_hr" && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-blue-700 dark:text-blue-300 font-medium">
                    📋 Forwarded to HR Department
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                    Seeker confirmed receiving HR contact - awaiting further updates
                  </p>
                </div>
              </div>
            )}

            {application.status === "interview_scheduled" && (
              <div className="space-y-4">
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-purple-700 dark:text-purple-300 font-medium">
                    📅 Interview Scheduled
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                    Seeker confirmed receiving interview invitation
                  </p>
                </div>
              </div>
            )}

            {(application.status === "completed" || application.status === "rejected") && (
              <div className={`text-center p-4 rounded-lg ${
                application.status === "completed" 
                  ? "bg-gray-50 dark:bg-gray-800" 
                  : "bg-red-50 dark:bg-red-900/20"
              }`}>
                <p className={`font-medium ${
                  application.status === "completed"
                    ? "text-gray-700 dark:text-gray-300"
                    : "text-red-700 dark:text-red-300"
                }`}>
                  {application.status === "completed" ? "✅ Process Complete" : "❌ Application Rejected"}
                </p>
                <p className={`text-sm mt-1 ${
                  application.status === "completed"
                    ? "text-gray-600 dark:text-gray-400"
                    : "text-red-600 dark:text-red-400"
                }`}>
                  {application.status === "completed" 
                    ? "This referral process has been completed"
                    : "This application was not successful"
                  }
                </p>
              </div>
            )}
          </div>

          {/* Close Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}