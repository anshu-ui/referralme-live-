import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  Star, Trophy, Users, Briefcase, Award, Eye, 
  ExternalLink, Crown, Shield, Medal, Zap, MapPin,
  Calendar, Mail, Phone, Linkedin, Github, Globe
} from "lucide-react";
import { useReferrerStats } from "../hooks/useReferrerStats";

interface ReferrerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  referrer: {
    id: string;
    name: string;
    email: string;
    photoURL?: string;
    jobTitle?: string;
    company?: string;
    bio?: string;
    location?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    personalWebsite?: string;
    phone?: string;
    createdAt?: any;
    reputationLevel?: 'newcomer' | 'helper' | 'expert' | 'legend';
  };
}

const REPUTATION_CONFIG = {
  newcomer: { 
    label: 'Newcomer', 
    color: 'bg-gray-100 text-gray-700', 
    icon: Users 
  },
  helper: { 
    label: 'Helper', 
    color: 'bg-blue-100 text-blue-700', 
    icon: Shield 
  },
  expert: { 
    label: 'Expert', 
    color: 'bg-purple-100 text-purple-700', 
    icon: Award 
  },
  legend: { 
    label: 'Legend', 
    color: 'bg-yellow-100 text-yellow-700', 
    icon: Crown 
  }
};

export default function ReferrerProfileModal({ isOpen, onClose, referrer }: ReferrerProfileModalProps) {
  const { stats, loading } = useReferrerStats(referrer.id);
  
  const reputationConfig = REPUTATION_CONFIG[referrer.reputationLevel || 'newcomer'];
  const ReputationIcon = reputationConfig.icon;

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    try {
      return new Date(date.seconds * 1000).toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={referrer.photoURL} />
              <AvatarFallback>
                {referrer.name?.charAt(0) || referrer.email?.charAt(0) || "R"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span>{referrer.name}</span>
                <Badge className={reputationConfig.color}>
                  <ReputationIcon className="h-3 w-3 mr-1" />
                  {reputationConfig.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 font-normal">
                {referrer.jobTitle} {referrer.company && `at ${referrer.company}`}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4">
                  {referrer.bio || "No bio available."}
                </p>
                
                <div className="space-y-2">
                  {referrer.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {referrer.location}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Joined {formatDate(referrer.createdAt)}
                  </div>
                  
                  {referrer.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4" />
                      {referrer.email}
                    </div>
                  )}
                  
                  {referrer.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      {referrer.phone}
                    </div>
                  )}
                </div>

                {/* Social Links */}
                <div className="flex gap-2 mt-4">
                  {referrer.linkedinUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={referrer.linkedinUrl} target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4 mr-1" />
                        LinkedIn
                      </a>
                    </Button>
                  )}
                  
                  {referrer.githubUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={referrer.githubUrl} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4 mr-1" />
                        GitHub
                      </a>
                    </Button>
                  )}
                  
                  {referrer.personalWebsite && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={referrer.personalWebsite} target="_blank" rel="noopener noreferrer">
                        <Globe className="h-4 w-4 mr-1" />
                        Website
                      </a>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            {stats.achievements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {stats.achievements.map((achievement, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1">
                        <Medal className="h-3 w-3" />
                        {achievement}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Stats */}
          <div className="space-y-6">
            {/* Activity Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Activity Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Jobs Posted</span>
                      <span className="font-semibold text-blue-600">{stats.jobsPosted}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Referrals Given</span>
                      <span className="font-semibold text-green-600">{stats.referralsGiven}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Successful Placements</span>
                      <span className="font-semibold text-purple-600">{stats.successfulPlacements}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Impact Score</span>
                      <span className="font-semibold text-orange-600">{stats.impactScore}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Profile Views</span>
                      <span className="font-semibold text-gray-600">{stats.profileViews}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats.referralsGiven > 0 ? 
                      ((stats.successfulPlacements / stats.referralsGiven) * 100).toFixed(1) + '%'
                      : '0%'
                    }
                  </div>
                  <div className="text-xs text-gray-600">Success Rate</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {stats.totalReferrals || 0}
                  </div>
                  <div className="text-xs text-gray-600">Total Referrals</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}