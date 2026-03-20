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
  role?: "seeker" | "referrer" | "admin";
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
  isSuspended?: boolean;
  suspendedReason?: string;
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
  jobType?: "full-time" | "part-time" | "contract" | "internship";
  workArrangement?: "remote" | "hybrid" | "onsite";
  experienceLevel?: "entry" | "mid" | "senior" | "lead";
  urgency?: "low" | "medium" | "high";
  niceToHave?: string;
  benefits?: string;
  applicationDeadline?: string;
  skills?: string[];
  quickSummary?: string;
  internalReferralLink?: string;
  applicationMode?: "platform_request" | "direct_internal_link" | "email_resume";
  visibility?: "public" | "private_link" | "invite_only";
  minAtsScore?: number;
  maxReferrals?: number;
  currentReferralCount?: number;
  autoCloseOnCap?: boolean;
  templateId?: string;
  templateName?: string;
  screeningQuestions?: ScreeningQuestion[];
  expiresAt?: string;
  reminderPreference?: "smart" | "daily" | "weekly";
  digestEnabled?: boolean;
  sourceType?: "manual" | "ai_import" | "quick_post";
  isArchived?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ScreeningQuestion {
  id: string;
  prompt: string;
  inputType: "short_text" | "long_text" | "select";
  required: boolean;
  options?: string[];
}

export interface ScreeningAnswer {
  questionId: string;
  prompt: string;
  answer: string;
}

