import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  User, Phone, Mail, FileText, Award, Target, CheckCircle, 
  AlertCircle, XCircle, Download, ExternalLink, MessageCircle,
  Clock, Calendar, Briefcase, TrendingUp
} from "lucide-react";
import jsPDF from "jspdf";

interface EnhancedRequestDetailsProps {
  request: any;
  onStatusChange: (requestId: string, newStatus: string) => void;
  onAddNotes: (requestId: string, notes: string) => void;
}

export default function EnhancedRequestDetails({ request, onStatusChange, onAddNotes }: EnhancedRequestDetailsProps) {
  const getATSScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 75) return "text-blue-600 bg-blue-50 border-blue-200";
    if (score >= 65) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getATSScoreIcon = (score: number) => {
    if (score >= 85) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (score >= 75) return <Target className="h-4 w-4 text-blue-600" />;
    if (score >= 65) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getCompatibilityBadge = (compatibility: string): "default" | "secondary" | "outline" | "destructive" => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      excellent: "default",
      good: "secondary", 
      fair: "outline",
      poor: "destructive"
    };
    return variants[compatibility] || "outline";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      accepted: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatExperienceLevel = (level: string) => {
    const levels = {
      entry: "Entry Level (0-2 years)",
      mid: "Mid Level (2-5 years)", 
      senior: "Senior Level (5-10 years)",
      lead: "Lead/Principal (10+ years)"
    };
    return levels[level as keyof typeof levels] || level;
  };

  const atsAnalysis = request.atsAnalysis ? JSON.parse(request.atsAnalysis) : null;

  return (
    <div className="space-y-6">
      {/* Header with Applicant Info */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12">
                <AvatarImage src={request.seeker?.profileImageUrl} />
                <AvatarFallback>
                  {request.fullName?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'UN'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold">{request.fullName}</h3>
                <p className="text-gray-600">{formatExperienceLevel(request.experienceLevel)}</p>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`${getStatusColor(request.status)} border-0`}>
                {request.status.replace('_', ' ').toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-500 mt-1">
                Applied {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{request.applicantEmail || request.seeker?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{request.phoneNumber}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ATS Analysis Results */}
      {request.atsScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              ATS Compatibility Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className={`p-4 rounded-lg border ${getATSScoreColor(request.atsScore)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getATSScoreIcon(request.atsScore)}
                    <div>
                      <p className="font-semibold">Overall ATS Score</p>
                      <Badge variant={getCompatibilityBadge(request.atsCompatibility)}>
                        {request.atsCompatibility?.toUpperCase()} Compatibility
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold">{request.atsScore}%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-gray-600">Keyword Match</p>
                  <p className="text-lg font-semibold">{request.keywordMatch}%</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-gray-600">Format Score</p>
                  <p className="text-lg font-semibold">{request.formatScore}%</p>
                </div>
                <div className="text-center p-3 border rounded-lg">
                  <p className="text-sm text-gray-600">Content Quality</p>
                  <p className="text-lg font-semibold">{request.contentScore}%</p>
                </div>
              </div>

              {atsAnalysis && (
                <div className="space-y-3">
                  <div>
                    <p className="font-medium text-sm text-gray-700 mb-2">Found Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {atsAnalysis.keywordAnalysis?.found?.map((keyword: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {atsAnalysis.keywordAnalysis?.missing?.length > 0 && (
                    <div>
                      <p className="font-medium text-sm text-red-600 mb-2">Missing Keywords:</p>
                      <div className="flex flex-wrap gap-1">
                        {atsAnalysis.keywordAnalysis.missing.map((keyword: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs border-red-200">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Application Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Application Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="font-semibold text-gray-700">Resume Summary</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{request.resumeText}</p>
            </div>
          </div>

          <div>
            <Label className="font-semibold text-gray-700">Motivation</Label>
            <div className="mt-1 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">{request.motivation}</p>
            </div>
          </div>

          {(request.resumeUrl || request.resumeText) && (
            <div>
              <Label className="font-semibold text-gray-700">Resume File</Label>
              <div className="mt-1 flex gap-2">
                {request.resumeUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                    onClick={() => {
                      if (!request.resumeUrl) return;
                      
                      // Most reliable way to trigger download across mobile/desktop for Firebase
                      // without CORS issues is to use a direct link with download attribute
                      // but for cross-origin, browsers usually ignore 'download' and just open it.
                      // To force download, we can try the blob method again but with better error handling.
                      
                      const triggerDownload = async () => {
                        try {
                          const response = await fetch(request.resumeUrl, { mode: 'cors' });
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.style.display = 'none';
                          a.href = url;
                          
                          let filename = 'resume_file.pdf';
                          try {
                            const decodedUrl = decodeURIComponent(request.resumeUrl);
                            const pathParts = decodedUrl.split('/');
                            const fileWithParams = pathParts[pathParts.length - 1];
                            filename = fileWithParams.split('?')[0] || 'resume.pdf';
                          } catch (e) {}
                          
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        } catch (err) {
                          console.error('Blob download failed, falling back to window.open', err);
                          // Fallback for mobile and CORS issues
                          const link = document.createElement('a');
                          link.href = request.resumeUrl;
                          link.target = '_blank';
                          link.rel = 'noopener noreferrer';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }
                      };
                      
                      triggerDownload();
                    }}
                    data-testid="button-download-original-resume"
                  >
                    <Download className="h-4 w-4" />
                    Download Original Resume
                  </Button>
                )}
                {request.resumeText && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-2"
                    onClick={() => {
                      // Generate PDF from resume text as backup
                      const doc = new jsPDF();
                      
                      // Add header
                      doc.setFontSize(18);
                      doc.setFont("helvetica", "bold");
                      doc.text(request.fullName || "Resume", 20, 20);
                      
                      // Add contact info
                      doc.setFontSize(10);
                      doc.setFont("helvetica", "normal");
                      let yPosition = 30;
                      
                      if (request.email) {
                        doc.text(`Email: ${request.email}`, 20, yPosition);
                        yPosition += 6;
                      }
                      if (request.phoneNumber) {
                        doc.text(`Phone: ${request.phoneNumber}`, 20, yPosition);
                        yPosition += 6;
                      }
                      if (request.experienceLevel) {
                        doc.text(`Experience: ${request.experienceLevel}`, 20, yPosition);
                        yPosition += 10;
                      }
                      
                      // Add resume content
                      doc.setFontSize(12);
                      doc.setFont("helvetica", "bold");
                      doc.text("Resume Summary", 20, yPosition);
                      yPosition += 8;
                      
                      doc.setFontSize(10);
                      doc.setFont("helvetica", "normal");
                      
                      // Split text into lines that fit the page width
                      const maxWidth = 170;
                      const lines = doc.splitTextToSize(request.resumeText, maxWidth);
                      
                      // Add text with page breaks if needed
                      for (let i = 0; i < lines.length; i++) {
                        if (yPosition > 270) {
                          doc.addPage();
                          yPosition = 20;
                        }
                        doc.text(lines[i], 20, yPosition);
                        yPosition += 6;
                      }
                      
                      // Add motivation if available
                      if (request.motivation) {
                        yPosition += 5;
                        if (yPosition > 270) {
                          doc.addPage();
                          yPosition = 20;
                        }
                        
                        doc.setFontSize(12);
                        doc.setFont("helvetica", "bold");
                        doc.text("Motivation", 20, yPosition);
                        yPosition += 8;
                        
                        doc.setFontSize(10);
                        doc.setFont("helvetica", "normal");
                        const motivationLines = doc.splitTextToSize(request.motivation, maxWidth);
                        
                        for (let i = 0; i < motivationLines.length; i++) {
                          if (yPosition > 270) {
                            doc.addPage();
                            yPosition = 20;
                          }
                          doc.text(motivationLines[i], 20, yPosition);
                          yPosition += 6;
                        }
                      }
                      
                      // Save the PDF
                      doc.save(`${request.fullName}_Resume_Summary.pdf`);
                    }}
                    data-testid="button-download-resume-summary"
                  >
                    <Download className="h-4 w-4" />
                    Download Summary PDF
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Application Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="font-semibold text-gray-700 mb-2 block">Referral Decision</Label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  variant={request.status === "accepted" ? "default" : "outline"}
                  onClick={() => onStatusChange(request.id, "accepted")}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Provide Referral
                </Button>
                <Button 
                  size="sm" 
                  variant={request.status === "rejected" ? "destructive" : "outline"}
                  onClick={() => onStatusChange(request.id, "rejected")}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Decline Referral
                </Button>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Choose to provide or decline the referral based on the candidate's qualifications and fit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}