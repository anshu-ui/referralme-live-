import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { useToast } from "../hooks/use-toast";
import { Upload, FileText, Target, CheckCircle, AlertCircle, X, Download, Sparkles } from "lucide-react";
import { analyzeResumeWithGemini, extractTextFromFile, type ATSAnalysisResult } from "../lib/gemini-ats";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { saveATSAnalysis } from "../lib/firestore";

interface ATSAnalyzerProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalysisComplete?: (result: any) => void;
  jobTitle?: string;
  company?: string;
}

export default function ATSAnalyzer({ isOpen, onClose, onAnalysisComplete, jobTitle, company }: ATSAnalyzerProps) {
  const { toast } = useToast();
  const { user } = useFirebaseAuth();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ATSAnalysisResult | null>(null);
  const [analysisStep, setAnalysisStep] = useState(0);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.type === "application/msword" || file.type.includes("wordprocessingml")) {
        setResumeFile(file);
        
        // Extract text from file
        extractTextFromFile(file).then((text) => {
          setResumeText(text);
          console.log("✅ Resume text extracted successfully");
        }).catch((error) => {
          console.error("Failed to extract text:", error);
          toast({
            title: "Text extraction failed",
            description: "Could not extract text from the file. Please try a different file.",
            variant: "destructive"
          });
        });
      } else {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document.",
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
      console.log("🤖 Starting Gemini ATS analysis...");
      // Use Gemini AI for real analysis
      const result = await analyzeResumeWithGemini(resumeText, jobDescription);
      
      setAnalysisResult(result);
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
        description: "There was an error analyzing your resume. Please try again.",
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
            Get an AI-powered analysis of your resume's ATS compatibility and optimization suggestions
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
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">
                          {resumeFile ? resumeFile.name : "Click to upload resume"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Supports PDF, DOC, DOCX files up to 10MB
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
                  </CardContent>
                </Card>

                {/* Job Description Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Target Job Description (Optional)</CardTitle>
                    <CardDescription>
                      Paste a job description to get more targeted keyword suggestions
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
                    disabled={isAnalyzing || !resumeText}
                    className="min-w-32"
                  >
                    {isAnalyzing ? (
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

                {/* Detailed Scores */}
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { name: "Skills Match", score: analysisResult.skillsScore },
                      { name: "Experience Relevance", score: analysisResult.experienceScore },
                      { name: "Format Compatibility", score: analysisResult.formatScore },
                      { name: "Keyword Optimization", score: analysisResult.keywordsScore }
                    ].map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="font-medium">{item.name}</span>
                        <div className="flex items-center gap-3 w-40">
                          <Progress value={item.score} className="flex-1 h-2" />
                          <span className={`font-semibold ${getScoreColor(item.score)}`}>
                            {item.score}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Strong Points */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      Strong Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2">
                      {analysisResult.strongPoints.map((point, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm">{point}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Missing Keywords */}
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

                {/* Matched Keywords */}
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

                {/* Recommendations */}
                <Card>
                  <CardHeader>
                    <CardTitle>AI Recommendations</CardTitle>
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