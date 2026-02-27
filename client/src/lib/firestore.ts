import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebase";
import { sendApplicationReceivedNotification, sendApplicationStatusUpdate } from "./emailService";

// Types for Firestore data
export interface FirestoreUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: "seeker" | "referrer";
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  experience?: string;
  designation?: string;
  company?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  linkedinUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  profileImageUrl?: string;
  // Profile completion tracking
  profileCompleted?: boolean;
  isVerified?: boolean;
  // Mentorship profile fields
  isMentorshipEnabled?: boolean;
  mentorshipServices?: MentorshipService[];
  mentorshipBio?: string;
  mentorshipRating?: number;
  totalMentorshipSessions?: number;
  // Referral system fields
  referralCode?: string;
  referredBy?: string; // referral code of referrer
  referralStats?: {
    totalReferred: number;
    successfulReferrals: number;
    rewardPointsEarned: number;
    premiumDaysEarned: number;
  };
  // Payment system fields
  razorpayAccountId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MentorshipService {
  id: string;
  title: string;
  description: string;
  duration: number; // in minutes
  price: number; // in INR
  isActive: boolean;
}

export interface JobPosting {
  id?: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string;
  salary?: string;
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReferralRequest {
  id?: string;
  jobPostingId: string;
  jobTitle: string;
  seekerId: string;
  seekerName: string;
  seekerEmail: string;
  seekerPhone: string;
  resumeText: string;
  resumeUrl?: string;
  resumeFileName?: string;
  linkedinUrl?: string;
  coverLetter?: string;
  status: "pending" | "accepted" | "rejected" | "referral_confirmed" | "sent_to_hr" | "interview_scheduled" | "completed";
  referrerId: string;
  referrerName: string;
  referrerEmail: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MentorshipSession {
  id?: string;
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  menteeId: string;
  menteeName: string;
  menteeEmail: string;
  title: string;
  description?: string;
  duration: number; // minutes
  price: number; // in USD
  scheduledAt: Timestamp;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  meetingUrl?: string;
  paymentStatus: "pending" | "paid" | "refunded";
  stripePaymentIntentId?: string;
  notes?: string;
  rating?: number; // 1-5 stars
  feedback?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReferralInvite {
  id?: string;
  referrerUserId: string;
  referrerName: string;
  referrerEmail: string;
  inviteeEmail: string;
  inviteeName?: string;
  referralCode: string;
  status: "pending" | "accepted" | "expired";
  rewardType: "premium_days" | "points" | "features";
  rewardAmount: number;
  expiresAt: Timestamp;
  acceptedAt?: Timestamp;
  createdAt: Timestamp;
}

// User operations
export const createUser = async (userData: Omit<FirestoreUser, "createdAt" | "updatedAt">) => {
  const userDoc = {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  // Use uid as document ID for easier lookup
  const userRef = doc(db, "users", userData.uid);
  await setDoc(userRef, userDoc);
};

export const updateUser = async (uid: string, updates: Partial<FirestoreUser>) => {
  try {
    if (!uid || typeof uid !== 'string' || uid.trim() === '') {
      throw new Error("Invalid UID provided");
    }
    
    console.log("Updating user with UID:", uid, "and data:", updates);
    const userRef = doc(db, "users", uid);
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(userRef, updateData);
    console.log("User updated successfully");
  } catch (error) {
    console.error("Error updating user:", error);
    console.error("UID was:", uid);
    console.error("Updates were:", updates);
    throw error;
  }
};

// Alias for consistency with profile-edit-form
export const updateFirestoreUser = updateUser;

// Get user profile
export const getUserProfile = async (uid: string): Promise<FirestoreUser | null> => {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { uid, ...userSnap.data() } as FirestoreUser;
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (uid: string, updates: Partial<FirestoreUser>) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export const getUser = async (uid: string): Promise<FirestoreUser | null> => {
  const userRef = doc(db, "users", uid);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    return null;
  }
  
  return { ...userDoc.data() } as FirestoreUser;
};

// Job posting operations
export const createJobPosting = async (jobData: Omit<JobPosting, "id" | "createdAt" | "updatedAt">) => {
  try {
    console.log("Creating job posting with data:", jobData);
    const jobDoc = {
      ...jobData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, "jobPostings"), jobDoc);
    console.log("Job posting created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating job posting:", error);
    throw error;
  }
};

export const getJobPostings = async (): Promise<JobPosting[]> => {
  try {
    console.log("Fetching job postings...");
    // Remove orderBy to avoid index requirement for now
    const q = query(
      collection(db, "jobPostings"), 
      where("isActive", "==", true)
    );
    const querySnapshot = await getDocs(q);
    
    const jobs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as JobPosting[];
    
    // Sort client-side instead
    jobs.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    console.log("Job postings fetched successfully:", jobs.length);
    return jobs;
  } catch (error) {
    console.error("Error fetching job postings:", error);
    throw error;
  }
};

export const getJobPostingsByReferrer = async (referrerId: string): Promise<JobPosting[]> => {
  try {
    console.log("Fetching job postings for referrer:", referrerId);
    // Remove orderBy to avoid index requirement
    const q = query(
      collection(db, "jobPostings"), 
      where("referrerId", "==", referrerId)
    );
    const querySnapshot = await getDocs(q);
    
    const jobs = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as JobPosting[];
    
    // Sort client-side instead
    jobs.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    console.log("Job postings fetched for referrer:", jobs.length);
    return jobs;
  } catch (error) {
    console.error("Error fetching job postings by referrer:", error);
    throw error;
  }
};

export const updateJobPosting = async (jobId: string, updates: Partial<JobPosting>) => {
  try {
    console.log("Updating job posting:", jobId, updates);
    const jobRef = doc(db, "jobPostings", jobId);
    await updateDoc(jobRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    console.log("Job posting updated successfully:", jobId);
  } catch (error) {
    console.error("Error updating job posting:", error);
    throw error;
  }
};

export const deleteJobPosting = async (jobId: string) => {
  try {
    console.log("Deleting job posting:", jobId);
    const jobRef = doc(db, "jobPostings", jobId);
    await deleteDoc(jobRef);
    console.log("Job posting deleted successfully:", jobId);
  } catch (error) {
    console.error("Error deleting job posting:", error);
    throw error;
  }
};

export const getJobPosting = async (jobId: string): Promise<JobPosting | null> => {
  try {
    const jobRef = doc(db, "jobPostings", jobId);
    const jobSnap = await getDoc(jobRef);
    
    if (jobSnap.exists()) {
      return { id: jobSnap.id, ...jobSnap.data() } as JobPosting;
    }
    return null;
  } catch (error) {
    console.error("Error fetching job posting:", error);
    throw error;
  }
};

// Referral request operations
export const createReferralRequest = async (requestData: Omit<ReferralRequest, "id" | "createdAt" | "updatedAt">) => {
  try {
    console.log("Creating referral request with data:", requestData);
    const requestDoc = {
      ...requestData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, "referralRequests"), requestDoc);
    console.log("Referral request created successfully with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating referral request:", error);
    throw error;
  }
}

// Enhanced referral request submission with ATS integration
export const submitReferralRequest = async (requestData: any) => {
  try {
    const enhancedRequestData = {
      ...requestData,
      // Ensure all ATS fields are included
      atsScore: requestData.atsScore || null,
      atsCompatibility: requestData.atsCompatibility || null,
      keywordMatch: requestData.keywordMatch || null,
      formatScore: requestData.formatScore || null,
      contentScore: requestData.contentScore || null,
      atsAnalysis: requestData.atsAnalysis || null,
      // Application details mapping
      applicantName: requestData.fullName,
      applicantEmail: requestData.seekerId, // Will be resolved to email in display
      applicantPhone: requestData.phoneNumber,
      experience: requestData.experienceLevel,
      skills: requestData.skills || null,
      coverLetter: requestData.motivation,
      resumeUrl: requestData.resumeUrl || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const requestRef = await addDoc(collection(db, 'referralRequests'), enhancedRequestData);
    
    console.log('✅ Enhanced referral request submitted with ATS analysis:', requestRef.id);
    
    // Send email notification to referrer about new application
    if (requestData.job && requestData.job.referrerEmail && requestData.job.referrerName) {
      const seekerData = {
        firstName: requestData.fullName?.split(' ')[0] || '',
        lastName: requestData.fullName?.split(' ').slice(1).join(' ') || '',
        email: requestData.email,
        phoneNumber: requestData.phoneNumber,
        experience: requestData.experienceLevel,
        jobTitle: requestData.currentCompany || 'Not specified',
        atsScore: requestData.atsScore
      };
      
      sendApplicationReceivedNotification(
        requestData.job.referrerName,
        requestData.job.referrerEmail,
        requestData.job,
        seekerData
      ).then((result) => {
        if (result) {
          console.log("✅ Application received notification sent to referrer");
        } else {
          console.error("❌ Failed to send application notification");
        }
      }).catch((error) => {
        console.error("❌ Error sending application notification:", error);
      });
    }
    
    return requestRef.id;
  } catch (error) {
    console.error('❌ Error submitting referral request:', error);
    throw error;
  }
};

export const getReferralRequestsBySeeker = async (seekerId: string): Promise<ReferralRequest[]> => {
  try {
    console.log("Fetching referral requests for seeker:", seekerId);
    // Remove orderBy to avoid index requirement
    const q = query(
      collection(db, "referralRequests"), 
      where("seekerId", "==", seekerId)
    );
    const querySnapshot = await getDocs(q);
    
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReferralRequest[];
    
    // Sort client-side instead
    requests.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    console.log("Referral requests fetched for seeker:", requests.length);
    return requests;
  } catch (error) {
    console.error("Error fetching referral requests by seeker:", error);
    throw error;
  }
};

export const getReferralRequestsByReferrer = async (referrerId: string): Promise<ReferralRequest[]> => {
  try {
    console.log("Fetching referral requests for referrer:", referrerId);
    // Remove orderBy to avoid index requirement
    const q = query(
      collection(db, "referralRequests"), 
      where("referrerId", "==", referrerId)
    );
    const querySnapshot = await getDocs(q);
    
    const requests = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReferralRequest[];
    
    // Sort client-side instead
    requests.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
    
    console.log("Referral requests fetched for referrer:", requests.length);
    return requests;
  } catch (error) {
    console.error("Error fetching referral requests by referrer:", error);
    throw error;
  }
};

export const updateReferralRequestStatus = async (requestId: string, status: ReferralRequest["status"]) => {
  const requestRef = doc(db, "referralRequests", requestId);
  await updateDoc(requestRef, {
    status,
    updatedAt: serverTimestamp(),
  });
};

// Real-time listeners with enhanced error handling
export const subscribeToJobPostings = (callback: (jobs: JobPosting[]) => void) => {
  try {
    console.log("Setting up job postings subscription...");
    
    // Use simplified collection reference without complex queries to avoid index issues
    const jobsRef = collection(db, "jobPostings");
    
    const unsubscribe = onSnapshot(jobsRef, 
      (querySnapshot) => {
        try {
          console.log("📄 Received job postings snapshot with", querySnapshot.docs.length, "documents");
          
          const jobs = querySnapshot.docs
            .map(doc => {
              try {
                const data = doc.data();
                return {
                  id: doc.id,
                  ...data
                } as JobPosting;
              } catch (error) {
                console.error("Error processing document:", doc.id, error);
                return null;
              }
            })
            .filter((job): job is JobPosting => job !== null && job.isActive !== false)
            .sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return bTime.getTime() - aTime.getTime();
            });
          
          console.log("✅ Processed job postings:", jobs.length, "active jobs");
          callback(jobs);
        } catch (error) {
          console.error("❌ Error processing job postings snapshot:", error);
          callback([]);
        }
      }, 
      (error) => {
        console.error("❌ Job postings subscription error:", error);
        console.error("Error details:", error.code, error.message);
        // Provide empty array on error but don't throw
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error("❌ Error setting up job postings subscription:", error);
    // Return a no-op unsubscribe function
    return () => {};
  }
};

export const subscribeToReferralRequests = (referrerId: string, callback: (requests: ReferralRequest[]) => void) => {
  try {
    console.log("Setting up referral requests subscription for:", referrerId);
    // Remove orderBy to avoid index requirement
    const q = query(
      collection(db, "referralRequests"), 
      where("referrerId", "==", referrerId)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferralRequest[];
      
      // Sort client-side instead
      requests.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      console.log("Referral requests subscription update:", requests.length);
      callback(requests);
    });
  } catch (error) {
    console.error("Error setting up referral requests subscription:", error);
    throw error;
  }
};

export const subscribeToSeekerRequests = (seekerId: string, callback: (requests: ReferralRequest[]) => void) => {
  try {
    console.log("Setting up seeker requests subscription for:", seekerId);
    const q = query(
      collection(db, "referralRequests"), 
      where("seekerId", "==", seekerId)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ReferralRequest[];
      
      // Sort client-side instead
      requests.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      console.log("Seeker requests subscription update:", requests.length);
      callback(requests);
    });
  } catch (error) {
    console.error("Error setting up seeker requests subscription:", error);
    throw error;
  }
};

// Mentorship Session operations
export const createMentorshipSession = async (sessionData: Omit<MentorshipSession, "id" | "createdAt" | "updatedAt">) => {
  try {
    const sessionDoc = {
      ...sessionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(db, "mentorshipSessions"), sessionDoc);
    return docRef.id;
  } catch (error) {
    console.error("Error creating mentorship session:", error);
    throw error;
  }
};

export const updateMentorshipSession = async (sessionId: string, updates: Partial<MentorshipSession>) => {
  try {
    const sessionRef = doc(db, "mentorshipSessions", sessionId);
    await updateDoc(sessionRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating mentorship session:", error);
    throw error;
  }
};

export const getMentorshipSessions = async (userId: string, role: "mentor" | "mentee") => {
  try {
    const fieldName = role === "mentor" ? "mentorId" : "menteeId";
    const q = query(
      collection(db, "mentorshipSessions"),
      where(fieldName, "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    const sessions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MentorshipSession[];
    
    return sessions.sort((a, b) => {
      const aTime = a.scheduledAt?.toDate?.() || new Date(0);
      const bTime = b.scheduledAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });
  } catch (error) {
    console.error("Error getting mentorship sessions:", error);
    throw error;
  }
};

export const subscribeToMentorshipSessions = (userId: string, role: "mentor" | "mentee", callback: (sessions: MentorshipSession[]) => void) => {
  try {
    const fieldName = role === "mentor" ? "mentorId" : "menteeId";
    const q = query(
      collection(db, "mentorshipSessions"),
      where(fieldName, "==", userId)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const sessions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MentorshipSession[];
      
      sessions.sort((a, b) => {
        const aTime = a.scheduledAt?.toDate?.() || new Date(0);
        const bTime = b.scheduledAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });
      
      callback(sessions);
    });
  } catch (error) {
    console.error("Error setting up mentorship sessions subscription:", error);
    throw error;
  }
};

// Mentorship Profile operations
export const updateMentorshipProfile = async (userId: string, mentorshipData: {
  isMentorshipEnabled: boolean;
  mentorshipServices?: MentorshipService[];
  mentorshipBio?: string;
}) => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      ...mentorshipData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating mentorship profile:", error);
    throw error;
  }
};

export const getMentorsWithActiveProfiles = async (): Promise<FirestoreUser[]> => {
  try {
    const q = query(
      collection(db, "users"),
      where("isMentorshipEnabled", "==", true),
      where("role", "==", "referrer")
    );
    
    const querySnapshot = await getDocs(q);
    const mentors = querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    })) as FirestoreUser[];
    
