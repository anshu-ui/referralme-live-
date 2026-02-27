import { useState, useEffect } from "react";
import { collection, getDocs, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";

interface PlatformStats {
  totalUsers: number;
  totalJobPostings: number;
  totalReferralRequests: number;
  activeReferrers: number;
  activeSeekers: number;
  successfulReferrals: number;
}

export function useRealTimeStats() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    totalJobPostings: 0,
    totalReferralRequests: 0,
    activeReferrers: 0,
    activeSeekers: 0,
    successfulReferrals: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get all users who have completed profiles and accessed dashboards
        const usersRef = collection(db, "users");
        const usersSnapshot = await getDocs(usersRef);
        
        let totalUsers = 0;
        let activeReferrers = 0;
        let activeSeekers = 0;

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          
          // Count users who have a role and some identifying information
          if (userData.role && (userData.name || userData.displayName || userData.email)) {
            totalUsers++;
            
            if (userData.role === "referrer") {
              activeReferrers++;
            } else if (userData.role === "seeker" || userData.role === "job_seeker") {
              activeSeekers++;
            }
          }
        });

        // Get active job postings (opportunities posted by referrers)
        const jobPostingsRef = collection(db, "jobPostings");
        const jobPostingsSnapshot = await getDocs(jobPostingsRef);
        let activeJobPostings = 0;
        
        jobPostingsSnapshot.forEach((doc) => {
          const jobData = doc.data();
          
          // Count all job postings unless explicitly closed/expired
          if (jobData.status !== "closed" && jobData.status !== "expired") {
            activeJobPostings++;
          }
        });

        // Get referral requests count
        const referralRequestsRef = collection(db, "referralRequests");
        const referralRequestsSnapshot = await getDocs(referralRequestsRef);
        const totalReferralRequests = referralRequestsSnapshot.size;

        // Get successful referrals (accepted or completed status)
        const successfulRef = query(
          referralRequestsRef,
          where("status", "in", ["accepted", "completed"])
        );
        const successfulSnapshot = await getDocs(successfulRef);
        const successfulReferrals = successfulSnapshot.size;

        // Log only when stats actually change
        const newStatsString = JSON.stringify({totalUsers, activeJobPostings, totalReferralRequests, successfulReferrals});
        const currentStatsString = JSON.stringify({
          totalUsers: stats.totalUsers, 
          activeJobPostings: stats.totalJobPostings, 
          totalReferralRequests: stats.totalReferralRequests, 
          successfulReferrals: stats.successfulReferrals
        });
        
        if (newStatsString !== currentStatsString) {
          console.log("📊 Stats updated:", {
            professionals: totalUsers,
            liveOpportunities: activeJobPostings,
            connections: totalReferralRequests,
            successful: successfulReferrals
          });
        }

        setStats({
          totalUsers,
          totalJobPostings: activeJobPostings,
          totalReferralRequests,
          activeReferrers,
          activeSeekers,
          successfulReferrals,
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching real-time stats:", error);
        setIsLoading(false);
      }
    };

    fetchStats();

    // Set up real-time listeners for key collections
    const unsubscribeUsers = onSnapshot(collection(db, "users"), () => {
      fetchStats();
    });

    const unsubscribeJobs = onSnapshot(collection(db, "jobPostings"), () => {
      fetchStats();
    });

    const unsubscribeRequests = onSnapshot(collection(db, "referralRequests"), () => {
      fetchStats();
    });

    return () => {
      unsubscribeUsers();
      unsubscribeJobs();
      unsubscribeRequests();
    };
  }, []);

  return { stats, isLoading };
}