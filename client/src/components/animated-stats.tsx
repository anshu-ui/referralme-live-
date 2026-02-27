import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot, setDoc, increment } from 'firebase/firestore';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  showPlus?: boolean;
  isAnimating?: boolean;
}

function AnimatedCounter({ value, duration = 1000, showPlus = true, isAnimating = false }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return (
    <span className={`stat-number ${isAnimating ? 'animate-pulse text-green-600' : ''}`}>
      {displayValue}{showPlus ? '+' : ''}
    </span>
  );
}

interface StatsData {
  professionals: number;
  liveOpportunities: number;
  totalReferrals: number;
  lastUpdated: number;
}

export default function AnimatedStats() {
  const [stats, setStats] = useState<StatsData>({
    professionals: 45,
    liveOpportunities: 12,
    totalReferrals: 8,
    lastUpdated: Date.now()
  });
  const [isAnimating, setIsAnimating] = useState<{[key: string]: boolean}>({});

  useEffect(() => {
    // Initialize stats document if it doesn't exist
    const initializeStats = async () => {
      try {
        const statsDoc = doc(db, 'platform_stats', 'global');
        await setDoc(statsDoc, {
          professionals: 45,
          liveOpportunities: 12,
          totalReferrals: 8,
          lastUpdated: Date.now()
        }, { merge: true });
      } catch (error) {
        console.error('Error initializing stats:', error);
      }
    };

    initializeStats();

    // Listen to real-time updates
    const statsDoc = doc(db, 'platform_stats', 'global');
    const unsubscribe = onSnapshot(statsDoc, (doc) => {
      if (doc.exists()) {
        const newStats = doc.data() as StatsData;
        setStats(newStats);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Auto-increment stats every 10 minutes with random increases
    const interval = setInterval(async () => {
      try {
        const statsDoc = doc(db, 'platform_stats', 'global');
        
        // Random increments to make it look realistic
        const profIncrease = Math.floor(Math.random() * 3) + 1; // 1-3
        const jobIncrease = Math.floor(Math.random() * 2) + 1; // 1-2
        const refIncrease = Math.floor(Math.random() * 2) + 1; // 1-2

        await setDoc(statsDoc, {
          professionals: increment(profIncrease),
          liveOpportunities: increment(jobIncrease),
          totalReferrals: increment(refIncrease),
          lastUpdated: Date.now()
        }, { merge: true });

        // Show animation indicators
        setIsAnimating({
          professionals: true,
          liveOpportunities: true,
          totalReferrals: true
        });

        // Clear animations after 3 seconds
        setTimeout(() => {
          setIsAnimating({});
        }, 3000);

      } catch (error) {
        console.error('Error updating stats:', error);
      }
    }, 10 * 60 * 1000); // 10 minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="hero-stats">
      <div className="stat">
        <AnimatedCounter 
          value={stats.professionals} 
          isAnimating={isAnimating.professionals}
        />
        <span className="stat-label">Professionals</span>
      </div>
      <div className="stat">
        <AnimatedCounter 
          value={stats.liveOpportunities} 
          isAnimating={isAnimating.liveOpportunities}
        />
        <span className="stat-label">Live Opportunities</span>
      </div>
      <div className="stat relative">
        <AnimatedCounter 
          value={stats.totalReferrals} 
          isAnimating={isAnimating.totalReferrals}
        />
        <span className="stat-label">
          Total Referrals
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </span>
      </div>
    </div>
  );
}