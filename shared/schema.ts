import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  profileIcon: varchar("profile_icon"), // Small preview icon for profile
  role: varchar("role", { enum: ["seeker", "referrer"] }),
  // Enhanced profile fields
  designation: varchar("designation"),
  company: varchar("company"),
  experience: text("experience"),
  skills: text("skills"), // JSON array of skills
  linkedinUrl: varchar("linkedin_url"),
  githubUrl: varchar("github_url"),
  websiteUrl: varchar("website_url"),
  bio: text("bio"),
  location: varchar("location"),
  phoneNumber: varchar("phone_number"),
  profileViews: integer("profile_views").default(0),
  isEmailVerified: boolean("is_email_verified").default(false),
  verificationBadges: jsonb("verification_badges"),
  companyInfo: jsonb("company_info"),
  profileCompleted: boolean("profile_completed").default(false),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobPostings = pgTable("job_postings", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  company: varchar("company").notNull(),
  location: varchar("location").notNull(),
  salary: varchar("salary"),
  description: text("description").notNull(),
  requirements: text("requirements"),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referralRequests = pgTable("referral_requests", {
  id: serial("id").primaryKey(),
  jobPostingId: integer("job_posting_id").notNull().references(() => jobPostings.id),
  seekerId: varchar("seeker_id").notNull().references(() => users.id),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  // Enhanced request fields
  fullName: varchar("full_name").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  experienceLevel: varchar("experience_level", { 
    enum: ["entry", "mid", "senior", "lead"] 
  }).notNull(),
  motivation: text("motivation").notNull(),
  resumeText: text("resume_text").notNull(),
  resumeUrl: varchar("resume_url"),
  atsScore: integer("ats_score"), // ATS score analysis
  notes: text("notes"),
  status: varchar("status", { 
    enum: ["pending", "under_review", "accepted", "rejected", "interview_scheduled", "interview_completed", "sent_to_hr", "completed"] 
  }).default("pending"),
  interviewDate: timestamp("interview_date"),
  interviewNotes: text("interview_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Community posts for networking
export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  authorId: varchar("author_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  type: varchar("type", { enum: ["experience", "job_posting", "tip", "question"] }).notNull(),
  tags: text("tags"), // JSON array of tags
  likes: integer("likes").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Comments on community posts
export const postComments = pgTable("post_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").notNull().references(() => communityPosts.id),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mentorship requests
export const mentorshipRequests = pgTable("mentorship_requests", {
  id: serial("id").primaryKey(),
  menteeId: varchar("mentee_id").notNull().references(() => users.id),
  mentorId: varchar("mentor_id").notNull().references(() => users.id),
  topic: varchar("topic").notNull(),
  message: text("message").notNull(),
  preferredDate: timestamp("preferred_date"),
  duration: integer("duration_minutes").default(30),
  meetingType: varchar("meeting_type", { enum: ["video", "phone", "in_person"] }).default("video"),
  status: varchar("status", { 
    enum: ["pending", "accepted", "rejected", "scheduled", "completed"] 
  }).default("pending"),
  calendarEventId: varchar("calendar_event_id"),
  meetingLink: varchar("meeting_link"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ATS Analysis results
export const atsAnalysis = pgTable("ats_analysis", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  resumeText: text("resume_text").notNull(),
  resumeUrl: varchar("resume_url"),
  overallScore: integer("overall_score").notNull(),
  skillsScore: integer("skills_score"),
  experienceScore: integer("experience_score"),
  formatScore: integer("format_score"),
  keywordsScore: integer("keywords_score"),
  suggestions: text("suggestions"), // JSON array of improvement suggestions
  analyzedAt: timestamp("analyzed_at").defaultNow(),
});

// Profile views tracking
export const profileViews = pgTable("profile_views", {
  id: serial("id").primaryKey(),
  viewedUserId: varchar("viewed_user_id").notNull().references(() => users.id),
  viewerUserId: varchar("viewer_user_id").references(() => users.id), // null for anonymous views
  viewerIp: varchar("viewer_ip"),
  userAgent: text("user_agent"),
  viewedAt: timestamp("viewed_at").defaultNow(),
});

// Gamification and Public Profile System
export const referrerAchievements = pgTable("referrer_achievements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  achievementType: varchar("achievement_type").notNull(), // 'first_referral', 'career_maker', 'top_performer', 'streak_master'
  achievementTitle: varchar("achievement_title").notNull(),
  achievementDescription: text("achievement_description"),
  badgeIcon: varchar("badge_icon").notNull(),
  badgeColor: varchar("badge_color").notNull(),
  unlockedAt: timestamp("unlocked_at").defaultNow(),
  isVisible: boolean("is_visible").default(true),
});

export const referrerImpactStats = pgTable("referrer_impact_stats", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  totalJobsPosted: integer("total_jobs_posted").default(0),
  totalApplications: integer("total_applications").default(0),
  successfulPlacements: integer("successful_placements").default(0),
  impactScore: integer("impact_score").default(0),
  reputationLevel: varchar("reputation_level").default("newcomer"), // newcomer, helper, expert, legend
  streakDays: integer("streak_days").default(0),
  profileViews: integer("profile_views").default(0),
  testimonialCount: integer("testimonial_count").default(0),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const successStories = pgTable("success_stories", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  seekerName: varchar("seeker_name").notNull(),
  jobTitle: varchar("job_title").notNull(),
  company: varchar("company").notNull(),
  story: text("story").notNull(),
  isPublic: boolean("is_public").default(true),
  isVerified: boolean("is_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const referrerTestimonials = pgTable("referrer_testimonials", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  referrerId: varchar("referrer_id").notNull().references(() => users.id),
  seekerId: varchar("seeker_id").references(() => users.id),
  seekerName: varchar("seeker_name").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  testimonial: text("testimonial").notNull(),
  jobTitle: varchar("job_title"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  jobPostings: many(jobPostings),
  sentRequests: many(referralRequests, { relationName: "seeker_requests" }),
  receivedRequests: many(referralRequests, { relationName: "referrer_requests" }),
  communityPosts: many(communityPosts),
  postComments: many(postComments),
  mentorshipRequestsAsMentee: many(mentorshipRequests, { relationName: "mentee_requests" }),
  mentorshipRequestsAsMentor: many(mentorshipRequests, { relationName: "mentor_requests" }),
  atsAnalyses: many(atsAnalysis),
}));

export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  author: one(users, {
    fields: [communityPosts.authorId],
    references: [users.id],
  }),
  comments: many(postComments),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(communityPosts, {
    fields: [postComments.postId],
    references: [communityPosts.id],
  }),
  author: one(users, {
    fields: [postComments.authorId],
    references: [users.id],
  }),
}));

export const mentorshipRequestsRelations = relations(mentorshipRequests, ({ one }) => ({
  mentee: one(users, {
    fields: [mentorshipRequests.menteeId],
    references: [users.id],
    relationName: "mentee_requests",
  }),
  mentor: one(users, {
    fields: [mentorshipRequests.mentorId],
    references: [users.id],
    relationName: "mentor_requests",
  }),
}));

export const atsAnalysisRelations = relations(atsAnalysis, ({ one }) => ({
  user: one(users, {
    fields: [atsAnalysis.userId],
    references: [users.id],
  }),
}));

export const jobPostingsRelations = relations(jobPostings, ({ one, many }) => ({
  referrer: one(users, {
    fields: [jobPostings.referrerId],
    references: [users.id],
  }),
  requests: many(referralRequests),
}));

export const referralRequestsRelations = relations(referralRequests, ({ one }) => ({
  jobPosting: one(jobPostings, {
    fields: [referralRequests.jobPostingId],
    references: [jobPostings.id],
  }),
  seeker: one(users, {
    fields: [referralRequests.seekerId],
    references: [users.id],
    relationName: "seeker_requests",
  }),
  referrer: one(users, {
    fields: [referralRequests.referrerId],
    references: [users.id],
    relationName: "referrer_requests",
  }),
}));

// Schemas
export const insertJobPostingSchema = createInsertSchema(jobPostings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralRequestSchema = createInsertSchema(referralRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateReferralRequestSchema = insertReferralRequestSchema.partial().extend({
  status: z.enum(["pending", "under_review", "accepted", "rejected", "completed"]).optional(),
});

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMentorshipRequestSchema = createInsertSchema(mentorshipRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertATSAnalysisSchema = createInsertSchema(atsAnalysis).omit({
  id: true,
  analyzedAt: true,
});

export const updateUserProfileSchema = createInsertSchema(users).partial().omit({
  id: true,
  createdAt: true,
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type JobPosting = typeof jobPostings.$inferSelect;
export type InsertJobPosting = z.infer<typeof insertJobPostingSchema>;
export type ReferralRequest = typeof referralRequests.$inferSelect;
export type InsertReferralRequest = z.infer<typeof insertReferralRequestSchema>;
export type UpdateReferralRequest = z.infer<typeof updateReferralRequestSchema>;
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type MentorshipRequest = typeof mentorshipRequests.$inferSelect;
export type InsertMentorshipRequest = z.infer<typeof insertMentorshipRequestSchema>;
export type ATSAnalysis = typeof atsAnalysis.$inferSelect;
export type InsertATSAnalysis = z.infer<typeof insertATSAnalysisSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
