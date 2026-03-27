import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { campusDb } from "./campus-firebase";

export interface CampusAmbassadorApplication {
  id?: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  collegeName: string;
  course: string;
  graduationYear: string;
  city?: string;
  linkedinUrl?: string;
  instagramHandle?: string;
  societies?: string;
  communityReach?: string;
  whyJoin: string;
  availabilityHours: string;
  heardFrom?: string;
  status: "pending" | "shortlisted" | "interview_scheduled" | "accepted" | "rejected" | "inactive";
  source?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CampusAmbassadorShowcaseItem {
  id?: string;
  section:
    | "highlight"
    | "leaderboard"
    | "gallery"
    | "pillar"
    | "mission"
    | "campus_moment"
    | "program_point"
    | "benefit"
    | "reward_tier"
    | "timeline"
    | "faq"
    | "testimonial"
    | "hero_stat"
    | "info_row";
  title: string;
  subtitle?: string;
  description?: string;
  badge?: string;
  accent?: string;
  initials?: string;
  metric?: string;
  imageUrl?: string;
  galleryImageUrls?: string[];
  imageAlt?: string;
  order: number;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CampusAmbassadorPageSettings {
  id?: string;
  heroEyebrow?: string;
  heroTitle?: string;
  heroDescription?: string;
  footerTitle?: string;
  footerSubtitle?: string;
  footerDescription?: string;
  footerTagline?: string;
  contactEmail?: string;
  linkedinHref?: string;
  instagramHref?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CampusAmbassadorMember {
  id?: string;
  email: string;
  fullName: string;
  collegeName: string;
  course?: string;
  graduationYear?: string;
  phoneNumber?: string;
  linkedinUrl?: string;
  profileImageUrl?: string;
  instagramHandle?: string;
  bio?: string;
  city?: string;
  status: "accepted" | "active" | "inactive";
  ambassadorCode: string;
  points: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CampusAmbassadorTask {
  id?: string;
  title: string;
  description: string;
  points: number;
  dueDate?: string;
  audience: "all" | "college";
  audienceCollege?: string;
  status: "draft" | "active" | "completed" | "archived";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CampusTaskSubmission {
  id?: string;
  taskId: string;
  taskTitle: string;
  ambassadorEmail: string;
  ambassadorName: string;
  ambassadorCollege: string;
  proofText?: string;
  proofLink?: string;
  proofImageUrl?: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  pointsAwarded: number;
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  updatedAt: Timestamp;
}

export interface CampusAnnouncement {
  id?: string;
  title: string;
  message: string;
  tone: "info" | "success" | "warning";
  audience: "all" | "college";
  audienceCollege?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

const ensureCampusDb = () => {
  if (!campusDb) {
    throw new Error("Campus Firebase is not configured. Add VITE_CAMPUS_FIREBASE_* variables first.");
  }
  return campusDb;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sanitizePayload = <T extends Record<string, any>>(payload: T) =>
  Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));

const isOfflineFirestoreError = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  const message =
    typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message) : "";
  const lowered = message.toLowerCase();

  return (
    code.includes("offline") ||
    code.includes("network-request-failed") ||
    lowered.includes("client is offline") ||
    lowered.includes("network-request-failed") ||
    lowered.includes("could not reach cloud firestore backend")
  );
};

const isPermissionFirestoreError = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  const message =
    typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message) : "";
  const lowered = message.toLowerCase();

  return code.includes("permission-denied") || lowered.includes("missing or insufficient permissions");
};

export const createCampusAmbassadorApplication = async (
  applicationData: Omit<CampusAmbassadorApplication, "id" | "createdAt" | "updatedAt" | "status">,
) => {
  const db = ensureCampusDb();
  const docRef = await addDoc(
    collection(db, "campusAmbassadorApplications"),
    sanitizePayload({
      ...applicationData,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return docRef.id;
};

export const getCampusAmbassadorApplications = async (): Promise<CampusAmbassadorApplication[]> => {
  if (!campusDb) return [];
  const db = campusDb;
  try {
    const snapshot = await getDocs(query(collection(db, "campusAmbassadorApplications"), orderBy("createdAt", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusAmbassadorApplication[];
  } catch (error) {
    if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) return [];
    throw error;
  }
};

export const updateCampusAmbassadorApplication = async (
  applicationId: string,
  updates: Partial<Omit<CampusAmbassadorApplication, "id" | "createdAt">>,
) => {
  const db = ensureCampusDb();
  await updateDoc(
    doc(db, "campusAmbassadorApplications", applicationId),
    sanitizePayload({
      ...updates,
      updatedAt: serverTimestamp(),
    }),
  );
};

export const deleteCampusAmbassadorApplication = async (applicationId: string) => {
  const db = ensureCampusDb();
  await deleteDoc(doc(db, "campusAmbassadorApplications", applicationId));
};

export const getCampusAmbassadorShowcaseItems = async (): Promise<CampusAmbassadorShowcaseItem[]> => {
  if (!campusDb) return [];
  const db = campusDb;
  try {
    const snapshot = await getDocs(query(collection(db, "campusAmbassadorShowcase"), orderBy("order", "asc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusAmbassadorShowcaseItem[];
  } catch (error) {
    if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) return [];
    throw error;
  }
};

export const createCampusAmbassadorShowcaseItem = async (
  item: Omit<CampusAmbassadorShowcaseItem, "id" | "createdAt" | "updatedAt">,
) => {
  const db = ensureCampusDb();
  const docRef = await addDoc(
    collection(db, "campusAmbassadorShowcase"),
    sanitizePayload({
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return docRef.id;
};

export const updateCampusAmbassadorShowcaseItem = async (
  itemId: string,
  updates: Partial<Omit<CampusAmbassadorShowcaseItem, "id" | "createdAt">>,
) => {
  const db = ensureCampusDb();
  await updateDoc(
    doc(db, "campusAmbassadorShowcase", itemId),
    sanitizePayload({
      ...updates,
      updatedAt: serverTimestamp(),
    }),
  );
};

export const deleteCampusAmbassadorShowcaseItem = async (itemId: string) => {
  const db = ensureCampusDb();
  await deleteDoc(doc(db, "campusAmbassadorShowcase", itemId));
};

export const getCampusAmbassadorPageSettings = async (): Promise<CampusAmbassadorPageSettings | null> => {
  if (!campusDb) return null;
  const db = campusDb;
  const settingsRef = doc(db, "campusAmbassadorPage", "settings");
  try {
    const snapshot = await getDoc(settingsRef);
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as CampusAmbassadorPageSettings;
  } catch (error) {
    if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) return null;
    throw error;
  }
};

export const upsertCampusAmbassadorPageSettings = async (
  settings: Omit<CampusAmbassadorPageSettings, "id" | "createdAt" | "updatedAt">,
) => {
  const db = ensureCampusDb();
  const settingsRef = doc(db, "campusAmbassadorPage", "settings");
  const existing = await getDoc(settingsRef);
  await setDoc(
    settingsRef,
    sanitizePayload({
      ...settings,
      createdAt: existing.exists() ? existing.data().createdAt || serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
};

export const generateCampusAmbassadorCode = (name: string) => {
  const prefix = name.replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 4) || "CAMP";
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}${suffix}`;
};

export const getCampusAmbassadorByEmail = async (email: string): Promise<CampusAmbassadorMember | null> => {
  const db = ensureCampusDb();
  try {
    const snapshot = await getDoc(doc(db, "campusAmbassadors", normalizeEmail(email)));
    if (!snapshot.exists()) return null;
    return { id: snapshot.id, ...snapshot.data() } as CampusAmbassadorMember;
  } catch (error) {
    if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) return null;
    throw error;
  }
};

export const subscribeToCampusAmbassadorByEmail = (
  email: string,
  onData: (member: CampusAmbassadorMember | null) => void,
) => {
  const db = ensureCampusDb();
  return onSnapshot(
    doc(db, "campusAmbassadors", normalizeEmail(email)),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }
      onData({ id: snapshot.id, ...snapshot.data() } as CampusAmbassadorMember);
    },
    (error) => {
      if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) {
        onData(null);
        return;
      }
      throw error;
    },
  );
};

export const upsertCampusAmbassadorMember = async (
  email: string,
  data: Omit<CampusAmbassadorMember, "id" | "createdAt" | "updatedAt" | "email">,
) => {
  const db = ensureCampusDb();
  const docId = normalizeEmail(email);
  const ref = doc(db, "campusAmbassadors", docId);
  const existing = await getDoc(ref);
  await setDoc(
    ref,
    sanitizePayload({
      email: docId,
      ...data,
      createdAt: existing.exists() ? existing.data().createdAt || serverTimestamp() : serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
};

export const getCampusAmbassadorMembers = async (): Promise<CampusAmbassadorMember[]> => {
  if (!campusDb) return [];
  const db = campusDb;
  try {
    const snapshot = await getDocs(query(collection(db, "campusAmbassadors"), orderBy("createdAt", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusAmbassadorMember[];
  } catch (error) {
    if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) return [];
    throw error;
  }
};

export const subscribeToCampusAmbassadorMembers = (onData: (members: CampusAmbassadorMember[]) => void) => {
  const db = ensureCampusDb();
  return onSnapshot(
    query(collection(db, "campusAmbassadors"), orderBy("createdAt", "desc")),
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusAmbassadorMember[]);
    },
    (error) => {
      if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) {
        onData([]);
        return;
      }
      throw error;
    },
  );
};

export const updateCampusAmbassadorMember = async (
  email: string,
  updates: Partial<Omit<CampusAmbassadorMember, "id" | "createdAt" | "updatedAt" | "email">>,
) => {
  const db = ensureCampusDb();
  await updateDoc(
    doc(db, "campusAmbassadors", normalizeEmail(email)),
    sanitizePayload({
      ...updates,
      updatedAt: serverTimestamp(),
    }),
  );
};

export const deleteCampusAmbassadorMember = async (email: string) => {
  const db = ensureCampusDb();
  await deleteDoc(doc(db, "campusAmbassadors", normalizeEmail(email)));
};

export const getCampusAmbassadorTasks = async (): Promise<CampusAmbassadorTask[]> => {
  if (!campusDb) return [];
  const db = campusDb;
  try {
    const snapshot = await getDocs(query(collection(db, "campusAmbassadorTasks"), orderBy("createdAt", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusAmbassadorTask[];
  } catch (error) {
    if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) return [];
    throw error;
  }
};

export const subscribeToCampusAmbassadorTasks = (onData: (tasks: CampusAmbassadorTask[]) => void) => {
  const db = ensureCampusDb();
  return onSnapshot(
    query(collection(db, "campusAmbassadorTasks"), orderBy("createdAt", "desc")),
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusAmbassadorTask[]);
    },
    (error) => {
      if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) {
        onData([]);
        return;
      }
      throw error;
    },
  );
};

export const createCampusAmbassadorTask = async (
  task: Omit<CampusAmbassadorTask, "id" | "createdAt" | "updatedAt">,
) => {
  const db = ensureCampusDb();
  const docRef = await addDoc(
    collection(db, "campusAmbassadorTasks"),
    sanitizePayload({
      ...task,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return docRef.id;
};

export const getCampusAnnouncements = async (): Promise<CampusAnnouncement[]> => {
  if (!campusDb) return [];
  const db = campusDb;
  try {
    const snapshot = await getDocs(query(collection(db, "campusAnnouncements"), orderBy("createdAt", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusAnnouncement[];
  } catch (error) {
    if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) return [];
    throw error;
  }
};

export const subscribeToCampusAnnouncements = (onData: (announcements: CampusAnnouncement[]) => void) => {
  const db = ensureCampusDb();
  return onSnapshot(
    query(collection(db, "campusAnnouncements"), orderBy("createdAt", "desc")),
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusAnnouncement[]);
    },
    (error) => {
      if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) {
        onData([]);
        return;
      }
      throw error;
    },
  );
};

export const createCampusAnnouncement = async (
  announcement: Omit<CampusAnnouncement, "id" | "createdAt" | "updatedAt">,
) => {
  const db = ensureCampusDb();
  const docRef = await addDoc(
    collection(db, "campusAnnouncements"),
    sanitizePayload({
      ...announcement,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return docRef.id;
};

export const updateCampusAnnouncement = async (
  announcementId: string,
  updates: Partial<Omit<CampusAnnouncement, "id" | "createdAt">>,
) => {
  const db = ensureCampusDb();
  await updateDoc(
    doc(db, "campusAnnouncements", announcementId),
    sanitizePayload({
      ...updates,
      updatedAt: serverTimestamp(),
    }),
  );
};

export const deleteCampusAnnouncement = async (announcementId: string) => {
  const db = ensureCampusDb();
  await deleteDoc(doc(db, "campusAnnouncements", announcementId));
};

export const updateCampusAmbassadorTask = async (
  taskId: string,
  updates: Partial<Omit<CampusAmbassadorTask, "id" | "createdAt">>,
) => {
  const db = ensureCampusDb();
  await updateDoc(
    doc(db, "campusAmbassadorTasks", taskId),
    sanitizePayload({
      ...updates,
      updatedAt: serverTimestamp(),
    }),
  );
};

export const deleteCampusAmbassadorTask = async (taskId: string) => {
  const db = ensureCampusDb();
  await deleteDoc(doc(db, "campusAmbassadorTasks", taskId));
};

export const getCampusTaskSubmissions = async (): Promise<CampusTaskSubmission[]> => {
  if (!campusDb) return [];
  const db = campusDb;
  try {
    const snapshot = await getDocs(query(collection(db, "campusTaskSubmissions"), orderBy("submittedAt", "desc")));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusTaskSubmission[];
  } catch (error) {
    if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) return [];
    throw error;
  }
};

export const subscribeToCampusTaskSubmissions = (onData: (submissions: CampusTaskSubmission[]) => void) => {
  const db = ensureCampusDb();
  return onSnapshot(
    query(collection(db, "campusTaskSubmissions"), orderBy("submittedAt", "desc")),
    (snapshot) => {
      onData(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as CampusTaskSubmission[]);
    },
    (error) => {
      if (isOfflineFirestoreError(error) || isPermissionFirestoreError(error)) {
        onData([]);
        return;
      }
      throw error;
    },
  );
};

export const getCampusTaskSubmissionsForAmbassador = async (email: string): Promise<CampusTaskSubmission[]> => {
  const submissions = await getCampusTaskSubmissions();
  const normalized = normalizeEmail(email);
  return submissions.filter((entry) => entry.ambassadorEmail?.toLowerCase() === normalized);
};

export const deleteCampusTaskSubmissionsForAmbassador = async (email: string) => {
  const db = ensureCampusDb();
  const submissions = await getCampusTaskSubmissionsForAmbassador(email);
  const approvedPoints = submissions
    .filter((entry) => entry.status === "approved")
    .reduce((sum, entry) => sum + Number(entry.pointsAwarded || 0), 0);

  await Promise.all(
    submissions
      .filter((entry) => entry.id)
      .map((entry) => deleteDoc(doc(db, "campusTaskSubmissions", entry.id as string))),
  );

  if (approvedPoints > 0) {
    await updateDoc(doc(db, "campusAmbassadors", normalizeEmail(email)), {
      points: increment(-approvedPoints),
      updatedAt: serverTimestamp(),
    });
  }
};

export const deleteCampusTaskSubmissionsForTask = async (taskId: string) => {
  const db = ensureCampusDb();
  const submissions = await getCampusTaskSubmissions();
  const taskSubmissions = submissions.filter((entry) => entry.taskId === taskId);
  const pointsByAmbassador = taskSubmissions.reduce<Record<string, number>>((acc, entry) => {
    if (entry.status === "approved") {
      const key = normalizeEmail(entry.ambassadorEmail || "");
      acc[key] = (acc[key] || 0) + Number(entry.pointsAwarded || 0);
    }
    return acc;
  }, {});

  await Promise.all(
    taskSubmissions
      .filter((entry) => entry.id)
      .map((entry) => deleteDoc(doc(db, "campusTaskSubmissions", entry.id as string))),
  );

  await Promise.all(
    Object.entries(pointsByAmbassador)
      .filter(([, points]) => points > 0)
      .map(([email, points]) =>
        updateDoc(doc(db, "campusAmbassadors", email), {
          points: increment(-points),
          updatedAt: serverTimestamp(),
        }),
      ),
  );
};

export const createCampusTaskSubmission = async (
  submission: Omit<CampusTaskSubmission, "id" | "submittedAt" | "updatedAt" | "reviewedAt" | "status">,
) => {
  const db = ensureCampusDb();
  const docRef = await addDoc(
    collection(db, "campusTaskSubmissions"),
    sanitizePayload({
      ...submission,
      ambassadorEmail: submission.ambassadorEmail.toLowerCase(),
      status: "pending",
      pointsAwarded: submission.pointsAwarded || 0,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  return docRef.id;
};

export const updateCampusTaskSubmission = async (
  submissionId: string,
  updates: Partial<Omit<CampusTaskSubmission, "id" | "submittedAt">>,
) => {
  const db = ensureCampusDb();
  await updateDoc(
    doc(db, "campusTaskSubmissions", submissionId),
    sanitizePayload({
      ...updates,
      updatedAt: serverTimestamp(),
    }),
  );
};

export const reviewCampusTaskSubmission = async (
  submission: CampusTaskSubmission,
  nextStatus: "approved" | "rejected",
  reviewNote?: string,
) => {
  const db = ensureCampusDb();
  const submissionRef = doc(db, "campusTaskSubmissions", submission.id as string);
  const memberRef = doc(db, "campusAmbassadors", submission.ambassadorEmail.toLowerCase());
  const awardedPoints = Number(submission.pointsAwarded || 0);
  const nextPointsAwarded = nextStatus === "approved" ? awardedPoints : 0;

  await updateDoc(
    submissionRef,
    sanitizePayload({
      status: nextStatus,
      reviewNote: reviewNote?.trim() || undefined,
      pointsAwarded: nextPointsAwarded,
      reviewedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );

  const pointsDelta =
    submission.status === "approved" && nextStatus !== "approved"
      ? -awardedPoints
      : submission.status !== "approved" && nextStatus === "approved"
        ? awardedPoints
        : 0;

  if (pointsDelta !== 0) {
    await updateDoc(memberRef, {
      points: increment(pointsDelta),
      updatedAt: serverTimestamp(),
    });
  }
};