    return mentors.filter(mentor => 
      mentor.mentorshipServices && 
      mentor.mentorshipServices.some(service => service.isActive)
    );
  } catch (error) {
    console.error("Error getting mentors with active profiles:", error);
    throw error;
  }
};

export const subscribeToActiveMentors = (callback: (mentors: FirestoreUser[]) => void) => {
  try {
    const q = query(
      collection(db, "users"),
      where("isMentorshipEnabled", "==", true),
      where("role", "==", "referrer")
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const mentors = querySnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as FirestoreUser[];
      
      const activeMentors = mentors.filter(mentor => 
        mentor.mentorshipServices && 
        mentor.mentorshipServices.some(service => service.isActive)
      );
      
      callback(activeMentors);
    });
  } catch (error) {
    console.error("Error setting up active mentors subscription:", error);
    throw error;
  }
};

// ===== REFERRAL SYSTEM FUNCTIONS =====

// Generate a unique referral code
export const generateReferralCode = (userName: string): string => {
  const cleanName = userName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const randomSuffix = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${cleanName.slice(0, 4)}${randomSuffix}`;
};

// Initialize user's referral code when they first sign up
export const initializeReferralCode = async (userId: string, userName: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && !userDoc.data().referralCode) {
      const referralCode = generateReferralCode(userName);
      await updateDoc(userRef, {
        referralCode,
        referralStats: {
          totalReferred: 0,
          successfulReferrals: 0,
          rewardPointsEarned: 0,
          premiumDaysEarned: 0,
        },
        updatedAt: serverTimestamp(),
      });
      return referralCode;
    }
    
    return userDoc.data()?.referralCode;
  } catch (error) {
    console.error("Error initializing referral code:", error);
    throw error;
  }
};

// Send referral invitation
export const sendReferralInvitation = async (
  referrerUserId: string,
  referrerName: string,
  referrerEmail: string,
  inviteeEmail: string,
  inviteeName?: string
) => {
  try {
    const referrerRef = doc(db, "users", referrerUserId);
    const referrerDoc = await getDoc(referrerRef);
    
    if (!referrerDoc.exists()) {
      throw new Error("Referrer not found");
    }
    
    const referrerData = referrerDoc.data();
    let referralCode = referrerData.referralCode;
    
    // Generate referral code if not exists
    if (!referralCode) {
      referralCode = await initializeReferralCode(referrerUserId, referrerName);
    }
    
    const inviteData: Omit<ReferralInvite, "id"> = {
      referrerUserId,
      referrerName,
      referrerEmail,
      inviteeEmail,
      inviteeName,
      referralCode,
      status: "pending",
      rewardType: "premium_days",
      rewardAmount: 7, // 7 days premium access
      expiresAt: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days
      createdAt: serverTimestamp() as Timestamp,
    };
    
    const inviteRef = await addDoc(collection(db, "referralInvites"), inviteData);
    return inviteRef.id;
  } catch (error) {
    console.error("Error sending referral invitation:", error);
    throw error;
  }
};

// Accept referral invitation (called when new user signs up with referral code)
export const acceptReferralInvitation = async (referralCode: string, newUserId: string) => {
  try {
    // Find pending invitation with this referral code
    const q = query(
      collection(db, "referralInvites"),
      where("referralCode", "==", referralCode),
      where("status", "==", "pending")
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error("Invalid or expired referral code");
    }
    
    const inviteDoc = querySnapshot.docs[0];
    const inviteData = inviteDoc.data() as ReferralInvite;
    
    // Check if invitation expired
    if (inviteData.expiresAt.toDate() < new Date()) {
      await updateDoc(doc(db, "referralInvites", inviteDoc.id), {
        status: "expired"
      });
      throw new Error("Referral invitation has expired");
    }
    
    // Update invitation status
    await updateDoc(doc(db, "referralInvites", inviteDoc.id), {
      status: "accepted",
      acceptedAt: serverTimestamp(),
    });
    
    // Update new user with referral info
    await updateDoc(doc(db, "users", newUserId), {
      referredBy: referralCode,
    });
    
    // Update referrer's stats
    const referrerRef = doc(db, "users", inviteData.referrerUserId);
    const referrerDoc = await getDoc(referrerRef);
    
    if (referrerDoc.exists()) {
      const referrerData = referrerDoc.data();
      const currentStats = referrerData.referralStats || {
        totalReferred: 0,
        successfulReferrals: 0,
        rewardPointsEarned: 0,
        premiumDaysEarned: 0,
      };
      
      await updateDoc(referrerRef, {
        referralStats: {
          ...currentStats,
          totalReferred: currentStats.totalReferred + 1,
          successfulReferrals: currentStats.successfulReferrals + 1,
          premiumDaysEarned: currentStats.premiumDaysEarned + inviteData.rewardAmount,
        },
        updatedAt: serverTimestamp(),
      });
    }
    
    return inviteData;
  } catch (error) {
    console.error("Error accepting referral invitation:", error);
    throw error;
  }
};

// Get user's referral stats
export const getUserReferralStats = async (userId: string) => {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        referralCode: userData.referralCode,
        stats: userData.referralStats || {
          totalReferred: 0,
          successfulReferrals: 0,
          rewardPointsEarned: 0,
          premiumDaysEarned: 0,
        },
        referredBy: userData.referredBy,
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user referral stats:", error);
    throw error;
  }
};

// Get user's sent referral invitations
export const getUserReferralInvitations = async (userId: string) => {
  try {
    const q = query(
      collection(db, "referralInvites"),
      where("referrerUserId", "==", userId)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ReferralInvite[];
  } catch (error) {
    console.error("Error getting user referral invitations:", error);
    // Return empty array if collection doesn't exist yet
    return [];
  }
};

// Helper function to check if user profile is complete
export const isProfileComplete = (user: FirestoreUser): boolean => {
  if (!user?.role) return false;
  
  // Basic required fields for both roles
  const hasBasicInfo = !!(
    user.firstName?.trim() &&
    user.lastName?.trim() &&
    user.email?.trim() &&
    user.phoneNumber?.trim() &&
    user.location?.trim() &&
    user.bio?.trim()
  );
  
  // Normalize role to handle both "job_seeker" and "seeker"
  const normalizedRole = user.role;
  
  if (normalizedRole === "seeker") {
    // Additional requirements for seekers
    return hasBasicInfo && !!(user.experience?.trim());
  } else if (normalizedRole === "referrer") {
    // Additional requirements for referrers
    return hasBasicInfo && !!(
      user.company?.trim() &&
      user.designation?.trim() &&
      user.experience?.trim()
    );
  }
  
  return false;
};

// Check if user qualifies for verification badge
export const isUserVerified = (user: FirestoreUser): boolean => {
  if (!user) return false;
  
  // Complete profile + company details for verification
  const hasCompleteProfile = isProfileComplete(user);
  const hasCompanyInfo = !!(user.company?.trim() && user.designation?.trim());
  
  return hasCompleteProfile && hasCompanyInfo;
};

// ========================================
// ATS Analysis History Functions
// ========================================

export interface ATSAnalysisHistory {
  id?: string;
  userId: string;
  jobTitle?: string;
  company?: string;
  resumeText: string;
  resumeUrl?: string;
  overallScore: number;
  skillsScore?: number;
  experienceScore?: number;
  formatScore?: number;
  keywordsScore?: number;
  suggestions: string[];
  strongPoints?: string[];
  missingKeywords?: string[];
  matchedKeywords?: string[];
  recommendations?: string[];
  analyzedAt: Timestamp;
}

// Save ATS analysis to history
export const saveATSAnalysis = async (analysisData: Omit<ATSAnalysisHistory, "id" | "analyzedAt">) => {
  try {
    const docRef = await addDoc(collection(db, "atsAnalysisHistory"), {
      ...analysisData,
      analyzedAt: serverTimestamp(),
    });
    
    console.log("✅ ATS analysis saved to history:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error saving ATS analysis:", error);
    throw error;
  }
};

// Get all ATS analyses for a user
export const getUserATSAnalysisHistory = async (userId: string): Promise<ATSAnalysisHistory[]> => {
  try {
    const q = query(
      collection(db, "atsAnalysisHistory"),
      where("userId", "==", userId),
      orderBy("analyzedAt", "desc")
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ATSAnalysisHistory[];
  } catch (error) {
    console.error("Error getting ATS analysis history:", error);
    // Return empty array if collection doesn't exist yet
    return [];
  }
};

// Get a specific ATS analysis
export const getATSAnalysis = async (analysisId: string): Promise<ATSAnalysisHistory | null> => {
  try {
    const docRef = doc(db, "atsAnalysisHistory", analysisId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as ATSAnalysisHistory;
    }
    
    return null;
  } catch (error) {
    console.error("Error getting ATS analysis:", error);
    throw error;
  }
};

// Delete an ATS analysis from history
export const deleteATSAnalysis = async (analysisId: string) => {
  try {
    await deleteDoc(doc(db, "atsAnalysisHistory", analysisId));
    console.log("✅ ATS analysis deleted:", analysisId);
  } catch (error) {
    console.error("Error deleting ATS analysis:", error);
    throw error;
  }
};

// Get ATS analysis statistics for a user
export const getUserATSStats = async (userId: string) => {
  try {
    const analyses = await getUserATSAnalysisHistory(userId);
    
    if (analyses.length === 0) {
      return {
        totalAnalyses: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        lastAnalyzed: null,
      };
    }
    
    const scores = analyses.map(a => a.overallScore);
    const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);
    
    return {
      totalAnalyses: analyses.length,
      averageScore,
      highestScore,
      lowestScore,
      lastAnalyzed: analyses[0].analyzedAt,
      improvement: analyses.length > 1 ? analyses[0].overallScore - analyses[analyses.length - 1].overallScore : 0,
    };
  } catch (error) {
    console.error("Error getting ATS stats:", error);
    throw error;
  }
};