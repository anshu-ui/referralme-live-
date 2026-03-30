import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, ImagePlus, LayoutGrid, ShieldCheck, Target, Trash2, Users } from "lucide-react";
import {
  type CampusAnnouncement,
  type CampusAmbassadorApplication,
  type CampusAmbassadorMember,
  type CampusAmbassadorTask,
  type CampusTaskSubmission,
  generateCampusAmbassadorCode,
  type CampusAmbassadorPageSettings,
  type CampusAmbassadorShowcaseItem,
  createCampusAmbassadorTask,
  createCampusAnnouncement,
  createCampusAmbassadorShowcaseItem,
  deleteCampusAnnouncement,
  deleteCampusAmbassadorApplication,
  deleteCampusAmbassadorMember,
  deleteCampusAmbassadorTask,
  deleteCampusAmbassadorShowcaseItem,
  deleteCampusTaskSubmissionsForAmbassador,
  deleteCampusTaskSubmissionsForTask,
  getCampusAmbassadorApplications,
  getCampusAmbassadorMembers,
  getCampusAmbassadorPageSettings,
  getCampusAmbassadorTasks,
  getCampusTaskSubmissions,
  getCampusAmbassadorShowcaseItems,
  getCampusAnnouncements,
  getCampusAmbassadorByEmail,
  reviewCampusTaskSubmission,
  updateCampusAnnouncement,
  subscribeToCampusAmbassadorMembers,
  subscribeToCampusAmbassadorTasks,
  subscribeToCampusTaskSubmissions,
  updateCampusAmbassadorApplication,
  updateCampusAmbassadorMember,
  updateCampusAmbassadorTask,
  updateCampusAmbassadorShowcaseItem,
  upsertCampusAmbassadorMember,
  upsertCampusAmbassadorPageSettings,
} from "../lib/campus-firestore";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useToast } from "../hooks/use-toast";
import FirebaseFileUpload from "../components/firebase-file-upload";
import { campusAuth, campusStorage } from "../lib/campus-firebase";
import {
  sendCampusAmbassadorStatusEmail,
  sendCampusProofReviewedEmail,
  sendCampusRewardUnlockedEmail,
  sendCampusWeeklyDigestEmail,
} from "../lib/emailService";

type CampusSection = CampusAmbassadorShowcaseItem["section"];

const PANEL =
  "admin-panel border border-slate-200/80 bg-white/90 shadow-[0_20px_60px_-32px_rgba(37,99,235,0.34)] backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:opacity-100 hover:shadow-[0_26px_70px_-34px_rgba(37,99,235,0.42)]";

const SOFT_PANEL =
  "rounded-[28px] border border-blue-100/80 bg-gradient-to-br from-blue-50 via-white to-cyan-50 shadow-[0_24px_70px_-40px_rgba(59,130,246,0.45)]";

const ITEM_CARD =
  "group rounded-[26px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.3)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:bg-white hover:opacity-100 hover:shadow-[0_22px_50px_-28px_rgba(37,99,235,0.34)]";

const TEXTAREA_CLASS =
  "min-h-[120px] w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100";

const SECTION_OPTIONS: Array<{ value: CampusSection; label: string }> = [
  { value: "highlight", label: "Top Ambassador" },
  { value: "leaderboard", label: "Leaderboard Row" },
  { value: "gallery", label: "Recognition Card" },
  { value: "pillar", label: "Program Text Card" },
  { value: "mission", label: "Mission Card" },
  { value: "campus_moment", label: "Big Photo Card" },
  { value: "program_point", label: "Program Bullet" },
  { value: "benefit", label: "Benefit Row" },
  { value: "reward_tier", label: "Reward Card" },
  { value: "timeline", label: "Timeline Step" },
  { value: "faq", label: "FAQ" },
  { value: "testimonial", label: "Quote" },
  { value: "hero_stat", label: "Hero Stat" },
  { value: "info_row", label: "Program Info Row" },
];

const SECTION_GUIDES: Record<
  CampusSection,
  {
    title: string;
    description: string;
    imageHint?: string;
    showSubtitle?: boolean;
    showDescription?: boolean;
    showBadge?: boolean;
    showMetric?: boolean;
    showInitials?: boolean;
    showAccent?: boolean;
    showImage?: boolean;
    titleLabel?: string;
    subtitleLabel?: string;
    descriptionLabel?: string;
    badgeLabel?: string;
    metricLabel?: string;
  }
> = {
  highlight: {
    title: "Top Ambassador Card",
    description: "Use this for top performer cards on the landing page. Add name, college, role tag, and optional photo.",
    imageHint: "Best for ambassador/profile photos.",
    showSubtitle: true,
    showDescription: false,
    showBadge: true,
    showMetric: false,
    showInitials: true,
    showAccent: true,
    showImage: true,
    titleLabel: "Ambassador Name",
    subtitleLabel: "College Name",
    badgeLabel: "Role Tag",
  },
  leaderboard: {
    title: "Leaderboard Row",
    description: "Controls the public top ambassador board. Add name, college, points, and role label.",
    showSubtitle: true,
    showDescription: false,
    showBadge: true,
    showMetric: true,
    showInitials: false,
    showAccent: true,
    showImage: false,
    titleLabel: "Ambassador Name",
    subtitleLabel: "College Name",
    badgeLabel: "Role Tag",
    metricLabel: "Points Text",
  },
  gallery: {
    title: "Recognition / Gallery Card",
    description: "Use this for the visual cards in the recognition section. Big image works well here.",
    imageHint: "Best for wide visuals, event photos, swag, or branded program imagery.",
    showSubtitle: false,
    showDescription: false,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: true,
    showImage: true,
    titleLabel: "Card Label",
  },
  pillar: {
    title: "Program Direction Card",
    description: "These are the 4 cards explaining what the program gives students.",
    showSubtitle: false,
    showDescription: true,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: true,
    showImage: false,
    titleLabel: "Card Heading",
    descriptionLabel: "Card Description",
  },
  mission: {
    title: "Mission Card",
    description: "Short mission cards in the hero/program area. Keep these very short.",
    showSubtitle: false,
    showDescription: true,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: false,
    showImage: false,
    titleLabel: "Mission Title",
    descriptionLabel: "Short Supporting Text",
  },
  campus_moment: {
    title: "Campus Moment Card",
    description: "This is the single featured big photo card in Program Direction. Add one strong campus/event visual story here.",
    imageHint: "Best for event photos, booths, crowds, workshops, or student activity shots.",
    showSubtitle: false,
    showDescription: true,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: true,
    showImage: true,
    titleLabel: "Card Title",
    descriptionLabel: "Short Description",
  },
  program_point: {
    title: "Program Bullet",
    description: "Short bullets in the hero box. Keep them clean and direct.",
    showSubtitle: false,
    showDescription: false,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: false,
    showImage: false,
    titleLabel: "Bullet Text",
  },
  benefit: {
    title: "Benefit Row",
    description: "These are the reward/benefit bullet rows next to the reward ladder.",
    showSubtitle: false,
    showDescription: false,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: false,
    showImage: false,
    titleLabel: "Benefit Text",
  },
  reward_tier: {
    title: "Reward Tier Card",
    description: "Used in the reward ladder. Add title, unlock points, reward text, and reward image.",
    imageHint: "Use certificate, t-shirt, kit, or any reward image.",
    showSubtitle: false,
    showDescription: true,
    showBadge: false,
    showMetric: true,
    showInitials: false,
    showAccent: false,
    showImage: true,
    titleLabel: "Reward Name",
    descriptionLabel: "Reward Description",
    metricLabel: "Unlock Points",
  },
  timeline: {
    title: "Timeline Step",
    description: "These are the 4 workflow cards that explain how the program works.",
    showSubtitle: false,
    showDescription: true,
    showBadge: false,
    showMetric: true,
    showInitials: false,
    showAccent: false,
    showImage: false,
    titleLabel: "Step Title",
    descriptionLabel: "Step Description",
    metricLabel: "Step Number",
  },
  faq: {
    title: "FAQ Item",
    description: "Question and answer shown in the FAQ section.",
    showSubtitle: false,
    showDescription: true,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: false,
    showImage: false,
    titleLabel: "Question",
    descriptionLabel: "Answer",
  },
  testimonial: {
    title: "Quote",
    description: "Short quote block shown on the landing page.",
    showSubtitle: false,
    showDescription: true,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: false,
    showImage: false,
    titleLabel: "Quote Author",
    descriptionLabel: "Quote Text",
  },
  hero_stat: {
    title: "Hero Stat",
    description: "Small stats in the top hero section.",
    showSubtitle: true,
    showDescription: true,
    showBadge: false,
    showMetric: true,
    showInitials: false,
    showAccent: false,
    showImage: false,
    titleLabel: "Stat Label",
    subtitleLabel: "Small Note",
    descriptionLabel: "Supporting Text",
    metricLabel: "Main Number / Value",
  },
  info_row: {
    title: "Program Direction Row",
    description: "These cards sit on the left side of the program section. Use short headings and descriptions.",
    showSubtitle: false,
    showDescription: true,
    showBadge: false,
    showMetric: false,
    showInitials: false,
    showAccent: false,
    showImage: false,
    titleLabel: "Row Heading",
    descriptionLabel: "Row Description",
  },
};

const DEFAULT_SETTINGS = {
  heroEyebrow: "ReferralMe Campus Ecosystem",
  heroTitle: "Be the face of career culture on your campus.",
  heroDescription:
    "Build hype, bring students into ReferralMe, and grow a campus ecosystem around opportunities, community, visibility, recognition, and real student momentum.",
  footerTitle: "ReferralMe Campus Ambassador",
  footerSubtitle: "A student ecosystem for campus growth, community, and career momentum.",
  footerDescription:
    "This program is designed to help ReferralMe grow through selected student ambassadors, stronger campus visibility, structured weekly tasks, and visible recognition.",
  footerTagline: "Built with love in India by ReferralMe",
  contactEmail: "info@referralme.in",
  linkedinHref: "https://www.linkedin.com",
  instagramHref: "https://www.instagram.com",
};

