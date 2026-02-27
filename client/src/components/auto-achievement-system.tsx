import { useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { trackEvent } from "../lib/analytics";

// Achievement definitions
const ACHIEVEMENTS = {
  FIRST_JOB_POST: {
    id: 'first_job_post',
    title: 'Getting Started',
    description: 'Posted your first job opportunity',
    icon: 'briefcase',
    color: 'blue',
    threshold: 1
  },
  CAREER_MAKER: {
    id: 'career_maker',
    title: 'Career Maker',
    description: 'Helped 10 people find jobs',
    icon: 'trophy',
    color: 'gold',
    threshold: 10
  },
  TOP_PERFORMER: {
    id: 'top_performer',
    title: 'Top Performer',
    description: 'Achieved 100+ impact score',
    icon: 'star',
    color: 'purple',
    threshold: 100
  },
  STREAK_MASTER: {
    id: 'streak_master',
    title: 'Streak Master',
    description: 'Active for 30 consecutive days',
    icon: 'zap',
    color: 'orange',
    threshold: 30
  },
  COMMUNITY_LEADER: {
    id: 'community_leader',
    title: 'Community Leader',
    description: 'Received 20+ testimonials',
    icon: 'users',
    color: 'green',
    threshold: 20
  }
};

// Reputation level thresholds
const REPUTATION_LEVELS = {
  NEWCOMER: { min: 0, max: 99, level: 'newcomer' },
  HELPER: { min: 100, max: 499, level: 'helper' },
  EXPERT: { min: 500, max: 1999, level: 'expert' },
  LEGEND: { min: 2000, max: Infinity, level: 'legend' }
};

interface AutoAchievementSystemProps {
  userStats: {
    totalJobsPosted: number;
    successfulPlacements: number;
    impactScore: number;
    streakDays: number;
    testimonialCount: number;
  };
  onAchievementUnlocked?: (achievement: any) => void;
}

export default function AutoAchievementSystem({ 
  userStats, 
  onAchievementUnlocked 
}: AutoAchievementSystemProps) {
  const { user } = useFirebaseAuth();

  // Check for new achievements
  useEffect(() => {
    if (!user || !userStats) return;

    const checkAchievements = () => {
      // Check First Job Post
      if (userStats.totalJobsPosted >= ACHIEVEMENTS.FIRST_JOB_POST.threshold) {
        unlockAchievement(ACHIEVEMENTS.FIRST_JOB_POST);
      }

      // Check Career Maker
      if (userStats.successfulPlacements >= ACHIEVEMENTS.CAREER_MAKER.threshold) {
        unlockAchievement(ACHIEVEMENTS.CAREER_MAKER);
      }

      // Check Top Performer
      if (userStats.impactScore >= ACHIEVEMENTS.TOP_PERFORMER.threshold) {
        unlockAchievement(ACHIEVEMENTS.TOP_PERFORMER);
      }

      // Check Streak Master
      if (userStats.streakDays >= ACHIEVEMENTS.STREAK_MASTER.threshold) {
        unlockAchievement(ACHIEVEMENTS.STREAK_MASTER);
      }

      // Check Community Leader
      if (userStats.testimonialCount >= ACHIEVEMENTS.COMMUNITY_LEADER.threshold) {
        unlockAchievement(ACHIEVEMENTS.COMMUNITY_LEADER);
      }

      // Check reputation level changes
      checkReputationLevel();
    };

    checkAchievements();
  }, [userStats, user]);

  const unlockAchievement = (achievement: any) => {
    // In real implementation, check if achievement is already unlocked
    const isAlreadyUnlocked = false; // This would come from database

    if (!isAlreadyUnlocked) {
      // Save to database (would be Firebase/API call)
      saveAchievementToDatabase(achievement);

      // Toast notification removed - achievements tracked silently

      // Track analytics
      trackEvent('achievement_unlocked', 'gamification', achievement.id);

      // Callback for parent component
      if (onAchievementUnlocked) {
        onAchievementUnlocked(achievement);
      }
    }
  };

  const checkReputationLevel = () => {
    const currentLevel = getCurrentReputationLevel(userStats.impactScore);
    // In real implementation, compare with stored level and notify if changed
    // This would trigger reputation level up notifications
  };

  const getCurrentReputationLevel = (impactScore: number) => {
    for (const [key, config] of Object.entries(REPUTATION_LEVELS)) {
      if (impactScore >= config.min && impactScore <= config.max) {
        return config.level;
      }
    }
    return 'newcomer';
  };

  const saveAchievementToDatabase = async (achievement: any) => {
    // In real implementation, this would save to Firebase/database
    try {
      const achievementData = {
        userId: user?.uid,
        achievementId: achievement.id,
        achievementTitle: achievement.title,
        achievementDescription: achievement.description,
        badgeIcon: achievement.icon,
        badgeColor: achievement.color,
        unlockedAt: new Date(),
        isVisible: true
      };

      // Firebase/API call would go here
      console.log('Achievement saved:', achievementData);
    } catch (error) {
      console.error('Error saving achievement:', error);
    }
  };

  const calculateImpactScore = (stats: any) => {
    // Impact score calculation algorithm
    const baseScore = stats.successfulPlacements * 50; // 50 points per successful placement
    const jobPostBonus = stats.totalJobsPosted * 10; // 10 points per job posted
    const testimonialBonus = stats.testimonialCount * 25; // 25 points per testimonial
    const streakBonus = Math.floor(stats.streakDays / 7) * 20; // 20 points per week streak

    return baseScore + jobPostBonus + testimonialBonus + streakBonus;
  };

  // This component doesn't render anything visible - it's a background system
  return null;
}

// Export utility functions for use in other components
export {
  ACHIEVEMENTS,
  REPUTATION_LEVELS,
  AutoAchievementSystem
};