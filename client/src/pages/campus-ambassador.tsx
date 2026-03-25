import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  CheckCircle2,
  Crown,
  GraduationCap,
  Megaphone,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  getCampusAmbassadorPageSettings,
  getCampusAmbassadorShowcaseItems,
  type CampusAmbassadorPageSettings,
  type CampusAmbassadorShowcaseItem,
} from "../lib/campus-firestore";

const defaultPillars = [
  {
    icon: Zap,
    title: "Learn",
    description: "Get hands-on experience in growth, storytelling, and community building.",
    accent: "from-[#dffb57] to-[#8fe357]",
  },
  {
    icon: Target,
    title: "Drive action",
    description: "Help students discover ReferralMe and take career steps that actually matter.",
    accent: "from-[#d8e5ff] to-[#90b4ff]",
  },
  {
    icon: Users,
    title: "Build network",
    description: "Become the visible connector between your campus and the ReferralMe team.",
    accent: "from-[#ffe2c9] to-[#ffb07a]",
  },
  {
    icon: Trophy,
    title: "Get recognized",
    description: "Earn certificates, rewards, campus visibility, and top-performer status.",
    accent: "from-[#f7d6ff] to-[#d791ff]",
  },
];

const defaultHighlights = [
  {
    name: "Aarav Sharma",
    college: "DTU",
    title: "Top Performer",
    accent: "from-[#1e3a8a] to-[#60a5fa]",
    initials: "AS",
  },
  {
    name: "Riya Mehta",
    college: "NMIMS",
    title: "Campus Lead",
    accent: "from-[#1d4ed8] to-[#7fb1ff]",
    initials: "RM",
  },
  {
    name: "Pranav Kulkarni",
    college: "VIT",
    title: "Growth Ambassador",
    accent: "from-[#0f766e] to-[#6fd7c8]",
    initials: "PK",
  },
];

const defaultLeaderboard = [
  { rank: "01", name: "Aarav Sharma", college: "DTU", points: "1,280 pts", badge: "Top Performer", accent: "from-[#1e3a8a] to-[#60a5fa]" },
  { rank: "02", name: "Riya Mehta", college: "NMIMS", points: "1,140 pts", badge: "Campus Lead", accent: "from-[#1d4ed8] to-[#7fb1ff]" },
  { rank: "03", name: "Sana Khan", college: "SRCC", points: "980 pts", badge: "Growth Star", accent: "from-[#ff824d] to-[#ffc48f]" },
];

const defaultMissions = [
  { title: "Grow reach", meta: "Bring ReferralMe into the right student circles." },
  { title: "Run campaigns", meta: "Activate clubs, groups, and campus communities." },
  { title: "Submit proof", meta: "Track work, earn points, and build visibility." },
];

const defaultGallery = [
  {
    title: "ReferralMe campus rewards",
    accent: "from-[#e2ebff] to-[#ffffff]",
  },
  {
    title: "ReferralMe ambassador tee",
    accent: "from-[#dfe9ff] to-[#ffffff]",
  },
  {
    title: "Recognition certificate",
    accent: "from-[#fff0df] to-[#ffffff]",
  },
  {
    title: "Program identity preview",
    accent: "from-[#eef4ff] to-[#ffffff]",
  },
];

const defaultMoments = [
  {
    title: "Promote ReferralMe",
    description: "Position ReferralMe across clubs, groups, and student circles.",
    tone: "from-[#dfe7ff] to-[#ffffff]",
    imageUrls: [],
  },
  {
    title: "Create campus energy",
    description: "Drive awareness, conversations, and student signups.",
    tone: "from-[#fff0df] to-[#ffffff]",
    imageUrls: [],
  },
  {
    title: "Build weekly momentum",
    description: "Complete tasks, submit proof, and stack wins each week.",
    tone: "from-[#e2f7ef] to-[#ffffff]",
    imageUrls: [],
  },
];

const campusMomentIcons = [Megaphone, Users, Zap];
const galleryIcons = [Sparkles, GraduationCap, Trophy, Star];
const campusMomentThemes = [
  {
    label: "Outreach",
    caption: "Campus visibility",
  },
  {
    label: "Community",
    caption: "Student buzz",
  },
  {
    label: "Momentum",
    caption: "Weekly momentum",
  },
];

const galleryThemes = [
  {
    label: "Outreach",
    lines: ["Activation playbook", "Student circles and campus reach"],
  },
  {
    label: "Campus community",
    lines: ["Student-led buzz", "Events, groups, and peer momentum"],
  },
  {
    label: "Leaderboard momentum",
    lines: ["Progress that compounds", "Weekly wins and visible ranking"],
  },
  {
    label: "Ambassador recognition",
    lines: ["Status and identity", "Rewards that make effort visible"],
  },
];

const defaultRewardTiers = [
  { tier: "Starter", points: "100+", reward: "Certificate and first ReferralMe spotlight", imageUrl: "/reward-certificate.png" },
  { tier: "Builder", points: "250+", reward: "ReferralMe swag and stronger recognition", imageUrl: "/reward-shirt.png" },
  { tier: "Elite", points: "500+", reward: "Featured ambassador status and founder visibility", imageUrl: "/reward-kit.png" },
];

