import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { ScrollArea } from "../components/ui/scroll-area";
import { 
  Target, TrendingUp, MapPin, DollarSign, Building, 
  Star, Sparkles, Brain, CheckCircle, Clock, ExternalLink,
  Users, Calendar, Award, Zap
} from "lucide-react";

interface JobMatch {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  matchPercentage: number;
  matchReasons: string[];
  skillsMatched: string[];
  skillsGaps: string[];
  description: string;
  requirements: string[];
  isRemote: boolean;
  experienceLevel: string;
  postedDate: Date;
  urgency: "low" | "medium" | "high";
}

interface AIJobMatcherProps {
  userSkills?: string[];
  userExperience?: string;
  userPreferences?: {
    location?: string;
    remote?: boolean;
    salaryRange?: string;
    jobType?: string;
  };
  onJobSelect?: (job: JobMatch) => void;
}

export default function AIJobMatcher({ 
  userSkills = [], 
  userExperience = "",
  userPreferences = {},
  onJobSelect 
}: AIJobMatcherProps) {
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisStep, setAnalysisStep] = useState(0);

  useEffect(() => {
    generateJobMatches();
  }, [userSkills, userExperience, userPreferences]);

  const generateJobMatches = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis process
    const steps = [
      "Analyzing your skills and experience...",
      "Matching with current job openings...",
      "Calculating compatibility scores...",
      "Identifying skill gaps and opportunities...",
      "Ranking recommendations by relevance..."
    ];

    for (let i = 0; i < steps.length; i++) {
      setAnalysisStep(i);
      await new Promise(resolve => setTimeout(resolve, 600));
    }

    // Platform-specific job matches from ReferralMe database only
    const platformJobs: JobMatch[] = [
      {
        id: "1",
        title: "Frontend Engineer",
        company: "ReferralMe Partner - TechFlow Inc.",
        location: "San Francisco, CA",
        salary: "$120,000 - $160,000",
        matchPercentage: 94,
        matchReasons: [
          "Posted by verified referrer on ReferralMe",
          "React.js experience matches perfectly",
          "TypeScript proficiency aligns with role",
          "Available through our referral network"
        ],
        skillsMatched: ["React", "TypeScript", "JavaScript", "Node.js", "Git"],
        skillsGaps: ["GraphQL", "Docker"],
        description: "Posted by Sarah M., Senior Engineering Manager. Join our team through ReferralMe referral network to build next-generation web applications using React and TypeScript.",
        requirements: ["3+ years React experience", "TypeScript proficiency", "Strong problem-solving skills"],
        isRemote: false,
        experienceLevel: "senior",
        postedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        urgency: "high"
      },
      {
        id: "2",
        title: "Full Stack Developer",
        company: "ReferralMe Partner - InnovateLab",
        location: "Remote (US)",
        salary: "$100,000 - $140,000",
        matchPercentage: 87,
        matchReasons: [
          "Posted by verified referrer Mike Chen on ReferralMe",
          "Full stack experience matches requirements",
          "Remote work preference perfectly aligned",
          "Node.js skills highly valued by this referrer"
        ],
        skillsMatched: ["React", "Node.js", "JavaScript", "PostgreSQL"],
        skillsGaps: ["AWS", "Kubernetes", "MongoDB"],
        description: "Posted by Mike Chen, Tech Lead. Build and scale our platform through our ReferralMe referral network. Work with cutting-edge technologies in a fully remote environment.",
        requirements: ["2+ years full stack experience", "React and Node.js", "Database experience"],
        isRemote: true,
        experienceLevel: "mid",
        postedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        urgency: "medium"
      },
      {
        id: "3",
        title: "React Developer",
        company: "ReferralMe Partner - DataCorp Solutions",
        location: "Austin, TX",
        salary: "$85,000 - $110,000",
        matchPercentage: 82,
        matchReasons: [
          "Posted by Jennifer Rodriguez on ReferralMe",
          "React specialization is perfect match",
          "Mid-level experience requirement fits perfectly",
          "Available through our referral network"
        ],
        skillsMatched: ["React", "JavaScript", "HTML/CSS", "Git"],
        skillsGaps: ["Redux", "Testing frameworks", "CI/CD"],
        description: "Posted by Jennifer Rodriguez, Senior Developer. Lead React development for our data visualization platform through ReferralMe network. Great opportunity to work with complex data interfaces.",
        requirements: ["2+ years React experience", "Strong JavaScript skills", "Experience with data visualization"],
        isRemote: false,
        experienceLevel: "mid",
        postedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        urgency: "low"
      },
      {
        id: "4",
        title: "Frontend Engineering Lead",
        company: "CloudTech Dynamics",
        location: "Seattle, WA",
        salary: "$140,000 - $180,000",
        matchPercentage: 76,
        matchReasons: [
          "Leadership experience valued",
          "Strong technical foundation",
          "Cloud technology focus alignment",
          "High growth company culture fit"
        ],
        skillsMatched: ["React", "TypeScript", "Leadership", "Architecture"],
        skillsGaps: ["Team management", "System design", "Microservices"],
        description: "Lead a team of frontend engineers building cloud-native applications. Opportunity to shape technical direction and mentor developers.",
        requirements: ["5+ years frontend experience", "Leadership experience", "System design knowledge"],
        isRemote: false,
        experienceLevel: "senior",
        postedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        urgency: "high"
      }
    ];

    setJobMatches(platformJobs);
    setIsAnalyzing(false);
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600";
    if (percentage >= 80) return "text-blue-600";
    if (percentage >= 70) return "text-yellow-600";
    return "text-gray-600";
  };

  const getMatchBadge = (percentage: number) => {
    if (percentage >= 90) return { variant: "default" as const, text: "Excellent Match", color: "bg-green-500" };
    if (percentage >= 80) return { variant: "secondary" as const, text: "Good Match", color: "bg-blue-500" };
    if (percentage >= 70) return { variant: "outline" as const, text: "Fair Match", color: "bg-yellow-500" };
    return { variant: "outline" as const, text: "Potential Match", color: "bg-gray-500" };
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-yellow-600 bg-yellow-50";
      case "low": return "text-green-600 bg-green-50";
      default: return "text-gray-600 bg-gray-50";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const diffInHours = Math.floor((new Date().getTime() - date.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Job Matching
          </CardTitle>
          <CardDescription>Analyzing your profile for personalized job recommendations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Analysis Progress</span>
              <span className="text-sm text-gray-500">{Math.round((analysisStep / 4) * 100)}%</span>
            </div>
            <Progress value={(analysisStep / 4) * 100} className="h-2" />
            <p className="text-sm text-gray-600">
              {analysisStep < 5 ? [
                "Analyzing your skills and experience...",
                "Matching with current job openings...",
                "Calculating compatibility scores...",
                "Identifying skill gaps and opportunities...",
                "Ranking recommendations by relevance..."
              ][analysisStep] : "Complete!"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-blue-600" />
                AI-Powered Job Recommendations
              </CardTitle>
              <CardDescription>
                Personalized matches based on your skills, experience, and preferences
              </CardDescription>
            </div>
            <Button variant="outline" onClick={generateJobMatches}>
              <Zap className="h-4 w-4 mr-2" />
              Refresh Matches
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Matches</p>
                  <p className="text-2xl font-bold text-blue-700">{jobMatches.length}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Excellent Matches</p>
                  <p className="text-2xl font-bold text-green-700">
                    {jobMatches.filter(job => job.matchPercentage >= 90).length}
                  </p>
                </div>
                <Star className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">High Urgency</p>
                  <p className="text-2xl font-bold text-yellow-700">
                    {jobMatches.filter(job => job.urgency === "high").length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Remote Options</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {jobMatches.filter(job => job.isRemote).length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {jobMatches.map((job) => (
          <Card key={job.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                    <Badge {...getMatchBadge(job.matchPercentage)}>
                      {getMatchBadge(job.matchPercentage).text}
                    </Badge>
                    <Badge className={`text-xs ${getUrgencyColor(job.urgency)}`}>
                      {job.urgency} priority
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Building className="h-4 w-4" />
                      {job.company}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {job.salary}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTimeAgo(job.postedDate)}
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-4 line-clamp-2">{job.description}</p>
                </div>
                
                <div className="text-center ml-6">
                  <div className={`text-3xl font-bold ${getMatchColor(job.matchPercentage)} mb-1`}>
                    {job.matchPercentage}%
                  </div>
                  <p className="text-xs text-gray-500">Match Score</p>
                  <Progress value={job.matchPercentage} className="w-16 h-2 mt-2" />
                </div>
              </div>

              {/* Match Analysis */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Why This Is a Good Match:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {job.matchReasons.map((reason, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-green-600 mb-2">Matching Skills:</h4>
                    <div className="flex flex-wrap gap-1">
                      {job.skillsMatched.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-green-100 text-green-800">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-orange-600 mb-2">Skills to Develop:</h4>
                    <div className="flex flex-wrap gap-1">
                      {job.skillsGaps.map((skill, index) => (
                        <Badge key={index} variant="outline" className="text-xs text-orange-600 border-orange-200">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => onJobSelect?.(job)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Apply Now
                    </Button>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Award className="h-3 w-3" />
                      {job.experienceLevel} level
                    </span>
                    {job.isRemote && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Remote OK
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}