export default function CampusAmbassadorAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingContent, setSavingContent] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTask, setSavingTask] = useState(false);
  const [applications, setApplications] = useState<CampusAmbassadorApplication[]>([]);
  const [members, setMembers] = useState<CampusAmbassadorMember[]>([]);
  const [tasks, setTasks] = useState<CampusAmbassadorTask[]>([]);
  const [submissions, setSubmissions] = useState<CampusTaskSubmission[]>([]);
  const [showcaseItems, setShowcaseItems] = useState<CampusAmbassadorShowcaseItem[]>([]);
  const [announcements, setAnnouncements] = useState<CampusAnnouncement[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [pageSettings, setPageSettings] = useState<CampusAmbassadorPageSettings>(DEFAULT_SETTINGS);
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState("all");
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberCollegeFilter, setMemberCollegeFilter] = useState("all");
  const [selectedMemberEmail, setSelectedMemberEmail] = useState<string | null>(null);
  const [manualPoints, setManualPoints] = useState<Record<string, string>>({});
  const [taskSearch, setTaskSearch] = useState("");
  const [taskStatusFilter, setTaskStatusFilter] = useState("all");
  const [submissionSearch, setSubmissionSearch] = useState("");
  const [submissionStatusFilter, setSubmissionStatusFilter] = useState("all");
  const [submissionCollegeFilter, setSubmissionCollegeFilter] = useState("all");
  const [submissionTaskFilter, setSubmissionTaskFilter] = useState("all");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [isSendingWeeklyDigest, setIsSendingWeeklyDigest] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({
    title: "",
    message: "",
    tone: "info" as CampusAnnouncement["tone"],
    audience: "all" as CampusAnnouncement["audience"],
    audienceCollege: "",
    isActive: true,
  });
  const [itemForm, setItemForm] = useState({
    section: "highlight" as CampusSection,
    title: "",
    subtitle: "",
    description: "",
    badge: "",
    accent: "from-blue-600 to-cyan-500",
    initials: "",
    metric: "",
    imageUrl: "",
    galleryImageUrlsText: "",
    imageAlt: "",
    order: "1",
  });
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    points: "50",
    dueDate: "",
    audience: "all" as CampusAmbassadorTask["audience"],
    audienceCollege: "",
    status: "active" as CampusAmbassadorTask["status"],
  });

  const loadCampusAdminData = async () => {
    try {
      const [nextAnnouncements, nextApplications, nextShowcaseItems, nextSettings, nextMembers, nextTasks, nextSubmissions] = await Promise.all([
        getCampusAnnouncements(),
        getCampusAmbassadorApplications(),
        getCampusAmbassadorShowcaseItems(),
        getCampusAmbassadorPageSettings(),
        getCampusAmbassadorMembers(),
        getCampusAmbassadorTasks(),
        getCampusTaskSubmissions(),
      ]);
      const applicationEmails = new Set(nextApplications.map((entry) => entry.email.trim().toLowerCase()));
      const syncedMembers = nextMembers.filter((entry) => applicationEmails.has(entry.email.trim().toLowerCase()));
      setAnnouncements(nextAnnouncements);
      setApplications(nextApplications);
      setShowcaseItems(nextShowcaseItems);
      setMembers(syncedMembers);
      setTasks(nextTasks);
      setSubmissions(nextSubmissions);
      setPageSettings({
        ...DEFAULT_SETTINGS,
        ...(nextSettings || {}),
      });
    } catch (error) {
      console.error("Error loading campus ambassador admin data:", error);
      toast({
        title: "Campus admin data failed to load",
        description: "Please refresh and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampusAdminData();
    const unsubMembers = subscribeToCampusAmbassadorMembers(setMembers);
    const unsubTasks = subscribeToCampusAmbassadorTasks(setTasks);
    const unsubSubmissions = subscribeToCampusTaskSubmissions(setSubmissions);
    return () => {
      unsubMembers();
      unsubTasks();
      unsubSubmissions();
    };
  }, []);

  useEffect(() => {
    if (loading || typeof window === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );

    const nodes = document.querySelectorAll("[data-admin-reveal]");
    nodes.forEach((node, index) => {
      const element = node as HTMLElement;
      element.style.transitionDelay = `${Math.min(index * 50, 260)}ms`;
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [loading, applications.length, members.length, tasks.length, submissions.length, showcaseItems.length]);

  const resetItemForm = () => {
    setItemForm({
      section: "highlight",
      title: "",
      subtitle: "",
      description: "",
      badge: "",
      accent: "from-blue-600 to-cyan-500",
      initials: "",
      metric: "",
      imageUrl: "",
      galleryImageUrlsText: "",
      imageAlt: "",
      order: "1",
    });
    setEditingItemId(null);
  };

  const resetTaskForm = () => {
    setTaskForm({
      title: "",
      description: "",
      points: "50",
      dueDate: "",
      audience: "all",
      audienceCollege: "",
      status: "active",
    });
    setEditingTaskId(null);
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({
      title: "",
      message: "",
      tone: "info",
      audience: "all",
      audienceCollege: "",
      isActive: true,
    });
    setEditingAnnouncementId(null);
  };

  const handleSavePageSettings = async () => {
    setSavingSettings(true);
    try {
      await upsertCampusAmbassadorPageSettings({
        heroEyebrow: pageSettings.heroEyebrow?.trim() || undefined,
        heroTitle: pageSettings.heroTitle?.trim() || undefined,
        heroDescription: pageSettings.heroDescription?.trim() || undefined,
        footerTitle: pageSettings.footerTitle?.trim() || undefined,
        footerSubtitle: pageSettings.footerSubtitle?.trim() || undefined,
        footerDescription: pageSettings.footerDescription?.trim() || undefined,
        footerTagline: pageSettings.footerTagline?.trim() || undefined,
        contactEmail: pageSettings.contactEmail?.trim() || undefined,
        linkedinHref: pageSettings.linkedinHref?.trim() || undefined,
        instagramHref: pageSettings.instagramHref?.trim() || undefined,
      });
      toast({ title: "Page settings updated" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error saving campus page settings:", error);
      toast({
        title: "Settings save failed",
        description: "The page settings could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) {
      toast({
        title: "Announcement incomplete",
        description: "Add both a title and message before saving.",
        variant: "destructive",
      });
      return;
    }

    try {
      const payload = {
        title: announcementForm.title.trim(),
        message: announcementForm.message.trim(),
        tone: announcementForm.tone,
        audience: announcementForm.audience,
        audienceCollege: announcementForm.audience === "college" ? announcementForm.audienceCollege.trim() || undefined : undefined,
        isActive: announcementForm.isActive,
      };

      if (editingAnnouncementId) {
        await updateCampusAnnouncement(editingAnnouncementId, payload);
        toast({ title: "Announcement updated" });
      } else {
        await createCampusAnnouncement(payload);
        toast({ title: "Announcement created" });
      }

      resetAnnouncementForm();
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error saving announcement:", error);
      toast({
        title: "Announcement save failed",
        description: "The announcement could not be saved.",
        variant: "destructive",
      });
    }
  };

  const handleEditAnnouncement = (announcement: CampusAnnouncement) => {
    setEditingAnnouncementId(announcement.id || null);
    setAnnouncementForm({
      title: announcement.title || "",
      message: announcement.message || "",
      tone: announcement.tone || "info",
      audience: announcement.audience || "all",
      audienceCollege: announcement.audienceCollege || "",
      isActive: announcement.isActive !== false,
    });
  };

  const handleDeleteAnnouncement = async (announcement?: CampusAnnouncement) => {
    if (!announcement?.id) return;
    try {
      await deleteCampusAnnouncement(announcement.id);
      toast({ title: "Announcement deleted" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast({
        title: "Delete failed",
        description: "The announcement could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const handleSaveContentItem = async () => {
    if (!itemForm.title.trim()) {
      toast({
        title: "Title required",
        description: "Add a title before saving the content item.",
        variant: "destructive",
      });
      return;
    }

    if (itemForm.imageUrl.trim().startsWith("data:") || itemForm.galleryImageUrlsText.split("\n").some((value) => value.trim().startsWith("data:"))) {
      toast({
        title: "Image upload not allowed",
        description: "This card needs a real Storage or public image URL. Base64 images are too large for landing-page content.",
        variant: "destructive",
      });
      return;
    }

    setSavingContent(true);
    try {
      const nextGalleryImages = itemForm.galleryImageUrlsText
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean);

      const payload = {
        section: itemForm.section,
        title: itemForm.title.trim(),
        subtitle: itemForm.subtitle.trim() || undefined,
        description: itemForm.description.trim() || undefined,
        badge: itemForm.badge.trim() || undefined,
        accent: itemForm.accent.trim() || undefined,
        initials: itemForm.initials.trim() || undefined,
        metric: itemForm.metric.trim() || undefined,
        imageUrl: itemForm.imageUrl.trim() || undefined,
        galleryImageUrls: nextGalleryImages,
        imageAlt: itemForm.imageAlt.trim() || undefined,
        order: Number(itemForm.order || "1"),
        isActive: true,
      };

      if (editingItemId) {
        await updateCampusAmbassadorShowcaseItem(editingItemId, payload);
        toast({ title: "Content item updated" });
      } else if (itemForm.section === "campus_moment") {
        const existingFeaturedMoment = showcaseItems
          .filter((item) => item.section === "campus_moment")
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))[0];

        if (existingFeaturedMoment?.id) {
          const existingImages = [
            existingFeaturedMoment.imageUrl,
            ...(existingFeaturedMoment.galleryImageUrls || []),
          ].filter((value): value is string => Boolean(value));
          const incomingImages = [payload.imageUrl, ...nextGalleryImages].filter((value): value is string => Boolean(value));
          const mergedImages = Array.from(new Set([...existingImages, ...incomingImages]));
          const [mainImage, ...galleryImages] = mergedImages;

          await updateCampusAmbassadorShowcaseItem(existingFeaturedMoment.id, {
            title: payload.title || existingFeaturedMoment.title,
            subtitle: payload.subtitle ?? existingFeaturedMoment.subtitle,
            description: payload.description ?? existingFeaturedMoment.description,
            accent: payload.accent ?? existingFeaturedMoment.accent,
            imageAlt: payload.imageAlt ?? existingFeaturedMoment.imageAlt,
            imageUrl: mainImage,
            galleryImageUrls: galleryImages,
            order: existingFeaturedMoment.order || payload.order,
            isActive: true,
          });
          toast({ title: "Images added to featured photo card" });
        } else {
          await createCampusAmbassadorShowcaseItem(payload);
          toast({ title: "Featured photo card created" });
        }
      } else {
        await createCampusAmbassadorShowcaseItem(payload);
        toast({ title: "Content item created" });
      }

      resetItemForm();
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error saving campus content item:", error);
      toast({
        title: "Content save failed",
        description: "The content item could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSavingContent(false);
    }
  };

  const handleEditContentItem = (item: CampusAmbassadorShowcaseItem) => {
    setEditingItemId(item.id || null);
    setItemForm({
      section: item.section,
      title: item.title || "",
      subtitle: item.subtitle || "",
      description: item.description || "",
      badge: item.badge || "",
      accent: item.accent || "from-blue-600 to-cyan-500",
      initials: item.initials || "",
      metric: item.metric || "",
      imageUrl: item.imageUrl || "",
      galleryImageUrlsText: item.galleryImageUrls?.join("\n") || "",
      imageAlt: item.imageAlt || "",
      order: String(item.order || 1),
    });
  };

  const handleDeleteContentItem = async (itemId?: string) => {
    if (!itemId) return;
    try {
      await deleteCampusAmbassadorShowcaseItem(itemId);
      toast({ title: "Content item deleted" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error deleting content item:", error);
      toast({
        title: "Delete failed",
        description: "The content item could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const handleSaveTask = async () => {
    if (!taskForm.title.trim()) {
      toast({
        title: "Task title required",
        description: "Add a task title before saving.",
        variant: "destructive",
      });
      return;
    }

    setSavingTask(true);
    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        points: Number(taskForm.points || "0"),
        dueDate: taskForm.dueDate || undefined,
        audience: taskForm.audience,
        audienceCollege: taskForm.audience === "college" ? taskForm.audienceCollege.trim() || undefined : undefined,
        status: taskForm.status,
      };

      if (editingTaskId) {
        await updateCampusAmbassadorTask(editingTaskId, payload);
        toast({ title: "Task updated" });
      } else {
        await createCampusAmbassadorTask(payload);
        toast({ title: "Task created" });
      }

      resetTaskForm();
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error saving campus task:", error);
      toast({
        title: "Task save failed",
        description: "The task could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSavingTask(false);
    }
  };

  const handleEditTask = (task: CampusAmbassadorTask) => {
    setEditingTaskId(task.id || null);
    setTaskForm({
      title: task.title || "",
      description: task.description || "",
      points: String(task.points || 0),
      dueDate: task.dueDate || "",
      audience: task.audience || "all",
      audienceCollege: task.audienceCollege || "",
      status: task.status || "active",
    });
  };

  const handleDeleteTask = async (taskId?: string) => {
    if (!taskId) return;
    try {
      await deleteCampusTaskSubmissionsForTask(taskId);
      await deleteCampusAmbassadorTask(taskId);
      setSubmissions((current) => current.filter((entry) => entry.taskId !== taskId));
      toast({ title: "Task deleted" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error deleting campus task:", error);
      toast({
        title: "Delete failed",
        description: "The task could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const handleApplicationStatus = async (
    application: CampusAmbassadorApplication,
    status: CampusAmbassadorApplication["status"],
  ) => {
    if (!application.id) return;
    try {
      await updateCampusAmbassadorApplication(application.id, { status });
      if (status === "accepted") {
        const existingMember = await getCampusAmbassadorByEmail(application.email);
        await upsertCampusAmbassadorMember(application.email, {
          fullName: application.fullName,
          collegeName: application.collegeName,
          course: application.course,
          graduationYear: application.graduationYear,
          phoneNumber: application.phoneNumber,
          linkedinUrl: application.linkedinUrl,
          status: "active",
          ambassadorCode: existingMember?.ambassadorCode || generateCampusAmbassadorCode(application.fullName),
          points: existingMember?.points || 0,
        });
      }

      if (status === "shortlisted" || status === "accepted") {
        const dashboardUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/campus-ambassador/dashboard`
            : "https://referralme.in/campus-ambassador/dashboard";
        await sendCampusAmbassadorStatusEmail({
          name: application.fullName,
          email: application.email,
          status,
          dashboardUrl,
        });
      }

      toast({ title: "Application updated" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error updating campus application:", error);
      toast({
        title: "Update failed",
        description: "The application could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteApplication = async (application?: CampusAmbassadorApplication) => {
    if (!application?.id) return;
    try {
      await deleteCampusAmbassadorApplication(application.id);
      await deleteCampusAmbassadorMember(application.email);
      await deleteCampusTaskSubmissionsForAmbassador(application.email);
      setApplications((current) => current.filter((entry) => entry.id !== application.id));
      setMembers((current) => current.filter((entry) => entry.email.toLowerCase() !== application.email.toLowerCase()));
      setSubmissions((current) => current.filter((entry) => entry.ambassadorEmail.toLowerCase() !== application.email.toLowerCase()));
      toast({ title: "Application and ambassador access deleted" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error deleting campus application:", error);
      toast({
        title: "Delete failed",
        description: "The application or linked ambassador access could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const handleBulkApplicationStatus = async (status: CampusAmbassadorApplication["status"]) => {
    const selectedApplications = applications.filter((entry) => entry.id && selectedApplicationIds.includes(entry.id));
    if (selectedApplications.length === 0) {
      toast({
        title: "No applications selected",
        description: "Select one or more applicants first.",
        variant: "destructive",
      });
      return;
    }

    try {
      await Promise.all(selectedApplications.map((entry) => handleApplicationStatus(entry, status)));
      setSelectedApplicationIds([]);
      toast({ title: `Updated ${selectedApplications.length} application${selectedApplications.length > 1 ? "s" : ""}` });
    } catch (error) {
      console.error("Error applying bulk application update:", error);
    }
  };

  const handleMemberStatus = async (member: CampusAmbassadorMember, status: CampusAmbassadorMember["status"]) => {
    try {
      await updateCampusAmbassadorMember(member.email, { status });
      toast({ title: "Ambassador updated" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error updating ambassador member:", error);
      toast({
        title: "Update failed",
        description: "The ambassador could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleManualPointUpdate = async (member: CampusAmbassadorMember) => {
    const nextValue = Number(manualPoints[member.email] ?? member.points ?? 0);
    if (Number.isNaN(nextValue)) {
      toast({
        title: "Invalid points",
        description: "Enter a valid number first.",
        variant: "destructive",
      });
      return;
    }
    try {
      await updateCampusAmbassadorMember(member.email, { points: nextValue });
      toast({ title: "Points updated" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error updating ambassador points:", error);
      toast({
        title: "Point update failed",
        description: "The ambassador points could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleSubmissionReview = async (
    submission: CampusTaskSubmission,
    nextStatus: "approved" | "rejected",
  ) => {
    if (!submission.id) return;
    try {
      const currentMember = syncedMembers.find(
        (entry) => entry.email.trim().toLowerCase() === submission.ambassadorEmail.trim().toLowerCase(),
      );
      const rewardTiers = showcaseItems
        .filter((item) => item.section === "reward_tier" && item.isActive)
        .map((item) => ({
          title: item.title,
          description: item.description || item.subtitle || "",
          points: Number.parseInt(String(item.metric || item.badge || "0").replace(/[^\d]/g, ""), 10) || 0,
        }))
        .filter((item) => item.points > 0)
        .sort((a, b) => a.points - b.points);
      const pointsBefore = Number(currentMember?.points || 0);
      const pointsAfter =
        nextStatus === "approved" && submission.status !== "approved"
          ? pointsBefore + Number(submission.pointsAwarded || 0)
          : nextStatus === "rejected" && submission.status === "approved"
            ? Math.max(0, pointsBefore - Number(submission.pointsAwarded || 0))
            : pointsBefore;

      await reviewCampusTaskSubmission(submission, nextStatus, reviewNotes[submission.id] || undefined);

      void sendCampusProofReviewedEmail({
        name: submission.ambassadorName,
        email: submission.ambassadorEmail,
        taskTitle: submission.taskTitle,
        status: nextStatus,
        pointsAwarded: Number(submission.pointsAwarded || 0),
        reviewNote: reviewNotes[submission.id] || undefined,
      });

      if (nextStatus === "approved") {
        const unlockedReward = rewardTiers.find((reward) => pointsBefore < reward.points && pointsAfter >= reward.points);
        if (unlockedReward) {
          void sendCampusRewardUnlockedEmail({
            name: submission.ambassadorName,
            email: submission.ambassadorEmail,
            rewardTitle: unlockedReward.title,
            rewardDescription: unlockedReward.description,
            currentPoints: pointsAfter,
          });
        }
      }

      setReviewNotes((current) => ({ ...current, [submission.id as string]: "" }));
      toast({ title: `Submission ${nextStatus}` });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error reviewing task submission:", error);
      toast({
        title: "Review failed",
        description: "The task submission could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleSendWeeklyDigest = async () => {
    const recipients = syncedMembers
      .filter((member) => member.status === "accepted" || member.status === "active")
      .map((member) => ({
        name: member.fullName,
        email: member.email,
        currentPoints: Number(member.points || 0),
      }));

    if (recipients.length === 0) {
      toast({
        title: "No ambassadors to email",
        description: "Accept at least one ambassador before sending the weekly digest.",
        variant: "destructive",
      });
      return;
    }

    setIsSendingWeeklyDigest(true);
    try {
      const result = await sendCampusWeeklyDigestEmail({
        recipients,
        activeTasks: tasks
          .filter((task) => task.status === "active")
          .map((task) => ({
            title: task.title,
            points: Number(task.points || 0),
            dueDate: task.dueDate,
          })),
        activeAnnouncements: announcements
          .filter((announcement) => announcement.isActive)
          .map((announcement) => ({
            title: announcement.title,
            message: announcement.message,
          })),
      });

      if (!result.success && result.sent === 0) {
        throw new Error("No weekly digest emails were sent.");
      }

      toast({
        title: "Weekly digest sent",
        description: `${result.sent} email${result.sent === 1 ? "" : "s"} delivered${result.failed ? `, ${result.failed} failed` : ""}.`,
      });
    } catch (error) {
      console.error("Error sending campus weekly digest:", error);
      toast({
        title: "Weekly digest failed",
        description: "The digest could not be sent right now.",
        variant: "destructive",
      });
    } finally {
      setIsSendingWeeklyDigest(false);
    }
  };

  const metrics = useMemo(() => {
    const accepted = applications.filter((entry) => entry.status === "accepted").length;
    const shortlisted = applications.filter((entry) => entry.status === "shortlisted").length;
    const pending = applications.filter((entry) => entry.status === "pending").length;
    const applicationEmails = new Set(applications.map((entry) => entry.email.trim().toLowerCase()));
    const syncedMembers = members.filter((entry) => applicationEmails.has(entry.email.trim().toLowerCase()));
    return {
      totalApplications: applications.length,
      accepted,
      shortlisted,
      pending,
      totalContent: showcaseItems.length,
      totalAmbassadors: syncedMembers.length,
      activeTasks: tasks.filter((task) => task.status === "active").length,
      pendingSubmissions: submissions.filter((submission) => submission.status === "pending").length,
      approvedSubmissions: submissions.filter((submission) => submission.status === "approved").length,
      activeAnnouncements: announcements.filter((announcement) => announcement.isActive).length,
    };
  }, [applications, showcaseItems, members, tasks, submissions, announcements]);

  const syncedMembers = useMemo(() => {
    const applicationEmails = new Set(applications.map((entry) => entry.email.trim().toLowerCase()));
    return members.filter((entry) => applicationEmails.has(entry.email.trim().toLowerCase()));
  }, [members, applications]);

  const leaderboard = useMemo(
    () => [...syncedMembers].sort((a, b) => Number(b.points || 0) - Number(a.points || 0)),
    [syncedMembers],
  );

  const filteredApplications = useMemo(() => {
    const search = applicationSearch.trim().toLowerCase();
    return applications.filter((entry) => {
      const matchesStatus = applicationStatusFilter === "all" || entry.status === applicationStatusFilter;
      const haystack = [entry.fullName, entry.email, entry.collegeName, entry.course].join(" ").toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [applications, applicationSearch, applicationStatusFilter]);

  const filteredMembers = useMemo(() => {
    const search = memberSearch.trim().toLowerCase();
    return syncedMembers.filter((entry) => {
      const matchesCollege = memberCollegeFilter === "all" || entry.collegeName === memberCollegeFilter;
      const haystack = [entry.fullName, entry.email, entry.collegeName, entry.ambassadorCode].join(" ").toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesCollege && matchesSearch;
    });
  }, [syncedMembers, memberSearch, memberCollegeFilter]);

  const filteredTasks = useMemo(() => {
    const search = taskSearch.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesStatus = taskStatusFilter === "all" || task.status === taskStatusFilter;
      const haystack = [task.title, task.description, task.audienceCollege].filter(Boolean).join(" ").toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesStatus && matchesSearch;
    });
  }, [tasks, taskSearch, taskStatusFilter]);

  const filteredSubmissions = useMemo(() => {
    const search = submissionSearch.trim().toLowerCase();
    return submissions.filter((submission) => {
      const matchesStatus = submissionStatusFilter === "all" || submission.status === submissionStatusFilter;
      const matchesCollege = submissionCollegeFilter === "all" || submission.ambassadorCollege === submissionCollegeFilter;
      const matchesTask = submissionTaskFilter === "all" || submission.taskTitle === submissionTaskFilter;
      const haystack = [submission.taskTitle, submission.ambassadorName, submission.ambassadorEmail, submission.ambassadorCollege]
        .join(" ")
        .toLowerCase();
      const matchesSearch = !search || haystack.includes(search);
      return matchesStatus && matchesCollege && matchesTask && matchesSearch;
    });
  }, [submissions, submissionSearch, submissionStatusFilter, submissionCollegeFilter, submissionTaskFilter]);

  const collegeOptions = useMemo(
    () => Array.from(new Set(syncedMembers.map((member) => member.collegeName).filter(Boolean))).sort(),
    [syncedMembers],
  );

  const submissionCollegeOptions = useMemo(
    () => Array.from(new Set(submissions.map((entry) => entry.ambassadorCollege).filter(Boolean))).sort(),
    [submissions],
  );

  const submissionTaskOptions = useMemo(
    () => Array.from(new Set(submissions.map((entry) => entry.taskTitle).filter(Boolean))).sort(),
    [submissions],
  );

  const selectedMember = useMemo(
    () => syncedMembers.find((entry) => entry.email === selectedMemberEmail) || null,
    [syncedMembers, selectedMemberEmail],
  );
  const contentGuide = SECTION_GUIDES[itemForm.section];

  const handleDeleteMember = async (member?: CampusAmbassadorMember) => {
    if (!member?.email) return;
    try {
      await deleteCampusAmbassadorMember(member.email);
      await deleteCampusTaskSubmissionsForAmbassador(member.email);
      setMembers((current) => current.filter((entry) => entry.email.toLowerCase() !== member.email.toLowerCase()));
      setSubmissions((current) => current.filter((entry) => entry.ambassadorEmail.toLowerCase() !== member.email.toLowerCase()));
      toast({ title: "Ambassador deleted" });
      await loadCampusAdminData();
    } catch (error) {
      console.error("Error deleting ambassador member:", error);
      toast({
        title: "Delete failed",
        description: "The ambassador record could not be deleted.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fbff] px-4 py-10 sm:px-6">
        <AdminShellStyles />
        <div className="mx-auto max-w-7xl">
          <div className={`${SOFT_PANEL} flex items-center justify-center p-10 sm:p-16`}>
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-blue-100 border-b-blue-600" />
              <p className="mt-4 text-sm font-medium text-slate-600">Loading campus ambassador admin...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8fbff] px-4 py-6 sm:px-6 sm:py-8">
      <AdminShellStyles />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.9),_rgba(248,251,255,0))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-full bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30" />

      <div className="relative mx-auto max-w-7xl space-y-5 sm:space-y-6">
        <div data-admin-reveal className={`${PANEL} overflow-hidden rounded-[34px] p-5 sm:p-7 lg:p-8`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.1),_transparent_22%)]" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
                Command Center
              </div>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Campus Ambassador Admin
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-black tracking-[-0.04em] text-slate-950 sm:text-4xl lg:text-[3.3rem]">
                Manage the full campus ambassador program.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
                Review applications, activate ambassadors, publish weekly missions, moderate proof, and tune the public campus funnel from one professional workspace.
              </p>
            </div>

            <div className={`${SOFT_PANEL} relative max-w-md p-5 sm:p-6`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">Program Health</p>
                  <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{metrics.totalApplications + metrics.totalAmbassadors}</p>
                  <p className="mt-1 text-sm text-slate-600">Managed records across applications and active members.</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-white shadow-[0_18px_36px_-18px_rgba(37,99,235,0.5)]">
                  <LayoutGrid className="h-8 w-8" />
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <QuickPulse label="Pending reviews" value={metrics.pending + metrics.pendingSubmissions} tone="blue" />
                <QuickPulse label="Live missions" value={metrics.activeTasks} tone="green" />
              </div>
            </div>
          </div>

          <div className="relative mt-6 flex flex-col gap-3 border-t border-slate-200/70 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <QuickStat label="Accepted" value={metrics.accepted} />
              <QuickStat label="Shortlisted" value={metrics.shortlisted} />
              <QuickStat label="Content blocks" value={metrics.totalContent} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/admin">
                <Button variant="outline" className="rounded-full border-slate-200 bg-white/90 text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Main Admin
                </Button>
              </Link>
              <Link href="/campus-ambassador">
                <Button className="rounded-full bg-blue-600 text-white shadow-[0_18px_30px_-18px_rgba(37,99,235,0.7)] hover:bg-blue-700">
                  View Public Landing
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div data-admin-reveal className="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <MetricCard title="Applications" value={metrics.totalApplications} hint="All applications received" icon={Users} />
          <MetricCard title="Pending" value={metrics.pending} hint="Waiting for review" icon={ShieldCheck} />
          <MetricCard title="Shortlisted" value={metrics.shortlisted} hint="Ready for next step" icon={LayoutGrid} />
          <MetricCard title="Accepted" value={metrics.accepted} hint="Approved ambassadors" icon={Users} />
          <MetricCard title="Ambassadors" value={metrics.totalAmbassadors} hint="Members in the program" icon={Users} />
          <MetricCard title="Active Tasks" value={metrics.activeTasks} hint="Tasks live right now" icon={Target} />
          <MetricCard title="Pending Proof" value={metrics.pendingSubmissions} hint="Waiting for review" icon={CheckCircle2} />
          <MetricCard title="Content Items" value={metrics.totalContent} hint="Landing-page controlled entries" icon={ImagePlus} />
        </div>

        <div data-admin-reveal className="grid gap-4 lg:grid-cols-3">
          <Card className={PANEL}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analytics</p>
              <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">
                {metrics.totalApplications ? Math.round((metrics.accepted / metrics.totalApplications) * 100) : 0}%
              </p>
              <p className="mt-2 text-sm text-slate-600">Acceptance rate across all campus applications.</p>
            </CardContent>
          </Card>
          <Card className={PANEL}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Proof quality</p>
              <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">
                {metrics.approvedSubmissions + metrics.pendingSubmissions ? Math.round((metrics.approvedSubmissions / (metrics.approvedSubmissions + metrics.pendingSubmissions)) * 100) : 0}%
              </p>
              <p className="mt-2 text-sm text-slate-600">Approved proof rate across reviewed submissions.</p>
            </CardContent>
          </Card>
          <Card className={PANEL}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Active notices</p>
              <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">{metrics.activeAnnouncements}</p>
              <p className="mt-2 text-sm text-slate-600">Announcements currently visible on the ambassador dashboard.</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-4">
          <TabsList data-admin-reveal className="sticky top-3 z-20 h-auto flex-wrap justify-start gap-2 rounded-[24px] border border-slate-200/80 bg-white/85 p-2 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] backdrop-blur-md">
            <TabsTrigger value="applications" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] data-[state=active]:bg-blue-600 data-[state=active]:text-white">Applications</TabsTrigger>
            <TabsTrigger value="ambassadors" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] data-[state=active]:bg-blue-600 data-[state=active]:text-white">Ambassadors</TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] data-[state=active]:bg-blue-600 data-[state=active]:text-white">Tasks</TabsTrigger>
            <TabsTrigger value="proof" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] data-[state=active]:bg-blue-600 data-[state=active]:text-white">Proof Review</TabsTrigger>
            <TabsTrigger value="announcements" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] data-[state=active]:bg-blue-600 data-[state=active]:text-white">Announcements</TabsTrigger>
            <TabsTrigger value="page" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] data-[state=active]:bg-blue-600 data-[state=active]:text-white">Page Settings</TabsTrigger>
            <TabsTrigger value="content" className="rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] data-[state=active]:bg-blue-600 data-[state=active]:text-white">Landing Content</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" data-admin-reveal>
            <Card className={PANEL}>
              <CardHeader>
                <CardTitle>Campus Ambassador Applications</CardTitle>
                <p className="text-sm text-slate-500">Review and update applicant status for the campus ambassador program.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                  <Input placeholder="Search by name, email, college, course" value={applicationSearch} onChange={(event) => setApplicationSearch(event.target.value)} />
                  <Select value={applicationStatusFilter} onValueChange={setApplicationStatusFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="shortlisted">Shortlisted</SelectItem>
                      <SelectItem value="interview_scheduled">Interview scheduled</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {selectedApplicationIds.length} selected
                  </span>
                  <Button size="sm" variant="outline" onClick={() => handleBulkApplicationStatus("shortlisted")}>Bulk shortlist</Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkApplicationStatus("accepted")}>Bulk accept</Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkApplicationStatus("rejected")}>Bulk reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedApplicationIds([])}>Clear</Button>
                </div>
                {filteredApplications.length === 0 ? (
                  <EmptyState>No campus ambassador applications yet.</EmptyState>
                ) : (
                  filteredApplications.map((entry) => (
                    <div key={entry.id} className={ITEM_CARD}>
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1 space-y-4">
                          <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            <input
                              type="checkbox"
                              checked={entry.id ? selectedApplicationIds.includes(entry.id) : false}
                              onChange={(event) =>
                                setSelectedApplicationIds((current) =>
                                  !entry.id
                                    ? current
                                    : event.target.checked
                                      ? [...current, entry.id]
                                      : current.filter((id) => id !== entry.id),
                                )
                              }
                            />
                            Select
                          </label>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words text-sm font-semibold text-slate-900">{entry.fullName}</p>
                            <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-700 capitalize">
                              {entry.status.replaceAll("_", " ")}
                            </Badge>
                          </div>

                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <ReviewStat label="Email" value={entry.email} />
                            <ReviewStat label="Phone" value={entry.phoneNumber} />
                            <ReviewStat label="College" value={entry.collegeName} />
                            <ReviewStat label="Course" value={entry.course} />
                            <ReviewStat label="Graduation Year" value={entry.graduationYear} />
                            <ReviewStat label="Availability" value={entry.availabilityHours} />
                            {entry.city ? <ReviewStat label="City" value={entry.city} /> : null}
                            {entry.societies ? <ReviewStat label="Campus Role / Clubs" value={entry.societies} /> : null}
                            {entry.communityReach ? <ReviewStat label="Community Reach" value={entry.communityReach} /> : null}
                            {entry.instagramHandle ? <ReviewStat label="Instagram" value={entry.instagramHandle} /> : null}
                            {entry.heardFrom ? <ReviewStat label="Heard From" value={entry.heardFrom} /> : null}
                            {entry.source ? <ReviewStat label="Source" value={entry.source} /> : null}
                            {entry.utmSource ? <ReviewStat label="UTM Source" value={entry.utmSource} /> : null}
                            {entry.utmMedium ? <ReviewStat label="UTM Medium" value={entry.utmMedium} /> : null}
                            {entry.utmCampaign ? <ReviewStat label="UTM Campaign" value={entry.utmCampaign} /> : null}
                          </div>

                          {entry.linkedinUrl ? (
                            <div className="rounded-[22px] border border-slate-200 bg-white p-3 shadow-sm">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">LinkedIn</p>
                              <a
                                href={entry.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-2 inline-flex break-all text-sm font-medium text-blue-700 hover:text-blue-800"
                              >
                                {entry.linkedinUrl}
                              </a>
                            </div>
                          ) : null}

                          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Why They Want To Join</p>
                            <p className="mt-2 break-words text-sm leading-6 text-slate-600">{entry.whyJoin}</p>
                          </div>

                          {entry.notes ? (
                            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Internal Notes</p>
                              <p className="mt-2 break-words text-sm leading-6 text-slate-600">{entry.notes}</p>
                            </div>
                          ) : null}
                        </div>
                        <div className="flex w-full flex-col gap-2 xl:w-[220px]">
                          <Select value={entry.status} onValueChange={(value) => handleApplicationStatus(entry, value as CampusAmbassadorApplication["status"])}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="shortlisted">Shortlisted</SelectItem>
                              <SelectItem value="interview_scheduled">Interview scheduled</SelectItem>
                              <SelectItem value="accepted">Accepted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleDeleteApplication(entry)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Application
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ambassadors" data-admin-reveal>
            <Card className={PANEL}>
              <CardHeader>
                <CardTitle>Accepted Ambassadors</CardTitle>
                <p className="text-sm text-slate-500">Every accepted member with code, college, points, and current program status.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-[1fr_240px]">
                  <Input placeholder="Search ambassador, code, email, college" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} />
                  <Select value={memberCollegeFilter} onValueChange={setMemberCollegeFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All colleges</SelectItem>
                      {collegeOptions.map((college) => (
                        <SelectItem key={college} value={college}>
                          {college}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                  <div className="space-y-4">
                    {filteredMembers.length === 0 ? (
                      <EmptyState>No ambassadors have been accepted yet.</EmptyState>
                    ) : (
                      filteredMembers.map((member) => (
                        <div key={member.id || member.email} className={ITEM_CARD}>
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <ReviewStat label="Name" value={member.fullName} />
                              <ReviewStat label="Email" value={member.email} />
                              <ReviewStat label="College" value={member.collegeName} />
                              <ReviewStat label="Ambassador Code" value={member.ambassadorCode} />
                              <ReviewStat label="Course" value={member.course || "Not set"} />
                              <ReviewStat label="Graduation Year" value={member.graduationYear || "Not set"} />
                              <ReviewStat label="Phone" value={member.phoneNumber || "Not set"} />
                              <ReviewStat label="Points" value={String(member.points || 0)} />
                            </div>
                            <div className="flex w-full flex-col gap-2 xl:w-[220px]">
                              <Button size="sm" variant="outline" onClick={() => setSelectedMemberEmail(member.email)}>View Details</Button>
                              <Badge variant="outline" className="w-fit rounded-full border-blue-100 bg-blue-50 text-blue-700 capitalize">
                                {member.status}
                              </Badge>
                              <Select value={member.status} onValueChange={(value) => handleMemberStatus(member, value as CampusAmbassadorMember["status"])}>
                                <SelectTrigger className="bg-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="accepted">Accepted</SelectItem>
                                  <SelectItem value="active">Active</SelectItem>
                                  <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteMember(member)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Ambassador
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="space-y-4">
                  <Card className={`${SOFT_PANEL} border-blue-100/80 shadow-none`}>
                    <CardHeader>
                      <CardTitle>Leaderboard</CardTitle>
                      <p className="text-sm text-slate-500">Top ambassadors ranked by points.</p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {leaderboard.length === 0 ? (
                        <EmptyState>No leaderboard data yet.</EmptyState>
                      ) : (
                        leaderboard.slice(0, 8).map((entry, index) => (
                          <div key={entry.email} className="flex items-center justify-between rounded-[22px] border border-slate-200 bg-white px-4 py-3 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-blue-200">
                            <div>
                              <p className="break-words text-sm font-semibold text-slate-900">
                                #{index + 1} {entry.fullName}
                              </p>
                              <p className="break-words text-xs text-slate-500">{entry.collegeName}</p>
                            </div>
                            <Badge variant="outline" className="border-blue-100 bg-blue-50 text-blue-700">
                              {entry.points || 0} pts
                            </Badge>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                  <Card className={`${PANEL}`}>
                    <CardHeader>
                      <CardTitle>Ambassador Detail</CardTitle>
                      <p className="text-sm text-slate-500">Select an ambassador to inspect and adjust manually.</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {!selectedMember ? (
                        <EmptyState>Select an ambassador from the list to inspect profile details and adjust points.</EmptyState>
                      ) : (
                        <>
                          <div className="grid gap-3 md:grid-cols-2">
                            <ReviewStat label="Full Name" value={selectedMember.fullName} />
                            <ReviewStat label="Email" value={selectedMember.email} />
                            <ReviewStat label="College" value={selectedMember.collegeName} />
                            <ReviewStat label="Code" value={selectedMember.ambassadorCode} />
                            <ReviewStat label="Current Points" value={String(selectedMember.points || 0)} />
                            <ReviewStat label="Status" value={selectedMember.status} />
                          </div>
                          <div className="grid gap-3 md:grid-cols-[1fr_160px]">
                            <Input
                              placeholder="Set points manually"
                              value={manualPoints[selectedMember.email] ?? String(selectedMember.points || 0)}
                              onChange={(event) => setManualPoints((current) => ({ ...current, [selectedMember.email]: event.target.value }))}
                            />
                            <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => handleManualPointUpdate(selectedMember)}>
                              Save Points
                            </Button>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks" data-admin-reveal>
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className={PANEL}>
                <CardHeader>
                  <CardTitle>{editingTaskId ? "Edit Task" : "Create Weekly Task"}</CardTitle>
                  <p className="text-sm text-slate-500">Create the weekly work ambassadors see on their dashboard and submit proof for.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Field label="Task Title">
                    <Input value={taskForm.title} onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))} />
                  </Field>
                  <Field label="Description">
                    <textarea
                      value={taskForm.description}
                      onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
                      className={TEXTAREA_CLASS}
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Points">
                      <Input value={taskForm.points} onChange={(event) => setTaskForm((current) => ({ ...current, points: event.target.value }))} />
                    </Field>
                    <Field label="Due Date">
                      <Input type="date" value={taskForm.dueDate} onChange={(event) => setTaskForm((current) => ({ ...current, dueDate: event.target.value }))} />
                    </Field>
                    <Field label="Audience">
                      <Select value={taskForm.audience} onValueChange={(value) => setTaskForm((current) => ({ ...current, audience: value as CampusAmbassadorTask["audience"] }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All ambassadors</SelectItem>
                          <SelectItem value="college">Specific college</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Task Status">
                      <Select value={taskForm.status} onValueChange={(value) => setTaskForm((current) => ({ ...current, status: value as CampusAmbassadorTask["status"] }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  {taskForm.audience === "college" ? (
                    <Field label="Audience College">
                      <div className="space-y-2">
                        <Input value={taskForm.audienceCollege} onChange={(event) => setTaskForm((current) => ({ ...current, audienceCollege: event.target.value }))} placeholder="Example: DTU" />
                        {collegeOptions.length ? (
                          <div className="flex flex-wrap gap-2">
                            {collegeOptions.slice(0, 8).map((college) => (
                              <Button key={college} type="button" size="sm" variant="outline" onClick={() => setTaskForm((current) => ({ ...current, audienceCollege: college }))}>
                                {college}
                              </Button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </Field>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSaveTask} disabled={savingTask}>
                      {savingTask ? "Saving..." : editingTaskId ? "Update Task" : "Create Task"}
                    </Button>
                    <Button variant="outline" onClick={resetTaskForm}>Reset</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className={PANEL}>
                <CardHeader>
                  <CardTitle>Task Queue</CardTitle>
                  <p className="text-sm text-slate-500">Manage every active, draft, completed, or archived mission from one place.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <Input placeholder="Search task title or description" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} />
                    <Select value={taskStatusFilter} onValueChange={setTaskStatusFilter}>
                      <SelectTrigger className="bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {filteredTasks.length === 0 ? (
                    <EmptyState>No tasks created yet.</EmptyState>
                  ) : (
                    filteredTasks.map((task) => (
                      <div key={task.id} className={ITEM_CARD}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                              <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-700 capitalize">{task.status}</Badge>
                              <Badge variant="outline" className="rounded-full border-emerald-100 bg-emerald-50 text-emerald-700">{task.points} pts</Badge>
                            </div>
                            <p className="text-sm leading-6 text-slate-600">{task.description}</p>
                            <p className="text-xs font-medium text-slate-500">
                              Audience: {task.audience === "college" ? task.audienceCollege || "Specific college" : "All ambassadors"}
                              {task.dueDate ? ` • Due ${task.dueDate}` : ""}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditTask(task)}>Edit</Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleDeleteTask(task.id)}>Delete</Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="proof" data-admin-reveal>
            <Card className={PANEL}>
              <CardHeader>
                <CardTitle>Proof Review</CardTitle>
                <p className="text-sm text-slate-500">Approve or reject ambassador submissions and keep the points system clean.</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Input placeholder="Search by task, ambassador, email, college" value={submissionSearch} onChange={(event) => setSubmissionSearch(event.target.value)} />
                  <Select value={submissionStatusFilter} onValueChange={setSubmissionStatusFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={submissionCollegeFilter} onValueChange={setSubmissionCollegeFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All colleges</SelectItem>
                      {submissionCollegeOptions.map((college) => (
                        <SelectItem key={college} value={college}>{college}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={submissionTaskFilter} onValueChange={setSubmissionTaskFilter}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All tasks</SelectItem>
                      {submissionTaskOptions.map((task) => (
                        <SelectItem key={task} value={task}>{task}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredSubmissions.length === 0 ? (
                  <EmptyState>No proof submissions yet.</EmptyState>
                ) : (
                  filteredSubmissions.map((submission) => (
                    <div key={submission.id} className={ITEM_CARD}>
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-slate-900">{submission.taskTitle}</p>
                            <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-700 capitalize">
                              {submission.status}
                            </Badge>
                            <Badge variant="outline" className="rounded-full border-emerald-100 bg-emerald-50 text-emerald-700">
                              {submission.pointsAwarded} pts
                            </Badge>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <ReviewStat label="Ambassador" value={submission.ambassadorName} />
                            <ReviewStat label="Email" value={submission.ambassadorEmail} />
                            <ReviewStat label="College" value={submission.ambassadorCollege} />
                          </div>
                          {submission.proofText ? (
                            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Proof Summary</p>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{submission.proofText}</p>
                            </div>
                          ) : null}
                          {submission.proofLink ? (
                            <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Proof Link</p>
                              <a href={submission.proofLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex break-all text-sm font-medium text-blue-700 hover:text-blue-800">
                                {submission.proofLink}
                              </a>
                            </div>
                          ) : null}
                          {submission.proofImageUrl ? (
                            <img src={submission.proofImageUrl} alt={submission.taskTitle} className="h-40 w-full rounded-[22px] object-cover shadow-sm xl:max-w-sm" />
                          ) : null}
                          <div className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Review Note</p>
                            <textarea
                              value={reviewNotes[submission.id || ""] ?? submission.reviewNote ?? ""}
                              onChange={(event) => setReviewNotes((current) => ({ ...current, [submission.id || ""]: event.target.value }))}
                              className={`${TEXTAREA_CLASS} mt-2 min-h-[90px]`}
                              placeholder="Add approval or rejection feedback for the ambassador."
                            />
                          </div>
                        </div>
                        <div className="flex w-full flex-col gap-2 xl:w-[220px]">
                          <Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={submission.status === "approved"} onClick={() => handleSubmissionReview(submission, "approved")}>
                            Approve
                          </Button>
                          <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" disabled={submission.status === "rejected"} onClick={() => handleSubmissionReview(submission, "rejected")}>
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="announcements" data-admin-reveal>
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className={PANEL}>
                <CardHeader>
                  <CardTitle>{editingAnnouncementId ? "Edit Announcement" : "Announcement Composer"}</CardTitle>
                  <p className="text-sm text-slate-500">Publish updates directly to the ambassador dashboard and push a polished weekly digest when the program needs a fresh nudge.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[22px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Weekly Mission Digest</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Send the current live missions and active notices to every accepted ambassador in one polished email.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="rounded-full border-blue-100 bg-white text-blue-700">
                        {syncedMembers.filter((member) => member.status === "accepted" || member.status === "active").length} ambassadors
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-blue-100 bg-white text-blue-700">
                        {tasks.filter((task) => task.status === "active").length} live missions
                      </Badge>
                      <Button
                        type="button"
                        onClick={handleSendWeeklyDigest}
                        disabled={isSendingWeeklyDigest}
                        className="rounded-full bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {isSendingWeeklyDigest ? "Sending digest..." : "Send Weekly Digest"}
                      </Button>
                    </div>
                  </div>
                  <Field label="Title">
                    <Input value={announcementForm.title} onChange={(event) => setAnnouncementForm((current) => ({ ...current, title: event.target.value }))} />
                  </Field>
                  <Field label="Message">
                    <textarea value={announcementForm.message} onChange={(event) => setAnnouncementForm((current) => ({ ...current, message: event.target.value }))} className={TEXTAREA_CLASS} />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Tone">
                      <Select value={announcementForm.tone} onValueChange={(value) => setAnnouncementForm((current) => ({ ...current, tone: value as CampusAnnouncement["tone"] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Audience">
                      <Select value={announcementForm.audience} onValueChange={(value) => setAnnouncementForm((current) => ({ ...current, audience: value as CampusAnnouncement["audience"] }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All ambassadors</SelectItem>
                          <SelectItem value="college">Specific college</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  {announcementForm.audience === "college" ? (
                    <Field label="Audience College">
                      <Input value={announcementForm.audienceCollege} onChange={(event) => setAnnouncementForm((current) => ({ ...current, audienceCollege: event.target.value }))} />
                    </Field>
                  ) : null}
                  <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                    <input type="checkbox" checked={announcementForm.isActive} onChange={(event) => setAnnouncementForm((current) => ({ ...current, isActive: event.target.checked }))} />
                    Active and visible on dashboard
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSaveAnnouncement}>
                      {editingAnnouncementId ? "Update Announcement" : "Publish Announcement"}
                    </Button>
                    <Button variant="outline" onClick={resetAnnouncementForm}>Reset</Button>
                  </div>
                </CardContent>
              </Card>
              <Card className={PANEL}>
                <CardHeader>
                  <CardTitle>Live Announcements</CardTitle>
                  <p className="text-sm text-slate-500">Current notice stack shown on the dashboard.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {announcements.length === 0 ? (
                    <EmptyState>No announcements yet.</EmptyState>
                  ) : (
                    announcements.map((announcement) => (
                      <div key={announcement.id} className={ITEM_CARD}>
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                              <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-700">{announcement.tone}</Badge>
                              <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">{announcement.audience === "all" ? "All" : announcement.audienceCollege || "College"}</Badge>
                            </div>
                            <p className="text-sm leading-6 text-slate-600">{announcement.message}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditAnnouncement(announcement)}>Edit</Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleDeleteAnnouncement(announcement)}>Delete</Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="page" data-admin-reveal>
            <Card className={PANEL}>
              <CardHeader>
                <CardTitle>Page Settings</CardTitle>
                <p className="text-sm text-slate-500">Edit the main hero and footer copy used across the campus ambassador landing page.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Hero Eyebrow">
                    <Input value={pageSettings.heroEyebrow || ""} onChange={(event) => setPageSettings((current) => ({ ...current, heroEyebrow: event.target.value }))} />
                  </Field>
                  <Field label="Hero Title">
                    <Input value={pageSettings.heroTitle || ""} onChange={(event) => setPageSettings((current) => ({ ...current, heroTitle: event.target.value }))} />
                  </Field>
                </div>
                <Field label="Hero Description">
                  <textarea
                    value={pageSettings.heroDescription || ""}
                    onChange={(event) => setPageSettings((current) => ({ ...current, heroDescription: event.target.value }))}
                    className="min-h-[110px] w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </Field>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Footer Title">
                    <Input value={pageSettings.footerTitle || ""} onChange={(event) => setPageSettings((current) => ({ ...current, footerTitle: event.target.value }))} />
                  </Field>
                  <Field label="Footer Subtitle">
                    <Input value={pageSettings.footerSubtitle || ""} onChange={(event) => setPageSettings((current) => ({ ...current, footerSubtitle: event.target.value }))} />
                  </Field>
                </div>

                <Field label="Footer Description">
                  <textarea
                    value={pageSettings.footerDescription || ""}
                    onChange={(event) => setPageSettings((current) => ({ ...current, footerDescription: event.target.value }))}
                    className="min-h-[110px] w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                  />
                </Field>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Field label="Footer Tagline">
                    <Input value={pageSettings.footerTagline || ""} onChange={(event) => setPageSettings((current) => ({ ...current, footerTagline: event.target.value }))} />
                  </Field>
                  <Field label="Contact Email">
                    <Input value={pageSettings.contactEmail || ""} onChange={(event) => setPageSettings((current) => ({ ...current, contactEmail: event.target.value }))} />
                  </Field>
                  <Field label="LinkedIn URL">
                    <Input value={pageSettings.linkedinHref || ""} onChange={(event) => setPageSettings((current) => ({ ...current, linkedinHref: event.target.value }))} />
                  </Field>
                  <Field label="Instagram URL">
                    <Input value={pageSettings.instagramHref || ""} onChange={(event) => setPageSettings((current) => ({ ...current, instagramHref: event.target.value }))} />
                  </Field>
                </div>

                <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSavePageSettings} disabled={savingSettings}>
                  {savingSettings ? "Saving..." : "Save Page Settings"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" data-admin-reveal>
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <Card className={PANEL}>
                <CardHeader>
                  <CardTitle>{editingItemId ? `Edit ${contentGuide.title}` : `Create ${contentGuide.title}`}</CardTitle>
                  <p className="text-sm text-slate-500">{contentGuide.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[24px] border border-blue-100 bg-blue-50/60 p-4">
                    <div className="grid gap-4 md:grid-cols-[220px_1fr] md:items-start">
                      <Field label="What are you editing?">
                        <Select value={itemForm.section} onValueChange={(value) => setItemForm((current) => ({ ...current, section: value as CampusSection }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SECTION_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </Field>
                      <div className="rounded-[20px] border border-blue-100 bg-white/90 p-4 text-sm leading-6 text-slate-600">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-700">{contentGuide.title}</p>
                        <p className="mt-2">{contentGuide.description}</p>
                        {contentGuide.imageHint ? <p className="mt-2 text-slate-500">Photo tip: {contentGuide.imageHint}</p> : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Display order">
                      <Input value={itemForm.order} onChange={(event) => setItemForm((current) => ({ ...current, order: event.target.value }))} />
                    </Field>
                    <Field label={contentGuide.titleLabel || "Title"}>
                      <Input value={itemForm.title} onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))} />
                    </Field>
                    {contentGuide.showSubtitle ? (
                      <Field label={contentGuide.subtitleLabel || "Subtitle"}>
                        <Input value={itemForm.subtitle} onChange={(event) => setItemForm((current) => ({ ...current, subtitle: event.target.value }))} />
                      </Field>
                    ) : null}
                    {contentGuide.showBadge ? (
                      <Field label={contentGuide.badgeLabel || "Badge / Tag"}>
                        <Input value={itemForm.badge} onChange={(event) => setItemForm((current) => ({ ...current, badge: event.target.value }))} />
                      </Field>
                    ) : null}
                    {contentGuide.showMetric ? (
                      <Field label={contentGuide.metricLabel || "Metric / Points"}>
                        <Input value={itemForm.metric} onChange={(event) => setItemForm((current) => ({ ...current, metric: event.target.value }))} />
                      </Field>
                    ) : null}
                    {contentGuide.showInitials ? (
                      <Field label="Initials">
                        <Input value={itemForm.initials} onChange={(event) => setItemForm((current) => ({ ...current, initials: event.target.value }))} />
                      </Field>
                    ) : null}
                    {contentGuide.showAccent ? (
                      <Field label="Card Color / Accent">
                        <Input value={itemForm.accent} onChange={(event) => setItemForm((current) => ({ ...current, accent: event.target.value }))} placeholder="from-blue-600 to-cyan-500" />
                      </Field>
                    ) : null}
                  </div>

                  {contentGuide.showDescription ? (
                    <Field label={contentGuide.descriptionLabel || "Description"}>
                      <textarea
                        value={itemForm.description}
                        onChange={(event) => setItemForm((current) => ({ ...current, description: event.target.value }))}
                        className={TEXTAREA_CLASS}
                      />
                    </Field>
                  ) : null}

                  {contentGuide.showImage ? (
                    <>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <Field label="Image Alt Text">
                          <Input value={itemForm.imageAlt} onChange={(event) => setItemForm((current) => ({ ...current, imageAlt: event.target.value }))} />
                        </Field>
                        <Field label="Image URL">
                          <Input value={itemForm.imageUrl} onChange={(event) => setItemForm((current) => ({ ...current, imageUrl: event.target.value }))} />
                        </Field>
                      </div>

                      {itemForm.section === "campus_moment" ? (
                        <Field label="More Image URLs (one per line)">
                          <textarea
                            value={itemForm.galleryImageUrlsText}
                            onChange={(event) => setItemForm((current) => ({ ...current, galleryImageUrlsText: event.target.value }))}
                            className={TEXTAREA_CLASS}
                            placeholder={"https://.../event-1.jpg\nhttps://.../event-2.jpg\nhttps://.../event-3.jpg"}
                          />
                        </Field>
                      ) : null}

                      <Field label="Upload / Replace Photo">
                        <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                          <FirebaseFileUpload
                            label={itemForm.section === "campus_moment" ? "Upload image to gallery" : "Landing page image"}
                            description={
                              itemForm.section === "campus_moment"
                                ? "First upload becomes the main image. Every next upload is added to the same card gallery."
                                : contentGuide.imageHint || "Upload a landing page image."
                            }
                            acceptedTypes=".jpg,.jpeg,.png,.gif"
                            maxSizeMB={8}
                            currentFile={itemForm.imageUrl}
                            storageOverride={campusStorage}
                            authOverride={campusAuth}
                            pathPrefix="campus-ambassador"
                            allowBase64Fallback={false}
                            onUploadError={(message) =>
                              toast({
                                title: "Image upload failed",
                                description: message,
                                variant: "destructive",
                              })
                            }
                            onFileUploaded={(fileUrl) =>
                              setItemForm((current) => {
                                const nextGallery = current.section === "campus_moment"
                                  ? [current.galleryImageUrlsText, fileUrl].filter(Boolean).join("\n")
                                  : current.galleryImageUrlsText;

                                return {
                                  ...current,
                                  imageUrl: current.imageUrl || fileUrl,
                                  galleryImageUrlsText: nextGallery,
                                };
                              })
                            }
                          />
                          {itemForm.imageUrl ? (
                            <div className="mt-3 flex flex-wrap gap-3">
                              <img src={itemForm.imageUrl} alt={itemForm.imageAlt || itemForm.title || "Campus content"} className="h-20 w-20 rounded-[20px] object-cover" />
                              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => setItemForm((current) => ({ ...current, imageUrl: "", imageAlt: "" }))}>
                                Remove Photo
                              </Button>
                            </div>
                          ) : null}
                          {itemForm.section === "campus_moment" && itemForm.galleryImageUrlsText.trim() ? (
                            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              {itemForm.galleryImageUrlsText
                                .split("\n")
                                .map((value) => value.trim())
                                .filter(Boolean)
                                .map((url, index) => (
                                  <div key={`${url}-${index}`} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white p-2">
                                    <img src={url} alt={`Campus moment ${index + 1}`} className="h-24 w-full rounded-[14px] object-cover" />
                                    <Button
                                      variant="ghost"
                                      className="mt-2 h-auto p-0 text-xs font-semibold text-red-600 hover:bg-transparent hover:text-red-700"
                                      onClick={() =>
                                        setItemForm((current) => ({
                                          ...current,
                                          galleryImageUrlsText: current.galleryImageUrlsText
                                            .split("\n")
                                            .map((value) => value.trim())
                                            .filter(Boolean)
                                            .filter((_, currentIndex) => currentIndex !== index)
                                            .join("\n"),
                                        }))
                                      }
                                    >
                                      Remove image
                                    </Button>
                                  </div>
                                ))}
                            </div>
                          ) : null}
                        </div>
                      </Field>
                    </>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={handleSaveContentItem} disabled={savingContent}>
                      {savingContent ? "Saving..." : editingItemId ? "Update Content" : "Create Content"}
                    </Button>
                    <Button variant="outline" onClick={resetItemForm}>
                      Reset
                    </Button>
                  </div>

                  <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Preview before publish</p>
                    <div className="mt-4 rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm">
                      {itemForm.section === "campus_moment" ? (
                        <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#eef5ff_0%,#ffffff_65%,#eef9f2_100%)]">
                          <div className="grid gap-0 lg:grid-cols-[1.12fr_0.88fr]">
                            <div className="relative min-h-[220px] overflow-hidden border-b border-slate-200 lg:border-b-0 lg:border-r">
                              {itemForm.imageUrl ? (
                                <img src={itemForm.imageUrl} alt={itemForm.imageAlt || itemForm.title || "Preview"} className="h-full w-full object-cover" />
                              ) : (
                                <>
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(223,251,87,0.18),transparent_28%),linear-gradient(135deg,#eff5ff_0%,#ffffff_55%,#eef8f3_100%)]" />
                                  <div className="absolute inset-6 rounded-[24px] border border-white/80 bg-white/70" />
                                </>
                              )}
                              <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-700 shadow-sm">
                                Big photo card
                              </div>
                              <div className="absolute bottom-4 left-4 flex gap-2 overflow-hidden rounded-full bg-white/88 px-3 py-2 shadow-sm">
                                {[itemForm.imageUrl, ...itemForm.galleryImageUrlsText.split("\n").map((value) => value.trim()).filter(Boolean)]
                                  .filter(Boolean)
                                  .slice(0, 3)
                                  .map((url, index) => (
                                    <div key={`${url}-${index}`} className="h-10 w-14 overflow-hidden rounded-2xl border border-white/60">
                                      <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                                    </div>
                                  ))}
                              </div>
                            </div>
                            <div className="p-5">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Campus moment</p>
                              <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-slate-950">{itemForm.title || "Preview title"}</p>
                              <p className="mt-3 text-sm leading-7 text-slate-600">{itemForm.description || "Description preview will appear here."}</p>
                              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                                {Math.max(
                                  [itemForm.imageUrl, ...itemForm.galleryImageUrlsText.split("\n").map((value) => value.trim()).filter(Boolean)].filter(Boolean).length,
                                  0,
                                )} image{Math.max(
                                  [itemForm.imageUrl, ...itemForm.galleryImageUrlsText.split("\n").map((value) => value.trim()).filter(Boolean)].filter(Boolean).length,
                                  0,
                                ) === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          {itemForm.imageUrl ? (
                            <img src={itemForm.imageUrl} alt={itemForm.imageAlt || itemForm.title || "Preview"} className="h-16 w-16 rounded-[18px] object-cover" />
                          ) : (
                            <div className={`flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br ${itemForm.accent || "from-blue-600 to-cyan-500"} text-lg font-black text-white`}>
                              {(itemForm.initials || itemForm.title.slice(0, 2) || "RM").toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{itemForm.title || "Preview title"}</p>
                              <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-700">{itemForm.section}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{itemForm.subtitle || itemForm.badge || "Preview subtitle"}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">{itemForm.description || "Description preview will appear here."}</p>
                            {itemForm.section === "campus_moment" && itemForm.galleryImageUrlsText.trim() ? (
                              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                                {itemForm.galleryImageUrlsText.split("\n").map((value) => value.trim()).filter(Boolean).length} gallery images added
                              </p>
                            ) : null}
                          </div>
                        </div>
                      )}
                      </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={PANEL}>
                <CardHeader>
                  <CardTitle>Live Landing Content</CardTitle>
                  <p className="text-sm text-slate-500">Every item here is editable and can be deleted, reordered, or updated with text and images.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {showcaseItems.length === 0 ? (
                    <EmptyState>No landing content items yet.</EmptyState>
                  ) : (
                    showcaseItems.map((item) => (
                      <div key={item.id} className={ITEM_CARD}>
                        <div className="flex flex-col gap-3 lg:justify-between">
                          {item.section === "campus_moment" ? (
                            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,#eef5ff_0%,#ffffff_65%,#eef9f2_100%)]">
                              <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
                                <div className="relative min-h-[180px] overflow-hidden border-b border-slate-200 lg:border-b-0 lg:border-r">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.imageAlt || item.title} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className={`absolute inset-0 bg-gradient-to-br ${item.accent || "from-blue-600/15 to-cyan-500/10"}`} />
                                  )}
                                  <div className="absolute left-4 top-4 flex gap-2">
                                    <Badge variant="outline" className="rounded-full border-white/60 bg-white/90 text-blue-700">
                                      Big Photo Card
                                    </Badge>
                                    <Badge variant="outline" className="rounded-full border-white/60 bg-[#071b2c]/78 text-white">
                                      {item.galleryImageUrls?.length ? item.galleryImageUrls.length + 1 : item.imageUrl ? 1 : 0} images
                                    </Badge>
                                  </div>
                                </div>
                                <div className="p-5">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                    <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-700">
                                      {item.section}
                                    </Badge>
                                    <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">
                                      order {item.order}
                                    </Badge>
                                  </div>
                                  <p className="mt-2 text-sm text-slate-600">{item.description || "No description"}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-3">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.imageAlt || item.title} className="h-16 w-16 rounded-[18px] object-cover" />
                              ) : (
                                <div className={`flex h-16 w-16 items-center justify-center rounded-[18px] bg-gradient-to-br ${item.accent || "from-blue-600 to-cyan-500"} text-lg font-black text-white shadow-[0_20px_35px_-20px_rgba(37,99,235,0.55)]`}>
                                  {(item.initials || item.title.slice(0, 2)).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                                  <Badge variant="outline" className="rounded-full border-blue-100 bg-blue-50 text-blue-700">
                                    {item.section}
                                  </Badge>
                                  <Badge variant="outline" className="rounded-full border-slate-200 bg-white text-slate-700">
                                    order {item.order}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-xs text-slate-500">{item.subtitle || item.badge || "No subtitle"}</p>
                                <p className="mt-2 text-sm text-slate-600">{item.description || "No description"}</p>
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEditContentItem(item)}>
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleDeleteContentItem(item.id)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
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
  icon: typeof Users;
}) {
  return (
    <Card className={PANEL}>
      <CardContent className="flex items-start justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{title}</p>
          <p className="mt-2.5 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-[2rem]">{value}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">{hint}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br from-blue-600 to-cyan-400 text-white shadow-[0_18px_35px_-20px_rgba(37,99,235,0.65)]">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-700">{label}</p>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-dashed border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-cyan-50/70 p-6 text-sm text-slate-600">
      {children}
    </div>
  );
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[20px] border border-slate-200 bg-white p-3 shadow-sm transition duration-300 group-hover:border-blue-200">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 break-words break-all text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function QuickPulse({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone: "blue" | "green";
}) {
  const toneClass =
    tone === "green"
      ? "border-emerald-100 bg-emerald-50 text-emerald-700"
      : "border-blue-100 bg-blue-50 text-blue-700";

  return (
    <div className={`rounded-[20px] border px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950">{value}</p>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
      <span className="font-semibold text-slate-950">{value}</span> {label}
    </div>
  );
}

function AdminShellStyles() {
  return (
    <style>{`
      [data-admin-reveal] {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
        transition: opacity 700ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      [data-admin-reveal].is-visible {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      .admin-panel::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        background: transparent;
        opacity: 0;
        transition: opacity 300ms ease;
      }

      .admin-panel:hover::before {
        opacity: 0;
      }

      .admin-panel:hover,
      .admin-panel:hover > *,
      .admin-panel:hover [class*="bg-white/"],
      .admin-panel:hover [class*="bg-slate-50"],
      .admin-panel:hover [class*="bg-blue-50"] {
        opacity: 1;
      }
    `}</style>
  );
}