const defaultTimeline = [
  { step: "01", title: "Applications", description: "Students apply through the campus ambassador page." },
  { step: "02", title: "Shortlist", description: "ReferralMe reviews applications and selects the strongest profiles." },
  { step: "03", title: "Onboarding", description: "Selected ambassadors receive orientation, systems, and weekly tasks." },
  { step: "04", title: "Execution", description: "Ambassadors run missions, submit proof, earn points, and climb the board." },
];

const defaultProgramPoints = [
  "Up to 2 ambassadors selected per college during the pilot",
  "Promote ReferralMe across campus and student communities",
  "Join structured online and offline growth campaigns",
  "Submit proof so work is tracked and rewarded fairly",
];

const defaultBenefits = [
  "Marketing, branding, and leadership experience",
  "Professional network growth and team exposure",
  "Certificates, recognition, and profile-building wins",
  "Performance-based rewards, swag, and visible credit",
];

const defaultFaqs = [
  {
    question: "Who can apply?",
    answer: "Any active student who can build visibility inside their campus community and commit a few focused hours each week.",
  },
  {
    question: "How many ambassadors will you select per college?",
    answer: "For the pilot, we plan to select up to 2 ambassadors per college so the system stays focused and manageable.",
  },
  {
    question: "What will ambassadors actually do?",
    answer: "Promote ReferralMe, grow campus awareness, engage students, participate in campaigns, and complete assigned weekly tasks.",
  },
  {
    question: "How are rewards handled?",
    answer: "Points are tied to verified weekly work and proof submissions. Stronger performance unlocks more visibility and better rewards.",
  },
];

const defaultTestimonials = [
  {
    quote: "This should feel like a real student movement, not just another share-and-forget internship.",
    author: "Student feedback",
  },
  {
    quote: "If there is structure, recognition, and visible progress, ambassadors will actually take it seriously.",
    author: "Early growth insight",
  },
];

