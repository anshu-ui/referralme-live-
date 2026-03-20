import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { FileText, Upload, Zap, Award, CheckCircle, AlertCircle, Send } from "lucide-react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { isJobClosedForApplications, submitReferralRequest, type ScreeningAnswer, type ScreeningQuestion } from "../lib/firestore";
import { trackEvent } from "../lib/analytics";
import { type ATSAnalysis } from "../lib/geminiATS";
import { analyzeDetailedResumeForRole } from "../lib/gemini-ats";
import { useToast } from "../hooks/use-toast";
import ATSAnalyzer from "./ats-analyzer";

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: any;
  onApplicationSubmitted: (application: any) => void;
}

// Use ATSAnalysis interface from geminiATS.ts

const getScoreSummary = (score: number) => {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "Needs work";
};

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
  const [screeningAnswers, setScreeningAnswers] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    fullName: user?.displayName || user?.firstName || "",
    phoneNumber: user?.phoneNumber || "",
    experienceLevel: "",
    motivation: "",
    resumeText: "",
  });
  const minAtsScore = Number(job?.minAtsScore || 75);
  const meetsAtsThreshold = !!atsAnalysis && atsAnalysis.overallScore >= minAtsScore;
  const screeningQuestions = (job?.screeningQuestions || []) as ScreeningQuestion[];
  const isJobClosed = isJobClosedForApplications(job);
  const missingRequiredScreening = screeningQuestions.some(
    (question) => question.required && !screeningAnswers[question.id]?.trim(),
  );
  const atsScoreCards = atsAnalysis
    ? [
        {
          name: "Keyword Match",
          score: atsAnalysis.keywordScore,
          description: "Alignment with the role description, requirements, and skills.",
        },
        {
          name: "Resume Structure",
          score: atsAnalysis.formatScore,
          description: "Section headers, bullet formatting, and parser-friendly layout.",
        },
        {
          name: "Content Strength",
          score: atsAnalysis.contentScore,
          description: "Impact, quantified achievements, and experience clarity.",
        },
      ]
    : [];
  const atsPriorityFixes = atsAnalysis
    ? Array.from(
        new Set([
          atsAnalysis.suggestions[0],
          atsAnalysis.suggestions[1],
          atsAnalysis.missingKeywords.length > 0
            ? `Add truthful role keywords like ${atsAnalysis.missingKeywords.slice(0, 4).join(", ")}.`
            : null,
        ].filter(Boolean) as string[]),
      ).slice(0, 3)
    : [];

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
      const roleContext = [
        job.description || "",
        job.requirements || "",
        Array.isArray(job.skills) ? job.skills.join(" ") : "",
      ]
        .filter(Boolean)
        .join("\n");

      const analysis = await analyzeDetailedResumeForRole(
        formData.resumeText,
        roleContext || "Job description not available",
        {
          jobTitle: job.title || "Job Position",
          requiredSkills: Array.isArray(job.skills) ? job.skills : [],
        },
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
        description: "The ATS score could not be calculated. Please try again.",
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
      setFormData((current) => ({
        ...current,
        resumeText: "",
      }));
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
              const contentType = xhr.getResponseHeader("content-type") || "";
              if (!contentType.includes("application/json")) {
                throw new Error("Upload endpoint returned an unexpected response");
              }
              const response = JSON.parse(xhr.responseText);
              setResumeUrl(response.url);
              setUploadProgress(100);
              console.log("Resume uploaded successfully:", response.url);
              if (response.extractedText) {
                setFormData((current) => ({
                  ...current,
                  resumeText: response.extractedText,
                }));
              }
              trackEvent("resume_uploaded", "application_form", file.type);
            } catch (parseError) {
              console.error("Failed to parse upload response:", parseError);
              toast({
                title: "Upload response error",
                description: parseError instanceof Error
                  ? parseError.message
                  : "Resume upload finished, but the server response could not be read.",
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

    if (isJobClosed) {
      toast({
        title: "Role is closed",
        description: "This opportunity has already expired or reached its application cap.",
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
        screeningAnswers: screeningQuestions.map((question) => ({
          questionId: question.id,
          prompt: question.prompt,
          answer: screeningAnswers[question.id] || "",
        })) as ScreeningAnswer[],
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
      setScreeningAnswers({});
      
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
            {isJobClosed ? (
              <Card className="border-red-200 bg-red-50/70">
                <CardContent className="p-4">
                  <p className="font-medium text-red-900">This role is closed for new applications.</p>
                  <p className="mt-1 text-sm text-red-700">The referrer has either reached the candidate cap or the role has expired.</p>
                </CardContent>
              </Card>
            ) : null}
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

            {screeningQuestions.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Referrer Screening</CardTitle>
                  <CardDescription>
                    Answer these questions once so the referrer can review only the best-fit candidates faster.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {screeningQuestions.map((question) => (
                    <div key={question.id} className="space-y-2">
                      <Label htmlFor={question.id}>
                        {question.prompt}
                        {question.required ? " *" : ""}
                      </Label>
                      {question.inputType === "long_text" ? (
                        <Textarea
                          id={question.id}
                          value={screeningAnswers[question.id] || ""}
                          onChange={(event) => setScreeningAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                          className="min-h-[90px]"
                          required={question.required}
                        />
                      ) : question.inputType === "select" ? (
                        <Select
                          value={screeningAnswers[question.id] || ""}
                          onValueChange={(value) => setScreeningAnswers((current) => ({ ...current, [question.id]: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an answer" />
                          </SelectTrigger>
                          <SelectContent>
                            {(question.options || []).map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={question.id}
                          value={screeningAnswers[question.id] || ""}
                          onChange={(event) => setScreeningAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                          required={question.required}
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : null}

            {/* ATS Analysis Results */}
            {atsAnalysis && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5" />
                    ATS Analysis Results
                  </CardTitle>
                  <CardDescription>
                    Review the weak areas first, then rerun the ATS scan before you submit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {getATSScoreIcon(atsAnalysis.overallScore)}
                      <div>
                        <p className="font-medium">ATS Compatibility Score</p>
                        <p className="text-sm text-gray-600">
                          Rule-based ATS analysis
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${getATSScoreColor(atsAnalysis.overallScore)}`}>
                      <span className="font-bold text-lg">{atsAnalysis.overallScore}%</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {atsScoreCards.map((item) => (
                      <div key={item.name} className="rounded-xl border border-slate-200 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{item.score}%</p>
                            <p className="text-xs text-slate-500">{getScoreSummary(item.score)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-green-200 bg-green-50/70 p-4">
                      <h4 className="font-medium text-sm text-green-800">What is already strong</h4>
                      <div className="mt-2 space-y-2">
                        {atsAnalysis.strengths.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-xs text-green-900">
                            <CheckCircle className="mt-0.5 h-3.5 w-3.5 text-green-600" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4">
                      <h4 className="font-medium text-sm text-orange-800">Top fixes before you apply</h4>
                      <div className="mt-2 space-y-2">
                        {atsPriorityFixes.map((item, index) => (
                          <div key={index} className="flex items-start gap-2 text-xs text-orange-900">
                            <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-600 text-[10px] font-semibold text-white">
                              {index + 1}
                            </span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {atsAnalysis.missingKeywords && atsAnalysis.missingKeywords.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium text-sm text-gray-700 mb-2">Role keywords still missing</h4>
                      <div className="flex flex-wrap gap-1">
                        {atsAnalysis.missingKeywords.slice(0, 6).map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
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
                  missingRequiredScreening ||
                  isJobClosed ||
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
