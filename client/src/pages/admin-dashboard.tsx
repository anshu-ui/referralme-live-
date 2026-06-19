import { type ComponentType, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Activity,
  Archive,
  Bell,
  Briefcase,
  CheckCircle,
  CheckSquare,
  Download,
  FileText,
  LineChart as LineChartIcon,
  Mail,
  Megaphone,
  PieChart as PieChartIcon,
  RefreshCw,
  Search,
  Shield,
  Target,
  Trash2,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { isAdminUser } from "../lib/admin";
import {
  type ATSAnalysisHistory,
  type FirestoreUser,
  type JobPosting,
  type PlatformAnnouncement,
  type ReferralRequest,
  type MentorshipSession,
  markMentorshipPayoutPaid,
  verifyManualMentorshipPayment,
  createPlatformAnnouncement,
  deleteJobPosting,
  getAllATSAnalysisHistory,
  getAllJobPostings,
  getAllMentorshipSessions,
  getPlatformAnnouncements,
  getAllReferralRequests,
  getAllUsers,
  updatePlatformAnnouncement,
  updateReferralRequestStatus,
  updateJobPosting,
  updateUser,
} from "../lib/firestore";
import { sendAdminBroadcastEmail, sendMentorshipPaymentVerifiedEmails } from "../lib/emailService";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useToast } from "../hooks/use-toast";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type UserFilter = "all" | "seeker" | "referrer" | "admin";
type JobFilter = "all" | "active" | "inactive" | "archived";
type RequestFilter = "all" | ReferralRequest["status"];
type EditableRole = "seeker" | "referrer" | "admin";
type AnnouncementAudience = PlatformAnnouncement["audience"];
type AnnouncementPriority = PlatformAnnouncement["priority"];

const ADMIN_SURFACE =
  "border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-blue-200 hover:shadow-md";

function getTimeLabel(value: any) {
  const date = value?.toDate?.() || null;
  return date ? formatDistanceToNow(date, { addSuffix: true }) : "Recently";
}

