import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Upload, FileText } from "lucide-react";
import { createReferralRequest, type ReferralRequest, type JobPosting, type FirestoreUser } from "../lib/firestore";
import FirebaseFileUpload from "../components/firebase-file-upload";

interface ReferralRequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobPosting;
  user: FirestoreUser;
  onRequestSubmitted: (request: ReferralRequest) => void;
}

export default function ReferralRequestFormModal({ 
  isOpen, 
  onClose, 
  job, 
  user, 
  onRequestSubmitted 
}: ReferralRequestFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [requestData, setRequestData] = useState({
    seekerName: user.displayName || "",
    seekerEmail: user.email || "",
    seekerPhone: user.phoneNumber || "",
    resumeText: "",
    resumeUrl: "",
    linkedinUrl: user.linkedin || "",
    coverLetter: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setRequestData(prev => ({ ...prev, [field]: value }));
  };



  const handleSubmit = async () => {
    if (!requestData.seekerName || !requestData.seekerEmail || !requestData.seekerPhone) {
      return;
    }

    setIsLoading(true);
    try {
      const referralRequest = {
        jobPostingId: job.id!,
        seekerId: user.uid,
        referrerId: job.referrerId,
        status: "pending" as const,
        ...requestData,
      };

      const requestId = await createReferralRequest(referralRequest);
      
      const newRequest: ReferralRequest = {
        id: requestId,
        ...referralRequest,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };
      
      onRequestSubmitted(newRequest);
      
      
      onClose();
    } catch (error) {
      console.error("Error submitting referral request:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Request Referral</DialogTitle>
          <div className="text-sm text-gray-600">
            Applying for: <span className="font-medium">{job.title}</span> at <span className="font-medium">{job.company}</span>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="seekerName">Full Name *</Label>
              <Input
                id="seekerName"
                value={requestData.seekerName}
                onChange={(e) => handleInputChange("seekerName", e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <Label htmlFor="seekerEmail">Email *</Label>
              <Input
                id="seekerEmail"
                type="email"
                value={requestData.seekerEmail}
                onChange={(e) => handleInputChange("seekerEmail", e.target.value)}
                placeholder="your@email.com"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="seekerPhone">Phone Number *</Label>
              <Input
                id="seekerPhone"
                value={requestData.seekerPhone}
                onChange={(e) => handleInputChange("seekerPhone", e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
              <Input
                id="linkedinUrl"
                value={requestData.linkedinUrl}
                onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>

          {/* Resume Upload */}
          <div>
            <Label>Resume *</Label>
            <FirebaseFileUpload
              onFileUploaded={(fileUrl, fileName) => {
                handleInputChange("resumeUrl", fileUrl);
              }}
              acceptedTypes=".pdf,.doc,.docx,.txt"
              maxSizeMB={5}
              label="Upload Resume"
              description="Upload your resume (PDF, DOC, DOCX, or TXT, max 5MB)"
              currentFile={requestData.resumeUrl}
            />
            
            <div className="mt-3">
              <Label htmlFor="resumeText">Or paste your resume text</Label>
              <Textarea
                id="resumeText"
                value={requestData.resumeText}
                onChange={(e) => handleInputChange("resumeText", e.target.value)}
                placeholder="Paste your resume content here..."
                rows={4}
              />
            </div>
          </div>

          {/* Cover Letter */}
          <div>
            <Label htmlFor="coverLetter">Cover Letter (Optional)</Label>
            <Textarea
              id="coverLetter"
              value={requestData.coverLetter}
              onChange={(e) => handleInputChange("coverLetter", e.target.value)}
              placeholder="Write a brief cover letter explaining why you're interested in this position and why you'd be a good fit..."
              rows={4}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}