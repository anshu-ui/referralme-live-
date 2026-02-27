import { useState } from "react";
import { updateReferralRequestStatus } from "../lib/firestore";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Input } from "../components/ui/input";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { 
  Mail, 
  Building, 
  Calendar, 
  CheckCircle, 
  Upload,
  Clock,
  Star
} from "lucide-react";
import type { ReferralRequest } from "../lib/firestore";

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  application: ReferralRequest | null;
  onStatusUpdate?: (requestId: string, status: ReferralRequest["status"]) => void;
}

export default function StatusUpdateModal({ 
  isOpen, 
  onClose, 
  application,
  onStatusUpdate 
}: StatusUpdateModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [emailDetails, setEmailDetails] = useState("");
  const [emailScreenshot, setEmailScreenshot] = useState<File | null>(null);
  const [interviewDate, setInterviewDate] = useState("");
  const [hrContact, setHrContact] = useState("");

  if (!application) return null;

  const statusOptions = [
    {
      value: "referral_confirmed",
      label: "I received a referral confirmation email",
      description: "Company acknowledged they received my application through a referral",
      icon: <Mail className="h-5 w-5 text-green-600" />
    },
    {
      value: "sent_to_hr", 
      label: "HR team contacted me",
      description: "I received an email from HR for screening or next steps",
      icon: <Building className="h-5 w-5 text-blue-600" />
    },
    {
      value: "interview_scheduled",
      label: "Interview invitation received",
      description: "Company sent me an interview invitation or scheduled a meeting",
      icon: <Calendar className="h-5 w-5 text-purple-600" />
    },
    {
      value: "completed",
      label: "Final outcome received",
      description: "I received an offer, rejection, or final decision from the company",
      icon: <CheckCircle className="h-5 w-5 text-gray-600" />
    }
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return;
      }
      setEmailScreenshot(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStatus || !emailDetails.trim()) {
      return;
    }

    if (!application.id) return;
    
    setIsUpdating(true);
    try {
      await updateReferralRequestStatus(application.id, selectedStatus as ReferralRequest["status"]);
      
      // In a real app, you'd also save the email details and screenshot
      // For now, we'll just show success

      if (onStatusUpdate) {
        onStatusUpdate(application.id, selectedStatus as ReferralRequest["status"]);
      }
      
      // Reset form
      setSelectedStatus("");
      setEmailDetails("");
      setEmailScreenshot(null);
      setInterviewDate("");
      setHrContact("");
      
      onClose();
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Update Application Status
          </DialogTitle>
          <DialogDescription>
            Report when you receive emails from the company about your application: {application.jobTitle}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Status Selection */}
          <div>
            <Label className="text-base font-medium mb-3 block">What happened? *</Label>
            <RadioGroup value={selectedStatus} onValueChange={setSelectedStatus}>
              {statusOptions.map((option) => (
                <div key={option.value} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {option.icon}
                      <Label htmlFor={option.value} className="font-medium cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Email Details */}
          <div>
            <Label htmlFor="email-details" className="text-base font-medium mb-2 block">
              Email Details *
            </Label>
            <Textarea
              id="email-details"
              value={emailDetails}
              onChange={(e) => setEmailDetails(e.target.value)}
              placeholder="Briefly describe the email you received (e.g., 'HR sent screening questions', 'Interview scheduled for next Tuesday', 'Received offer letter')"
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Additional Fields Based on Status */}
          {selectedStatus === "sent_to_hr" && (
            <div>
              <Label htmlFor="hr-contact" className="text-base font-medium mb-2 block">
                HR Contact (Optional)
              </Label>
              <Input
                id="hr-contact"
                value={hrContact}
                onChange={(e) => setHrContact(e.target.value)}
                placeholder="HR person's name or email"
              />
            </div>
          )}

          {selectedStatus === "interview_scheduled" && (
            <div>
              <Label htmlFor="interview-date" className="text-base font-medium mb-2 block">
                Interview Date (Optional)
              </Label>
              <Input
                id="interview-date"
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
              />
            </div>
          )}

          {/* Email Screenshot Upload */}
          <div>
            <Label className="text-base font-medium mb-2 block">
              Email Screenshot (Recommended)
            </Label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Upload a screenshot of the email to verify your update
              </p>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="screenshot-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById('screenshot-upload')?.click()}
                type="button"
              >
                Choose File
              </Button>
              {emailScreenshot && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ {emailScreenshot.name} uploaded
                </p>
              )}
            </div>
          </div>

          {/* Benefits Message */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <Star className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Help Build Trust
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Your updates help other job seekers see which referrers are most effective, and help successful referrers build their reputation on the platform.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUpdating || !selectedStatus || !emailDetails.trim()}
              className="flex-1"
            >
              {isUpdating ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Update Status
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}