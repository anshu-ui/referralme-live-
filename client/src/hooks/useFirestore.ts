import { useState, useEffect } from "react";
import { useFirebaseAuth } from "./useFirebaseAuth";
import {
  getUser,
  createUser,
  updateUser,
  getJobPostings,
  getJobPostingsByReferrer,
  createJobPosting,
  updateJobPosting,
  deleteJobPosting,
  getReferralRequestsBySeeker,
  getReferralRequestsByReferrer,
  createReferralRequest,
  updateReferralRequestStatus,
  subscribeToJobPostings,
  subscribeToReferralRequests,
  subscribeToSeekerRequests,
  type FirestoreUser,
  type JobPosting,
  type ReferralRequest,
} from "../lib/firestore";

export function useFirestoreUser() {
  const { user } = useFirebaseAuth();
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setFirestoreUser(null);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const userData = await getUser(user.uid);
        if (!userData) {
          // Create new user in Firestore
          const newUser = {
            uid: user.uid,
            email: user.email || "",
            displayName: user.displayName || "",
            photoURL: user.photoURL || undefined,
          };
          await createUser(newUser);
          setFirestoreUser({ ...newUser, createdAt: new Date() as any, updatedAt: new Date() as any });
        } else {
          setFirestoreUser(userData);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [user]);

  const updateUserRole = async (role: "seeker" | "referrer") => {
    if (!user) return;
    
    try {
      await updateUser(user.uid, { role });
      setFirestoreUser(prev => prev ? { ...prev, role } : null);
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  };

  return { firestoreUser, loading, updateUserRole };
}

export function useJobPostings() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToJobPostings((jobData) => {
      setJobs(jobData);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const createJob = async (jobData: Omit<JobPosting, "id" | "createdAt" | "updatedAt">) => {
    try {
      const jobId = await createJobPosting(jobData);
      return jobId;
    } catch (error) {
      console.error("Error creating job:", error);
      throw error;
    }
  };

  const updateJob = async (jobId: string, updates: Partial<JobPosting>) => {
    try {
      await updateJobPosting(jobId, updates);
    } catch (error) {
      console.error("Error updating job:", error);
      throw error;
    }
  };

  const deleteJob = async (jobId: string) => {
    try {
      await deleteJobPosting(jobId);
    } catch (error) {
      console.error("Error deleting job:", error);
      throw error;
    }
  };

  return { jobs, loading, createJob, updateJob, deleteJob };
}

export function useReferralRequests(userType: "seeker" | "referrer") {
  const { user } = useFirebaseAuth();
  const [requests, setRequests] = useState<ReferralRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRequests([]);
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    if (userType === "referrer") {
      console.log("Setting up referrer subscription for user:", user.uid);
      unsubscribe = subscribeToReferralRequests(user.uid, (requestData) => {
        console.log("Referrer received requests update:", requestData.length, requestData);
        setRequests(requestData);
        setLoading(false);
      });
    } else {
      // For seekers, also use subscription for real-time updates
      console.log("Setting up seeker subscription for user:", user.uid);
      unsubscribe = subscribeToSeekerRequests(user.uid, (requestData) => {
        console.log("Seeker received requests update:", requestData.length, requestData);
        setRequests(requestData);
        setLoading(false);
      });
    }

    return unsubscribe;
  }, [user, userType]);

  const createRequest = async (requestData: Omit<ReferralRequest, "id" | "createdAt" | "updatedAt">) => {
    try {
      const requestId = await createReferralRequest(requestData);
      return requestId;
    } catch (error) {
      console.error("Error creating request:", error);
      throw error;
    }
  };

  const updateRequestStatus = async (requestId: string, status: ReferralRequest["status"]) => {
    try {
      await updateReferralRequestStatus(requestId, status);
    } catch (error) {
      console.error("Error updating request status:", error);
      throw error;
    }
  };

  return { requests, loading, createRequest, updateRequestStatus };
}