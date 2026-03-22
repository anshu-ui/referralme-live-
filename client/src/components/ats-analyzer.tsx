import { useState } from "react";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { useToast } from "../hooks/use-toast";
import { Upload, FileText, Target, CheckCircle, AlertCircle, X, Download, Sparkles, Copy, Wand2 } from "lucide-react";
import { analyzeResumeWithGemini, isLikelyJobDescription, type ATSAnalysisResult } from "../lib/gemini-ats";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { saveATSAnalysis } from "../lib/firestore";

interface ATSAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (result: any) => void;
  jobTitle?: string;
  company?: string;
}

interface ImprovementSuggestion {
  id: string;
  title: string;
  helper: string;
  original: string;
  improved: string;
  reason: string;
}

const getScoreSummary = (score: number) => {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Moderate";
  return "Needs work";
};

const getPriorityFixes = (analysis: ATSAnalysisResult, hasTargetJobDescription: boolean) => {
  const fixes = [
    analysis.suggestions[0],
    analysis.recommendations.includes("Resume structure")
      ? "Add clear section headers such as Summary, Experience, Skills, and Education."
      : null,
    analysis.recommendations.includes("Experience formatting")
      ? "Convert dense work history into short bullet points with outcomes."
      : null,
    analysis.recommendations.includes("Achievement quantification")
      ? "Add numbers, percentages, or delivery impact to your experience bullets."
      : null,
    hasTargetJobDescription && analysis.missingKeywords.length > 0
      ? `Add truthful JD keywords like ${analysis.missingKeywords.slice(0, 4).join(", ")}.`
      : null,
  ].filter(Boolean) as string[];

  return Array.from(new Set(fixes)).slice(0, 3);
};

const getResumeLines = (resumeText: string) =>
  resumeText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const findWeakBullet = (resumeText: string) => {
  const lines = getResumeLines(resumeText);
  return (
    lines.find((line) =>
      (/^[-*•]/.test(line) || line.split(" ").length <= 8) &&
      !/\b\d+[%+x]?\b/.test(line) &&
      line.length > 18,
    ) ||
    lines.find((line) => line.length > 18 && line.length < 120) ||
    "Worked on backend APIs"
  );
};

const findSummarySample = (resumeText: string) => {
  const lines = getResumeLines(resumeText);
  const summaryIndex = lines.findIndex((line) => /summary/i.test(line));
  if (summaryIndex >= 0) {
    return lines.slice(summaryIndex + 1, summaryIndex + 3).join(" ").trim();
  }

  const candidates = lines.filter((line) => !/^[-*•]/.test(line) && line.split(" ").length > 7);
  return candidates[0] || "";
};

const hasSection = (resumeText: string, section: string) =>
  new RegExp(`\\b${section}\\b`, "i").test(resumeText);

