import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { createJobPosting, type JobPosting, type FirestoreUser } from "../lib/firestore";
import FirebaseFileUpload from "../components/firebase-file-upload";

interface JobPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirestoreUser;
  onJobPosted: (job: JobPosting) => void;
}

export default function JobPostingModal({ isOpen, onClose, user, onJobPosted }: JobPostingModalProps) {
  console.log("JobPostingModal rendered with props:", { isOpen, user: !!user });
  
  const [isLoading, setIsLoading] = useState(false);
  const [jobData, setJobData] = useState({
    title: "",
    company: user.company || "",
    location: "",
    description: "",
    requirements: "",
    salary: "",
    type: "full-time" as "full-time" | "part-time" | "contract" | "internship",
    experience: "entry" as "entry" | "mid" | "senior" | "lead",
    jobDescriptionUrl: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setJobData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    console.log("Job posting form submitted with data:", jobData);
    console.log("User data:", user);
    
    if (!jobData.title || !jobData.company || !jobData.description) {
      console.log("Validation failed - missing required fields");
      return;
    }

    setIsLoading(true);
    try {
      const jobPosting = {
        ...jobData,
        referrerId: user.uid,
        referrerName: user.displayName,
        referrerEmail: user.email,
        isActive: true,
      };

      console.log("About to create job posting:", jobPosting);
      const jobId = await createJobPosting(jobPosting);
      console.log("Job posting created with ID:", jobId);
      
      const newJob: JobPosting = {
        id: jobId,
        ...jobPosting,
        createdAt: new Date() as any,
        updatedAt: new Date() as any,
      };
      
      onJobPosted(newJob);
      
      
      // Reset form
      setJobData({
        title: "",
        company: user.company || "",
        location: "",
        description: "",
        requirements: "",
        salary: "",
        type: "full-time",
        experience: "entry",
        jobDescriptionUrl: "",
      });
      
      onClose();
    } catch (error) {
      console.error("Error posting job:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Post a New Job</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Job Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Job Title *</Label>
              <Input
                id="title"
                value={jobData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="e.g., Senior Software Engineer"
              />
            </div>
            <div>
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={jobData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="Company name"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={jobData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="e.g., San Francisco, CA"
              />
            </div>
            <div>
              <Label htmlFor="type">Job Type</Label>
              <Select value={jobData.type} onValueChange={(value) => handleInputChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="internship">Internship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="experience">Experience Level</Label>
              <Select value={jobData.experience} onValueChange={(value) => handleInputChange("experience", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level</SelectItem>
                  <SelectItem value="mid">Mid Level</SelectItem>
                  <SelectItem value="senior">Senior Level</SelectItem>
                  <SelectItem value="lead">Lead/Executive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="salary">Salary Range (Optional)</Label>
            <Input
              id="salary"
              value={jobData.salary}
              onChange={(e) => handleInputChange("salary", e.target.value)}
              placeholder="e.g., $80,000 - $120,000"
            />
          </div>

          {/* Job Description */}
          <div>
            <Label htmlFor="description">Job Description *</Label>
            <Textarea
              id="description"
              value={jobData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the role, responsibilities, and what makes this opportunity exciting..."
              rows={4}
            />
          </div>

          {/* Requirements */}
          <div>
            <Label htmlFor="requirements">Requirements & Qualifications</Label>
            <Textarea
              id="requirements"
              value={jobData.requirements}
              onChange={(e) => handleInputChange("requirements", e.target.value)}
              placeholder="List the required skills, experience, education, and qualifications..."
              rows={4}
            />
          </div>

          {/* Job Description File Upload */}
          <div>
            <Label>Job Description Document (Optional)</Label>
            <FileUpload
              onFileUploaded={(fileUrl, fileName) => {
                handleInputChange("jobDescriptionUrl", fileUrl);
              }}
              acceptedTypes=".pdf,.doc,.docx,.txt"
              maxSizeMB={5}
              label="Upload Job Description"
              description="Upload a detailed job description document (PDF, DOC, DOCX, or TXT, max 5MB)"
              currentFile={jobData.jobDescriptionUrl}
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
              {isLoading ? "Posting..." : "Post Job"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}