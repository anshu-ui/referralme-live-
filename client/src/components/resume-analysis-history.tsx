import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  Target,
  Award,
  AlertCircle,
  CheckCircle2,
  Brain,
  Sparkles,
  BarChart3,
  Download,
  Trash2,
  Eye
} from "lucide-react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { getUserATSAnalysisHistory, getUserATSStats, deleteATSAnalysis, type ATSAnalysisHistory } from "../lib/firestore";
import { useToast } from "../hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface ResumeAnalysisHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ResumeAnalysisHistory({ isOpen, onClose }: ResumeAnalysisHistoryProps) {
  const { user } = useFirebaseAuth();
  const { toast } = useToast();
  const [analyses, setAnalyses] = useState<ATSAnalysisHistory[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<ATSAnalysisHistory | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadHistory();
    }
  }, [isOpen, user]);

  const loadHistory = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const [history, statistics] = await Promise.all([
        getUserATSAnalysisHistory(user.uid),
        getUserATSStats(user.uid)
      ]);
      
      setAnalyses(history);
      setStats(statistics);
    } catch (error) {
      console.error("Error loading analysis history:", error);
      toast({
        title: "Error",
        description: "Failed to load analysis history",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (analysisId: string) => {
    try {
      await deleteATSAnalysis(analysisId);
      toast({
        title: "Success",
        description: "Analysis deleted successfully"
      });
      loadHistory();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete analysis",
        variant: "destructive"
      });
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800 border-green-200";
    if (score >= 60) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    return "bg-red-100 text-red-800 border-red-200";
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const viewDetails = (analysis: ATSAnalysisHistory) => {
    setSelectedAnalysis(analysis);
    setShowDetails(true);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <Brain className="w-6 h-6 text-primary" />
              Resume Analysis History
            </DialogTitle>
            <DialogDescription>
              Track your progress and see how your resume improves over time
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {/* Statistics Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="border-2 border-primary/20 hover:border-primary/40 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Analyses</p>
                          <p className="text-3xl font-bold text-primary">{stats.totalAnalyses}</p>
                        </div>
                        <FileText className="w-10 h-10 text-primary/20" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="border-2 border-blue-200 hover:border-blue-400 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-700 mb-1">Average Score</p>
                          <p className="text-3xl font-bold text-blue-800">{stats.averageScore}%</p>
                        </div>
                        <Target className="w-10 h-10 text-blue-200" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="border-2 border-green-200 hover:border-green-400 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-green-700 mb-1">Best Score</p>
                          <p className="text-3xl font-bold text-green-800">{stats.highestScore}%</p>
                        </div>
                        <Award className="w-10 h-10 text-green-200" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className={`border-2 transition-all ${stats.improvement >= 0 ? 'border-green-200 hover:border-green-400' : 'border-red-200 hover:border-red-400'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs mb-1 ${stats.improvement >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                            Improvement
                          </p>
                          <p className={`text-3xl font-bold ${stats.improvement >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                            {stats.improvement >= 0 ? '+' : ''}{stats.improvement}%
                          </p>
                        </div>
                        {stats.improvement >= 0 ? (
                          <TrendingUp className="w-10 h-10 text-green-200" />
                        ) : (
                          <TrendingDown className="w-10 h-10 text-red-200" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            )}

            {/* Analysis History List */}
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : analyses.length === 0 ? (
              <div className="text-center py-12">
                <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-2">No analysis history yet</p>
                <p className="text-sm text-gray-500">
                  Start analyzing your resume to track your progress
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Your Resume Analyses ({analyses.length})
                </h3>
                
                <AnimatePresence mode="popLayout">
                  {analyses.map((analysis, index) => (
                    <motion.div
                      key={analysis.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      layout
                    >
                      <Card className="hover:shadow-lg transition-all border-2 hover:border-primary/30">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row gap-4">
                            {/* Score Circle */}
                            <div className="flex-shrink-0">
                              <div className="relative w-20 h-20 md:w-24 md:h-24">
                                <svg className="w-full h-full transform -rotate-90">
                                  <circle
                                    cx="50%"
                                    cy="50%"
                                    r="35%"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    className="text-gray-200"
                                  />
                                  <circle
                                    cx="50%"
                                    cy="50%"
                                    r="35%"
                                    stroke="currentColor"
                                    strokeWidth="8"
                                    fill="none"
                                    strokeDasharray={`${2 * Math.PI * 35}`}
                                    strokeDashoffset={`${2 * Math.PI * 35 * (1 - analysis.overallScore / 100)}`}
                                    className={getScoreColor(analysis.overallScore)}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                                    {analysis.overallScore}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Analysis Details */}
                            <div className="flex-1 space-y-3">
                              <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div>
                                    {analysis.jobTitle && (
                                      <h4 className="font-semibold text-gray-900">
                                        {analysis.jobTitle}
                                      </h4>
                                    )}
                                    {analysis.company && (
                                      <p className="text-sm text-gray-600">{analysis.company}</p>
                                    )}
                                  </div>
                                  <Badge className={`${getScoreBadgeColor(analysis.overallScore)} border`}>
                                    {analysis.overallScore >= 80 ? 'Excellent' : analysis.overallScore >= 60 ? 'Good' : 'Needs Work'}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                                  {analysis.skillsScore !== undefined && (
                                    <div className="text-xs">
                                      <p className="text-gray-500">Skills</p>
                                      <Progress value={analysis.skillsScore} className="h-2 mt-1" />
                                      <p className="text-gray-700 font-medium mt-1">{analysis.skillsScore}%</p>
                                    </div>
                                  )}
                                  {analysis.experienceScore !== undefined && (
                                    <div className="text-xs">
                                      <p className="text-gray-500">Experience</p>
                                      <Progress value={analysis.experienceScore} className="h-2 mt-1" />
                                      <p className="text-gray-700 font-medium mt-1">{analysis.experienceScore}%</p>
                                    </div>
                                  )}
                                  {analysis.formatScore !== undefined && (
                                    <div className="text-xs">
                                      <p className="text-gray-500">Format</p>
                                      <Progress value={analysis.formatScore} className="h-2 mt-1" />
                                      <p className="text-gray-700 font-medium mt-1">{analysis.formatScore}%</p>
                                    </div>
                                  )}
                                  {analysis.keywordsScore !== undefined && (
                                    <div className="text-xs">
                                      <p className="text-gray-500">Keywords</p>
                                      <Progress value={analysis.keywordsScore} className="h-2 mt-1" />
                                      <p className="text-gray-700 font-medium mt-1">{analysis.keywordsScore}%</p>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(analysis.analyzedAt)}
                                  </span>
                                  {analysis.suggestions && (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span className="flex items-center gap-1">
                                        <Sparkles className="w-3 h-3" />
                                        {analysis.suggestions.length} suggestions
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => viewDetails(analysis)}
                                  data-testid={`button-view-analysis-${analysis.id}`}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  View Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => analysis.id && handleDelete(analysis.id)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  data-testid={`button-delete-analysis-${analysis.id}`}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t bg-gray-50">
            <Button
              onClick={onClose}
              className="w-full md:w-auto"
              variant="outline"
              data-testid="button-close-history"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      {selectedAnalysis && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Analysis Details
              </DialogTitle>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {/* Score Breakdown */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Score Breakdown
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600">Overall</p>
                      <p className="text-2xl font-bold text-primary">{selectedAnalysis.overallScore}%</p>
                    </div>
                    {selectedAnalysis.skillsScore !== undefined && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Skills</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedAnalysis.skillsScore}%</p>
                      </div>
                    )}
                    {selectedAnalysis.experienceScore !== undefined && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Experience</p>
                        <p className="text-2xl font-bold text-green-600">{selectedAnalysis.experienceScore}%</p>
                      </div>
                    )}
                    {selectedAnalysis.formatScore !== undefined && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-sm text-gray-600">Format</p>
                        <p className="text-2xl font-bold text-purple-600">{selectedAnalysis.formatScore}%</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggestions */}
                {selectedAnalysis.suggestions && selectedAnalysis.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Suggestions for Improvement
                    </h4>
                    <ul className="space-y-2">
                      {selectedAnalysis.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex gap-2 text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                          <span className="text-yellow-600 font-bold">{index + 1}.</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Strong Points */}
                {selectedAnalysis.strongPoints && selectedAnalysis.strongPoints.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      Strong Points
                    </h4>
                    <ul className="space-y-2">
                      {selectedAnalysis.strongPoints.map((point, index) => (
                        <li key={index} className="flex gap-2 text-sm text-gray-700 bg-green-50 p-3 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Keywords */}
                {selectedAnalysis.missingKeywords && selectedAnalysis.missingKeywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Missing Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnalysis.missingKeywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matched Keywords */}
                {selectedAnalysis.matchedKeywords && selectedAnalysis.matchedKeywords.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Matched Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAnalysis.matchedKeywords.map((keyword, index) => (
                        <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
