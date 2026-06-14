import type { ATSAnalysisHistory, FirestoreUser, MentorshipSession, ReferralRequest } from "./firestore";

export type PublicRankCategory = "referrer" | "mentor" | "seeker";

export interface PublicRankEntry {
  user: FirestoreUser;
  category: PublicRankCategory;
  score: number;
  rank: number;
  badge: string;
  subtitle: string;
  metrics: {
    jobs?: number;
    acceptedReferrals?: number;
    completedMentorships?: number;
    averageRating?: number;
    atsScore?: number;
    applications?: number;
    profileCompletion?: number;
  };
}

export const getUserDisplayName = (user?: Partial<FirestoreUser> | null) => {
  if (!user) return "ReferralMe User";
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.displayName || user.email?.split("@")[0] || "ReferralMe User";
};

export const parseSkills = (skills: unknown): string[] => {
  if (Array.isArray(skills)) return skills.filter(Boolean).map(String);
  if (typeof skills === "string") {
    try {
      const parsed = JSON.parse(skills);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {
      return skills.split(",").map((skill) => skill.trim()).filter(Boolean);
    }
  }
  return [];
};

export const getProfileCompletionScore = (user: Partial<FirestoreUser>) => {
  const checks = [
    !!getUserDisplayName(user),
    !!user.email,
    !!user.photoURL || !!user.profileImageUrl,
    !!user.bio,
    !!user.company || !!user.designation,
    parseSkills(user.skills).length > 0,
    !!user.linkedinUrl || !!user.linkedin,
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
};

export const getProfileBadge = (score: number, category: PublicRankCategory) => {
  if (category === "mentor") {
    if (score >= 180) return "Top Mentor";
    if (score >= 90) return "Career Guide";
    return "New Mentor";
  }
  if (category === "seeker") {
    if (score >= 160) return "Placement Ready";
    if (score >= 90) return "Rising Candidate";
    return "Profile Starter";
  }
  if (score >= 180) return "Referrer of the Month";
  if (score >= 90) return "Referral Champion";
  return "Trusted Referrer";
};

export const buildPublicLeaderboard = ({
  users,
  requests,
  sessions,
  atsHistoryByUser = {},
}: {
  users: FirestoreUser[];
  requests: ReferralRequest[];
  sessions: MentorshipSession[];
  atsHistoryByUser?: Record<string, ATSAnalysisHistory[]>;
}) => {
  const activeUsers = (users || []).filter((user) => !user.isSuspended && user.role !== "admin");

  const entries = activeUsers.map((user) => {
    const userRequestsAsReferrer = (requests || []).filter((request) => request.referrerId === user.uid);
    const userRequestsAsSeeker = (requests || []).filter((request) => request.seekerId === user.uid);
    const mentorSessions = (sessions || []).filter((session) => session.mentorId === user.uid);
    const menteeSessions = (sessions || []).filter((session) => session.menteeId === user.uid);
    const atsHistory = atsHistoryByUser[user.uid] || [];
    const latestAtsScore = atsHistory[0]?.overallScore || 0;
    const acceptedReferrals = userRequestsAsReferrer.filter((request) => request.status === "accepted").length;
    const completedMentorships = mentorSessions.filter((session) => session.status === "completed").length;
    const profileCompletion = getProfileCompletionScore(user);

    const category: PublicRankCategory =
      user.role === "seeker"
        ? "seeker"
        : user.isMentorshipEnabled || completedMentorships > 0
          ? "mentor"
          : "referrer";

    const referrerScore = acceptedReferrals * 35 + userRequestsAsReferrer.length * 8;
    const mentorScore =
      completedMentorships * 45 +
      mentorSessions.filter((session) => session.paymentStatus === "paid").length * 15 +
      Math.round((user.mentorshipRating || 0) * 10);
    const seekerScore =
      latestAtsScore +
      userRequestsAsSeeker.length * 10 +
      menteeSessions.filter((session) => session.status === "completed").length * 12;
    const score = profileCompletion + referrerScore + mentorScore + seekerScore;

    return {
      user,
      category,
      score,
      badge: getProfileBadge(score, category),
      subtitle:
        category === "seeker"
          ? user.designation || "Career seeker"
          : user.company && user.designation
            ? `${user.designation} at ${user.company}`
            : user.company || user.designation || "ReferralMe professional",
      metrics: {
        acceptedReferrals,
        completedMentorships,
        averageRating: user.mentorshipRating || 0,
        atsScore: latestAtsScore,
        applications: userRequestsAsSeeker.length,
        profileCompletion,
      },
    } satisfies Omit<PublicRankEntry, "rank">;
  });

  return entries
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};
