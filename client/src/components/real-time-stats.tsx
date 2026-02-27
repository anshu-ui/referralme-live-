import { useRealTimeStats } from "../hooks/useRealTimeStats";
import { useState, useEffect } from "react";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
}

function AnimatedNumber({ value, duration = 2000, suffix = "" }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (value === 0) return;
    
    const startTime = Date.now();
    const startValue = 0;
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const currentValue = Math.floor(startValue + (value - startValue) * easeOutExpo);
      
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [value, duration]);

  return (
    <span className="stat-number">
      {displayValue}{suffix}
    </span>
  );
}

export default function RealTimeStats() {
  const { stats, isLoading } = useRealTimeStats();

  if (isLoading) {
    return (
      <div className="hero-stats">
        <div className="stat">
          <span className="stat-number animate-pulse">•••</span>
          <span className="stat-label">Loading...</span>
        </div>
        <div className="stat">
          <span className="stat-number animate-pulse">•••</span>
          <span className="stat-label">Loading...</span>
        </div>
        <div className="stat">
          <span className="stat-number animate-pulse">•••</span>
          <span className="stat-label">Loading...</span>
        </div>
      </div>
    );
  }

  // Show meaningful stats based on what data we have
  const hasUsers = stats.totalUsers > 0;
  const hasJobs = stats.totalJobPostings > 0;
  const hasRequests = stats.totalReferralRequests > 0;

  // If no real data yet, show encouraging launch message
  if (!hasUsers && !hasJobs && !hasRequests) {
    return (
      <div className="hero-stats">
        <div className="stat">
          <span className="stat-number">🚀</span>
          <span className="stat-label">Launching Soon</span>
        </div>
        <div className="stat">
          <span className="stat-number">✨</span>
          <span className="stat-label">Be First to Join</span>
        </div>
        <div className="stat">
          <span className="stat-number">💼</span>
          <span className="stat-label">Your Success Starts Here</span>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-stats">
      <div className="stat">
        <AnimatedNumber 
          value={stats.totalUsers} 
          suffix={stats.totalUsers > 0 ? "+" : ""} 
        />
        <span className="stat-label">
          {stats.totalUsers === 1 ? "Professional" : "Professionals"}
        </span>
      </div>
      
      <div className="stat">
        <AnimatedNumber 
          value={stats.totalJobPostings} 
          suffix={stats.totalJobPostings > 0 ? "+" : ""} 
        />
        <span className="stat-label">
          {stats.totalJobPostings === 1 ? "Live Opportunity" : "Live Opportunities"}
        </span>
      </div>
      
      <div className="stat">
        <AnimatedNumber 
          value={stats.totalReferralRequests} 
          suffix={stats.totalReferralRequests > 0 ? "+" : ""} 
        />
        <span className="stat-label">
          {stats.totalReferralRequests === 1 ? "Total Referral" : "Total Referrals"}
        </span>
      </div>
    </div>
  );
}