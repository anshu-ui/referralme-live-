import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { 
  Trophy, Star, Award, Crown, Shield, Medal, Zap, 
  Target, TrendingUp, Users, Briefcase, CheckCircle,
  Gift, Flame, Bolt, Calendar, Sparkles
} from "lucide-react";
import { useReferrerStats } from "../hooks/useReferrerStats";
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface RealTimeGamificationProps {
  userId: string;
  onRewardEarned?: (reward: any) => void;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  requirement: number;
  type: 'jobs_posted' | 'referrals_given' | 'placements' | 'impact_score';
  unlocked: boolean;
  progress: number;
  maxProgress: number;
}

interface Reward {
  id: string;
  title: string;
  description: string;
  points: number;
  type: 'badge' | 'points' | 'feature_unlock';
  earned: boolean;
  earnedAt?: Date;
}

export default function RealTimeGamification({ userId, onRewardEarned }: RealTimeGamificationProps) {
  const { stats, loading } = useReferrerStats(userId);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [pointsToNextLevel, setPointsToNextLevel] = useState(100);
  const [totalPoints, setTotalPoints] = useState(0);

  // Define achievements based on real metrics
  const achievementDefinitions: Omit<Achievement, 'unlocked' | 'progress' | 'maxProgress'>[] = [
    {
      id: 'first_job_post',
      title: 'Getting Started',
      description: 'Post your first job opportunity',
      icon: Briefcase,
      color: 'bg-blue-100 text-blue-700',
      requirement: 1,
      type: 'jobs_posted'
    },
    {
      id: 'job_poster',
      title: 'Job Creator',
      description: 'Post 5 job opportunities',
      icon: Target,
      color: 'bg-green-100 text-green-700',
      requirement: 5,
      type: 'jobs_posted'
    },
    {
      id: 'prolific_poster',
      title: 'Prolific Poster',
      description: 'Post 10 job opportunities',
      icon: Trophy,
      color: 'bg-purple-100 text-purple-700',
      requirement: 10,
      type: 'jobs_posted'
    },
    {
      id: 'first_referral',
      title: 'First Helper',
      description: 'Give your first referral',
      icon: Users,
      color: 'bg-orange-100 text-orange-700',
      requirement: 1,
      type: 'referrals_given'
    },
    {
      id: 'referral_expert',
      title: 'Referral Expert',
      description: 'Give 10 referrals',
      icon: Star,
      color: 'bg-yellow-100 text-yellow-700',
      requirement: 10,
      type: 'referrals_given'
    },
    {
      id: 'placement_master',
      title: 'Placement Master',
      description: 'Complete 5 successful placements',
      icon: Crown,
      color: 'bg-red-100 text-red-700',
      requirement: 5,
      type: 'placements'
    },
    {
      id: 'impact_leader',
      title: 'Impact Leader',
      description: 'Reach 500 impact score',
      icon: Bolt,
      color: 'bg-indigo-100 text-indigo-700',
      requirement: 500,
      type: 'impact_score'
    },
    {
      id: 'legend',
      title: 'Platform Legend',
      description: 'Reach 1000 impact score',
      icon: Award,
      color: 'bg-pink-100 text-pink-700',
      requirement: 1000,
      type: 'impact_score'
    }
  ];

  // Calculate achievements progress
  useEffect(() => {
    if (loading) return;

    const updatedAchievements = achievementDefinitions.map(def => {
      let currentValue = 0;
      
      switch (def.type) {
        case 'jobs_posted':
          currentValue = stats.jobsPosted;
          break;
        case 'referrals_given':
          currentValue = stats.referralsGiven;
          break;
        case 'placements':
          currentValue = stats.successfulPlacements;
          break;
        case 'impact_score':
          currentValue = stats.impactScore;
          break;
      }

      const unlocked = currentValue >= def.requirement;
      const progress = Math.min(currentValue, def.requirement);

      return {
        ...def,
        unlocked,
        progress,
        maxProgress: def.requirement
      };
    });

    setAchievements(updatedAchievements);

    // Calculate level and points
    const points = stats.impactScore + (stats.jobsPosted * 10) + (stats.referralsGiven * 15) + (stats.successfulPlacements * 50);
    setTotalPoints(points);
    
    const level = Math.floor(points / 100) + 1;
    setCurrentLevel(level);
    setPointsToNextLevel(100 - (points % 100));

    // Check for newly unlocked achievements
    updatedAchievements.forEach(achievement => {
      if (achievement.unlocked && !stats.achievements?.includes(achievement.id)) {
        // Award achievement
        updateUserAchievement(achievement);
      }
    });
  }, [stats, loading]);

  const updateUserAchievement = async (achievement: Achievement) => {
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        achievements: arrayUnion(achievement.id),
        totalPoints: totalPoints + 50, // Bonus points for achievement
        lastAchievement: achievement.title,
        lastAchievementDate: new Date()
      });

      if (onRewardEarned) {
        onRewardEarned({
          type: 'achievement',
          title: achievement.title,
          description: achievement.description,
          points: 50
        });
      }
    } catch (error) {
      console.error("Error updating achievement:", error);
    }
  };

  const getProgressColor = (progress: number, max: number) => {
    const percentage = (progress / max) * 100;
    if (percentage === 100) return "bg-green-500";
    if (percentage >= 80) return "bg-yellow-500";
    if (percentage >= 50) return "bg-blue-500";
    return "bg-gray-300";
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Level Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Your Level Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-2xl font-bold text-purple-600">Level {currentLevel}</p>
                <p className="text-sm text-gray-600">{totalPoints} total points earned</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{pointsToNextLevel} points to next level</p>
                <Badge className="mt-1 bg-purple-100 text-purple-700">
                  {Math.round(((100 - pointsToNextLevel) / 100) * 100)}% Complete
                </Badge>
              </div>
            </div>
            <Progress 
              value={(100 - pointsToNextLevel)} 
              className="h-3"
            />
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <div className="text-2xl font-bold text-blue-600">{stats.jobsPosted}</div>
            <div className="text-xs text-gray-600">Jobs Posted</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
            <div className="text-2xl font-bold text-green-600">{stats.referralsGiven}</div>
            <div className="text-xs text-gray-600">Referrals Given</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" />
            <div className="text-2xl font-bold text-purple-600">{stats.successfulPlacements}</div>
            <div className="text-xs text-gray-600">Successful Placements</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Bolt className="h-8 w-8 mx-auto text-orange-600 mb-2" />
            <div className="text-2xl font-bold text-orange-600">{stats.impactScore}</div>
            <div className="text-xs text-gray-600">Impact Score</div>
          </CardContent>
        </Card>
      </div>

      {/* Achievements Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Achievements & Badges ({achievements.filter(a => a.unlocked).length}/{achievements.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => {
              const IconComponent = achievement.icon;
              const isCompleted = achievement.unlocked;
              
              return (
                <div
                  key={achievement.id}
                  className={`p-4 rounded-lg border-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'border-green-200 bg-green-50 shadow-md' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      isCompleted ? achievement.color : 'bg-gray-200 text-gray-500'
                    }`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-semibold ${
                          isCompleted ? 'text-green-800' : 'text-gray-700'
                        }`}>
                          {achievement.title}
                        </h3>
                        {isCompleted && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {achievement.description}
                      </p>
                      
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">
                            {achievement.progress} / {achievement.maxProgress}
                          </span>
                          <span className="font-medium">
                            {Math.round((achievement.progress / achievement.maxProgress) * 100)}%
                          </span>
                        </div>
                        <Progress 
                          value={(achievement.progress / achievement.maxProgress) * 100}
                          className="h-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions for Earning More Points */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            Earn More Points
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Briefcase className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <h4 className="font-semibold mb-1">Post Jobs</h4>
              <p className="text-sm text-gray-600 mb-2">+10 points per job</p>
              <Badge variant="outline">Active</Badge>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Users className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <h4 className="font-semibold mb-1">Give Referrals</h4>
              <p className="text-sm text-gray-600 mb-2">+15 points per referral</p>
              <Badge variant="outline">Active</Badge>
            </div>
            
            <div className="text-center p-4 border rounded-lg">
              <Trophy className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <h4 className="font-semibold mb-1">Complete Placements</h4>
              <p className="text-sm text-gray-600 mb-2">+50 points per placement</p>
              <Badge variant="outline">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}