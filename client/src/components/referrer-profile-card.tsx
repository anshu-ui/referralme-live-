import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  Star, Trophy, Users, Briefcase, Award, Eye, 
  ExternalLink, Crown, Shield, Medal, Zap 
} from "lucide-react";

interface ReferrerProfileCardProps {
  referrer: {
    id: string;
    name: string;
    email: string;
    photoURL?: string;
    jobTitle?: string;
    company?: string;
    bio?: string;
    reputationLevel: 'newcomer' | 'helper' | 'expert' | 'legend';
    impactScore: number;
    totalJobsPosted: number;
    successfulPlacements: number;
    testimonialCount: number;
    averageRating: number;
    profileViews: number;
    achievements: string[];
  };
  onViewProfile: (referrerId: string) => void;
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

const ACHIEVEMENT_ICONS = {
  'Career Maker': Trophy,
  'Top Performer': Star,
  'Streak Master': Zap,
  'Community Leader': Users,
  'Rising Star': Medal,
};

export default function ReferrerProfileCard({ referrer, onViewProfile }: ReferrerProfileCardProps) {
  const reputationConfig = REPUTATION_CONFIG[referrer.reputationLevel];
  const ReputationIcon = reputationConfig.icon;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={referrer.photoURL} />
              <AvatarFallback>
                {referrer.name?.charAt(0) || referrer.email?.charAt(0) || "R"}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{referrer.name || "Professional Referrer"}</CardTitle>
              <p className="text-sm text-gray-600">
                {referrer.jobTitle && referrer.company 
                  ? `${referrer.jobTitle} at ${referrer.company}`
                  : referrer.jobTitle || referrer.company || "Professional"}
              </p>
            </div>
          </div>
          <Badge className={`${reputationConfig.color} flex items-center gap-1`}>
            <ReputationIcon className="h-3 w-3" />
            {reputationConfig.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Impact Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-700">{referrer.successfulPlacements}</div>
            <div className="text-xs text-green-600">Successful Placements</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-700">{referrer.impactScore}</div>
            <div className="text-xs text-blue-600">Impact Score</div>
          </div>
        </div>

        {/* Rating */}
        {referrer.averageRating > 0 && (
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.floor(referrer.averageRating) 
                      ? 'text-yellow-500 fill-current' 
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {referrer.averageRating.toFixed(1)} ({referrer.testimonialCount} reviews)
            </span>
          </div>
        )}

        {/* Top Achievements */}
        {referrer.achievements.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Top Achievements</div>
            <div className="flex flex-wrap gap-1">
              {referrer.achievements.slice(0, 3).map((achievement, index) => {
                const AchievementIcon = ACHIEVEMENT_ICONS[achievement as keyof typeof ACHIEVEMENT_ICONS] || Trophy;
                return (
                  <Badge key={index} variant="outline" className="text-xs flex items-center gap-1">
                    <AchievementIcon className="h-3 w-3" />
                    {achievement}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Bio */}
        {referrer.bio && (
          <p className="text-sm text-gray-600 line-clamp-2">{referrer.bio}</p>
        )}

        {/* Quick Stats */}
        <div className="flex justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {referrer.totalJobsPosted} jobs posted
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {referrer.profileViews} views
          </div>
        </div>

        {/* View Profile Button */}
        <Button 
          onClick={() => onViewProfile(referrer.id)}
          className="w-full"
          variant="outline"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          View Full Profile
        </Button>
      </CardContent>
    </Card>
  );
}