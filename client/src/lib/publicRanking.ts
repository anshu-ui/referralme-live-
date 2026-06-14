import type { FirestoreUser, MentorshipSession, ReferralRequest } from "./firestore";

export type PublicRankCategory = "referrer" | "mentor";

export interface PublicRankEntry {
  user: FirestoreUser;
  category: PublicRankCategory;
  score: number;
  rank: number;
  badge: string;
  subtitle: string;
  metrics: {
    acceptedReferrals?: number;
    completedMentorships?: number;
    averageRating?: number;
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
    !!user.bio || !!user.mentorshipBio,
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

  if (score >= 180) return "Referrer of the Month";
  if (score >= 90) return "Referral Champion";
  return "Trusted Referrer";
};

export const buildPublicLeaderboard = ({
  users,
  requests,
  sessions,
}: {
  users: FirestoreUser[];
  requests: ReferralRequest[];
  sessions: MentorshipSession[];
}) => {
  const activeReferrers = (users || []).filter((user) => !user.isSuspended && user.role === "referrer");

  const entries = activeReferrers.flatMap((user) => {
    const referrerRequests = (requests || []).filter((request) => request.referrerId === user.uid);
    const mentorSessions = (sessions || []).filter((session) => session.mentorId === user.uid);
    const acceptedReferrals = referrerRequests.filter((request) => request.status === "accepted").length;
    const completedMentorships = mentorSessions.filter((session) => session.status === "completed").length;
    const paidMentorships = mentorSessions.filter((session) => session.paymentStatus === "paid").length;
    const profileCompletion = getProfileCompletionScore(user);
    const subtitle = user.company && user.designation
      ? `${user.designation} at ${user.company}`
      : user.company || user.designation || "ReferralMe professional";

    const referrerScore = profileCompletion + acceptedReferrals * 35 + referrerRequests.length * 8;
    const mentorScore =
      profileCompletion +
      completedMentorships * 45 +
      paidMentorships * 15 +
      Math.round((user.mentorshipRating || 0) * 10);

    const baseMetrics = {
      acceptedReferrals,
      completedMentorships,
      averageRating: user.mentorshipRating || 0,
      profileCompletion,
    };

    const rows: Array<Omit<PublicRankEntry, "rank">> = [{
      user,
      category: "referrer",
      score: referrerScore,
      badge: getProfileBadge(referrerScore, "referrer"),
      subtitle,
      metrics: baseMetrics,
    }];

    const hasActiveMentorshipService = (user.mentorshipServices || []).some((service) => service.isActive);
    if (user.isMentorshipEnabled || hasActiveMentorshipService || mentorSessions.length > 0) {
      rows.push({
        user,
        category: "mentor",
        score: mentorScore,
        badge: getProfileBadge(mentorScore, "mentor"),
        subtitle,
        metrics: baseMetrics,
      });
    }

    return rows;
  });

  return entries
    .sort((a, b) => b.score - a.score)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
};