export default function CampusAmbassadorLanding() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showcaseItems, setShowcaseItems] = useState<CampusAmbassadorShowcaseItem[]>([]);
  const [pageSettings, setPageSettings] = useState<CampusAmbassadorPageSettings | null>(null);
  const [activeMomentImageIndices, setActiveMomentImageIndices] = useState<Record<number, number>>({});
  const [hoveredMomentIndex, setHoveredMomentIndex] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoaded(true), 80);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCampusAmbassadorShowcaseItems(), getCampusAmbassadorPageSettings()]).then(([items, settings]) => {
      if (cancelled) return;
      setShowcaseItems(items.filter((item) => item.isActive !== false));
      setPageSettings(settings);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: "0px 0px -8% 0px" },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [showcaseItems, pageSettings]);

  const getSectionItems = (section: CampusAmbassadorShowcaseItem["section"]) =>
    showcaseItems.filter((item) => item.section === section).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));

  const pageHighlights = useMemo(() => {
    const items = getSectionItems("highlight");
    return items.length
      ? items.map((item) => ({
          name: item.title,
          college: item.subtitle || "ReferralMe Campus",
          title: item.badge || "Campus Ambassador",
          accent: item.accent || "from-[#1e3a8a] to-[#60a5fa]",
          initials: item.initials || item.title.slice(0, 2).toUpperCase(),
          imageUrl: item.imageUrl,
          imageAlt: item.imageAlt || item.title,
        }))
      : defaultHighlights;
  }, [showcaseItems]);

  const pageLeaderboard = useMemo(() => {
    const items = getSectionItems("leaderboard");
    return items.length
      ? items.map((item, index) => ({
          rank: String(index + 1).padStart(2, "0"),
          name: item.title,
          college: item.subtitle || "ReferralMe Campus",
          points: item.metric || "Top score",
          badge: item.badge || "Top Performer",
          accent: item.accent || "from-[#1d4ed8] to-[#7fb1ff]",
        }))
      : defaultLeaderboard;
  }, [showcaseItems]);

  const pageGalleryMoments = useMemo(() => {
    const items = getSectionItems("gallery");
    return items.length
      ? items.map((item, index) => ({
          title: item.title,
          imageUrl: item.imageUrl,
          imageAlt: item.imageAlt || item.title,
          accent: item.accent || (index % 2 === 0 ? "from-[#e2ebff] to-[#ffffff]" : "from-[#fff0df] to-[#ffffff]"),
        }))
      : defaultGallery;
  }, [showcaseItems]);

  const pagePillars = useMemo(() => {
    const items = getSectionItems("pillar");
    const icons = [Zap, Target, Users, Trophy];
    return items.length
      ? items.map((item, index) => ({
          icon: icons[index % icons.length],
          title: item.title,
          description: item.description || item.subtitle || "",
          accent: item.accent || "from-[#dfe7ff] to-[#ffffff]",
        }))
      : defaultPillars;
  }, [showcaseItems]);

  const pageMissions = useMemo(() => {
    const items = getSectionItems("mission");
    return items.length
      ? items.map((item) => ({
          title: item.title,
          meta: item.description || item.subtitle || "",
        }))
      : defaultMissions;
  }, [showcaseItems]);

  const pageCampusMoments = useMemo(() => {
    const items = getSectionItems("campus_moment");
    const source = items.length ? [items[0]] : [defaultMoments[0]];
    return source.map((item) => ({
      title: item.title,
      description: item.description || item.subtitle || "",
      tone: item.accent || "from-[#dfe7ff] to-[#ffffff]",
      imageUrls: [item.imageUrl, ...(item.galleryImageUrls || [])].filter((value): value is string => Boolean(value)),
    }));
  }, [showcaseItems]);

  const setMomentImageIndex = (cardIndex: number, imageIndex: number, imageCount: number) => {
    setActiveMomentImageIndices((current) => ({
      ...current,
      [cardIndex]: (imageIndex + imageCount) % imageCount,
    }));
  };

  useEffect(() => {
    const autoPlayIndex = hoveredMomentIndex ?? 0;
    const moment = pageCampusMoments[autoPlayIndex];
    if (!moment?.imageUrls || moment.imageUrls.length <= 1) return;

    const interval = window.setInterval(() => {
      setActiveMomentImageIndices((current) => {
        const currentIndex = current[autoPlayIndex] ?? 0;
        return {
          ...current,
          [autoPlayIndex]: (currentIndex + 1) % moment.imageUrls!.length,
        };
      });
    }, hoveredMomentIndex !== null ? 1600 : 3200);

    return () => window.clearInterval(interval);
  }, [hoveredMomentIndex, pageCampusMoments]);

  const pageProgramPoints = useMemo(() => {
    const items = getSectionItems("program_point");
    return items.length ? items.map((item) => item.title) : defaultProgramPoints;
  }, [showcaseItems]);

  const pageBenefits = useMemo(() => {
    const items = getSectionItems("benefit");
    return items.length ? items.map((item) => item.title) : defaultBenefits;
  }, [showcaseItems]);

  const tickerItems = useMemo(() => {
    const missionItems = pageMissions
      .map((item) => [item.title, item.meta].filter(Boolean).join(" • "))
      .filter(Boolean);

    if (missionItems.length > 0) return missionItems;

    const pointItems = pageProgramPoints.filter(Boolean);
    return pointItems.length > 0 ? pointItems : ["Campus visibility", "Weekly missions", "Proof-driven recognition"];
  }, [pageMissions, pageProgramPoints]);

  const pageRewardTiers = useMemo(() => {
    const items = getSectionItems("reward_tier");
    return items.length
      ? items.map((item) => ({
          tier: item.title,
          points: item.metric || item.badge || "Points",
          reward: item.description || item.subtitle || "",
          imageUrl: item.imageUrl,
        }))
      : defaultRewardTiers;
  }, [showcaseItems]);

  const pageTimeline = useMemo(() => {
    const items = getSectionItems("timeline");
    return items.length
      ? items.map((item, index) => ({
          step: item.metric || String(index + 1).padStart(2, "0"),
          title: item.title,
          description: item.description || item.subtitle || "",
        }))
      : defaultTimeline;
  }, [showcaseItems]);

  const pageFaqs = useMemo(() => {
    const items = getSectionItems("faq");
    return items.length
      ? items.map((item) => ({
          question: item.title,
          answer: item.description || item.subtitle || "",
        }))
      : defaultFaqs;
  }, [showcaseItems]);

  const pageTestimonials = useMemo(() => {
    const items = getSectionItems("testimonial");
    return items.length
      ? items.map((item) => ({
          quote: item.description || item.subtitle || item.title,
          author: item.title,
        }))
      : defaultTestimonials;
  }, [showcaseItems]);

  const pageHeroStats = useMemo(() => {
    const items = getSectionItems("hero_stat");
    return items.length
      ? items.map((item) => ({
          label: item.title,
          value: item.metric || item.subtitle || "",
          sublabel: item.description || item.badge || "",
        }))
      : [
          { label: "Pilot", value: "2 reps", sublabel: "per college" },
          { label: "Loop", value: "Tasks + proof", sublabel: "every week" },
          { label: "Reward", value: "Swag + visibility", sublabel: "for execution" },
        ];
  }, [showcaseItems]);

  const pageInfoRows = useMemo(() => {
    const items = getSectionItems("info_row");
    return items.length
      ? items.map((item) => ({
          title: item.title,
          description: item.description || item.subtitle || "",
        }))
      : [
          { title: "Best fit", description: "Students active in communities, clubs, placements, or campus circles." },
          { title: "Time commitment", description: "A few focused hours every week with clear tasks and visible outcomes." },
          { title: "What counts", description: "Consistency, initiative, proof of work, and actual campus reach." },
        ];
  }, [showcaseItems]);

  const heroEyebrow = pageSettings?.heroEyebrow || "ReferralMe Campus Ecosystem";
  const heroTitle = pageSettings?.heroTitle || "Be the face of career culture on your campus.";
  const heroDescription =
    pageSettings?.heroDescription ||
    "Build hype, bring students into ReferralMe, and create visible campus momentum around careers, resumes, opportunity, and community.";
  const footerTitle = pageSettings?.footerTitle || "ReferralMe Campus Ambassador";
  const footerSubtitle =
    pageSettings?.footerSubtitle || "A structured campus system for visibility, growth, and recognition.";
  const footerDescription =
    pageSettings?.footerDescription ||
    "ReferralMe is building an ambassador program around weekly execution, real accountability, and student energy that actually compounds.";
  const footerTagline = pageSettings?.footerTagline || "Built with ❤️ in India by ReferralMe";

  return (
    <div className="min-h-screen bg-[#f8fbff] text-[#0a2222]">
      <style>{`
        @keyframes campusFloatIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes campusTicker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .campus-grid {
          background-image:
            linear-gradient(rgba(10, 34, 34, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(10, 34, 34, 0.08) 1px, transparent 1px);
          background-size: 36px 36px;
        }
        .campus-float-in {
          animation: campusFloatIn 0.75s cubic-bezier(.19,1,.22,1) forwards;
        }
        .campus-ticker {
          width: max-content;
          animation: campusTicker 26s linear infinite;
        }
        .campus-ticker:hover {
          animation-play-state: paused;
        }
        @keyframes campusCardGlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        .campus-card {
          transition:
            transform .45s cubic-bezier(.19,1,.22,1),
            box-shadow .45s cubic-bezier(.19,1,.22,1),
            border-color .3s ease,
            background-color .3s ease;
        }
        .campus-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 60px rgba(29, 78, 216, 0.10);
          border-color: rgba(29, 78, 216, 0.18);
        }
        .campus-card-soft:hover {
          animation: campusCardGlow 2.8s ease-in-out infinite;
        }
        .reveal-on-scroll {
          opacity: 0;
          transform: translate3d(0, 26px, 0);
          transition:
            opacity .85s cubic-bezier(.19,1,.22,1),
            transform .85s cubic-bezier(.19,1,.22,1);
          will-change: opacity, transform;
        }
        .reveal-on-scroll.is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        .campus-link {
          color: #1d4ed8;
          transition: color .25s ease;
        }
        .campus-link:hover {
          color: #1e40af;
        }
      `}</style>

      <header className="sticky top-0 z-30 border-b border-[#0a2222]/10 bg-[#f8fbff]/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="ReferralMe" className="h-10 w-10 rounded-2xl border border-[#0a2222]/10 bg-white p-1" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">ReferralMe</p>
              <p className="text-lg font-black tracking-[-0.02em] text-slate-950">Campus Ambassador</p>
            </div>
          </a>
          <div className="flex items-center gap-2 lg:hidden">
            <a href="/campus-ambassador/dashboard">
              <Button variant="outline" className="rounded-full border-[#0a2222]/12 bg-white/80 px-4 text-[#0a2222] hover:bg-white">
                Sign In
              </Button>
            </a>
            <a href="/campus-ambassador/apply">
              <Button className="rounded-full bg-[#1d4ed8] px-4 text-white hover:bg-[#1e40af]">Apply</Button>
            </a>
          </div>
          <div className="hidden items-center gap-6 lg:flex">
            <a href="#program" className="campus-link text-sm font-semibold">Program</a>
            <a href="#recognition" className="campus-link text-sm font-semibold">Recognition</a>
            <a href="#faq" className="campus-link text-sm font-semibold">FAQ</a>
            <a href="/campus-ambassador/dashboard" className="campus-link text-sm font-semibold">Sign In</a>
            <a href="/campus-ambassador/apply">
              <Button className="rounded-full bg-[#1d4ed8] px-6 text-white hover:bg-[#1e40af]">Apply Now</Button>
            </a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#0a2222]/10">
        <div className="absolute inset-0 campus-grid opacity-35" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(223,251,87,0.24),_transparent_24%),radial-gradient(circle_at_80%_18%,_rgba(160,189,255,0.34),_transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.82),rgba(255,255,255,0.15))]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-24">
          <div className={isLoaded ? "campus-float-in" : "opacity-0"}>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0a2222]/10 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#1d4ed8] shadow-sm">
              <GraduationCap className="h-3.5 w-3.5" />
              {heroEyebrow}
            </div>

            <h1 className="mt-6 max-w-5xl text-5xl font-normal leading-[0.94] tracking-[-0.06em] text-slate-950 sm:text-7xl lg:text-[6.4rem]">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#0a2222]/70 sm:text-lg">
              {heroDescription}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/campus-ambassador/apply">
                <Button size="lg" className="w-full rounded-full bg-[#1d4ed8] px-7 text-white hover:bg-[#1e40af] sm:w-auto">
                  Apply to Join
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <a href="/campus-ambassador/dashboard">
                <Button size="lg" variant="outline" className="w-full rounded-full border-[#0a2222]/15 bg-white/70 px-7 text-[#0a2222] hover:bg-white sm:w-auto">
                  Sign In
                </Button>
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {pageHeroStats.map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-[28px] border border-[#0a2222]/10 bg-white/78 p-5 shadow-[0_20px_50px_rgba(10,34,34,0.06)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/55">{item.label}</p>
                  <p className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950">{item.value}</p>
                  <p className="mt-2 text-sm text-[#0a2222]/62">{item.sublabel}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={isLoaded ? "campus-float-in" : "opacity-0"} style={{ animationDelay: "120ms" }}>
            <div className="overflow-hidden rounded-[34px] border border-[#0a2222]/10 bg-white/78 shadow-[0_30px_90px_rgba(10,34,34,0.08)]">
              <div className="border-b border-[#0a2222]/10 p-7 lg:p-8">
                <div className="flex items-center justify-between gap-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#0a2222]/10 bg-[#f3f8ff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
                    <Sparkles className="h-3.5 w-3.5" />
                    Program frame
                  </div>
                  <span className="rounded-full bg-[#dffb57] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950">
                    Live pilot
                  </span>
                </div>
                <h2 className="mt-5 text-3xl font-normal leading-[1] tracking-[-0.045em] text-slate-950 sm:text-[2.8rem]">
                  A student growth engine, not a poster-sharing internship.
                </h2>
                <p className="mt-4 text-sm leading-8 text-[#0a2222]/68">
                  Selected ambassadors lead visibility for ReferralMe on their campus through structured execution, weekly missions, and visible recognition.
                </p>
              </div>
              <div className="grid gap-0 lg:grid-cols-[1fr_0.92fr]">
                <div className="border-b border-[#0a2222]/10 p-6 lg:border-b-0 lg:border-r lg:p-8">
                <div className="grid gap-3">
                    {pageProgramPoints.map((point) => (
                      <div key={point} className="campus-card flex items-start gap-3 rounded-[24px] border border-[#0a2222]/10 bg-[#fbfaf6] px-4 py-4">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#1d4ed8]" />
                        <p className="text-sm leading-6 text-[#0a2222]/72">{point}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[linear-gradient(180deg,#f6faff_0%,#eef4ff_100%)] p-6 lg:p-8">
                  <div className="grid gap-3">
                    {pageMissions.map((mission, index) => (
                      <div key={mission.title} className="campus-card rounded-[24px] border border-[#0a2222]/10 bg-white/75 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-lg font-semibold tracking-[-0.015em] text-[#0a2222]">{mission.title}</p>
                            <p className="mt-2 text-sm leading-6 text-[#0a2222]/65">{mission.meta}</p>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0a2222]/45">
                            0{index + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-b border-[#0a2222]/10 bg-white/55 py-4">
        <div className="campus-ticker flex gap-4">
          {[...tickerItems, ...tickerItems].map((item, index) => (
            <div key={`${item}-${index}`} className="w-[280px] shrink-0 rounded-full border border-[#0a2222]/10 bg-white/85 px-4 py-3 text-[13px] font-semibold text-[#0a2222]/72 shadow-sm sm:w-[340px] sm:px-5 sm:text-sm">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section id="program" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="reveal-on-scroll lg:sticky lg:top-28 lg:self-start">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a2222]/50">Program direction</p>
            <h2 className="mt-4 text-4xl font-normal leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Built to feel premium, visible, and worth doing.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#0a2222]/68">
              The campus program should feel closer to a movement with structure: clear missions, stronger recognition, cleaner presentation, and visible proof that work compounds.
            </p>
            <div className="mt-8 space-y-3">
              {pageInfoRows.map((row) => (
                <div key={row.title} className="rounded-[26px] border border-[#0a2222]/10 bg-white/78 px-5 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">{row.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[#0a2222]/68">{row.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              {pagePillars.map((pillar) => (
                <div key={pillar.title} className="reveal-on-scroll campus-card rounded-[30px] border border-[#0a2222]/10 bg-white/82 p-5 sm:p-6 shadow-[0_20px_50px_rgba(10,34,34,0.05)]">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br ${pillar.accent} text-[#0a2222]`}>
                    <pillar.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{pillar.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#0a2222]/65">{pillar.description}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4">
              {pageCampusMoments.map((item, index) => {
                const MomentIcon = campusMomentIcons[index % campusMomentIcons.length];
                const theme = campusMomentThemes[index % campusMomentThemes.length];
                const momentImages = item.imageUrls?.length ? item.imageUrls : [];
                const activeImageIndex = momentImages.length ? activeMomentImageIndices[index] ?? 0 : 0;
                return (
                  <div
                    key={item.title}
                    className={`reveal-on-scroll group campus-card campus-card-soft overflow-hidden rounded-[34px] border border-[#0a2222]/10 bg-gradient-to-br ${item.tone} shadow-[0_24px_60px_rgba(10,34,34,0.06)]`}
                    onMouseEnter={() => {
                      if (momentImages.length > 1) {
                        setHoveredMomentIndex(index);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredMomentIndex((current) => (current === index ? null : current));
                    }}
                  >
                    <div className="flex flex-col">
                      <div className="relative min-h-[320px] overflow-hidden border-b border-[#0a2222]/10 sm:min-h-[380px] lg:h-[80vh] lg:min-h-[520px]">
                        {momentImages.length > 0 ? (
                          <>
                            <div
                              className="flex h-full transition-transform duration-700 group-hover:scale-[1.02]"
                              style={{
                                width: `${momentImages.length * 100}%`,
                                transform: `translateX(-${(100 / momentImages.length) * activeImageIndex}%)`,
                                transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                              }}
                            >
                              {momentImages.map((imageUrl, imageIndex) => (
                                <div key={`${item.title}-slide-${imageIndex}`} className="h-full" style={{ width: `${100 / momentImages.length}%` }}>
                                  <img
                                    src={imageUrl}
                                    alt={`${item.title} ${imageIndex + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,27,44,0.06),rgba(7,27,44,0.16)_48%,rgba(7,27,44,0.36))]" />
                          </>
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(223,251,87,0.18),transparent_28%),linear-gradient(135deg,#eff5ff_0%,#ffffff_55%,#eef8f3_100%)]" />
                            <div className="absolute inset-8 rounded-[28px] border border-white/80 bg-white/65 shadow-[0_18px_40px_rgba(29,78,216,0.08)] backdrop-blur-sm" />
                            <div className="absolute inset-x-10 top-10 flex items-center justify-between rounded-full bg-white/88 px-4 py-3 shadow-sm">
                              <div className="h-2.5 w-24 rounded-full bg-[#dbe7ff]" />
                              <MomentIcon className="h-5 w-5 text-[#1d4ed8]" />
                            </div>
                            <div className="absolute inset-x-10 bottom-10 rounded-[24px] border border-[#dbe7ff] bg-white/90 p-5 shadow-sm">
                              <div className="space-y-3">
                                <div className="h-3 w-24 rounded-full bg-[#dbe7ff]" />
                                <div className="h-3 w-full rounded-full bg-[#edf3ff]" />
                                <div className="h-3 w-3/4 rounded-full bg-[#edf3ff]" />
                              </div>
                            </div>
                          </>
                        )}

                        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2 sm:left-6 sm:top-6">
                          <div className="inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1d4ed8] shadow-sm">
                            <MomentIcon className="h-3.5 w-3.5" />
                            {theme.label}
                          </div>
                          <div className="rounded-full bg-[#071b2c]/68 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/92">
                            {momentImages.length > 1 ? `${momentImages.length} photos` : "Big visual"}
                          </div>
                        </div>

                        {momentImages.length > 1 ? (
                          <>
                            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 sm:bottom-6 sm:left-6 sm:right-6">
                              <div className="flex min-w-0 gap-2 overflow-x-auto rounded-full bg-white/88 px-3 py-2 backdrop-blur-sm shadow-sm">
                                {momentImages.map((imageUrl, imageIndex) => (
                                  <button
                                    key={`${item.title}-thumb-${imageIndex}`}
                                    type="button"
                                    onClick={() => setMomentImageIndex(index, imageIndex, momentImages.length)}
                                    onMouseEnter={() => setHoveredMomentIndex(index)}
                                    className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-2xl border transition-all duration-300 ${
                                      activeImageIndex === imageIndex
                                        ? "border-white shadow-[0_12px_24px_rgba(7,27,44,0.22)]"
                                        : "border-white/45 opacity-75 hover:opacity-100"
                                    }`}
                                  >
                                    <img src={imageUrl} alt={`${item.title} ${imageIndex + 1}`} className="h-full w-full object-cover" />
                                  </button>
                                ))}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setMomentImageIndex(index, activeImageIndex - 1, momentImages.length)}
                                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/88 text-slate-950 shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
                                  aria-label={`Previous ${item.title} image`}
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setMomentImageIndex(index, activeImageIndex + 1, momentImages.length)}
                                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/88 text-slate-950 shadow-sm transition-transform duration-300 hover:-translate-y-0.5"
                                  aria-label={`Next ${item.title} image`}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </>
                        ) : null}
                      </div>

                      <div className="border-t border-white/60 bg-white/92 p-6 sm:p-7 lg:p-8">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0a2222]/50">Campus moment</p>
                            <h3 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.65rem] sm:leading-[1]">
                              {item.title}
                            </h3>
                          </div>
                          {momentImages.length > 1 ? (
                            <div className="flex items-center gap-2 self-start lg:self-auto">
                              {momentImages.map((_, imageIndex) => (
                                <button
                                  key={`${item.title}-dot-${imageIndex}`}
                                  type="button"
                                  onClick={() => setMomentImageIndex(index, imageIndex, momentImages.length)}
                                  className={`h-2.5 rounded-full transition-all duration-300 ${
                                    activeImageIndex === imageIndex ? "w-8 bg-[#1d4ed8]" : "w-2.5 bg-[#1d4ed8]/24"
                                  }`}
                                  aria-label={`View image ${imageIndex + 1}`}
                                />
                              ))}
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                          <p className="max-w-3xl text-base leading-8 text-[#0a2222]/66">{item.description}</p>
                          <div className="inline-flex items-center gap-2 rounded-full border border-[#0a2222]/10 bg-[#f8fbff] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
                            {theme.caption}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#0a2222]/10 bg-[#f6faff]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="reveal-on-scroll">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a2222]/50">What ambassadors get</p>
            <h2 className="mt-4 text-4xl font-normal leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Recognition is part of the product.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#0a2222]/68">
              Strong student programs work because effort is visible. The campus loop should reward consistency with recognition, profile value, and clear status.
            </p>

            <div className="mt-8 grid gap-3">
              {pageBenefits.map((benefit) => (
                <div key={benefit} className="reveal-on-scroll campus-card flex items-start gap-3 rounded-[24px] border border-[#0a2222]/10 bg-white/82 px-4 py-4 sm:px-5">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1d4ed8]" />
                  <p className="text-sm leading-6 text-[#0a2222]/72">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {pageRewardTiers.map((entry) => (
              <div key={entry.tier} className="reveal-on-scroll campus-card rounded-[30px] border border-[#0a2222]/10 bg-white/84 p-5 sm:p-6 shadow-[0_20px_50px_rgba(10,34,34,0.05)]">
                {entry.imageUrl ? (
                  <div className="mb-5 overflow-hidden rounded-[22px] border border-[#0a2222]/10 bg-[#f8fbff]">
                    <img src={entry.imageUrl} alt={entry.tier} className="h-44 w-full object-contain p-3" />
                  </div>
                ) : null}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0a2222]/48">{entry.points}</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{entry.tier}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#0a2222]/66">{entry.reward}</p>
                  </div>
                  <div className="rounded-full bg-[#1d4ed8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                    Tier
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="recognition" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="reveal-on-scroll max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a2222]/50">Visible proof</p>
            <h2 className="mt-4 text-4xl font-normal leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Recognition wall, top performers, and campus moments.
            </h2>
          </div>
          <div className="reveal-on-scroll inline-flex items-center gap-2 rounded-full border border-[#0a2222]/10 bg-white/82 px-4 py-2 text-sm font-semibold text-[#0a2222]/72">
            <Star className="h-4 w-4" />
            status should be visible
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="reveal-on-scroll rounded-[34px] border border-[#0a2222]/10 bg-white/84 p-5 sm:p-6 shadow-[0_25px_80px_rgba(10,34,34,0.06)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#0a2222]/10 pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">Leaderboard block</p>
                <h3 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-950">Top ambassador board</h3>
              </div>
              <Crown className="h-5 w-5 text-[#0a2222]/45" />
            </div>
            <div className="mt-5 space-y-3">
              {pageLeaderboard.map((entry) => (
              <div key={`${entry.rank}-${entry.name}`} className="reveal-on-scroll campus-card flex items-center gap-4 rounded-[24px] border border-[#0a2222]/10 bg-[#fbfaf6] px-4 py-4">
                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-gradient-to-br ${entry.accent} text-sm font-black text-white`}>
                    {entry.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold tracking-[-0.015em] text-slate-950">{entry.name}</p>
                    <p className="mt-1 text-sm text-[#0a2222]/55">{entry.college}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-950">{entry.points}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/45">{entry.badge}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-3">
              {pageHighlights.map((entry) => (
                <div key={`${entry.name}-${entry.college}`} className="reveal-on-scroll campus-card overflow-hidden rounded-[30px] border border-[#0a2222]/10 bg-white/84 shadow-[0_20px_50px_rgba(10,34,34,0.05)]">
                  <div
                    className={`h-28 bg-gradient-to-br ${entry.accent} ${entry.imageUrl ? "bg-cover bg-center" : ""}`}
                    style={entry.imageUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,0.12), rgba(255,255,255,0.12)), url(${entry.imageUrl})` } : undefined}
                  />
                  <div className="p-5">
                    {entry.imageUrl ? (
                      <div className="-mt-14 h-20 w-20 overflow-hidden rounded-[24px] border-4 border-white bg-white shadow-lg">
                        <img src={entry.imageUrl} alt={entry.imageAlt || entry.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className={`-mt-14 flex h-20 w-20 items-center justify-center rounded-[24px] border-4 border-white bg-gradient-to-br ${entry.accent} text-xl font-black text-white shadow-lg`}>
                        {entry.initials}
                      </div>
                    )}
                    <p className="mt-4 text-xl font-semibold tracking-[-0.02em] text-slate-950">{entry.name}</p>
                    <p className="mt-1 text-sm text-[#0a2222]/55">{entry.college}</p>
                    <div className="mt-4 inline-flex rounded-full border border-[#0a2222]/10 bg-[#f3f8ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
                      {entry.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {pageGalleryMoments.map((item, index) => {
                const GalleryIcon = galleryIcons[index % galleryIcons.length];
                const theme = galleryThemes[index % galleryThemes.length];
                return (
                <div key={item.title} className={`reveal-on-scroll campus-card rounded-[30px] border border-[#0a2222]/10 bg-white/84 p-4 shadow-[0_20px_50px_rgba(10,34,34,0.05)] ${index === 0 ? "md:col-span-2" : ""}`}>
                  {item.imageUrl ? (
                    <div
                      className={`flex ${index === 0 ? "h-44" : "h-36"} items-end rounded-[24px] border border-[#0a2222]/10 bg-gradient-to-br ${item.accent} bg-cover bg-center p-4`}
                      style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.14), rgba(255,255,255,0.14)), url(${item.imageUrl})` }}
                    >
                      <div className="max-w-full rounded-2xl bg-white/92 px-4 py-2 text-sm font-semibold leading-5 text-[#0a2222]">
                        {item.title}
                      </div>
                    </div>
                  ) : (
                    <div className={`relative overflow-hidden rounded-[24px] border border-[#0a2222]/10 bg-gradient-to-br ${item.accent} p-4 ${index === 0 ? "h-44" : "min-h-[11rem]"}`}>
                      <div className="absolute -right-6 top-2 h-24 w-24 rounded-full bg-[#1d4ed8]/12 blur-2xl" />
                      <div className="absolute bottom-0 left-4 h-16 w-16 rounded-full bg-[#dffb57]/30 blur-2xl" />
                      <div className="relative flex h-full flex-col rounded-[20px] border border-white/70 bg-white/72 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <GalleryIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#1d4ed8]" />
                          <span className="max-w-[70%] rounded-2xl bg-[#eff5ff] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1d4ed8]">
                            {theme.label}
                          </span>
                        </div>
                        <div className="mt-4 space-y-1.5">
                          <div className="text-sm font-semibold leading-5 tracking-[-0.015em] text-slate-950">{theme.lines[0]}</div>
                          <div className="text-xs leading-5 text-[#0a2222]/58">{theme.lines[1]}</div>
                        </div>
                        <div className="mt-3 max-w-full rounded-2xl bg-white/92 px-4 py-2 text-sm font-semibold leading-5 text-[#0a2222]">
                          {item.title}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )})}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {pageTestimonials.map((item) => (
                <div key={item.author} className="reveal-on-scroll campus-card rounded-[30px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,#1d4ed8_0%,#1e3a8a_100%)] p-5 sm:p-6 text-white shadow-[0_20px_50px_rgba(10,34,34,0.12)]">
                  <p className="text-sm leading-7 text-white/82">“{item.quote}”</p>
                  <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{item.author}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#0a2222]/10 bg-[#f6faff]">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="reveal-on-scroll mb-10 max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a2222]/50">How it works</p>
            <h2 className="mt-4 text-4xl font-normal leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Simple rollout. Clear logic. Weekly momentum.
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {pageTimeline.map((entry) => (
                <div key={entry.step} className="reveal-on-scroll campus-card rounded-[30px] border border-[#0a2222]/10 bg-[#fbfaf6] p-5 sm:p-6 shadow-[0_18px_40px_rgba(10,34,34,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-[#0a2222]/10 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/58">
                    {entry.step}
                  </span>
                  <ArrowRight className="h-4 w-4 text-[#0a2222]/32" />
                </div>
                <h3 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-slate-950">{entry.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#0a2222]/66">{entry.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="reveal-on-scroll">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a2222]/50">FAQ</p>
            <h2 className="mt-4 text-4xl font-normal leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Questions students will actually ask.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-[#0a2222]/68">
              Keep the offer simple and credible: who it is for, how selection works, and what students get back for doing the work well.
            </p>
          </div>
          <div className="space-y-3">
            {pageFaqs.map((item) => (
              <details key={item.question} className="group reveal-on-scroll campus-card rounded-[28px] border border-[#0a2222]/10 bg-white/82 px-4 py-5 sm:px-5 shadow-[0_18px_40px_rgba(10,34,34,0.04)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold tracking-[-0.015em] text-slate-950">
                  <span>{item.question}</span>
                  <span className="text-[#0a2222]/38 transition group-open:rotate-45">+</span>
                </summary>
                <p className="pt-4 text-sm leading-7 text-[#0a2222]/66">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-t border-[#0a2222]/10 bg-[#eef5ff]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(223,251,87,0.24),_transparent_24%),radial-gradient(circle_at_85%_20%,_rgba(160,189,255,0.34),_transparent_22%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.92fr] lg:px-8">
          <div className="reveal-on-scroll">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#0a2222]/48">Apply now</p>
            <h2 className="mt-4 text-4xl font-normal leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-6xl">
              Ready to represent ReferralMe on your campus?
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#0a2222]/68">
              The application flow lives on its own page. This landing page is here to explain the system, the visibility, and the opportunity clearly.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="/campus-ambassador/apply">
                <Button size="lg" className="w-full rounded-full bg-[#1d4ed8] px-7 text-white hover:bg-[#1e40af] sm:w-auto">
                  Open Application
                </Button>
              </a>
              <a href="/campus-ambassador/dashboard">
                <Button size="lg" variant="outline" className="w-full rounded-full border-[#0a2222]/15 bg-white/80 px-7 text-[#0a2222] hover:bg-white sm:w-auto">
                  Ambassador Sign In
                </Button>
              </a>
            </div>
          </div>

          <div className="reveal-on-scroll rounded-[34px] border border-[#0a2222]/10 bg-white/82 p-5 sm:p-6 shadow-[0_28px_80px_rgba(10,34,34,0.08)] lg:p-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#0a2222]/48">Before you apply</p>
            <div className="mt-5 space-y-3">
              {pageInfoRows.map((row) => (
                <div key={row.title} className="rounded-[24px] border border-[#0a2222]/10 bg-[#fbfaf6] px-4 py-4">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a2222]/50">{row.title}</p>
                  <p className="mt-2 text-sm leading-7 text-[#0a2222]/66">{row.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[linear-gradient(180deg,#0f1f4b_0%,#12285f_100%)] text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="ReferralMe" className="h-12 w-12 rounded-2xl border border-white/15 bg-white/95 p-1.5 shadow-lg" />
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/48">ReferralMe Campus</p>
                <p className="text-lg font-semibold tracking-[-0.015em] text-white">{footerTitle}</p>
              </div>
            </div>
            <h2 className="mt-5 max-w-3xl text-4xl font-normal leading-[0.98] tracking-[-0.05em] text-white sm:text-6xl">
              {footerSubtitle}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/70">{footerDescription}</p>
          </div>
          <div className="grid gap-3">
            <a href="/campus-ambassador/apply" className="flex items-center justify-between rounded-[24px] border border-white/12 bg-white/5 px-5 py-4 text-sm font-semibold text-white/82 transition hover:bg-white/10">
              <span>Apply for the campus ambassador program</span>
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="/campus-ambassador/dashboard" className="flex items-center justify-between rounded-[24px] border border-white/12 bg-white/5 px-5 py-4 text-sm font-semibold text-white/82 transition hover:bg-white/10">
              <span>Sign in to the ambassador dashboard</span>
              <ArrowRight className="h-4 w-4" />
            </a>
            <div className="rounded-[24px] border border-white/12 bg-white/5 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Tagline</p>
              <p className="mt-2 text-sm leading-7 text-white/70">{footerTagline}</p>
            </div>
            <div className="rounded-[24px] border border-white/12 bg-white/5 px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Quick links</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                <a href="#program" className="text-[#9cc0ff] transition hover:text-white">Program</a>
                <a href="#recognition" className="text-[#9cc0ff] transition hover:text-white">Recognition</a>
                <a href="#faq" className="text-[#9cc0ff] transition hover:text-white">FAQ</a>
                <a href="/" className="text-[#9cc0ff] transition hover:text-white">ReferralMe</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
