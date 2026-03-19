import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { FileText, Upload, Zap, Award, CheckCircle, AlertCircle, Send } from "lucide-react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { submitReferralRequest } from "../lib/firestore";
import { trackEvent } from "../lib/analytics";
import { analyzeResumeWithGemini, type ATSAnalysis } from "../lib/geminiATS";
import { useToast } from "../hooks/use-toast";
import ATSAnalyzer from "./ats-analyzer";

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onApplicationSubmitted: (application: any) => void;
}

// Use ATSAnalysis interface from geminiATS.ts

export default function ApplicationFormModal({ isOpen, onClose, job, onApplicationSubmitted }: ApplicationFormModalProps) {
  const { user } = useFirebaseAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showATSAnalyzer, setShowATSAnalyzer] = useState(false);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const autoAnalysisKeyRef = useRef<string>("");
  
  const [formData, setFormData] = useState({
    fullName: user?.displayName || user?.firstName || "",
    phoneNumber: user?.phoneNumber || "",
    experienceLevel: "",
    motivation: "",
    resumeText: "",
  });
  const minAtsScore = Number(job?.minAtsScore || 75);
  const meetsAtsThreshold = !!atsAnalysis && atsAnalysis.overallScore >= minAtsScore;

  const runATSAnalysis = async (source: "manual" | "auto" = "manual") => {
    if (!formData.resumeText || !formData.resumeText.trim()) {
      if (source === "manual") {
        toast({
          title: "Resume content required",
          description: "Paste or enter your resume content before running ATS analysis.",
          variant: "destructive",
        });
      }
      return;
    }

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeResumeWithGemini(
        formData.resumeText,
        job.title || "Job Position",
        job.description || "Job description not available"
      );

      setAtsAnalysis(analysis);
      trackEvent("ats_analysis_completed", "application_form", analysis.overallScore.toString());
      toast({
        title: source === "auto" ? "ATS scan updated automatically" : "ATS analysis complete",
        description:
          source === "auto"
            ? `Your uploaded resume and summary scored ${analysis.overallScore} for this role.`
            : `Your resume scored ${analysis.overallScore} for this referral opportunity.`,
      });
    } catch (error) {
      console.error("ATS analysis failed:", error);
      toast({
        title: "ATS analysis failed",
        description: "The AI analysis could not complete. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    
    // Support more file types and be more robust
    const supportedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword", "text/plain"];
    const isSupported = supportedTypes.includes(file.type) || 
                        file.name.endsWith(".pdf") || 
                        file.name.endsWith(".docx") || 
                        file.name.endsWith(".doc") || 
                        file.name.endsWith(".txt");

    if (isSupported) {
      setResumeFile(file);
      setAtsAnalysis(null);
      autoAnalysisKeyRef.current = "";
      setIsUploading(true);
      setUploadProgress(0);
      
      try {
        const formData = new FormData();
        formData.append("file", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/upload", true);

        xhr.upload.onprogress = (progressEvent) => {
          if (!progressEvent.lengthComputable) return;
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(progress);
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              setResumeUrl(response.url);
              setUploadProgress(100);
              console.log("Resume uploaded successfully:", response.url);
              if (response.extractedText) {
                setFormData((current) => ({
                  ...current,
                  resumeText: current.resumeText.trim() ? current.resumeText : response.extractedText,
                }));
              }
              trackEvent("resume_uploaded", "application_form", file.type);
            } catch (parseError) {
              console.error("Failed to parse upload response:", parseError);
              toast({
                title: "Upload response error",
                description: "Resume upload finished, but the server response could not be read.",
                variant: "destructive",
              });
              setResumeFile(null);
            } finally {
              setIsUploading(false);
            }
          } else {
            console.error("Upload failed:", xhr.responseText);
            toast({
              title: "Resume upload failed",
              description: "The resume could not be uploaded. Please try again.",
              variant: "destructive",
            });
            setIsUploading(false);
            setResumeFile(null);
          }
        };

        xhr.onerror = () => {
          console.error("Resume upload network error");
          toast({
            title: "Network error",
            description: "Resume upload failed because of a network error.",
            variant: "destructive",
          });
          setIsUploading(false);
          setResumeFile(null);
        };

        xhr.send(formData);
      } catch (error: any) {
        console.error('Error uploading resume:', error);
        toast({
          title: "Resume upload failed",
          description: error.message || "The resume upload could not be completed.",
          variant: "destructive",
        });
        setIsUploading(false);
        setResumeFile(null);
      }
    } else {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF, DOCX, DOC, or TXT file.",
        variant: "destructive",
      });
    }
  };

  const handleATSAnalysis = async () => {
    await runATSAnalysis("manual");
  };

  useEffect(() => {
    const normalizedResumeText = formData.resumeText.trim();
    const autoKey = `${resumeUrl || ""}::${normalizedResumeText}::${job?.id || ""}`;

    if (!isOpen || !resumeUrl || !normalizedResumeText || isUploading || isAnalyzing) return;
    if (autoAnalysisKeyRef.current === autoKey) return;

    autoAnalysisKeyRef.current = autoKey;
    void runATSAnalysis("auto");
  }, [formData.resumeText, isAnalyzing, isOpen, isUploading, job?.description, job?.id, job?.title, resumeUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in before submitting an application.",
        variant: "destructive",
      });
      return;
    }

    if (!atsAnalysis) {
      toast({
        title: "ATS analysis required",
        description: `Run ATS analysis first. This role requires a minimum score of ${minAtsScore}.`,
        variant: "destructive",
      });
      return;
    }

    if (atsAnalysis.overallScore < minAtsScore) {
      toast({
        title: "ATS score below cutoff",
        description: `Your ATS score is ${atsAnalysis.overallScore}. You need at least ${minAtsScore} to apply.`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const applicationData = {
        jobPostingId: job.id,
        jobTitle: job.title, // Add job title explicitly
        seekerId: user.uid,
        referrerId: job.referrerId,
        referrerName: job.referrerName,
        referrerEmail: job.referrerEmail,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        experienceLevel: formData.experienceLevel,
        motivation: formData.motivation,
        resumeText: formData.resumeText,
        resumeUrl: resumeUrl, // Use the actual uploaded file URL
        // Include ATS analysis if available
        atsScore: atsAnalysis?.overallScore || null,
        atsCompatibility: atsAnalysis ? (atsAnalysis.overallScore >= 85 ? 'excellent' : atsAnalysis.overallScore >= 75 ? 'good' : atsAnalysis.overallScore >= 65 ? 'fair' : 'poor') : null,
        keywordMatch: atsAnalysis?.keywordScore || null,
        formatScore: atsAnalysis?.formatScore || null,
        contentScore: atsAnalysis?.contentScore || null,
        atsAnalysis: atsAnalysis ? JSON.stringify(atsAnalysis) : null,
        status: "pending"
      };

      // Add job data to the application so email notification can be sent
      const applicationDataWithJob = {
        ...applicationData,
        job: job,
        email: user.email || "",
        currentCompany: user.company || 'Not specified'
      };

      await submitReferralRequest(applicationDataWithJob);
      
      trackEvent('application_submitted', 'referral_system', job.id);
      
      // Call the callback
      onApplicationSubmitted({
        ...applicationDataWithJob,
        atsAnalysis,
      });
      onClose();
      toast({
        title: "Application submitted",
        description: "Your referral request has been sent successfully.",
      });
      
      // NO AUTOMATIC REDIRECTS - application submitted successfully
      console.log("Application submitted successfully - no redirect");
      
      // Reset form
      setFormData({
        fullName: user?.displayName || user?.firstName || "",
        phoneNumber: user?.phoneNumber || "",
        experienceLevel: "",
        motivation: "",
        resumeText: "",
      });
      setResumeFile(null);
      setResumeUrl(null);
      setUploadProgress(0);
      setAtsAnalysis(null);
      
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Application failed",
        description: "The application could not be submitted. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getATSScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-50";
    if (score >= 75) return "text-blue-600 bg-blue-50";
    if (score >= 65) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getATSScoreIcon = (score: number) => {
    if (score >= 75) return <CheckCircle className="h-4 w-4" />;
    return <AlertCircle className="h-4 w-4" />;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply for {job?.title}</DialogTitle>
            <DialogDescription>
              Submit your application for this referral opportunity. ATS analysis is mandatory, and you must hit the referrer cutoff before applying.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="border-blue-200 bg-blue-50/60">
              <CardContent className="p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-blue-900">Mandatory ATS Gate</p>
                  <p className="text-sm text-blue-700">
                    Minimum score required for this referral: <strong>{minAtsScore}</strong>
                  </p>
                </div>
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-white">
                  ATS Required
                </Badge>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  required
                />
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <Label htmlFor="experienceLevel">Experience Level *</Label>
              <Select value={formData.experienceLevel} onValueChange={(value) => setFormData({...formData, experienceLevel: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                  <SelectItem value="mid">Mid Level (2-5 years)</SelectItem>
                  <SelectItem value="senior">Senior Level (5-10 years)</SelectItem>
                  <SelectItem value="lead">Lead/Principal (10+ years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Resume Upload */}
            <div className="space-y-3">
              <Label htmlFor="resume-upload">Resume Upload (Required)</Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <Input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="max-w-xs mx-auto"
                  disabled={isUploading}
                  data-testid="input-resume-upload"
                />
                {isUploading && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-2">Uploading... {Math.round(uploadProgress)}%</p>
                    <p className="text-xs text-blue-600 mt-1">Please wait for upload to complete before submitting</p>
                  </div>
                )}
                {resumeFile && !isUploading && resumeUrl && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">
                      {resumeFile.name} uploaded successfully{formData.resumeText.trim() ? " and ATS scan is updating." : "!"}
                    </span>
                  </div>
                )}
                {resumeFile && !isUploading && !resumeUrl && (
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">Upload failed. Please try again.</span>
                  </div>
                )}
              </div>
              
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={handleATSAnalysis}
                  disabled={isAnalyzing || !formData.resumeText.trim()}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isAnalyzing ? "Analyzing..." : "Re-run ATS Analysis"}
                </Button>
              </div>
            </div>

            {/* ATS Analysis Results */}
            {atsAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5" />
                    ATS Analysis Results
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getATSScoreIcon(atsAnalysis.overallScore)}
                      <div>
                        <p className="font-medium">ATS Compatibility Score</p>
                        <p className="text-sm text-gray-600">
                          AI-powered ATS analysis
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${getATSScoreColor(atsAnalysis.overallScore)}`}>
                      <span className="font-bold text-lg">{atsAnalysis.overallScore}%</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Keywords</p>
                      <p className="font-semibold">{atsAnalysis.keywordScore}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Format</p>
                      <p className="font-semibold">{atsAnalysis.formatScore}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Content</p>
                      <p className="font-semibold">{atsAnalysis.contentScore}%</p>
                    </div>
                  </div>
                  
                  {/* Suggestions and Improvements */}
                  {atsAnalysis.suggestions && atsAnalysis.suggestions.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <h4 className="font-medium text-sm text-gray-700 mb-2">💡 Suggestions for Improvement:</h4>
                        <ul className="text-xs text-gray-600 space-y-1">
                          {atsAnalysis.suggestions.slice(0, 3).map((suggestion, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-blue-500">•</span>
                              <span>{suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {atsAnalysis.missingKeywords && atsAnalysis.missingKeywords.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm text-gray-700 mb-2">🔍 Missing Keywords:</h4>
                          <div className="flex flex-wrap gap-1">
                            {atsAnalysis.missingKeywords.slice(0, 6).map((keyword, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {keyword}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {atsAnalysis.overallScore < 75 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Tip:</strong> Consider improving your resume based on the ATS suggestions before submitting.
                      </p>
                    </div>
                  )}
                  <div className={`mt-3 p-3 rounded-lg border ${meetsAtsThreshold ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                    <p className={`text-sm ${meetsAtsThreshold ? "text-green-800" : "text-red-800"}`}>
                      {meetsAtsThreshold
                        ? `You meet the ATS cutoff for this referral (${minAtsScore}+).`
                        : `You do not meet the ATS cutoff for this referral yet. Required: ${minAtsScore}, current: ${atsAnalysis.overallScore}.`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resume Text */}
            <div>
              <Label htmlFor="resumeText">Resume Summary/Key Points *</Label>
              <Textarea
                id="resumeText"
                value={formData.resumeText}
                onChange={(e) => setFormData({...formData, resumeText: e.target.value})}
                placeholder="Paste the strongest resume content for this role. ATS analysis will auto-run after upload once this summary is filled."
                className="min-h-[120px]"
                required
              />
            </div>

            {/* Motivation */}
            <div>
              <Label htmlFor="motivation">Why are you interested in this role? *</Label>
              <Textarea
                id="motivation"
                value={formData.motivation}
                onChange={(e) => setFormData({...formData, motivation: e.target.value})}
                placeholder="Explain why you're interested in this position and how you can contribute to the company..."
                className="min-h-[100px]"
                required
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={
                  isSubmitting || 
                  isUploading || 
                  !formData.fullName || 
                  !formData.phoneNumber || 
                  !formData.experienceLevel || 
                  !formData.motivation || 
                  !formData.resumeText ||
                  (resumeFile !== null && resumeUrl === null) ||
                  !atsAnalysis ||
                  !meetsAtsThreshold
                }
                className="flex-1"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Submitting...
                  </>
                ) : isUploading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Uploading Resume...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ATS Analyzer Modal */}
      <ATSAnalyzer
        isOpen={showATSAnalyzer}
        onClose={() => setShowATSAnalyzer(false)}
        onAnalysisComplete={handleATSAnalysis}
        jobTitle={job?.title}
        company={job?.company}
      />
    </>
  );
}
