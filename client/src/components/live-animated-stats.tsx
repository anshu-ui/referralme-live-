import { useState, useEffect } from "react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { TrendingUp, Users, Briefcase, CheckCircle, Zap } from "lucide-react";

interface LiveAnimatedStatsProps {
  initialStats?: {
    professionals: number;
    liveOpportunities: number;
    connections: number;
    successful: number;
  };
}

export default function LiveAnimatedStats({ 
  initialStats = {
    professionals: 10,
    liveOpportunities: 23,
    connections: 50,
    successful: 89
  }
}: LiveAnimatedStatsProps) {
  const [stats, setStats] = useState(initialStats);
  const [isAnimating, setIsAnimating] = useState({
    professionals: false,
    liveOpportunities: false,
    connections: false,
    successful: false
  });
  const [isBlinkerVisible, setIsBlinkerVisible] = useState(true);

  useEffect(() => {
    const intervals: NodeJS.Timeout[] = [];

    // Continuous blinking for all indicators every 2 seconds
    intervals.push(setInterval(() => {
      setIsBlinkerVisible(prev => !prev);
    }, 2000));

    // Professionals increase every 30-45 seconds (much slower)
    intervals.push(setInterval(() => {
      setIsAnimating(prev => ({ ...prev, professionals: true }));
      setStats(prev => ({ ...prev, professionals: prev.professionals + 1 }));
      setTimeout(() => setIsAnimating(prev => ({ ...prev, professionals: false })), 2000);
    }, Math.random() * 15000 + 30000));

    // Live opportunities increase every 45-60 seconds (much slower)
    intervals.push(setInterval(() => {
      setIsAnimating(prev => ({ ...prev, liveOpportunities: true }));
      setStats(prev => ({ ...prev, liveOpportunities: prev.liveOpportunities + 1 }));
      setTimeout(() => setIsAnimating(prev => ({ ...prev, liveOpportunities: false })), 2000);
    }, Math.random() * 15000 + 45000));

    // Connections increase every 25-40 seconds (slower)
    intervals.push(setInterval(() => {
      setIsAnimating(prev => ({ ...prev, connections: true }));
      setStats(prev => ({ ...prev, connections: prev.connections + 1 }));
      setTimeout(() => setIsAnimating(prev => ({ ...prev, connections: false })), 2000);
    }, Math.random() * 15000 + 25000));

    // Successful referrals increase every 50-70 seconds (slowest)
    intervals.push(setInterval(() => {
      setIsAnimating(prev => ({ ...prev, successful: true }));
      setStats(prev => ({ ...prev, successful: prev.successful + 1 }));
      setTimeout(() => setIsAnimating(prev => ({ ...prev, successful: false })), 2000);
    }, Math.random() * 20000 + 50000));

    return () => intervals.forEach(clearInterval);
  }, []);

  const StatCard = ({ 
    icon, 
    value, 
    label, 
    color, 
    isAnimating,
    showContinuousBlinker = false
  }: { 
    icon: React.ReactNode; 
    value: number; 
    label: string; 
    color: string;
    isAnimating: boolean;
    showContinuousBlinker?: boolean;
  }) => (
    <Card className="relative overflow-hidden border-2 hover:border-blue-300 transition-all duration-300">
      <CardContent className="p-3 md:p-6 text-center">
        <div className="flex items-center justify-center mb-2 relative">
          <div className={`${color} p-2 md:p-3 rounded-full bg-opacity-10`}>
            {icon}
          </div>
          {/* Show continuous blinker for referrals or animation blinker for others */}
          {(showContinuousBlinker ? isBlinkerVisible : isAnimating) && (
            <div className="absolute -top-1 -right-1">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-ping"></div>
              <div className="w-4 h-4 bg-red-500 rounded-full absolute top-0 animate-pulse"></div>
            </div>
          )}
          {/* Show general blinker for all stats every 2 seconds - but not for referrals which has continuous blinker */}
          {!isAnimating && !showContinuousBlinker && isBlinkerVisible && (
            <div className="absolute -top-2 -right-2">
              <div className="w-3 h-3 bg-red-400 rounded-full opacity-60"></div>
            </div>
          )}
        </div>
        <div className={`text-xl md:text-3xl font-bold mb-1 transition-all duration-500 ${isAnimating ? 'scale-110 text-blue-600' : 'text-gray-900'}`}>
          {value.toLocaleString()}
        </div>
        <div className="text-xs md:text-sm text-gray-600 font-medium">{label}</div>
        {isAnimating && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 right-2 text-xs animate-pulse bg-red-500"
          >
            LIVE
          </Badge>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6">
      <div className="text-center mb-6 md:mb-8">
        <Badge variant="secondary" className="mb-3 md:mb-4 bg-red-100 text-red-700 border border-red-300 text-xs md:text-sm">
          <Zap className="h-3 w-3 mr-1" />
          LIVE PLATFORM ACTIVITY
        </Badge>
        <h3 className="text-lg md:text-2xl font-semibold text-gray-900 mb-2">
          Real-Time Platform Growth
        </h3>
        <p className="text-sm md:text-base text-gray-600 max-w-2xl mx-auto px-2">
          Watch our community grow in real-time as professionals connect and opportunities multiply
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <StatCard
          icon={<Users className="h-6 w-6 text-blue-600" />}
          value={stats.professionals}
          label="Active Professionals"
          color="text-blue-600"
          isAnimating={isAnimating.professionals}
        />
        <StatCard
          icon={<Briefcase className="h-6 w-6 text-orange-600" />}
          value={stats.liveOpportunities}
          label="Live Opportunities"
          color="text-orange-600"
          isAnimating={isAnimating.liveOpportunities}
        />
        <StatCard
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          value={stats.connections}
          label="Connections Made"
          color="text-purple-600"
          isAnimating={isAnimating.connections}
        />
        <StatCard
          icon={<CheckCircle className="h-6 w-6 text-green-600" />}
          value={stats.successful}
          label="Successful Referrals"
          color="text-green-600"
          isAnimating={isAnimating.successful}
          showContinuousBlinker={true}
        />
      </div>

      <div className="text-center mt-4 md:mt-6">
        <div className="text-xs md:text-sm text-gray-500">
          <span className="inline-flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2"></div>
            Live updates every few seconds
          </span>
        </div>
      </div>
    </div>
  );
}