export default function AdminDashboard() {
  const { user, logout } = useFirebaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [requests, setRequests] = useState<ReferralRequest[]>([]);
  const [mentorshipSessions, setMentorshipSessions] = useState<MentorshipSession[]>([]);
  const [atsAnalyses, setAtsAnalyses] = useState<ATSAnalysisHistory[]>([]);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");
  const [requestSearch, setRequestSearch] = useState("");
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [jobFilter, setJobFilter] = useState<JobFilter>("all");
  const [requestFilter, setRequestFilter] = useState<RequestFilter>("all");
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutTarget, setPayoutTarget] = useState<MentorshipSession | null>(null);
  const [payoutNote, setPayoutNote] = useState("");
  const [payoutSaving, setPayoutSaving] = useState(false);
  const [paymentVerifyDialogOpen, setPaymentVerifyDialogOpen] = useState(false);
  const [paymentVerifyTarget, setPaymentVerifyTarget] = useState<MentorshipSession | null>(null);
  const [paymentVerifyNote, setPaymentVerifyNote] = useState("");
  const [paymentVerifySaving, setPaymentVerifySaving] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastAudience, setBroadcastAudience] = useState<AnnouncementAudience>("all");
  const [broadcastPriority, setBroadcastPriority] = useState<AnnouncementPriority>("important");
  const [broadcastCtaLabel, setBroadcastCtaLabel] = useState("");
  const [broadcastCtaHref, setBroadcastCtaHref] = useState("");
  const [broadcastSpecificEmails, setBroadcastSpecificEmails] = useState("");
  const [publishingAnnouncement, setPublishingAnnouncement] = useState(false);

  const loadAdminData = async () => {
    try {
      const [nextUsers, nextJobs, nextRequests, nextMentorshipSessions, nextAtsAnalyses, nextAnnouncements] = await Promise.all([
        getAllUsers(),
        getAllJobPostings(),
        getAllReferralRequests(),
        getAllMentorshipSessions(),
        getAllATSAnalysisHistory(),
        getPlatformAnnouncements(),
      ]);
      setUsers(nextUsers);
      setJobs(nextJobs);
      setRequests(nextRequests);
      setMentorshipSessions(nextMentorshipSessions);
      setAtsAnalyses(nextAtsAnalyses);
      setAnnouncements(nextAnnouncements);
    } catch (error) {
      console.error("Error loading admin data:", error);
      toast({
        title: "Admin data failed to load",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAdminData();
  };

  const openPayoutDialog = (session: MentorshipSession) => {
    setPayoutTarget(session);
    setPayoutNote(session.payoutNote || "");
    setPayoutDialogOpen(true);
  };

  const openPaymentVerifyDialog = (session: MentorshipSession) => {
    setPaymentVerifyTarget(session);
    setPaymentVerifyNote(session.manualPaymentVerificationNote || "");
    setPaymentVerifyDialogOpen(true);
  };

  const confirmPayoutPaid = async () => {
    if (!payoutTarget?.id) return;
    setPayoutSaving(true);
    try {
      await markMentorshipPayoutPaid({
        sessionId: payoutTarget.id,
        note: payoutNote.trim() || undefined,
        adminEmail: user?.email || undefined,
      });
      toast({ title: "Payout marked as paid" });
      setPayoutDialogOpen(false);
      setPayoutTarget(null);
      setPayoutNote("");
      await loadAdminData();
    } catch (e: any) {
      toast({ title: "Could not update payout", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setPayoutSaving(false);
    }
  };

  const confirmManualPaymentVerified = async () => {
    if (!paymentVerifyTarget?.id) return;
    setPaymentVerifySaving(true);
    try {
      await verifyManualMentorshipPayment({
        sessionId: paymentVerifyTarget.id,
        note: paymentVerifyNote.trim() || undefined,
        adminEmail: user?.email || undefined,
      });

      sendMentorshipPaymentVerifiedEmails({
        sessionId: paymentVerifyTarget.id,
        menteeName: paymentVerifyTarget.menteeName,
        menteeEmail: String(paymentVerifyTarget.menteeEmail || "").trim(),
        mentorName: paymentVerifyTarget.mentorName,
        mentorEmail: String(paymentVerifyTarget.mentorEmail || "").trim(),
        title: paymentVerifyTarget.title,
        scheduledAt: paymentVerifyTarget.scheduledAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
        duration: paymentVerifyTarget.duration,
        price: paymentVerifyTarget.price,
        upiId: paymentVerifyTarget.manualUpiId,
        paymentReference: paymentVerifyTarget.manualPaymentReference,
      }).catch(() => {});

      toast({ title: "Payment verified", description: "Mentor and seeker will receive booking confirmation emails." });
      setPaymentVerifyDialogOpen(false);
      setPaymentVerifyTarget(null);
      setPaymentVerifyNote("");
      await loadAdminData();
    } catch (e: any) {
      toast({ title: "Could not verify payment", description: e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setPaymentVerifySaving(false);
    }
  };

  const handleToggleVerified = async (targetUser: FirestoreUser) => {
    try {
      await updateUser(targetUser.uid, { isVerified: !targetUser.isVerified });
      toast({
        title: targetUser.isVerified ? "User unverified" : "User verified",
        description: `${targetUser.displayName || targetUser.email} has been updated.`,
      });
      await loadAdminData();
    } catch (error) {
      console.error("Error toggling user verification:", error);
      toast({
        title: "User update failed",
        description: "The verification status could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (targetUser: FirestoreUser, nextRole: EditableRole) => {
    try {
      await updateUser(targetUser.uid, { role: nextRole });
      toast({
        title: "Role updated",
        description: `${targetUser.displayName || targetUser.email} is now ${nextRole}.`,
      });
      await loadAdminData();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast({
        title: "Role update failed",
        description: "The user role could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleToggleSuspended = async (targetUser: FirestoreUser) => {
    try {
      const nextSuspended = !targetUser.isSuspended;
      await updateUser(targetUser.uid, {
        isSuspended: nextSuspended,
        suspendedReason: nextSuspended ? "Restricted by admin" : "",
      });
      toast({
        title: nextSuspended ? "User suspended" : "User restored",
        description: `${targetUser.displayName || targetUser.email} has been ${nextSuspended ? "suspended" : "re-enabled"}.`,
      });
      await loadAdminData();
    } catch (error) {
      console.error("Error toggling suspension:", error);
      toast({
        title: "Suspension update failed",
        description: "The user access state could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleToggleJobStatus = async (job: JobPosting) => {
    if (!job.id) return;
    try {
      await updateJobPosting(job.id, { isActive: !job.isActive });
      toast({
        title: job.isActive ? "Job deactivated" : "Job activated",
        description: `${job.title} has been updated.`,
      });
      await loadAdminData();
    } catch (error) {
      console.error("Error toggling job status:", error);
      toast({
        title: "Job update failed",
        description: "The job status could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleArchiveJob = async (job: JobPosting) => {
    if (!job.id) return;
    try {
      await updateJobPosting(job.id, {
        isArchived: !job.isArchived,
        isActive: job.isArchived ? true : false,
      });
      toast({
        title: job.isArchived ? "Job restored" : "Job archived",
        description: `${job.title} has been ${job.isArchived ? "restored to active review" : "archived"}.`,
      });
      await loadAdminData();
    } catch (error) {
      console.error("Error archiving job:", error);
      toast({
        title: "Archive failed",
        description: "The job could not be archived.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteJob = async (job: JobPosting) => {
    if (!job.id) return;
    const confirmed = window.confirm(`Delete "${job.title}" permanently? This cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteJobPosting(job.id);
      toast({
        title: "Job deleted",
        description: `${job.title} has been permanently removed.`,
      });
      await loadAdminData();
    } catch (error) {
      console.error("Error deleting job:", error);
      toast({
        title: "Delete failed",
        description: "The job could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const handleRequestStatusChange = async (request: ReferralRequest, status: ReferralRequest["status"]) => {
    if (!request.id) return;
    try {
      await updateReferralRequestStatus(request.id, status);
      toast({
        title: "Request updated",
        description: `${request.seekerName || request.fullName || "Candidate"} marked as ${status.replaceAll("_", " ")}.`,
      });
      await loadAdminData();
    } catch (error) {
      console.error("Error updating request status:", error);
      toast({
        title: "Request update failed",
        description: "The request status could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handlePublishAnnouncement = async ({ sendInApp, sendEmail }: { sendInApp: boolean; sendEmail: boolean }) => {
    const title = broadcastTitle.trim();
    const subject = (broadcastSubject || broadcastTitle).trim();
    const message = broadcastMessage.trim();
    const specificEmails = broadcastSpecificEmails
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);

    if (!title || !subject || !message) {
      toast({
        title: "Announcement details missing",
        description: "Add a title, subject, and message before publishing.",
        variant: "destructive",
      });
      return;
    }

    const recipients = specificEmails.length
      ? specificEmails.map((email) => {
          const matchedUser = users.find((entry) => entry.email?.toLowerCase() === email);
          return {
            email,
            name: matchedUser?.displayName || matchedUser?.firstName || email,
          };
        })
      : users
          .filter((entry) => {
            if (!entry.email) return false;
            if (broadcastAudience === "all") return true;
            if (broadcastAudience === "seekers") return entry.role === "seeker";
            if (broadcastAudience === "referrers") return entry.role === "referrer";
            if (broadcastAudience === "admins") return isAdminUser(entry);
            return false;
          })
          .map((entry) => ({
            email: entry.email,
            name: entry.displayName || entry.firstName || entry.email,
          }));

    if (sendEmail && recipients.length === 0) {
      toast({
        title: "No recipients found",
        description: "This audience currently has no email recipients.",
        variant: "destructive",
      });
      return;
    }

    setPublishingAnnouncement(true);

    try {
      if (sendInApp) {
        await createPlatformAnnouncement({
          title,
          message,
          audience: broadcastAudience,
          priority: broadcastPriority,
          status: "published",
          ctaLabel: broadcastCtaLabel.trim() || undefined,
          ctaHref: broadcastCtaHref.trim() || undefined,
          createdByUid: user?.uid || "admin",
          createdByEmail: user?.email || "admin@referralme.in",
          deliveryChannels: sendEmail ? ["in_app", "email"] : ["in_app"],
          publishedAt: true,
        });
      }

      let emailResult = { success: true, sent: 0, failed: 0 };
      if (sendEmail) {
        emailResult = await sendAdminBroadcastEmail({
          recipients,
          subject,
          title,
          message,
          ctaLabel: broadcastCtaLabel.trim() || undefined,
          ctaHref: broadcastCtaHref.trim() || undefined,
        });
      }

      toast({
        title: sendEmail && sendInApp ? "Announcement published and emailed" : sendEmail ? "Broadcast email sent" : "Announcement published",
        description: sendEmail
          ? `${emailResult.sent} emails sent${emailResult.failed ? `, ${emailResult.failed} failed` : ""}.`
          : "The in-app platform notification is now live.",
      });

      setBroadcastTitle("");
      setBroadcastSubject("");
      setBroadcastMessage("");
      setBroadcastCtaLabel("");
      setBroadcastCtaHref("");
      setBroadcastSpecificEmails("");
      await loadAdminData();
    } catch (error) {
      console.error("Error publishing announcement:", error);
      toast({
        title: "Announcement failed",
        description: "The update could not be published. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPublishingAnnouncement(false);
    }
  };

  const mentorshipSummary = useMemo(() => {
    const total = mentorshipSessions.length;
    const pending = mentorshipSessions.filter((s) => s.status === "pending").length;
    const confirmed = mentorshipSessions.filter((s) => s.status === "confirmed").length;
    const completed = mentorshipSessions.filter((s) => s.status === "completed").length;
    const payoutDue = mentorshipSessions.filter((s) => s.status === "completed" && s.paymentStatus === "paid" && (s.payoutStatus || "unpaid") === "unpaid").length;
    const totalGmv = mentorshipSessions.reduce((sum, s) => sum + Number(s.price || 0), 0);
    const totalFees = mentorshipSessions.reduce((sum, s) => sum + Number(s.platformFeeAmount || 0), 0);
    return { total, pending, confirmed, completed, payoutDue, totalGmv, totalFees };
  }, [mentorshipSessions]);

  const handleArchiveAnnouncement = async (announcement: PlatformAnnouncement) => {
    if (!announcement.id) return;

    try {
      await updatePlatformAnnouncement(announcement.id, { status: "archived" });
      toast({
        title: "Announcement archived",
        description: `${announcement.title} has been removed from the live rail.`,
      });
      await loadAdminData();
    } catch (error) {
      console.error("Error archiving announcement:", error);
      toast({
        title: "Archive failed",
        description: "The announcement could not be archived.",
        variant: "destructive",
      });
    }
  };

  const overview = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayScans = atsAnalyses.filter((entry) => {
      const analyzedDate = entry.analyzedAt?.toDate?.();
      return analyzedDate ? analyzedDate >= startOfToday : false;
    });
    const uniqueTodayScanners = new Set(todayScans.map((entry) => entry.userId).filter(Boolean)).size;
    const avgTodayAtsScore = todayScans.length
      ? Math.round(todayScans.reduce((sum, entry) => sum + Number(entry.overallScore || 0), 0) / todayScans.length)
      : 0;
    const seekers = users.filter((entry) => entry.role === "seeker").length;
    const referrers = users.filter((entry) => entry.role === "referrer").length;
    const admins = users.filter((entry) => isAdminUser(entry)).length;
    const completedSeekerProfiles = users.filter((entry) => entry.role === "seeker" && entry.profileCompleted).length;
    const completedReferrerProfiles = users.filter((entry) => entry.role === "referrer" && entry.profileCompleted).length;
    const completedProfiles = users.filter((entry) => entry.profileCompleted).length;
    const verifiedUsers = users.filter((entry) => entry.isVerified).length;
    const activeJobs = jobs.filter((entry) => entry.isActive !== false).length;
    const pendingRequests = requests.filter((entry) => entry.status === "pending").length;
    const acceptedRequests = requests.filter((entry) => entry.status === "accepted").length;
    const rejectedRequests = requests.filter((entry) => entry.status === "rejected").length;
    const liveAnnouncements = announcements.filter((entry) => entry.status === "published").length;
    const emailCampaigns = announcements.filter((entry) => entry.deliveryChannels?.includes("email")).length;
    const resumesAttached = requests.filter((entry: any) => !!entry.resumeUrl || !!entry.resumeText).length;
    const atsCovered = requests.filter((entry: any) => typeof entry.atsScore === "number").length;
    const avgAtsScore =
      requests.filter((entry: any) => typeof entry.atsScore === "number").length > 0
        ? Math.round(
            requests
              .filter((entry: any) => typeof entry.atsScore === "number")
              .reduce((sum: number, entry: any) => sum + Number(entry.atsScore), 0) /
              requests.filter((entry: any) => typeof entry.atsScore === "number").length
          )
        : 0;

    return {
      seekers,
      referrers,
      admins,
      completedSeekerProfiles,
      completedReferrerProfiles,
      completedProfiles,
      verifiedUsers,
      activeJobs,
      pendingRequests,
      acceptedRequests,
      rejectedRequests,
      liveAnnouncements,
      emailCampaigns,
      resumesAttached,
      atsCovered,
      avgAtsScore,
      atsScansToday: todayScans.length,
      uniqueTodayScanners,
      avgTodayAtsScore,
      acceptanceRate: requests.length ? Math.round((acceptedRequests / requests.length) * 100) : 0,
    };
  }, [announcements, atsAnalyses, users, jobs, requests]);

  const filteredUsers = useMemo(() => {
    return users.filter((entry) => {
      const matchesRole =
        userFilter === "all"
          ? true
          : userFilter === "admin"
            ? isAdminUser(entry)
            : entry.role === userFilter;
      const haystack = `${entry.displayName} ${entry.email} ${entry.company || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(userSearch.toLowerCase());
      return matchesRole && matchesSearch;
    });
  }, [users, userFilter, userSearch]);

  const filteredJobs = useMemo(() => {
    return jobs.filter((entry) => {
      const matchesState =
        jobFilter === "all"
          ? true
          : jobFilter === "archived"
            ? entry.isArchived === true
          : jobFilter === "active"
            ? entry.isActive !== false && entry.isArchived !== true
            : entry.isActive === false && entry.isArchived !== true;
      const haystack = `${entry.title} ${entry.company} ${entry.location}`.toLowerCase();
      const matchesSearch = haystack.includes(jobSearch.toLowerCase());
      return matchesState && matchesSearch;
    });
  }, [jobs, jobFilter, jobSearch]);

  const filteredRequests = useMemo(() => {
    return requests.filter((entry: any) => {
      const matchesStatus = requestFilter === "all" ? true : entry.status === requestFilter;
      const haystack = `${entry.seekerName || entry.fullName || ""} ${entry.jobTitle || ""} ${entry.referrerName || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(requestSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [requests, requestFilter, requestSearch]);

  const recentSignups = users.slice(0, 5);
  const recentJobs = jobs.slice(0, 5);
  const recentRequests = requests.slice(0, 5);
  const recentAtsScans = atsAnalyses.slice(0, 8);
  const recentAnnouncements = announcements.slice(0, 4);

  const projectionFinance = useMemo(() => {
    const inr = (amount: number) => `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount)} INR`;
    const revenueSources = [
      {
        source: "Student Pro subscriptions",
        users: "500 students",
        unit: "₹599 INR / 30 days",
        amount: 100000,
        note: "AI Mentor, ATS, placement plan, interview prep",
      },
      {
        source: "Mentorship platform fee",
        users: "50 bookings",
        unit: "₹1,000 INR average booking x 20%",
        amount: 10000,
        note: "Platform keeps 20%, mentor payout handled separately",
      },
      {
        source: "Premium resume review",
        users: "60 reviews",
        unit: "₹500 INR average",
        amount: 30000,
        note: "Advanced resume/ATS guidance package",
      },
      {
        source: "College/internship cohort",
        users: "20 seats",
        unit: "₹500 INR average",
        amount: 10000,
        note: "Campus/internship prep partner revenue",
      },
    ];
    const payoutSplit = [
      { member: "Founder account", role: "Operations + product", amount: 70000 },
      { member: "Family/member account 1", role: "Support allocation", amount: 30000 },
      { member: "Family/member account 2", role: "Support allocation", amount: 20000 },
      { member: "Internship/support person", role: "Marketing + operations", amount: 15000 },
      { member: "Growth reserve", role: "Ads, tools, refunds buffer", amount: 15000 },
      { member: "Platform buffer", role: "Hosting, email, AI API, misc.", amount: 0 },
    ];
    const monthlyTrend = [
      { month: "Oct 2025", freeUsers: 180, paidUsers: 20, atsScans: 260, aiChats: 420, mentorshipBookings: 3, subscriptions: 4000, mentorship: 1000, services: 3000 },
      { month: "Nov 2025", freeUsers: 310, paidUsers: 45, atsScans: 540, aiChats: 980, mentorshipBookings: 7, subscriptions: 9000, mentorship: 2000, services: 7000 },
      { month: "Dec 2025", freeUsers: 520, paidUsers: 85, atsScans: 920, aiChats: 1700, mentorshipBookings: 13, subscriptions: 17000, mentorship: 4000, services: 14000 },
      { month: "Jan 2026", freeUsers: 760, paidUsers: 145, atsScans: 1420, aiChats: 2600, mentorshipBookings: 20, subscriptions: 29000, mentorship: 6000, services: 23000 },
      { month: "Feb 2026", freeUsers: 1080, paidUsers: 220, atsScans: 2200, aiChats: 4100, mentorshipBookings: 29, subscriptions: 44000, mentorship: 8000, services: 30000 },
      { month: "Mar 2026", freeUsers: 1460, paidUsers: 315, atsScans: 3350, aiChats: 6100, mentorshipBookings: 38, subscriptions: 63000, mentorship: 10000, services: 35000 },
      { month: "Apr 2026", freeUsers: 1880, paidUsers: 420, atsScans: 4700, aiChats: 8200, mentorshipBookings: 45, subscriptions: 84000, mentorship: 12000, services: 36000 },
      { month: "May 2026", freeUsers: 2350, paidUsers: 500, atsScans: 6200, aiChats: 10800, mentorshipBookings: 50, subscriptions: 100000, mentorship: 10000, services: 40000 },
    ];
    const monthlyGrowthSheet = monthlyTrend.map((item) => ({
      ...item,
      total: item.subscriptions + item.mentorship + item.services,
      conversionRate: Number(((item.paidUsers / Math.max(1, item.freeUsers + item.paidUsers)) * 100).toFixed(1)),
    }));
    const latestMonth = monthlyGrowthSheet[monthlyGrowthSheet.length - 1];
    const totalRevenue = revenueSources.reduce((sum, item) => sum + item.amount, 0);
    const totalPayout = payoutSplit.reduce((sum, item) => sum + item.amount, 0);
    const sourceChartData = revenueSources.map((item) => ({
      name: item.source.replace("Student ", "").replace("platform ", ""),
      value: item.amount,
    }));
    const payoutChartData = payoutSplit.map((item) => ({
      name: item.member,
      value: item.amount,
    }));

    return {
      inr,
      totalRevenue,
      totalPayout,
      revenueSources,
      payoutSplit,
      monthlyTrend,
      monthlyGrowthSheet,
      latestMonth,
      sourceChartData,
      payoutChartData,
    };
  }, []);

  const atsScansToday = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return atsAnalyses
      .filter((entry) => {
        const analyzedDate = entry.analyzedAt?.toDate?.();
        return analyzedDate ? analyzedDate >= startOfToday : false;
      })
      .slice(0, 10);
  }, [atsAnalyses]);

  const getUserLabel = (userId: string) => {
    const matchedUser = users.find((entry) => entry.uid === userId);
    if (!matchedUser) {
      return {
        name: "Unknown user",
        email: userId,
      };
    }

    return {
      name: matchedUser.displayName || matchedUser.firstName || matchedUser.email || "Unknown user",
      email: matchedUser.email || userId,
    };
  };

  const exportCsv = (filename: string, rows: Array<Record<string, unknown>>) => {
    if (!rows.length) {
      toast({
        title: "Nothing to export",
        description: "There is no data available for this export yet.",
      });
      return;
    }

    const headers = Array.from(
      rows.reduce((set, row) => {
        Object.keys(row).forEach((key) => set.add(key));
        return set;
      }, new Set<string>()),
    );

    const escapeCsv = (value: unknown) => {
      const raw =
        value instanceof Date
          ? value.toISOString()
          : typeof value === "object" && value !== null
            ? JSON.stringify(value)
            : String(value ?? "");
      return `"${raw.replace(/"/g, '""')}"`;
    };

    const content = [
      headers.join(","),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(",")),
    ].join("\n");

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "CSV exported",
      description: `${filename} has been downloaded.`,
    });
  };

  const handleExportUsers = () => {
    exportCsv(
      "referralme-users.csv",
      filteredUsers.map((entry) => ({
        uid: entry.uid,
        name: entry.displayName || "",
        email: entry.email || "",
        role: isAdminUser(entry) ? "admin" : entry.role || "",
        company: entry.company || "",
        profileCompleted: entry.profileCompleted ? "yes" : "no",
        verified: entry.isVerified ? "yes" : "no",
        suspended: entry.isSuspended ? "yes" : "no",
        joinedAt: entry.createdAt?.toDate?.()?.toISOString?.() || "",
      })),
    );
  };

  const handleExportJobs = () => {
    exportCsv(
      "referralme-jobs.csv",
      filteredJobs.map((entry) => ({
        id: entry.id || "",
        title: entry.title,
        company: entry.company,
        location: entry.location,
        referrerName: entry.referrerName || "",
        referrerEmail: entry.referrerEmail || "",
        active: entry.isActive !== false ? "yes" : "no",
        archived: entry.isArchived ? "yes" : "no",
        visibility: entry.visibility || "",
        applicationMode: entry.applicationMode || "",
        minAtsScore: entry.minAtsScore ?? "",
        createdAt: entry.createdAt?.toDate?.()?.toISOString?.() || "",
      })),
    );
  };

  const handleExportRequests = () => {
    exportCsv(
      "referralme-referral-requests.csv",
      filteredRequests.map((entry: any) => ({
        id: entry.id || "",
        seekerName: entry.seekerName || entry.fullName || "",
        seekerEmail: entry.seekerEmail || entry.email || "",
        jobTitle: entry.jobTitle || "",
        referrerName: entry.referrerName || "",
        referrerEmail: entry.referrerEmail || "",
        status: entry.status || "",
        atsScore: entry.atsScore ?? "",
        hasResume: entry.resumeUrl || entry.resumeText ? "yes" : "no",
        submittedAt: entry.createdAt?.toDate?.()?.toISOString?.() || "",
      })),
    );
  };

  const handleExportAtsScans = () => {
    exportCsv(
      "referralme-ats-scans.csv",
      atsAnalyses.map((entry) => {
        const userLabel = getUserLabel(entry.userId);
        return {
          id: entry.id || "",
          userId: entry.userId,
          userName: userLabel.name,
          userEmail: userLabel.email,
          overallScore: entry.overallScore,
          jobTitle: entry.jobTitle || "",
          company: entry.company || "",
          analyzedAt: entry.analyzedAt?.toDate?.()?.toISOString?.() || "",
          suggestionsCount: entry.suggestions?.length || 0,
          missingKeywordsCount: entry.missingKeywords?.length || 0,
          matchedKeywordsCount: entry.matchedKeywords?.length || 0,
        };
      }),
    );
  };

  const growthChartData = useMemo(() => {
    const months = new Map<string, { label: string; users: number; jobs: number; requests: number }>();

    const ensureBucket = (dateValue: any) => {
      const date = dateValue?.toDate?.() || null;
      if (!date) return null;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!months.has(key)) {
        months.set(key, {
          label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
          users: 0,
          jobs: 0,
          requests: 0,
        });
      }
      return months.get(key)!;
    };

    users.forEach((entry) => {
      const bucket = ensureBucket(entry.createdAt);
      if (bucket) bucket.users += 1;
    });
    jobs.forEach((entry) => {
      const bucket = ensureBucket(entry.createdAt);
      if (bucket) bucket.jobs += 1;
    });
    requests.forEach((entry) => {
      const bucket = ensureBucket(entry.createdAt);
      if (bucket) bucket.requests += 1;
    });

    return Array.from(months.values()).slice(-6);
  }, [users, jobs, requests]);

  const atsTrendData = useMemo(() => {
    const days = new Map<string, { label: string; scans: number; avgScoreTotal: number }>();

    atsAnalyses.forEach((entry) => {
      const date = entry.analyzedAt?.toDate?.();
      if (!date) return;
      const key = date.toISOString().slice(0, 10);
      if (!days.has(key)) {
        days.set(key, {
          label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          scans: 0,
          avgScoreTotal: 0,
        });
      }
      const bucket = days.get(key)!;
      bucket.scans += 1;
      bucket.avgScoreTotal += Number(entry.overallScore || 0);
    });

    return Array.from(days.values())
      .slice(-7)
      .map((entry) => ({
        label: entry.label,
        scans: entry.scans,
        avgScore: entry.scans ? Math.round(entry.avgScoreTotal / entry.scans) : 0,
      }));
  }, [atsAnalyses]);

  const requestStatusData = useMemo(
    () => [
      { name: "Pending", value: overview.pendingRequests, color: "#f59e0b" },
      { name: "Accepted", value: overview.acceptedRequests, color: "#10b981" },
      { name: "Rejected", value: overview.rejectedRequests, color: "#ef4444" },
    ].filter((entry) => entry.value > 0),
    [overview]
  );

  const userRoleData = useMemo(
    () => [
      { name: "Seekers", value: overview.seekers, color: "#2563eb" },
      { name: "Referrers", value: overview.referrers, color: "#10b981" },
      { name: "Admins", value: overview.admins, color: "#7c3aed" },
    ].filter((entry) => entry.value > 0),
    [overview]
  );

  const atsBandData = useMemo(() => {
    const values = { excellent: 0, strong: 0, needs_work: 0 };
    requests.forEach((entry: any) => {
      const score = Number(entry.atsScore);
      if (!Number.isFinite(score)) return;
      if (score >= 85) values.excellent += 1;
      else if (score >= 70) values.strong += 1;
      else values.needs_work += 1;
    });
    return [
      { name: "85+", value: values.excellent, color: "#10b981" },
      { name: "70-84", value: values.strong, color: "#2563eb" },
      { name: "<70", value: values.needs_work, color: "#f59e0b" },
    ].filter((entry) => entry.value > 0);
  }, [requests]);

  const jobsByModeData = useMemo(() => {
    const counts = new Map<string, number>();
    jobs.forEach((entry) => {
      const key = entry.applicationMode || "platform_request";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [jobs]);

  const topReferrers = useMemo(() => {
    const counts = new Map<string, { name: string; requests: number; accepted: number }>();

    requests.forEach((entry) => {
      const key = entry.referrerId || entry.referrerEmail;
      if (!counts.has(key)) {
        counts.set(key, { name: entry.referrerName || entry.referrerEmail, requests: 0, accepted: 0 });
      }
      const current = counts.get(key)!;
      current.requests += 1;
      if (entry.status === "accepted") current.accepted += 1;
    });

    return Array.from(counts.values())
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);
  }, [requests]);

  const topCompanies = useMemo(() => {
    const counts = new Map<string, { company: string; jobs: number; active: number }>();

    jobs.forEach((entry) => {
      const key = entry.company || "Unknown";
      if (!counts.has(key)) {
        counts.set(key, { company: key, jobs: 0, active: 0 });
      }
      const current = counts.get(key)!;
      current.jobs += 1;
      if (entry.isActive !== false) current.active += 1;
    });

    return Array.from(counts.values())
      .sort((a, b) => b.jobs - a.jobs)
      .slice(0, 5);
  }, [jobs]);

  const topJobs = useMemo(() => {
    const counts = new Map<string, { title: string; company: string; requests: number; accepted: number }>();
    requests.forEach((entry: any) => {
      const key = entry.jobPostingId || entry.jobTitle;
      if (!counts.has(key)) {
        counts.set(key, {
          title: entry.jobTitle || "Untitled role",
          company: entry.job?.company || "Unknown",
          requests: 0,
          accepted: 0,
        });
      }
      const current = counts.get(key)!;
      current.requests += 1;
      if (entry.status === "accepted") current.accepted += 1;
    });
    return Array.from(counts.values()).sort((a, b) => b.requests - a.requests).slice(0, 6);
  }, [requests]);

  const topAtsUsers = useMemo(() => {
    const counts = new Map<string, { name: string; email: string; scans: number; avgScoreTotal: number; bestScore: number }>();

    atsAnalyses.forEach((entry) => {
      const userLabel = getUserLabel(entry.userId);
      const key = entry.userId || userLabel.email;
      if (!counts.has(key)) {
        counts.set(key, {
          name: userLabel.name,
          email: userLabel.email,
          scans: 0,
          avgScoreTotal: 0,
          bestScore: 0,
        });
      }
      const current = counts.get(key)!;
      current.scans += 1;
      current.avgScoreTotal += Number(entry.overallScore || 0);
      current.bestScore = Math.max(current.bestScore, Number(entry.overallScore || 0));
    });

    return Array.from(counts.values())
      .map((entry) => ({
        ...entry,
        avgScore: entry.scans ? Math.round(entry.avgScoreTotal / entry.scans) : 0,
      }))
      .sort((a, b) => b.scans - a.scans)
      .slice(0, 6);
  }, [atsAnalyses, users]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-3xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-600/10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-600">ReferralMe Admin</p>
          <p className="mt-2 text-sm text-slate-600">Loading platform operations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Mark payout as paid</DialogTitle>
            <DialogDescription>
              This is a manual payout tracker. Only mark as paid after you transfer the mentor payout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="font-semibold text-slate-900">{payoutTarget?.title || "Mentorship session"}</div>
              <div className="mt-1 text-xs text-slate-600">
                Mentor: {payoutTarget?.mentorName || "—"} • Mentee: {payoutTarget?.menteeName || "—"}
              </div>
              <div className="mt-2 text-xs text-slate-600">
                Payout amount:{" "}
                <span className="font-semibold text-slate-900">
                  ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(payoutTarget?.mentorPayoutAmount || 0))} INR
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Note (optional)</div>
              <Input
                value={payoutNote}
                onChange={(e) => setPayoutNote(e.target.value)}
                placeholder="UTR / reference / bank transfer note"
                className="border-slate-200 bg-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayoutDialogOpen(false)} disabled={payoutSaving}>
              Cancel
            </Button>
            <Button onClick={confirmPayoutPaid} disabled={payoutSaving}>
              {payoutSaving ? "Saving..." : "Confirm paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={paymentVerifyDialogOpen} onOpenChange={setPaymentVerifyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Verify manual UPI payment</DialogTitle>
            <DialogDescription>
              Confirm only after matching the UPI payment in your bank/UPI statement.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
              <div className="font-semibold text-slate-900">{paymentVerifyTarget?.title || "Mentorship session"}</div>
              <div className="mt-1 text-xs text-slate-600">
                Mentor: {paymentVerifyTarget?.mentorName || "—"} • Mentee: {paymentVerifyTarget?.menteeName || "—"}
              </div>
              <div className="mt-3 grid gap-2 text-xs text-slate-700">
                <div>
                  Amount:{" "}
                  <span className="font-semibold text-slate-900">
                    ₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(paymentVerifyTarget?.price || 0))} INR
                  </span>
                </div>
                <div>UPI ID: <span className="font-semibold text-slate-900">{paymentVerifyTarget?.manualUpiId || "—"}</span></div>
                <div>Reference/UTR: <span className="font-semibold text-slate-900">{paymentVerifyTarget?.manualPaymentReference || "—"}</span></div>
                {paymentVerifyTarget?.manualPaymentProofNote ? (
                  <div>Proof note: <span className="font-semibold text-slate-900">{paymentVerifyTarget.manualPaymentProofNote}</span></div>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Verification note (optional)</div>
              <Input
                value={paymentVerifyNote}
                onChange={(e) => setPaymentVerifyNote(e.target.value)}
                placeholder="Matched in UPI statement / bank note"
                className="border-slate-200 bg-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentVerifyDialogOpen(false)} disabled={paymentVerifySaving}>
              Cancel
            </Button>
            <Button onClick={confirmManualPaymentVerified} disabled={paymentVerifySaving}>
              {paymentVerifySaving ? "Verifying..." : "Verify payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                <Shield className="h-3.5 w-3.5" />
                Admin Control Panel
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Platform Operations</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Control growth, trust, communication, jobs, users, and referral pipeline activity from one blue-and-white operations workspace.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <HeroPill label="Live updates" value={`${overview.liveAnnouncements}`} caption="in-app announcement(s) active" />
                <HeroPill label="Pipeline" value={`${overview.pendingRequests}`} caption="requests waiting review" />
                <HeroPill label="Trust" value={`${overview.verifiedUsers}`} caption="verified user accounts" />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline" className="border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">
                Signed in as {user?.email}
              </Badge>
              <Button variant="outline" className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50" onClick={handleRefresh} disabled={refreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="outline" className="border-slate-200 bg-white" onClick={logout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard title="Total Users" value={users.length} hint={`${overview.completedProfiles} profiles completed`} icon={Users} />
          <MetricCard title="Seekers / Referrers" value={`${overview.seekers} / ${overview.referrers}`} hint={`${overview.admins} admin`} icon={UserCheck} />
          <MetricCard title="Active Jobs" value={overview.activeJobs} hint={`${jobs.length} total job posts`} icon={Briefcase} />
          <MetricCard title="Referral Requests" value={requests.length} hint={`${overview.pendingRequests} pending review`} icon={Activity} />
          <MetricCard title="Avg ATS Score" value={overview.avgAtsScore || "--"} hint={`${overview.acceptanceRate}% accepted`} icon={CheckCircle} />
        </div>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <MetricCard title="Resume Coverage" value={`${requests.length ? Math.round((overview.resumesAttached / requests.length) * 100) : 0}%`} hint={`${overview.resumesAttached} requests with resume data`} icon={FileText} />
          <MetricCard title="ATS Coverage" value={`${requests.length ? Math.round((overview.atsCovered / requests.length) * 100) : 0}%`} hint={`${overview.atsCovered} requests with ATS scoring`} icon={Target} />
          <MetricCard title="Verified Users" value={overview.verifiedUsers} hint={`${users.length ? Math.round((overview.verifiedUsers / users.length) * 100) : 0}% trust coverage`} icon={Shield} />
        </div>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <MetricCard title="ATS Scans Today" value={overview.atsScansToday} hint="Resume scans completed since midnight" icon={Activity} />
          <MetricCard title="Unique Scanners Today" value={overview.uniqueTodayScanners} hint="People who ran ATS at least once today" icon={Users} />
          <MetricCard title="Avg ATS Today" value={overview.avgTodayAtsScore || "--"} hint="Average ATS score from today's scans" icon={Target} />
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="mentorship">Mentorship</TabsTrigger>
            <TabsTrigger value="projection">Projection</TabsTrigger>
            <TabsTrigger value="comms">Comms</TabsTrigger>
            <TabsTrigger value="controls">Controls</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className={`lg:col-span-2 ${ADMIN_SURFACE}`}>
                <CardHeader>
                  <CardTitle>Platform Snapshot</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <SnapshotItem label="Verified users" value={overview.verifiedUsers} />
                  <SnapshotItem label="Pending requests" value={overview.pendingRequests} />
                  <SnapshotItem label="Accepted requests" value={overview.acceptedRequests} />
                  <SnapshotItem label="Rejected requests" value={overview.rejectedRequests} />
                  <SnapshotItem label="Profile completion" value={`${users.length ? Math.round((overview.completedProfiles / users.length) * 100) : 0}%`} />
                  <SnapshotItem label="Job activation rate" value={`${jobs.length ? Math.round((overview.activeJobs / jobs.length) * 100) : 0}%`} />
                </CardContent>
              </Card>

              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentRequests.map((entry: any) => (
                    <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        {entry.seekerName || entry.fullName || "Candidate"} applied for {entry.jobTitle || "a role"}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {entry.referrerName || "Referrer"} • {getTimeLabel(entry.createdAt)}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <RecentListCard
                title="Recent Signups"
                items={recentSignups.map((entry) => ({
                  id: entry.uid,
                  title: entry.displayName || entry.email,
                  meta: `${entry.role || "unassigned"} • ${getTimeLabel(entry.createdAt)}`,
                }))}
              />
              <RecentListCard
                title="Recent Jobs"
                items={recentJobs.map((entry) => ({
                  id: entry.id || `${entry.title}-${entry.company}`,
                  title: `${entry.title} • ${entry.company}`,
                  meta: `${entry.isActive !== false ? "active" : "inactive"} • ${getTimeLabel(entry.createdAt)}`,
                }))}
              />
              <RecentListCard
                title="Recent Requests"
                items={recentRequests.map((entry: any) => ({
                  id: entry.id || `${entry.jobTitle}-${entry.seekerId}`,
                  title: `${entry.seekerName || entry.fullName || "Candidate"} • ${entry.jobTitle || "Role"}`,
                  meta: `${entry.status} • ${getTimeLabel(entry.createdAt)}`,
                }))}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Seeker Quality</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SnapshotItem label="Total seekers" value={overview.seekers} />
                  <SnapshotItem label="Completed seeker profiles" value={overview.completedSeekerProfiles} />
                  <SnapshotItem label="Seeker completion rate" value={`${overview.seekers ? Math.round((overview.completedSeekerProfiles / overview.seekers) * 100) : 0}%`} />
                </CardContent>
              </Card>
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Referrer Quality</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SnapshotItem label="Total referrers" value={overview.referrers} />
                  <SnapshotItem label="Completed referrer profiles" value={overview.completedReferrerProfiles} />
                  <SnapshotItem label="Referrer completion rate" value={`${overview.referrers ? Math.round((overview.completedReferrerProfiles / overview.referrers) * 100) : 0}%`} />
                </CardContent>
              </Card>
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Application Data Quality</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <SnapshotItem label="Requests with resumes" value={overview.resumesAttached} />
                  <SnapshotItem label="Requests with ATS scores" value={overview.atsCovered} />
                  <SnapshotItem label="ATS coverage rate" value={`${requests.length ? Math.round((overview.atsCovered / requests.length) * 100) : 0}%`} />
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className={`xl:col-span-2 ${ADMIN_SURFACE}`}>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>ATS Activity Today</CardTitle>
                    <p className="text-sm text-slate-500">See who ran ATS scans today, when they scanned, and how those resumes scored.</p>
                  </div>
                  <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handleExportAtsScans}>
                    <Download className="mr-2 h-4 w-4" />
                    Export ATS CSV
                  </Button>
                </CardHeader>
                <CardContent>
                  {atsScansToday.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                      No ATS scans have been recorded today yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {atsScansToday.map((entry) => {
                        const userLabel = getUserLabel(entry.userId);
                        return (
                          <div key={entry.id || `${entry.userId}-${entry.jobTitle || "scan"}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{userLabel.name}</p>
                                <p className="text-xs text-slate-500">{userLabel.email}</p>
                                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">Score {entry.overallScore}%</Badge>
                                  <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">{entry.company || "General ATS scan"}</Badge>
                                  {entry.jobTitle ? (
                                    <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">{entry.jobTitle}</Badge>
                                  ) : null}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">{getTimeLabel(entry.analyzedAt)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Recent ATS Scans</CardTitle>
                  <p className="text-sm text-slate-500">Latest scan activity across the platform.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recentAtsScans.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No ATS scan history yet.
                    </div>
                  ) : (
                    recentAtsScans.map((entry) => {
                      const userLabel = getUserLabel(entry.userId);
                      return (
                        <div key={entry.id || `${entry.userId}-${entry.jobTitle || "scan-recent"}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-900">{userLabel.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {entry.overallScore}% • {entry.jobTitle || entry.company || "General scan"} • {getTimeLabel(entry.analyzedAt)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <Card className={`xl:col-span-2 ${ADMIN_SURFACE}`}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Growth Trends</CardTitle>
                    <p className="text-sm text-slate-500">Users, jobs, and requests over the last visible months</p>
                  </div>
                  <LineChartIcon className="h-5 w-5 text-slate-400" />
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Area type="monotone" dataKey="users" stackId="1" stroke="#2563eb" fill="#bfdbfe" />
                      <Area type="monotone" dataKey="jobs" stackId="1" stroke="#10b981" fill="#bbf7d0" />
                      <Area type="monotone" dataKey="requests" stackId="1" stroke="#f59e0b" fill="#fde68a" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className={ADMIN_SURFACE}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Request Status Mix</CardTitle>
                    <p className="text-sm text-slate-500">Current platform-wide request health</p>
                  </div>
                  <PieChartIcon className="h-5 w-5 text-slate-400" />
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={requestStatusData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={4}>
                        {requestStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>User Role Mix</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={userRoleData} dataKey="value" nameKey="name" outerRadius={95}>
                        {userRoleData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>ATS Score Bands</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={atsBandData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95}>
                        {atsBandData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Jobs by Application Mode</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={jobsByModeData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#7c3aed" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <Card className={`xl:col-span-2 ${ADMIN_SURFACE}`}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>ATS Scan Trend</CardTitle>
                    <p className="text-sm text-slate-500">Daily ATS scan volume and average score over the last 7 visible days.</p>
                  </div>
                  <LineChartIcon className="h-5 w-5 text-slate-400" />
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={atsTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="label" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="scans" fill="#2563eb" radius={[8, 8, 0, 0]} />
                      <Bar yAxisId="right" dataKey="avgScore" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Top ATS Users</CardTitle>
                  <p className="text-sm text-slate-500">Who is using the ATS tool most often.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topAtsUsers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No ATS usage data yet.
                    </div>
                  ) : (
                    topAtsUsers.map((entry) => (
                      <div key={`${entry.email}-${entry.name}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                            <p className="text-xs text-slate-500">{entry.email}</p>
                          </div>
                          <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                            {entry.scans} scan{entry.scans === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-600">
                          Avg score {entry.avgScore}% • Best score {entry.bestScore}%
                        </p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Top Referrers</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topReferrers}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="requests" fill="#2563eb" radius={[8, 8, 0, 0]} />
                      <Bar dataKey="accepted" fill="#10b981" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Companies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topCompanies.map((entry) => (
                    <div key={entry.company} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-slate-900">{entry.company}</p>
                          <p className="text-xs text-slate-500">{entry.jobs} jobs • {entry.active} active</p>
                        </div>
                        <Badge variant="outline">{entry.active}/{entry.jobs} active</Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card className={ADMIN_SURFACE}>
              <CardHeader>
                <CardTitle>Top Performing Jobs</CardTitle>
                <p className="text-sm text-slate-500">Roles receiving the most referral activity across the platform</p>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Total Requests</TableHead>
                      <TableHead>Accepted</TableHead>
                      <TableHead>Conversion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topJobs.map((entry) => (
                      <TableRow key={`${entry.title}-${entry.company}`}>
                        <TableCell className="font-medium text-slate-900">{entry.title}</TableCell>
                        <TableCell>{entry.company}</TableCell>
                        <TableCell>{entry.requests}</TableCell>
                        <TableCell>{entry.accepted}</TableCell>
                        <TableCell>{entry.requests ? `${Math.round((entry.accepted / entry.requests) * 100)}%` : "0%"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className={ADMIN_SURFACE}>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by name, email, company" className="pl-9" />
                  </div>
                  <Select value={userFilter} onValueChange={(value) => setUserFilter(value as UserFilter)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All roles</SelectItem>
                      <SelectItem value="seeker">Seekers</SelectItem>
                      <SelectItem value="referrer">Referrers</SelectItem>
                      <SelectItem value="admin">Admins</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handleExportUsers}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Controls</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((entry) => (
                      <TableRow key={entry.uid}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{entry.displayName || "Unnamed user"}</div>
                          <div className="text-xs text-slate-500">{entry.email}</div>
                        </TableCell>
                        <TableCell>
                          <Select value={((entry.role || (isAdminUser(entry) ? "admin" : "seeker")) as EditableRole)} onValueChange={(value) => handleRoleChange(entry, value as EditableRole)}>
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="seeker">Seeker</SelectItem>
                              <SelectItem value="referrer">Referrer</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{entry.company || "—"}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={entry.profileCompleted ? "default" : "secondary"}>
                              {entry.profileCompleted ? "Profile complete" : "Incomplete"}
                            </Badge>
                            <Badge variant="outline" className={entry.isVerified ? "border-emerald-300 text-emerald-700" : "border-slate-300 text-slate-600"}>
                              {entry.isVerified ? "Verified" : "Unverified"}
                            </Badge>
                            {entry.isSuspended ? (
                              <Badge variant="destructive">Suspended</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{getTimeLabel(entry.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggleVerified(entry)}>
                              {entry.isVerified ? "Unverify" : "Verify"}
                            </Button>
                            <Button size="sm" variant="outline" className={entry.isSuspended ? "border-emerald-200 text-emerald-700" : "border-red-200 text-red-700"} onClick={() => handleToggleSuspended(entry)}>
                              <UserX className="mr-1 h-3.5 w-3.5" />
                              {entry.isSuspended ? "Restore" : "Suspend"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card className={ADMIN_SURFACE}>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>Job Moderation</CardTitle>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={jobSearch} onChange={(event) => setJobSearch(event.target.value)} placeholder="Search title, company, location" className="pl-9" />
                  </div>
                  <Select value={jobFilter} onValueChange={(value) => setJobFilter(value as JobFilter)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter jobs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All jobs</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handleExportJobs}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Referrer</TableHead>
                      <TableHead>ATS / Visibility</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Controls</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredJobs.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{entry.title}</div>
                          <div className="text-xs text-slate-500">{entry.company} • {entry.location}</div>
                        </TableCell>
                        <TableCell>
                          <div>{entry.referrerName}</div>
                          <div className="text-xs text-slate-500">{entry.referrerEmail}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-700">ATS {entry.minAtsScore || "—"}</div>
                          <div className="text-xs text-slate-500 capitalize">{entry.visibility || "public"} • {entry.applicationMode || "platform_request"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={entry.isActive !== false ? "default" : "secondary"}>
                              {entry.isActive !== false ? "Active" : "Inactive"}
                            </Badge>
                            {entry.isArchived ? <Badge variant="outline">Archived</Badge> : null}
                          </div>
                        </TableCell>
                        <TableCell>{getTimeLabel(entry.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleToggleJobStatus(entry)}>
                              {entry.isActive !== false ? "Deactivate" : "Activate"}
                            </Button>
                            <Button size="sm" variant="outline" className="border-amber-200 text-amber-700" onClick={() => handleArchiveJob(entry)}>
                              <Archive className="mr-1 h-3.5 w-3.5" />
                              {entry.isArchived ? "Restore" : "Archive"}
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-700" onClick={() => handleDeleteJob(entry)}>
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <CardTitle>Referral Request Monitoring</CardTitle>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input value={requestSearch} onChange={(event) => setRequestSearch(event.target.value)} placeholder="Search candidate, role, referrer" className="pl-9" />
                  </div>
                  <Select value={requestFilter} onValueChange={(value) => setRequestFilter(value as RequestFilter)}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                      <SelectValue placeholder="Filter requests" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="referral_confirmed">Referral confirmed</SelectItem>
                      <SelectItem value="sent_to_hr">Sent to HR</SelectItem>
                      <SelectItem value="interview_scheduled">Interview scheduled</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handleExportRequests}>
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Referrer</TableHead>
                      <TableHead>ATS</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Controls</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((entry: any) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          <div className="font-medium text-slate-900">{entry.seekerName || entry.fullName || "Candidate"}</div>
                          <div className="text-xs text-slate-500">{entry.seekerEmail || entry.email || "—"}</div>
                        </TableCell>
                        <TableCell>{entry.jobTitle || "—"}</TableCell>
                        <TableCell>{entry.referrerName || "—"}</TableCell>
                        <TableCell>{typeof entry.atsScore === "number" ? `${entry.atsScore}%` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={entry.status === "accepted" ? "default" : entry.status === "rejected" ? "destructive" : "secondary"} className="capitalize">
                            {String(entry.status).replaceAll("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>{getTimeLabel(entry.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Select value={entry.status} onValueChange={(value) => handleRequestStatusChange(entry, value as ReferralRequest["status"])}>
                            <SelectTrigger className="ml-auto w-[190px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="referral_confirmed">Referral confirmed</SelectItem>
                              <SelectItem value="sent_to_hr">Sent to HR</SelectItem>
                              <SelectItem value="interview_scheduled">Interview scheduled</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mentorship" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard title="Sessions" value={mentorshipSummary.total} hint="All mentorship sessions" icon={Users} />
              <MetricCard title="Pending" value={mentorshipSummary.pending} hint="Waiting for mentor confirm" icon={Activity} />
              <MetricCard title="Completed" value={mentorshipSummary.completed} hint="Done sessions" icon={CheckSquare} />
              <MetricCard title="Payout Due" value={mentorshipSummary.payoutDue} hint="Completed + unpaid" icon={Mail} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <MetricCard
                title="Mentorship GMV"
                value={`₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(mentorshipSummary.totalGmv)} INR`}
                hint="Sum of session prices"
                icon={TrendingUp}
              />
              <MetricCard
                title="Platform Fees"
                value={`₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(mentorshipSummary.totalFees)} INR`}
                hint="20% fee captured on paid sessions"
                icon={Target}
              />
            </div>

            <Card className={ADMIN_SURFACE}>
              <CardHeader>
                <CardTitle>Mentorship Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
	                  <TableHeader>
	                    <TableRow>
	                      <TableHead>Scheduled</TableHead>
	                      <TableHead>Mentor</TableHead>
	                      <TableHead>Mentee</TableHead>
	                      <TableHead>Status</TableHead>
	                      <TableHead>Payment</TableHead>
	                      <TableHead>Provider</TableHead>
	                      <TableHead>Reference</TableHead>
	                      <TableHead className="text-right">Price</TableHead>
	                      <TableHead className="text-right">Fee</TableHead>
	                      <TableHead className="text-right">Payout</TableHead>
	                      <TableHead>Payout Status</TableHead>
	                      <TableHead className="text-right">Actions</TableHead>
	                    </TableRow>
	                  </TableHeader>
	                  <TableBody>
	                    {mentorshipSessions.slice(0, 200).map((s) => (
	                      <TableRow key={s.id}>
                        <TableCell className="text-xs text-slate-600">{s.scheduledAt?.toDate?.()?.toLocaleString?.() || "-"}</TableCell>
                        <TableCell className="text-sm">{s.mentorName}</TableCell>
                        <TableCell className="text-sm">{s.menteeName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{s.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.paymentStatus === "paid" ? "default" : "outline"} className="capitalize">
                            {s.paymentStatus === "paid" ? "Paid" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.paymentProvider || (s.cashfreeOrderId ? "cashfree" : s.razorpayOrderId ? "razorpay" : "-")}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">
                          {s.manualPaymentReference || s.razorpayPaymentId || s.cashfreeOrderId || "-"}
                        </TableCell>
                        <TableCell className="text-right">₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(s.price || 0))} INR</TableCell>
	                        <TableCell className="text-right">₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(s.platformFeeAmount || 0))} INR</TableCell>
	                        <TableCell className="text-right">₹{new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(s.mentorPayoutAmount || 0))} INR</TableCell>
	                        <TableCell className="text-xs capitalize">{s.payoutStatus || "unpaid"}</TableCell>
	                        <TableCell className="text-right">
	                          {s.paymentProvider === "manual_upi" && s.paymentStatus !== "paid" ? (
	                            <Button size="sm" onClick={() => openPaymentVerifyDialog(s)}>
	                              Verify payment
	                            </Button>
	                          ) : s.status === "completed" && s.paymentStatus === "paid" && (s.payoutStatus || "unpaid") === "unpaid" ? (
	                            <Button size="sm" variant="outline" onClick={() => openPayoutDialog(s)}>
	                              Mark paid
	                            </Button>
	                          ) : (
	                            <span className="text-xs text-slate-400">—</span>
	                          )}
	                        </TableCell>
	                      </TableRow>
	                    ))}
	                  </TableBody>
	                </Table>
	              </CardContent>
	            </Card>
          </TabsContent>

          <TabsContent value="projection" className="space-y-4">
            <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-slate-50 p-5 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                    Internal Growth Scenario
                  </div>
                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Finance & Growth Snapshot</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                    Scenario model for internal planning across subscriptions, mentorship, ATS usage, AI mentor activity, premium services, and member allocation.
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-blue-200 bg-white px-3 py-2 text-blue-700">
                  Oct 2025 - May 2026
                </Badge>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard
                title="May Revenue"
                value={projectionFinance.inr(projectionFinance.totalRevenue)}
                hint="Subscription + mentorship + services"
                icon={TrendingUp}
              />
              <MetricCard title="Paid Users" value={projectionFinance.latestMonth.paidUsers} hint="Students at ₹599 INR / 30 days" icon={Users} />
              <MetricCard title="AI Mentor Chats" value={projectionFinance.latestMonth.aiChats.toLocaleString("en-IN")} hint="Monthly guidance conversations" icon={Activity} />
              <MetricCard
                title="Planned Split"
                value={projectionFinance.inr(projectionFinance.totalPayout)}
                hint="Allocation model across members"
                icon={PieChartIcon}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard title="Free Users" value={projectionFinance.latestMonth.freeUsers.toLocaleString("en-IN")} hint="Top-of-funnel users" icon={UserCheck} />
              <MetricCard title="ATS Scans" value={projectionFinance.latestMonth.atsScans.toLocaleString("en-IN")} hint="Resume scans in May" icon={FileText} />
              <MetricCard title="Mentorship Bookings" value={projectionFinance.latestMonth.mentorshipBookings} hint="May session bookings" icon={CheckSquare} />
              <MetricCard title="Paid Conversion" value={`${projectionFinance.latestMonth.conversionRate}%`} hint="Paid users / total users" icon={Target} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Where Money Comes From</CardTitle>
                </CardHeader>
                <CardContent className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectionFinance.sourceChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k INR`} />
                      <Tooltip formatter={(value: number) => projectionFinance.inr(Number(value))} />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="#2563eb" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>October to May Growth Story</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projectionFinance.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(value) => `₹${Number(value) / 1000}k INR`} />
                        <Tooltip formatter={(value: number) => projectionFinance.inr(Number(value))} />
                        <Area type="monotone" dataKey="subscriptions" stackId="1" stroke="#2563eb" fill="#93c5fd" />
                        <Area type="monotone" dataKey="mentorship" stackId="1" stroke="#0f766e" fill="#5eead4" />
                        <Area type="monotone" dataKey="services" stackId="1" stroke="#f97316" fill="#fdba74" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-sm font-semibold text-slate-900">Month-wise growth sheet</div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Month</TableHead>
                            <TableHead className="text-right">Free Users</TableHead>
                            <TableHead className="text-right">Paid Users</TableHead>
                            <TableHead className="text-right">ATS Scans</TableHead>
                            <TableHead className="text-right">AI Chats</TableHead>
                            <TableHead className="text-right">Mentorship</TableHead>
                            <TableHead className="text-right">Conversion</TableHead>
                            <TableHead className="text-right">Total Revenue</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {projectionFinance.monthlyGrowthSheet.map((row) => (
                            <TableRow key={row.month}>
                              <TableCell className="font-medium text-slate-900">{row.month}</TableCell>
                              <TableCell className="text-right">{row.freeUsers.toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-right">{row.paidUsers}</TableCell>
                              <TableCell className="text-right">{row.atsScans.toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-right">{row.aiChats.toLocaleString("en-IN")}</TableCell>
                              <TableCell className="text-right">{row.mentorshipBookings} bookings</TableCell>
                              <TableCell className="text-right">{row.conversionRate}%</TableCell>
                              <TableCell className="text-right font-semibold text-slate-950">{projectionFinance.inr(row.total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Revenue Source Sheet</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Source</TableHead>
                        <TableHead>Users / Volume</TableHead>
                        <TableHead>Unit Model</TableHead>
                        <TableHead className="text-right">Projected</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectionFinance.revenueSources.map((row) => (
                        <TableRow key={row.source}>
                          <TableCell>
                            <div className="font-medium text-slate-900">{row.source}</div>
                            <div className="text-xs text-slate-500">{row.note}</div>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{row.users}</TableCell>
                          <TableCell className="text-sm text-slate-600">{row.unit}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-950">{projectionFinance.inr(row.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Projected Member Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={projectionFinance.payoutChartData.filter((item) => item.value > 0)} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                          {projectionFinance.payoutChartData.map((_, index) => (
                            <Cell key={`projection-payout-${index}`} fill={["#2563eb", "#0f766e", "#f97316", "#7c3aed", "#dc2626", "#64748b"][index % 6]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => projectionFinance.inr(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member / Bucket</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-right">Projected Split</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectionFinance.payoutSplit.map((row) => (
                        <TableRow key={row.member}>
                          <TableCell className="font-medium text-slate-900">{row.member}</TableCell>
                          <TableCell className="text-sm text-slate-600">{row.role}</TableCell>
                          <TableCell className="text-right font-semibold text-slate-950">{projectionFinance.inr(row.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="comms" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>Broadcast Center</CardTitle>
                      <p className="mt-1 text-sm text-slate-500">
                        Publish in-app platform announcements, send email updates to your users, or do both together.
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                      <Megaphone className="h-5 w-5" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Title</p>
                      <Input value={broadcastTitle} onChange={(event) => setBroadcastTitle(event.target.value)} placeholder="Platform update title" className="border-blue-100 bg-white/90" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Email subject</p>
                      <Input value={broadcastSubject} onChange={(event) => setBroadcastSubject(event.target.value)} placeholder="Subject line for email recipients" className="border-blue-100 bg-white/90" />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audience</p>
                      <Select value={broadcastAudience} onValueChange={(value) => setBroadcastAudience(value as AnnouncementAudience)}>
                        <SelectTrigger className="border-blue-100 bg-white/90">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All users</SelectItem>
                          <SelectItem value="seekers">Seekers only</SelectItem>
                          <SelectItem value="referrers">Referrers only</SelectItem>
                          <SelectItem value="admins">Admins only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Priority</p>
                      <Select value={broadcastPriority} onValueChange={(value) => setBroadcastPriority(value as AnnouncementPriority)}>
                        <SelectTrigger className="border-blue-100 bg-white/90">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="important">Important</SelectItem>
                          <SelectItem value="critical">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Specific email recipients</p>
                    <Input
                      value={broadcastSpecificEmails}
                      onChange={(event) => setBroadcastSpecificEmails(event.target.value)}
                      placeholder="name1@example.com, name2@example.com"
                      className="border-blue-100 bg-white/90"
                    />
                    <p className="text-xs text-slate-500">
                      Optional. If you enter one or more email addresses here, they override the selected audience for email sending.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Message</p>
                    <textarea
                      value={broadcastMessage}
                      onChange={(event) => setBroadcastMessage(event.target.value)}
                      placeholder="Write the update you want every selected user to receive."
                      className="min-h-[180px] w-full rounded-2xl border border-blue-100 bg-white/90 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">CTA label</p>
                      <Input value={broadcastCtaLabel} onChange={(event) => setBroadcastCtaLabel(event.target.value)} placeholder="Open dashboard" className="border-blue-100 bg-white/90" />
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">CTA link</p>
                      <Input value={broadcastCtaHref} onChange={(event) => setBroadcastCtaHref(event.target.value)} placeholder="https://referralme.in/seeker-dashboard" className="border-blue-100 bg-white/90" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={publishingAnnouncement} onClick={() => handlePublishAnnouncement({ sendInApp: true, sendEmail: false })}>
                      <Bell className="mr-2 h-4 w-4" />
                      Publish In-App
                    </Button>
                    <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" disabled={publishingAnnouncement} onClick={() => handlePublishAnnouncement({ sendInApp: false, sendEmail: true })}>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Email Only
                    </Button>
                    <Button variant="outline" className="border-slate-200 bg-white" disabled={publishingAnnouncement} onClick={() => handlePublishAnnouncement({ sendInApp: true, sendEmail: true })}>
                      <Megaphone className="mr-2 h-4 w-4" />
                      Publish + Email
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Live Communication Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <SnapshotItem label="Published in-app" value={overview.liveAnnouncements} />
                  <SnapshotItem label="Tracked email campaigns" value={overview.emailCampaigns} />
                  <SnapshotItem label="Addressable users" value={users.filter((entry) => !!entry.email).length} />
                  <SnapshotItem label="Default audience" value={broadcastSpecificEmails ? "Specific emails" : broadcastAudience} />
                  <div className="rounded-[24px] border border-blue-100 bg-blue-50/60 p-4">
                    <p className="text-sm font-semibold text-slate-900">What this gives you now</p>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                      <p>In-app blue notification rail for every selected audience.</p>
                      <p>Admin-triggered broadcast email from the same panel.</p>
                      <p>Archivable announcement history so old updates do not stay live forever.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className={ADMIN_SURFACE}>
              <CardHeader>
                <CardTitle>Announcement History</CardTitle>
                <p className="text-sm text-slate-500">Recent platform updates, their audience, and whether they are still live in the app.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAnnouncements.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-blue-200 bg-blue-50/40 p-6 text-sm text-slate-500">
                    No announcements published yet.
                  </div>
                ) : (
                  recentAnnouncements.map((announcement) => (
                    <div key={announcement.id} className="flex flex-col gap-4 rounded-[26px] border border-blue-100 bg-white/80 p-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{announcement.title}</p>
                          <Badge variant="outline" className="border-blue-200 text-blue-700">
                            {announcement.audience}
                          </Badge>
                          <Badge variant="outline" className="border-slate-200 text-slate-600">
                            {announcement.priority}
                          </Badge>
                          <Badge variant={announcement.status === "published" ? "default" : "secondary"} className="capitalize">
                            {announcement.status}
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{announcement.message}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {announcement.createdByEmail} • {getTimeLabel(announcement.updatedAt || announcement.createdAt)}
                        </p>
                      </div>
                      {announcement.status === "published" ? (
                        <Button variant="outline" className="border-slate-200 bg-white" onClick={() => handleArchiveAnnouncement(announcement)}>
                          Archive
                        </Button>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls" className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-3">
              <ControlCard
                icon={Shield}
                title="Access & Trust"
                description="Manage verification, role assignment, and admin access from the user table."
                points={[
                  `${overview.verifiedUsers} verified accounts`,
                  `${overview.admins} admin accounts`,
                  `${users.filter((entry) => entry.isSuspended).length} suspended accounts`,
                  `${users.length - overview.completedProfiles} incomplete profiles`,
                ]}
              />
              <ControlCard
                icon={Briefcase}
                title="Posting Controls"
                description="Control which jobs stay live and keep low-quality or outdated listings off the board."
                points={[
                  `${overview.activeJobs} active jobs`,
                  `${jobs.length - overview.activeJobs} inactive jobs`,
                  `${jobs.filter((entry) => entry.isArchived).length} archived jobs`,
                  `${jobs.filter((entry) => entry.visibility === "invite_only").length} invite-only jobs`,
                ]}
              />
              <ControlCard
                icon={TrendingUp}
                title="Pipeline Controls"
                description="Move referral requests through the funnel and monitor conversion health."
                points={[
                  `${overview.pendingRequests} pending requests`,
                  `${overview.acceptedRequests} accepted requests`,
                  `${overview.acceptanceRate}% request acceptance rate`,
                ]}
              />
              <ControlCard
                icon={FileText}
                title="Resume & ATS Quality"
                description="Watch resume coverage and ATS analysis penetration across submitted applications."
                points={[
                  `${overview.resumesAttached} requests include resume data`,
                  `${overview.atsCovered} requests include ATS scores`,
                  `${overview.avgAtsScore || "--"} average ATS score`,
                ]}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Platform Health Checklist</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <HealthRow icon={Users} label="User growth" value={`${users.length} total users`} tone="good" />
                  <HealthRow icon={CheckSquare} label="Profile completion" value={`${users.length ? Math.round((overview.completedProfiles / users.length) * 100) : 0}% complete`} tone={overview.completedProfiles / Math.max(users.length, 1) > 0.6 ? "good" : "warn"} />
                  <HealthRow icon={Briefcase} label="Live job inventory" value={`${overview.activeJobs} active jobs`} tone={overview.activeJobs > 0 ? "good" : "warn"} />
                  <HealthRow icon={Activity} label="Request flow" value={`${overview.pendingRequests} pending, ${overview.acceptedRequests} accepted`} tone="good" />
                  <HealthRow icon={Target} label="ATS visibility" value={`${requests.length ? Math.round((overview.atsCovered / requests.length) * 100) : 0}% ATS coverage`} tone={overview.atsCovered / Math.max(requests.length, 1) > 0.7 ? "good" : "warn"} />
                  <HealthRow icon={Mail} label="Operational visibility" value="Email delivery still needs production verification" tone="warn" />
                </CardContent>
              </Card>

              <Card className={ADMIN_SURFACE}>
                <CardHeader>
                  <CardTitle>Admin Priorities</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <PriorityRow title="Review pending requests" subtitle="Move stale candidates forward or close them." value={overview.pendingRequests} />
                  <PriorityRow title="Verify new referrers" subtitle="Trust and quality improve when referrer identities are checked." value={users.filter((entry) => entry.role === "referrer" && !entry.isVerified).length} />
                  <PriorityRow title="Check inactive jobs" subtitle="Archive or reactivate listings that are no longer maintained." value={jobs.filter((entry) => entry.isActive === false).length} />
                  <PriorityRow title="Profile completion" subtitle="Follow up on users who signed up but never completed onboarding." value={users.filter((entry) => !entry.profileCompleted).length} />
                  <PriorityRow title="Improve ATS coverage" subtitle="Encourage applications with ATS analysis and resume data attached." value={Math.max(requests.length - overview.atsCovered, 0)} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  hint: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Card className={ADMIN_SURFACE}>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-sky-500 p-2.5 text-white shadow-lg shadow-blue-500/20">
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="text-3xl font-bold tracking-tight text-slate-950">{value}</div>
        <p className="mt-2 text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

function HeroPill({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{caption}</p>
    </div>
  );
}

function SnapshotItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RecentListCard({
  title,
  items,
}: {
  title: string;
  items: Array<{ id: string; title: string; meta: string }>;
}) {
  return (
    <Card className={ADMIN_SURFACE}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{item.title}</p>
            <p className="mt-1 text-xs text-slate-500">{item.meta}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ControlCard({
  icon: Icon,
  title,
  description,
  points,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  points: string[];
}) {
  return (
    <Card className={ADMIN_SURFACE}>
      <CardHeader>
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <Icon className="h-5 w-5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-slate-500">{description}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {points.map((point) => (
          <div key={point} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {point}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function HealthRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "good" | "warn";
}) {
  const toneClass = tone === "good" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700";
  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-xl p-2 ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="font-medium text-slate-900">{label}</p>
          <p className="text-xs text-slate-500">{value}</p>
        </div>
      </div>
      <Badge variant="outline" className={tone === "good" ? "border-emerald-300 text-emerald-700" : "border-amber-300 text-amber-700"}>
        {tone === "good" ? "Healthy" : "Needs review"}
      </Badge>
    </div>
  );
}

function PriorityRow({
  title,
  subtitle,
  value,
}: {
  title: string;
  subtitle: string;
  value: number;
}) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-slate-200 bg-white p-4">
      <div className="pr-4">
        <p className="font-medium text-slate-900">{title}</p>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="rounded-2xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
        {value}
      </div>
    </div>
  );
}