const buildImprovementSuggestions = (
  analysis: ATSAnalysisResult,
  resumeText: string,
  jobDescription: string,
  hasTargetJobDescription: boolean,
  fallbackJobTitle?: string,
): ImprovementSuggestion[] => {
  const suggestions: ImprovementSuggestion[] = [];
  const weakBullet = findWeakBullet(resumeText);
  const summarySample = findSummarySample(resumeText);
  const keywords = analysis.missingKeywords.slice(0, 3);
  const titleLabel = fallbackJobTitle || "target role";

  if (analysis.experienceScore < 75) {
    suggestions.push({
      id: "rewrite-bullet",
      title: "Rewrite a weak bullet",
      helper: "Turn a vague line into a sharper achievement statement.",
      original: weakBullet,
      improved: weakBullet
        .replace(/^[-*•]\s*/, "")
        .includes("Worked on")
        ? `Built and maintained backend APIs in [stack/tool], supporting [team or product] and improving [speed, reliability, or workflow] by [X]%.`
        : `${weakBullet.replace(/^[-*•]\s*/, "").replace(/\.$/, "")} by delivering [specific outcome] for [team/product], resulting in [metric or impact].`,
      reason: "ATS systems and recruiters both respond better to bullets with ownership, scope, and measurable impact.",
    });
  }

  if (analysis.formatScore < 75 || !hasSection(resumeText, "summary")) {
    suggestions.push({
      id: "improve-summary",
      title: "Improve summary",
      helper: "Add a short top-of-resume summary that sets role fit quickly.",
      original: summarySample || "No clear professional summary found.",
      improved: `Results-focused ${titleLabel} candidate with experience in [core skill 1], [core skill 2], and [domain/tool]. Known for delivering [type of work] and improving [metric/outcome] across fast-moving teams.`,
      reason: "A focused summary gives ATS systems more role context and helps recruiters understand your fit within seconds.",
    });
  }

  if (hasTargetJobDescription && keywords.length > 0) {
    suggestions.push({
      id: "add-keywords",
      title: "Add missing keywords naturally",
      helper: "Use role keywords inside truthful bullets or summary lines.",
      original: `Keywords still missing: ${keywords.join(", ")}`,
      improved: `Example update: Built projects using ${keywords.join(", ")} where relevant to the role, and highlighted those tools in experience and skills sections.`,
      reason: "Keyword matching improves when role terms appear naturally inside real work experience instead of being stuffed into a list.",
    });
  }

  if (!hasSection(resumeText, "skills")) {
    suggestions.push({
      id: "add-skills-section",
      title: "Add a missing skills section",
      helper: "Create a clean ATS-readable section for tools and technologies.",
      original: "No dedicated skills section detected.",
      improved: `Skills\n• Languages: [language 1], [language 2]\n• Frameworks: [framework 1], [framework 2]\n• Tools: [tool 1], [tool 2]\n• Domain: [relevant domain or workflow]`,
      reason: "A clear skills section helps ATS parsers index your tools faster and makes keyword relevance easier to verify.",
    });
  }

  if (analysis.formatScore < 70 && !/^[-*•]/m.test(resumeText)) {
    suggestions.push({
      id: "make-ats-friendly",
      title: "Make this ATS-friendly",
      helper: "Break dense paragraphs into ATS-readable bullet points.",
      original: "Dense work history without bullet structure.",
      improved: `• Led [project or responsibility] using [tool/skill]\n• Improved [metric] by [X]% through [action]\n• Collaborated with [team] to deliver [result] on time`,
      reason: "Bullets improve scanability, parser clarity, and make achievements much easier to understand quickly.",
    });
  }

  return suggestions.slice(0, 4);
};

