import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface ReferrerStats {
  jobsPosted: number;
  referralsGiven: number;
  successfulPlacements: number;
  impactScore: number;
  totalEarnings: number;
  profileViews: number;
  achievements: string[];
}

export function useReferrerStats(userId: string) {
  const [stats, setStats] = useState<ReferrerStats>({
    jobsPosted: 0,
    referralsGiven: 0,
    successfulPlacements: 0,
    impactScore: 0,
    totalEarnings: 0,
    profileViews: 0,
    achievements: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const unsubscribers: (() => void)[] = [];

    // Track job postings
    const jobsQuery = query(
      collection(db, "jobPostings"),
      where("postedBy", "==", userId)
    );
    
    const unsubJobs = onSnapshot(jobsQuery, (snapshot) => {
      const jobsPosted = snapshot.docs.length;
      setStats(prev => ({ ...prev, jobsPosted }));
    });
    unsubscribers.push(unsubJobs);

    // Track referral requests (referrals given)
    const referralsQuery = query(
      collection(db, "referralRequests"),
      where("referrerId", "==", userId)
    );
    
    const unsubReferrals = onSnapshot(referralsQuery, (snapshot) => {
      const referralsGiven = snapshot.docs.length;
      const successfulPlacements = snapshot.docs.filter(doc => 
        doc.data().status === "completed"
      ).length;
      
      // Calculate impact score based on activity
      const impactScore = (referralsGiven * 10) + (successfulPlacements * 25);
      
      setStats(prev => ({ 
        ...prev, 
        referralsGiven, 
        successfulPlacements, 
        impactScore 
      }));
    });
    unsubscribers.push(unsubReferrals);

    // Get user profile data including achievements
    const getUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setStats(prev => ({
            ...prev,
            profileViews: userData.profileViews || 0,
            achievements: userData.achievements || [],
            totalEarnings: userData.totalEarnings || 0
          }));
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error);
        setLoading(false);
      }
    };

    getUserData();

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [userId]);

  return { stats, loading };
}