export interface JobTemplate {
  id?: string;
  referrerId: string;
  referrerEmail: string;
  referrerName: string;
  name: string;
  title: string;
  company: string;
  location: string;
  jobType?: JobPosting["jobType"];
  workArrangement?: JobPosting["workArrangement"];
  experienceLevel?: JobPosting["experienceLevel"];
  description: string;
  requirements: string;
  quickSummary?: string;
  urgency?: JobPosting["urgency"];
  visibility?: JobPosting["visibility"];
  applicationMode?: JobPosting["applicationMode"];
  minAtsScore?: number;
  maxReferrals?: number;
  autoCloseOnCap?: boolean;
  reminderPreference?: JobPosting["reminderPreference"];
  digestEnabled?: boolean;
  screeningQuestions?: ScreeningQuestion[];
  skills?: string[];
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
  screeningAnswers?: ScreeningAnswer[];
  screeningScore?: number;
  matchScore?: number;
  shortlistTier?: "auto_shortlist" | "review" | "hold";
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

export interface PlatformAnnouncement {
  id?: string;
  title: string;
  message: string;
  audience: "all" | "seekers" | "referrers" | "admins";
  priority: "info" | "important" | "critical";
  status: "draft" | "published" | "archived";
  ctaLabel?: string;
  ctaHref?: string;
  createdByUid: string;
  createdByEmail: string;
  deliveryChannels?: Array<"in_app" | "email">;
  publishedAt?: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const sanitizeFirestorePayload = <T extends Record<string, any>>(payload: T) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const normalizeScreeningQuestions = (questions?: ScreeningQuestion[]) =>
  (questions || [])
    .map((question) => {
      const options = question.options?.map((option) => option.trim()).filter(Boolean);
      return {
        id: question.id,
        prompt: question.prompt.trim(),
        inputType: question.inputType,
        required: question.required,
        ...(options && options.length > 0 ? { options } : {}),
      };
    })
    .filter((question) => question.prompt);

const getRequestStatusWeight = (status?: ReferralRequest["status"]) => {
  switch (status) {
    case "accepted":
    case "referral_confirmed":
    case "sent_to_hr":
    case "interview_scheduled":
    case "completed":
      return 1;
    default:
      return 0;
  }
};

export const isJobExpired = (job?: Partial<JobPosting> | null) => {
  if (!job?.expiresAt) return false;
  const expiryDate = new Date(job.expiresAt);
  return !Number.isNaN(expiryDate.getTime()) && expiryDate.getTime() < Date.now();
};

export const isJobAtCapacity = (job?: Partial<JobPosting> | null) => {
  const maxReferrals = Number(job?.maxReferrals || 0);
  if (!maxReferrals) return false;
  return Number(job?.currentReferralCount || 0) >= maxReferrals;
};

export const isJobClosedForApplications = (job?: Partial<JobPosting> | null) =>
  !job || job.isActive === false || job.isArchived === true || isJobExpired(job) || isJobAtCapacity(job);

export const computeRequestMatchScore = (request: Partial<ReferralRequest>, job?: Partial<JobPosting> | null) => {
  const atsScore = Number(request.atsScore || 0);
  const cutoff = Number(job?.minAtsScore || 0);
  const screeningScore = Number(request.screeningScore || 0);
  const atsComponent = atsScore ? Math.min(60, atsScore * 0.6) : 0;
  const screeningComponent = screeningScore ? Math.min(25, screeningScore * 0.25) : 0;
  const cutoffBoost = cutoff && atsScore >= cutoff ? 15 : 0;
  return Math.round(Math.min(100, atsComponent + screeningComponent + cutoffBoost));
};

export const computeShortlistTier = (request: Partial<ReferralRequest>, job?: Partial<JobPosting> | null) => {
  const cutoff = Number(job?.minAtsScore || 0);
  const atsScore = Number(request.atsScore || 0);
  const screeningScore = Number(request.screeningScore || 0);
  const hasRequiredScreening = !(job?.screeningQuestions || []).some((question) => question.required) || screeningScore > 0;

  if (cutoff && atsScore >= cutoff && hasRequiredScreening) {
    return "auto_shortlist" as const;
  }

  if (!cutoff && (atsScore >= 75 || screeningScore >= 75)) {
    return "auto_shortlist" as const;
  }

  if (atsScore >= Math.max(55, cutoff - 10) || screeningScore >= 50) {
    return "review" as const;
  }

  return "hold" as const;
};

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

export const getAllUsers = async (): Promise<FirestoreUser[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = querySnapshot.docs.map((userDoc) => ({
      uid: userDoc.id,
      ...userDoc.data(),
    })) as FirestoreUser[];

    users.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

    return users;
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
};

export const createPlatformAnnouncement = async (
  data: Omit<PlatformAnnouncement, "id" | "createdAt" | "updatedAt" | "publishedAt"> & {
    publishedAt?: boolean;
  },
) => {
  const announcement = sanitizeFirestorePayload({
    ...data,
    publishedAt: data.publishedAt ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const docRef = await addDoc(collection(db, "platformAnnouncements"), announcement);
  return docRef.id;
};

export const updatePlatformAnnouncement = async (
  id: string,
  updates: Partial<PlatformAnnouncement> & { publishedAt?: boolean },
) => {
  const announcementRef = doc(db, "platformAnnouncements", id);
  const sanitizedUpdates = sanitizeFirestorePayload({
    ...updates,
    publishedAt:
      typeof updates.publishedAt === "boolean"
        ? updates.publishedAt
          ? serverTimestamp()
          : null
        : updates.publishedAt,
    updatedAt: serverTimestamp(),
  });

  await updateDoc(announcementRef, sanitizedUpdates);
};

export const getPlatformAnnouncements = async (): Promise<PlatformAnnouncement[]> => {
  const querySnapshot = await getDocs(collection(db, "platformAnnouncements"));
  const announcements = querySnapshot.docs.map((announcementDoc) => ({
    id: announcementDoc.id,
    ...announcementDoc.data(),
  })) as PlatformAnnouncement[];

  announcements.sort((a, b) => {
    const aTime = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
    const bTime = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
    return bTime.getTime() - aTime.getTime();
  });

  return announcements;
};

export const subscribeToPlatformAnnouncements = (
  callback: (announcements: PlatformAnnouncement[]) => void,
) => {
  const announcementsQuery = query(collection(db, "platformAnnouncements"), orderBy("updatedAt", "desc"));

  return onSnapshot(announcementsQuery, (snapshot) => {
    const announcements = snapshot.docs.map((announcementDoc) => ({
      id: announcementDoc.id,
      ...announcementDoc.data(),
    })) as PlatformAnnouncement[];

    callback(announcements);
  });
};

// Job posting operations
export const createJobPosting = async (jobData: Omit<JobPosting, "id" | "createdAt" | "updatedAt">) => {
  try {
    console.log("Creating job posting with data:", jobData);
    const sanitizedJobData = sanitizeFirestorePayload({
      ...jobData,
      screeningQuestions: normalizeScreeningQuestions(jobData.screeningQuestions),
      currentReferralCount: Number(jobData.currentReferralCount || 0),
    });
    const jobDoc = {
      ...sanitizedJobData,
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

export const getAllJobPostings = async (): Promise<JobPosting[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "jobPostings"));

    const jobs = querySnapshot.docs.map((jobDoc) => ({
      id: jobDoc.id,
      ...jobDoc.data(),
    })) as JobPosting[];

    jobs.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

    return jobs;
  } catch (error) {
    console.error("Error getting all job postings:", error);
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
    await updateDoc(jobRef, sanitizeFirestorePayload({
      ...updates,
      screeningQuestions: updates.screeningQuestions ? normalizeScreeningQuestions(updates.screeningQuestions) : undefined,
      updatedAt: serverTimestamp(),
    }));
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
    const shortlistTier = requestData.shortlistTier || computeShortlistTier(requestData, null);
    const requestDoc = sanitizeFirestorePayload({
      ...requestData,
      screeningAnswers: requestData.screeningAnswers || [],
      matchScore: requestData.matchScore || computeRequestMatchScore(requestData, null),
      shortlistTier,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
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
    const linkedJob = requestData.job || null;
    const screeningAnswers = (requestData.screeningAnswers || []) as ScreeningAnswer[];
    const normalizedQuestions = (linkedJob?.screeningQuestions || []) as ScreeningQuestion[];
    const requiredQuestions = normalizedQuestions.filter((question) => question.required);
    const answeredRequiredCount = requiredQuestions.filter((question) =>
      screeningAnswers.some((entry) => entry.questionId === question.id && entry.answer?.trim()),
    ).length;
    const answeredOptionalCount = normalizedQuestions.filter((question) =>
      !question.required && screeningAnswers.some((entry) => entry.questionId === question.id && entry.answer?.trim()),
    ).length;
    const screeningScore = requiredQuestions.length
      ? Math.round((answeredRequiredCount / requiredQuestions.length) * 100)
      : normalizedQuestions.length
        ? Math.round((answeredOptionalCount / normalizedQuestions.length) * 100)
        : 0;
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
      screeningAnswers,
      screeningScore,
      matchScore: computeRequestMatchScore(
        {
          atsScore: requestData.atsScore,
          screeningScore,
        },
        linkedJob,
      ),
      shortlistTier: computeShortlistTier(
        {
          atsScore: requestData.atsScore,
          screeningScore,
        },
        linkedJob,
      ),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const requestRef = await addDoc(collection(db, 'referralRequests'), enhancedRequestData);

    if (linkedJob?.id) {
      const jobRef = doc(db, "jobPostings", linkedJob.id);
      const nextCount = Number(linkedJob.currentReferralCount || 0) + 1;
      await updateDoc(jobRef, sanitizeFirestorePayload({
        currentReferralCount: nextCount,
        isActive:
          linkedJob.autoCloseOnCap && linkedJob.maxReferrals
            ? nextCount < Number(linkedJob.maxReferrals)
            : linkedJob.isActive !== false,
        updatedAt: serverTimestamp(),
      }));
    }
    
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

export const getAllReferralRequests = async (): Promise<ReferralRequest[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, "referralRequests"));

    const requests = querySnapshot.docs.map((requestDoc) => ({
      id: requestDoc.id,
      ...requestDoc.data(),
    })) as ReferralRequest[];

    requests.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime.getTime() - aTime.getTime();
    });

    return requests;
  } catch (error) {
    console.error("Error getting all referral requests:", error);
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

export const createJobTemplate = async (
  templateData: Omit<JobTemplate, "id" | "createdAt" | "updatedAt">,
) => {
  const templateDoc = sanitizeFirestorePayload({
    ...templateData,
    screeningQuestions: normalizeScreeningQuestions(templateData.screeningQuestions),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const docRef = await addDoc(collection(db, "jobTemplates"), templateDoc);
  return docRef.id;
};

export const getJobTemplatesByReferrer = async (referrerId: string): Promise<JobTemplate[]> => {
  const q = query(collection(db, "jobTemplates"), where("referrerId", "==", referrerId));
  const querySnapshot = await getDocs(q);
  const templates = querySnapshot.docs.map((templateDoc) => ({
    id: templateDoc.id,
    ...templateDoc.data(),
  })) as JobTemplate[];

  templates.sort((a, b) => {
    const aTime = a.updatedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
    const bTime = b.updatedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
    return bTime.getTime() - aTime.getTime();
  });

  return templates;
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
            .filter((job): job is JobPosting => {
              if (!job || job.isActive === false) return false;
              if (job.isArchived) return false;
              if (isJobExpired(job)) return false;
              if (job.autoCloseOnCap && isJobAtCapacity(job)) return false;
              return true;
            })
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

export const subscribeToReferrerJobPostings = (referrerId: string, callback: (jobs: JobPosting[]) => void) => {
  try {
    console.log("Setting up referrer job postings subscription for:", referrerId);
    const q = query(
      collection(db, "jobPostings"),
      where("referrerId", "==", referrerId)
    );

    return onSnapshot(q, (querySnapshot) => {
      const jobs = querySnapshot.docs.map((jobDoc) => ({
        id: jobDoc.id,
        ...jobDoc.data(),
      })) as JobPosting[];

      jobs.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      });

      callback(jobs);
    });
  } catch (error) {
    console.error("Error setting up referrer job postings subscription:", error);
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

export const getSeekersForJobAlerts = async (): Promise<FirestoreUser[]> => {
  try {
    const q = query(
      collection(db, "users"),
      where("role", "==", "seeker"),
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs
      .map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }) as FirestoreUser)
      .filter((user) => user.email?.trim());
  } catch (error) {
    console.error("Error getting seekers for job alerts:", error);
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