export default function ATSAnalyzer({ isOpen, onClose, onAnalysisComplete, jobTitle, company }: ATSAnalyzerProps) {
  const { toast } = useToast();
  const { user } = useFirebaseAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ATSAnalysisResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const hasTargetJobDescription = isLikelyJobDescription(jobDescription);
  const scoreCards = analysisResult
    ? [
        {
          name: "Keyword Match",
          score: analysisResult.keywordsScore,
          description: hasTargetJobDescription
            ? "How well your resume matches the role language."
            : "General technical signal strength from your resume text.",
        },
        {
          name: "Resume Structure",
          score: analysisResult.formatScore,
          description: "Section headers, bullets, and clean ATS-readable layout.",
        },
        {
          name: "Content Strength",
          score: analysisResult.experienceScore,
          description: "Impact, experience clarity, and relevance of your content.",
        },
        {
          name: "ATS Readability",
          score: analysisResult.formatScore,
          description: "How easy it is for parsers to read contact info and experience.",
        },
      ]
    : [];
  const priorityFixes = analysisResult ? getPriorityFixes(analysisResult, hasTargetJobDescription) : [];
  const needsWork = analysisResult
    ? Array.from(
        new Set([
          ...analysisResult.recommendations,
          ...(analysisResult.missingKeywords.length > 0 && hasTargetJobDescription ? ["JD keyword alignment"] : []),
        ]),
      ).slice(0, 4)
    : [];
  const improvementSuggestions = analysisResult
    ? buildImprovementSuggestions(analysisResult, resumeText, jobDescription, hasTargetJobDescription, jobTitle)
    : [];
  const selectedSuggestion = improvementSuggestions.find((suggestion) => suggestion.id === selectedSuggestionId) || improvementSuggestions[0] || null;

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isTextFile = file.type === "text/plain" || file.name.endsWith(".txt");
      const isDocumentFile =
        file.type === "application/pdf" ||
        file.type === "application/msword" ||
        file.type.includes("wordprocessingml") ||
        file.name.endsWith(".pdf") ||
        file.name.endsWith(".doc") ||
        file.name.endsWith(".docx");

      if (isTextFile || isDocumentFile) {
        setResumeFile(file);
        setResumeText("");
        setIsUploading(true);

        try {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const contentType = response.headers.get("content-type") || "";
          if (!response.ok) {
            throw new Error("Upload failed");
          }
          if (!contentType.includes("application/json")) {
            throw new Error("Upload endpoint returned an unexpected response");
          }

          const payload = await response.json();
          const extractedText = String(payload.extractedText || "").trim();

          if (extractedText) {
            setResumeText(extractedText);
            toast({
              title: "Resume uploaded",
              description: "Resume text extracted successfully. ATS scan is ready.",
            });
          } else {
            toast({
              title: "Upload complete",
              description: "The file uploaded, but no readable text was extracted from it.",
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Failed to upload/extract resume:", error);
          toast({
            title: "Upload failed",
            description: error instanceof Error ? error.message : "The resume could not be uploaded for ATS analysis.",
            variant: "destructive"
          });
        } finally {
          setIsUploading(false);
        }
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF, Word, or TXT resume.",
          variant: "destructive"
        });
      }
    }
  };

  const analyzeResume = async () => {
    if (!resumeText.trim()) {
      toast({
        title: "Missing resume content",
        description: "Please upload a resume or paste your resume text.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStep(0);

    // Realistic ATS analysis process steps
    const analysisSteps = [
      "Parsing resume structure...",
      "Extracting skills and keywords...",
      "Analyzing experience relevance...",
      "Checking ATS compatibility...",
      "Generating recommendations...",
      "Finalizing analysis..."
    ];

    // Simulate progress through analysis steps
    for (let i = 0; i < analysisSteps.length; i++) {
      setAnalysisStep(i);
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    try {
      console.log("📊 Starting deterministic ATS analysis...");
      const result = await analyzeResumeWithGemini(resumeText, jobDescription, {
        jobTitle,
      });
      
      setAnalysisResult(result);
      setSelectedSuggestionId(null);
      setIsAnalyzing(false);
      
      // Save analysis to history if user is logged in
      if (user) {
        try {
          await saveATSAnalysis({
            userId: user.uid,
            jobTitle: jobTitle || undefined,
            company: company || undefined,
            resumeText: resumeText,
            overallScore: result.overallScore,
            skillsScore: result.skillsScore,
            experienceScore: result.experienceScore,
            formatScore: result.formatScore,
            keywordsScore: result.keywordsScore,
            suggestions: result.suggestions || [],
            strongPoints: result.strongPoints || [],
            missingKeywords: result.missingKeywords || [],
            matchedKeywords: result.matchedKeywords || [],
            recommendations: result.recommendations || []
          });
          console.log("✅ Analysis saved to history");
        } catch (saveError) {
          console.error("Failed to save analysis to history:", saveError);
          // Don't show error to user, just log it
        }
      }
      
      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }

      toast({
        title: "Analysis Complete!",
        description: `Your ATS score is ${result.overallScore}/100. Check the detailed report for improvements.`
      });
    } catch (error) {
      console.error("❌ ATS analysis failed:", error);
      setIsAnalyzing(false);
      toast({
        title: "Analysis Failed",
        description: "There was an error calculating your ATS score. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { variant: "default" as const, text: "Excellent", color: "bg-green-500" };
    if (score >= 60) return { variant: "secondary" as const, text: "Good", color: "bg-yellow-500" };
    return { variant: "destructive" as const, text: "Needs Work", color: "bg-red-500" };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            ATS Resume Analyzer
          </DialogTitle>
          <DialogDescription>
            Get a rule-based ATS analysis of your resume with keyword, structure, and content recommendations
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6">
            {!analysisResult ? (
              <>
                {/* File Upload Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Upload Resume</CardTitle>
                    <CardDescription>
                      Upload your resume in PDF or Word format for analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <input
                        type="file"
                        id="resume-upload"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          {resumeFile ? resumeFile.name : "Click to upload resume"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Supports PDF, DOC, DOCX, and TXT files up to 10MB
                        </p>
                      </label>
                    </div>

                    {resumeText && (
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Extracted Text Preview
                        </h4>
                        <div className="text-sm text-gray-700 max-h-32 overflow-y-auto bg-white p-3 rounded border">
                          {resumeText.slice(0, 300)}...
                        </div>
                      </div>
                    )}

                    {!resumeText && resumeFile && !isUploading && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                        This file uploaded successfully, but readable text could not be extracted from it.
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Job Description Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Target Job Description (Optional)</CardTitle>
                    <CardDescription>
                      Paste a real job description with requirements or responsibilities to enable keyword matching
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      placeholder="Paste the job description here for better keyword matching..."
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      className="w-full h-32 p-3 border rounded-md resize-none"
                    />
                  </CardContent>
                </Card>

                {/* Analysis Button */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={analyzeResume}
                    disabled={isAnalyzing || isUploading || !resumeText}
                    className="min-w-32"
                  >
                    {isUploading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading...
                      </div>
                    ) : isAnalyzing ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Analyzing...
                      </div>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Analyze Resume
                      </>
                    )}
                  </Button>
                </div>

                {/* Analysis Progress */}
                {isAnalyzing && (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Analysis Progress</span>
                          <span className="text-sm text-gray-500">{Math.round((analysisStep / 5) * 100)}%</span>
                        </div>
                        <Progress value={(analysisStep / 5) * 100} className="h-2" />
                        <p className="text-sm text-gray-600">
                          {analysisStep < 6 ? [
                            "Parsing resume structure...",
                            "Extracting skills and keywords...",
                            "Analyzing experience relevance...",
                            "Checking ATS compatibility...",
                            "Generating recommendations...",
                            "Finalizing analysis..."
                          ][analysisStep] : "Complete!"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              /* Analysis Results */
              <div className="space-y-6">
                {/* Overall Score */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>ATS Compatibility Score</span>
                      <Badge {...getScoreBadge(analysisResult.overallScore)}>
                        {getScoreBadge(analysisResult.overallScore).text}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className={`text-6xl font-bold ${getScoreColor(analysisResult.overallScore)} mb-2`}>
                        {analysisResult.overallScore}
                      </div>
                      <p className="text-gray-600 mb-4">Out of 100</p>
                      <Progress value={analysisResult.overallScore} className="h-3 mb-4" />
                      <p className="text-sm text-gray-700">
                        Your resume is {analysisResult.overallScore >= 80 ? "well-optimized" : 
                                       analysisResult.overallScore >= 60 ? "moderately optimized" : 
                                       "needs optimization"} for ATS systems
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Where To Improve</CardTitle>
                    <CardDescription>
                      Focus on the lowest areas first. They move your ATS result the most.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 md:grid-cols-2">
                    {scoreCards.map((item) => (
                      <div key={item.name} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-600">{item.description}</p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-semibold ${getScoreColor(item.score)}`}>{item.score}%</p>
                            <p className="text-xs text-slate-500">{getScoreSummary(item.score)}</p>
                          </div>
                        </div>
                        <Progress value={item.score} className="mt-3 h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        What Is Already Strong
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {analysisResult.strongPoints.map((point, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <CheckCircle className="mt-0.5 h-4 w-4 text-green-500" />
                            <span className="text-sm">{point}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="h-5 w-5" />
                        What Needs Work
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {needsWork.length > 0 ? needsWork.map((item, index) => (
                          <div key={index} className="flex items-start gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 text-orange-500" />
                            <span className="text-sm">{item}</span>
                          </div>
                        )) : (
                          <p className="text-sm text-slate-600">No major ATS weaknesses were detected.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 3 Fixes To Improve Your Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {priorityFixes.map((fix, index) => (
                        <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                            {index + 1}
                          </span>
                          <span className="text-sm text-slate-700">{fix}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {improvementSuggestions.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-blue-600" />
                        ATS Improvement Assistant
                      </CardTitle>
                      <CardDescription>
                        Choose a targeted fix below to turn weak ATS areas into stronger resume wording.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        {improvementSuggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => setSelectedSuggestionId(suggestion.id)}
                            className={`rounded-xl border p-4 text-left transition-colors ${
                              selectedSuggestion?.id === suggestion.id
                                ? "border-blue-300 bg-blue-50"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <p className="font-medium text-slate-900">{suggestion.title}</p>
                            <p className="mt-1 text-sm text-slate-600">{suggestion.helper}</p>
                          </button>
                        ))}
                      </div>

                      {selectedSuggestion ? (
                        <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original</p>
                            <div className="mt-1 rounded-lg border bg-white p-3 text-sm text-slate-700">
                              {selectedSuggestion.original}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested rewrite</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(selectedSuggestion.improved);
                                    toast({
                                      title: "Suggestion copied",
                                      description: "You can now paste this improved version into your resume.",
                                    });
                                  } catch (error) {
                                    console.error("Failed to copy ATS suggestion:", error);
                                    toast({
                                      title: "Copy failed",
                                      description: "The improved suggestion could not be copied. Please try again.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy suggestion
                              </Button>
                            </div>
                            <div className="mt-1 rounded-lg border border-blue-100 bg-white p-3 text-sm text-slate-800">
                              {selectedSuggestion.improved}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Why this helps</p>
                            <p className="mt-1 text-sm text-slate-600">{selectedSuggestion.reason}</p>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}

                {hasTargetJobDescription && analysisResult.missingKeywords.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="h-5 w-5" />
                        Missing Keywords
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.missingKeywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-orange-600 border-orange-200">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {hasTargetJobDescription && analysisResult.matchedKeywords.length > 0 ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        Matched Keywords
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.matchedKeywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-green-600 bg-green-50">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {analysisResult.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <span className="text-blue-600 font-semibold text-sm mt-0.5">{index + 1}.</span>
                          <span className="text-sm text-gray-700">{suggestion}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setAnalysisResult(null)}>
                    Analyze Another Resume
                  </Button>
                  <Button onClick={() => {
                    // Generate and download report
                    const reportData = `ATS Analysis Report
Generated: ${new Date().toLocaleDateString()}

Overall Score: ${analysisResult.overallScore}/100

Detailed Scores:
- Skills Match: ${analysisResult.skillsScore}%
- Experience Relevance: ${analysisResult.experienceScore}%
- Format Compatibility: ${analysisResult.formatScore}%
- Keyword Optimization: ${analysisResult.keywordsScore}%

Strong Points:
${analysisResult.strongPoints.map(point => `• ${point}`).join('\n')}

Missing Keywords:
${analysisResult.missingKeywords.map(keyword => `• ${keyword}`).join('\n')}

Matched Keywords:
${analysisResult.matchedKeywords.map(keyword => `• ${keyword}`).join('\n')}

Recommendations:
${analysisResult.suggestions.map((suggestion, i) => `${i + 1}. ${suggestion}`).join('\n')}
`;
                    
                    const blob = new Blob([reportData], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'ats-analysis-report.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                  <Button onClick={onClose}>
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
