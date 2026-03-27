import { useState, useEffect, useRef } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { useLocation } from "wouter";
import { getUserProfile, getJobPostings, JobPosting } from "../lib/firestore";
import LiveAnimatedStats from "../components/live-animated-stats";
import LiveJobsSection from "../components/live-jobs-section";
import { Link } from "wouter";
import SeoHead from "../components/seo-head";
import {
  SiGoogle, SiNetflix, SiAmazon, SiMeta, SiSlack,
  SiSpotify, SiUber, SiAirbnb, SiFigma, SiStripe,
} from "react-icons/si";

function useScrollReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return { ref, visible };
}

function useTypewriter(words: string[], speed = 75, pause = 2200) {
  const [text, setText] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const word = words[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && text === word) {
      timeout = setTimeout(() => setDeleting(true), pause);
    } else if (deleting && text === "") {
      setDeleting(false);
      setWordIdx(i => (i + 1) % words.length);
    } else {
      timeout = setTimeout(() => {
        setText(prev => deleting ? prev.slice(0, -1) : word.slice(0, prev.length + 1));
      }, deleting ? speed / 2 : speed);
    }
    return () => clearTimeout(timeout);
  }, [text, wordIdx, deleting, words, speed, pause]);
  return text;
}

function useRotatingLabel(labels: string[], interval = 2200) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % labels.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [labels, interval]);

  return labels[index];
}

function getFriendlySignInError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "");
  const normalized = message.toLowerCase();

  if (normalized.includes("popup") && normalized.includes("closed")) {
    return "Google sign-in was closed before it finished. Please try again.";
  }

  if (normalized.includes("popup") && normalized.includes("blocked")) {
    return "Your browser blocked the Google sign-in popup. Please allow popups and try again.";
  }

  return "We couldn't complete sign-in right now. Please try again in a moment.";
}

async function getUserProfileWithRetry(uid: string, attempts = 2) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await getUserProfile(uid);
    } catch (error) {
      lastError = error;
      if (attempt < attempts - 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 500));
      }
    }
  }

  throw lastError;
}

export default function NewLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { user, refreshUser } = useFirebaseAuth();
  const [, setLocation] = useLocation();
  const [allJobs, setAllJobs] = useState<JobPosting[]>([]);

  const featuresReveal = useScrollReveal();
  const atsReveal = useScrollReveal();
  const howReveal = useScrollReveal();
  const statsReveal = useScrollReveal();
  const ctaReveal = useScrollReveal();
  const allJobsReveal = useScrollReveal();
  const testimonialsReveal = useScrollReveal();
  const calloutReveal = useScrollReveal();
  const campusReveal = useScrollReveal();

  const roles = ["Software Engineer", "Product Manager", "Data Analyst", "UX Designer", "DevOps Engineer"];
  const typedRole = useTypewriter(roles);
  const heroSignal = useRotatingLabel(["Referrals", "Interviews", "Offers", "Career Momentum"]);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    getJobPostings().then(jobs => setAllJobs(jobs)).catch(() => {});
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
      const total = document.body.scrollHeight - window.innerHeight;
      setScrollProgress(total > 0 ? Math.min(100, (window.scrollY / total) * 100) : 0);
      const sections = ["hero", "resume-scan", "features", "campus-program", "how-it-works", "live-jobs"];
      const pos = window.scrollY + 120;
      for (const s of sections) {
        const el = document.getElementById(s);
        if (el && pos >= el.offsetTop && pos < el.offsetTop + el.offsetHeight) {
          setActiveSection(s); break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const handleGetStarted = async () => {
    if (user) {
      if (user.role && user.profileCompleted) {
        setLocation(user.role === "seeker" ? "/seeker-dashboard" : "/referrer-dashboard");
      } else if (user.role) {
        setLocation("/profile-edit");
      } else {
        setLocation("/role-selection");
      }
      return;
    }
    try {
      setIsSigningIn(true); setSignInError(null);
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await refreshUser().catch((error) => {
          console.error("Error refreshing user after sign-in:", error);
        });

        let userData: Awaited<ReturnType<typeof getUserProfile>> = null;
        try {
          userData = await getUserProfileWithRetry(result.user.uid);
        } catch (error) {
          console.error("Error fetching signed-in user profile on landing:", error);
        }

        if (userData?.role && userData?.profileCompleted) {
          setLocation(userData.role === "seeker" ? "/seeker-dashboard" : "/referrer-dashboard");
        } else if (userData?.role) {
          setLocation("/profile-edit");
        } else {
          setLocation("/role-selection");
        }
      }
    } catch (error) {
      console.error("Landing sign-in failed:", error);
      setSignInError(getFriendlySignInError(error));
    } finally {
      setIsSigningIn(false);
    }
  };

  const features = [
    { icon: "🎯", title: "Smart Referrals", desc: "Skip the ATS black hole. Get your resume directly in front of the hiring manager through a real employee referral.", wide: true, highlight: true },
    { icon: "🤝", title: "Verified Professionals", desc: "Every referrer is a verified employee at their company — authentic and trustworthy connections.", wide: false, highlight: false },
    { icon: "📊", title: "ATS Resume Analysis", desc: "Get an instant AI-powered resume score with detailed feedback and keyword recommendations.", wide: false, highlight: false },
    { icon: "🏆", title: "Reward System", desc: "Referrers earn points and rewards for every successful placement, creating a thriving ecosystem.", wide: false, highlight: false },
    { icon: "💬", title: "Direct Messaging", desc: "Communicate directly with referrers, ask questions, and build genuine professional relationships.", wide: false, highlight: false },
    { icon: "🔒", title: "100% Private", desc: "Your data is end-to-end encrypted. You control who sees your profile and resume at all times.", wide: true, highlight: false },
  ];

  const steps = [
    { num: "01", icon: "👤", title: "Create Your Profile", desc: "Sign up with Google in seconds. Set your role as a job seeker or a professional referrer." },
    { num: "02", icon: "🔍", title: "Discover Opportunities", desc: "Browse live job openings from verified professionals at top companies across India." },
    { num: "03", icon: "📄", title: "Apply with Your Resume", desc: "Submit your resume with our ATS optimizer. Get matched based on skills and experience." },
    { num: "04", icon: "🚀", title: "Get Referred & Hired", desc: "Your referrer submits your application internally. Track every step of your journey in real-time." },
  ];

  const stats = [
    { number: "10,000+", label: "Professionals Joined", icon: "👥" },
    { number: "2,500+", label: "Referrals Sent", icon: "📨" },
    { number: "850+", label: "Jobs Posted", icon: "💼" },
    { number: "92%", label: "Success Rate", icon: "🏆" },
  ];

  const testimonials = [
    { name: "Priya Sharma", role: "Software Engineer at Google", text: "ReferralMe got me an interview at Google in just 3 days. The referral from an actual employee made all the difference!", avatar: "P", color: "#2563eb" },
    { name: "Rahul Verma", role: "Product Manager at Flipkart", text: "I was struggling to get responses. After using ReferralMe, I had 4 interviews scheduled within a week. Incredible platform.", avatar: "R", color: "#1d4ed8" },
    { name: "Ananya Iyer", role: "Data Analyst at Amazon", text: "The ATS resume analysis helped me fix my resume and the referral network is amazing. Got my dream job in 2 weeks!", avatar: "A", color: "#1e40af" },
    { name: "Karan Mehta", role: "UX Designer at Swiggy", text: "As a referrer, I love helping talented people land roles at my company. The platform makes it seamless and rewarding.", avatar: "K", color: "#1e3a8a" },
  ];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length);
    }, 2800);

    return () => window.clearInterval(timer);
  }, [testimonials.length]);

  const activityFeed = [
    { icon: "✅", text: "Priya S. got referred to Google", time: "2 min ago" },
    { icon: "🎯", text: "New SDE-II role posted at Microsoft", time: "5 min ago" },
    { icon: "🎉", text: "Rahul V. accepted at Flipkart", time: "12 min ago" },
    { icon: "📊", text: "Ananya's resume scored 94/100", time: "18 min ago" },
    { icon: "✅", text: "Karan M. referred to Swiggy", time: "24 min ago" },
    { icon: "💼", text: "Amazon posted 3 new openings", time: "31 min ago" },
    { icon: "🚀", text: "Sneha T. landed her dream job!", time: "45 min ago" },
    { icon: "🎯", text: "Product role posted at Razorpay", time: "1 hr ago" },
    { icon: "🤝", text: "Aditya K. connected with referrer", time: "1 hr ago" },
    { icon: "🏆", text: "100th successful referral today!", time: "2 hr ago" },
  ];

  const trustBrands = [
    { name: "Google", Icon: SiGoogle, color: "#4285F4" },
    { name: "Netflix", Icon: SiNetflix, color: "#E50914" },
    { name: "Amazon", Icon: SiAmazon, color: "#FF9900" },
    { name: "Meta", Icon: SiMeta, color: "#0866FF" },
    { name: "Slack", Icon: SiSlack, color: "#4A154B" },
    { name: "Spotify", Icon: SiSpotify, color: "#1DB954" },
    { name: "Uber", Icon: SiUber, color: "#000000" },
    { name: "Airbnb", Icon: SiAirbnb, color: "#FF5A5F" },
    { name: "Figma", Icon: SiFigma, color: "#F24E1E" },
    { name: "Stripe", Icon: SiStripe, color: "#635BFF" },
  ];

  const websiteStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        name: "ReferralMe",
        url: "https://referralme.in",
        logo: "https://referralme.in/logo.png",
      },
      {
        "@type": "WebSite",
        name: "ReferralMe",
        url: "https://referralme.in",
      },
    ],
  };

  return (
    <div className="lp-root">
      <SeoHead
        title="ReferralMe | Job Referrals, ATS Resume Scan, and Career Growth"
        description="ReferralMe helps job seekers get real employee referrals, improve resumes with a free ATS scan, and discover live opportunities faster."
        canonicalPath="/"
        image="https://referralme.in/logo.png"
        keywords="ReferralMe, job referrals, employee referrals, ATS resume scan, referral platform India, careers, jobs"
        structuredData={websiteStructuredData}
      />
      <style>{`
        :root {
          --blue: #2563eb;
          --blue-dark: #1d4ed8;
          --blue-deep: #1e3a8a;
          --blue-light: #eff6ff;
          --blue-mid: #dbeafe;
          --dark: #0f172a;
          --gray: #64748b;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        .lp-root {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          color: var(--dark); background: #fff; overflow-x: hidden;
        }

        /* ── NAVBAR ───────────────────────── */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          padding: 1rem 0; transition: all 0.35s ease;
        }
        .lp-nav.scrolled {
          background: rgba(255,255,255,0.97);
          backdrop-filter: blur(24px);
          box-shadow: 0 1px 0 rgba(0,0,0,0.06);
          padding: 0.6rem 0;
        }
        .lp-progress-bar {
          position: absolute; bottom: 0; left: 0;
          height: 2px; background: var(--blue); transition: width 0.1s linear;
        }
        .lp-nav-inner {
          max-width: 1280px; margin: 0 auto; padding: 0 1.5rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .lp-logo {
          display: flex; align-items: center; gap: 0.6rem; text-decoration: none;
        }
        .lp-logo img { width: 32px; height: 32px; border-radius: 8px; }
        .lp-logo-text { font-size: 1.25rem; font-weight: 800; }
        .lp-logo-text .r { color: var(--dark); }
        .lp-logo-text .m { color: var(--blue); }
        .lp-nav-links { display: none; list-style: none; gap: 0.25rem; align-items: center; }
        @media (min-width: 768px) { .lp-nav-links { display: flex; } }
        .lp-nav-links a {
          text-decoration: none; color: var(--gray); font-weight: 500; font-size: 0.9rem;
          padding: 0.45rem 0.85rem; border-radius: 8px; transition: all 0.2s;
          position: relative;
        }
        .lp-nav-links a::after {
          content: ''; position: absolute; bottom: 2px; left: 0.85rem; right: 0.85rem;
          height: 2px; background: var(--blue); border-radius: 2px;
          transform: scaleX(0); transition: transform 0.25s ease;
        }
        .lp-nav-links a:hover, .lp-nav-links a.active { color: var(--blue); }
        .lp-nav-links a:hover::after, .lp-nav-links a.active::after { transform: scaleX(1); }
        .lp-nav-right { display: flex; align-items: center; gap: 0.75rem; }
        .lp-nav-btn {
          background: var(--blue); color: white; border: none;
          padding: 0.55rem 1.3rem; border-radius: 8px; font-weight: 600; font-size: 0.88rem;
          cursor: pointer; transition: all 0.25s; position: relative; overflow: hidden;
        }
        @media (max-width: 767px) { .lp-nav-btn { display: none; } }
        .lp-nav-btn::after {
          content: ''; position: absolute; top: -50%; left: -75%;
          width: 50%; height: 200%; background: rgba(255,255,255,0.18);
          transform: skewX(-20deg); transition: left 0.4s ease;
        }
        .lp-nav-btn:hover { background: var(--blue-dark); transform: translateY(-1px); }
        .lp-nav-btn:hover::after { left: 125%; }
        .lp-hamburger {
          display: flex; flex-direction: column; gap: 4px;
          background: none; border: none; cursor: pointer; padding: 4px;
        }
        @media (min-width: 768px) { .lp-hamburger { display: none; } }
        .lp-hamburger span {
          display: block; width: 22px; height: 2px;
          background: var(--dark); border-radius: 2px; transition: all 0.3s;
        }
        .lp-hamburger.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
        .lp-hamburger.open span:nth-child(2) { opacity: 0; }
        .lp-hamburger.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

        /* ── MOBILE MENU ──────────────────── */
        .lp-mobile-menu {
          position: fixed; inset: 0; background: white; z-index: 99;
          display: flex; flex-direction: column; gap: 0.5rem;
          padding: 5.5rem 1.5rem 2rem;
          overflow-y: auto;
          transform: translateX(100%); transition: transform 0.35s cubic-bezier(0.4,0,0.2,1);
        }
        .lp-mobile-menu.open { transform: translateX(0); }
        .lp-mobile-menu a {
          text-decoration: none; color: var(--dark); font-weight: 600;
          padding: 0.9rem 1rem; border-radius: 12px; transition: all 0.2s; font-size: 1rem;
        }
        .lp-mobile-menu a:hover { background: var(--blue-light); color: var(--blue); }
        .lp-mobile-menu-btn {
          margin-top: 0.5rem; background: var(--blue); color: white;
          border: none; padding: 0.9rem; border-radius: 12px; font-weight: 700;
          font-size: 1rem; cursor: pointer;
        }

        /* ── HERO ─────────────────────────── */
        .lp-hero {
          min-height: 100vh; background: #fff;
          display: flex; align-items: center;
          padding: 7rem 1.5rem 5rem;
          position: relative; overflow: hidden;
        }
        .lp-hero-dot-grid {
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(37,99,235,0.1) 1px, transparent 1px);
          background-size: 28px 28px; pointer-events: none;
          mask-image: radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%);
          -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black 40%, transparent 80%);
        }
        .lp-hero-glow {
          position: absolute; border-radius: 50%; pointer-events: none;
          filter: blur(90px); animation: lpGlowPulse 7s ease-in-out infinite;
        }
        .lp-hero-glow-1 { width: 600px; height: 600px; top: -200px; right: -150px; background: rgba(37,99,235,0.1); animation-delay: 0s; }
        .lp-hero-glow-2 { width: 400px; height: 400px; bottom: -150px; left: -100px; background: rgba(37,99,235,0.07); animation-delay: 3.5s; }
        @keyframes lpGlowPulse {
          0%,100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .lp-hero-inner {
          max-width: 1280px; margin: 0 auto; width: 100%;
          display: grid; grid-template-columns: 1fr;
          gap: 3.5rem; align-items: center;
          position: relative; z-index: 1; text-align: center;
        }
        @media (min-width: 900px) { .lp-hero-inner { grid-template-columns: 1fr 1fr; text-align: left; } }
        .lp-hero-badge {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: var(--blue-light); color: var(--blue);
          border: 1px solid var(--blue-mid);
          padding: 0.45rem 1rem; border-radius: 30px;
          font-size: 0.8rem; font-weight: 600; margin-bottom: 1.5rem;
          animation: lpFadeDown 0.6s ease-out both;
        }
        .lp-hero-badge-dot {
          width: 6px; height: 6px; background: var(--blue);
          border-radius: 50%; animation: lpPulse 1.5s infinite;
        }
        @keyframes lpPulse { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.8); } }
        .lp-hero h1 {
          font-size: clamp(2.4rem, 5.5vw, 4rem);
          font-weight: 900; line-height: 1.1;
          letter-spacing: -0.03em; margin-bottom: 0.4rem;
          animation: lpFadeUp 0.7s ease-out 0.1s both;
          color: var(--dark);
        }
        .lp-hero-role-line {
          font-size: clamp(2rem, 4.5vw, 3.5rem);
          font-weight: 900; line-height: 1.1;
          letter-spacing: -0.03em; margin-bottom: 1.75rem;
          color: var(--blue);
          animation: lpFadeUp 0.7s ease-out 0.2s both;
          min-height: 1.2em;
        }
        .lp-typewriter-cursor {
          display: inline-block; width: 3px; height: 0.85em;
          background: var(--blue); margin-left: 2px;
          animation: lpBlink 0.85s step-end infinite;
          vertical-align: text-bottom;
        }
        @keyframes lpBlink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .lp-hero-sub {
          font-size: clamp(1rem, 2vw, 1.15rem); color: var(--gray); line-height: 1.8;
          max-width: 500px; margin: 0 auto 2rem;
          animation: lpFadeUp 0.7s ease-out 0.3s both;
        }
        @media (min-width: 900px) { .lp-hero-sub { margin: 0 0 2rem; } }
        .lp-hero-signals {
          display: flex; flex-wrap: wrap; gap: 0.75rem;
          justify-content: center; margin: -0.3rem 0 1.75rem;
          animation: lpFadeUp 0.7s ease-out 0.35s both;
        }
        @media (min-width: 900px) { .lp-hero-signals { justify-content: flex-start; } }
        .lp-signal-pill {
          display: inline-flex; align-items: center; gap: 0.55rem;
          padding: 0.55rem 0.9rem; border-radius: 999px;
          border: 1px solid rgba(37,99,235,0.12);
          background: rgba(255,255,255,0.82);
          box-shadow: 0 12px 30px rgba(37,99,235,0.08);
          color: #334155; font-size: 0.82rem; font-weight: 700;
          backdrop-filter: blur(16px);
        }
        .lp-signal-pill strong {
          color: var(--blue); min-width: 11ch; display: inline-block;
          animation: lpWordSwap 0.45s ease;
        }
        .lp-signal-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: linear-gradient(135deg, #22c55e, #2563eb);
          box-shadow: 0 0 0 6px rgba(37,99,235,0.08);
        }
        .lp-signal-mini {
          color: #64748b; font-size: 0.78rem; font-weight: 600;
          padding: 0.55rem 0.8rem; border-radius: 999px;
          background: #f8fafc; border: 1px solid #e2e8f0;
        }
        @keyframes lpWordSwap {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .lp-hero-ctas {
          display: flex; flex-wrap: wrap; gap: 0.75rem;
          justify-content: center; margin-bottom: 2.5rem;
          animation: lpFadeUp 0.7s ease-out 0.4s both;
        }
        @media (min-width: 900px) { .lp-hero-ctas { justify-content: flex-start; } }

        /* Buttons */
        .lp-btn-primary {
          display: inline-flex; align-items: center; gap: 0.6rem;
          background: var(--blue); color: white;
          border: none; padding: 0.9rem 2rem; border-radius: 12px;
          font-weight: 700; font-size: 1rem; cursor: pointer;
          transition: all 0.3s ease; box-shadow: 0 4px 24px rgba(37,99,235,0.35);
          white-space: nowrap; position: relative; overflow: hidden;
        }
        .lp-btn-primary::after {
          content: ''; position: absolute; top: -50%; left: -75%;
          width: 50%; height: 200%; background: rgba(255,255,255,0.2);
          transform: skewX(-20deg); transition: left 0.5s ease;
        }
        .lp-btn-primary:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(37,99,235,0.45); background: var(--blue-dark); }
        .lp-btn-primary:hover::after { left: 130%; }
        .lp-btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .lp-btn-secondary {
          display: inline-flex; align-items: center; gap: 0.6rem;
          background: white; color: var(--dark);
          border: 1.5px solid #e2e8f0; padding: 0.9rem 1.75rem;
          border-radius: 12px; font-weight: 600; font-size: 1rem;
          text-decoration: none; transition: all 0.3s ease; white-space: nowrap;
        }
        .lp-btn-secondary:hover { border-color: var(--blue); color: var(--blue); transform: translateY(-2px); background: var(--blue-light); }

        .lp-hero-trust {
          display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;
          justify-content: center; color: var(--gray); font-size: 0.82rem;
          animation: lpFadeUp 0.7s ease-out 0.5s both;
        }
        @media (min-width: 900px) { .lp-hero-trust { justify-content: flex-start; } }
        .lp-trust-avatars { display: flex; }
        .lp-trust-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: var(--blue); border: 2px solid white; margin-left: -8px;
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 0.7rem; font-weight: 700;
        }
        .lp-trust-avatar:first-child { margin-left: 0; }

        /* ── HERO MOCKUP CARD ─────────────── */
        .lp-hero-visual {
          display: flex; justify-content: center; align-items: center;
          animation: lpFadeLeft 0.9s ease-out 0.3s both; position: relative;
        }
        @keyframes lpFadeLeft { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        .lp-mockup-card {
          background: white; border-radius: 24px;
          box-shadow: 0 40px 80px rgba(37,99,235,0.15), 0 0 0 1px rgba(37,99,235,0.08);
          padding: 1.75rem; width: 100%; max-width: 380px;
          position: relative;
          transform: perspective(1000px) rotateY(-5deg) rotateX(2deg);
          transition: transform 0.5s ease;
          isolation: isolate;
        }
        .lp-mockup-card::before {
          content: ''; position: absolute; right: -16%; bottom: -24%;
          width: 180px; height: 180px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.22), rgba(37,99,235,0));
          z-index: -1; animation: lpGlowPulse 5.5s ease-in-out infinite;
        }
        .lp-mockup-card:hover { transform: perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1.02); }
        .lp-mockup-header { display: flex; gap: 6px; margin-bottom: 1.5rem; }
        .lp-dot { width: 10px; height: 10px; border-radius: 50%; }
        .lp-dot-r { background: #ef4444; } .lp-dot-y { background: #f59e0b; } .lp-dot-g { background: #10b981; }
        .lp-mockup-job-icon {
          width: 52px; height: 52px; background: var(--blue);
          border-radius: 14px; display: flex; align-items: center;
          justify-content: center; font-size: 1.5rem; margin-bottom: 1rem;
        }
        .lp-mockup-company { font-size: 0.78rem; color: var(--gray); font-weight: 500; margin-bottom: 0.25rem; }
        .lp-mockup-title { font-size: 1.2rem; font-weight: 800; color: var(--dark); margin-bottom: 0.25rem; }
        .lp-mockup-loc { font-size: 0.82rem; color: var(--gray); margin-bottom: 1.25rem; }
        .lp-mockup-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 1.25rem; }
        .lp-mockup-tag {
          background: var(--blue-light); color: var(--blue);
          padding: 0.3rem 0.7rem; border-radius: 8px; font-size: 0.75rem; font-weight: 600;
        }
        .lp-mockup-cta {
          background: var(--blue); color: white; border: none; width: 100%;
          padding: 0.8rem; border-radius: 12px; font-weight: 700; font-size: 0.95rem; cursor: pointer;
          transition: all 0.3s;
        }
        .lp-mockup-cta:hover { background: var(--blue-dark); }
        .lp-mockup-float {
          position: absolute; background: white; border-radius: 14px;
          padding: 0.75rem 1rem; box-shadow: 0 12px 30px rgba(0,0,0,0.1);
          border: 1px solid var(--blue-mid); font-size: 0.78rem; font-weight: 600;
          display: flex; align-items: center; gap: 0.5rem; white-space: nowrap;
          animation: lpFloatCard 4s ease-in-out infinite;
        }
        .lp-float-1 { top: -22px; right: -20px; animation-delay: 0s; }
        .lp-float-2 { bottom: -22px; left: -20px; animation-delay: 2s; }
        .lp-float-icon { font-size: 1rem; }
        @keyframes lpFloatCard { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        /* ── TRUST BAR ────────────────────── */
        .lp-trust-bar {
          background: white; border-top: 1px solid #e8edf5;
          border-bottom: 1px solid #e8edf5; padding: 2rem 1.25rem; overflow: hidden;
        }
        .lp-trust-label {
          text-align: center; color: #94a3b8; font-size: 0.72rem;
          font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 1.5rem;
        }
        .lp-trust-track-wrap { overflow: hidden; }
        .lp-trust-scroll {
          display: flex; animation: lpTrustScroll 28s linear infinite;
          width: max-content; align-items: center;
        }
        .lp-trust-scroll:hover { animation-play-state: paused; }
        .lp-trust-brand {
          display: flex; align-items: center; gap: 0.6rem;
          padding: 0.6rem 2rem; white-space: nowrap;
          transition: all 0.3s; border-right: 1px solid #f1f5f9; cursor: default;
        }
        .lp-trust-brand:hover { background: var(--blue-light); border-radius: 8px; }
        .lp-trust-brand-icon { transition: transform 0.3s; }
        .lp-trust-brand:hover .lp-trust-brand-icon { transform: scale(1.2) rotate(-5deg); }
        .lp-trust-brand-name { font-weight: 700; font-size: 0.9rem; color: #94a3b8; transition: color 0.3s; }
        .lp-trust-brand:hover .lp-trust-brand-name { color: #475569; }
        @keyframes lpTrustScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }

        /* ── STATS ────────────────────────── */
        .lp-stats {
          padding: 5rem 1.5rem;
          background: var(--blue);
          position: relative; overflow: hidden;
        }
        .lp-stats::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .lp-stats-inner {
          max-width: 1000px; margin: 0 auto; position: relative; z-index: 1;
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 2.5rem; text-align: center;
        }
        @media (min-width: 640px) { .lp-stats-inner { grid-template-columns: repeat(4, 1fr); } }
        .lp-stat-item { opacity: 0; transform: translateY(24px); transition: all 0.6s ease; }
        .lp-stat-item.revealed { opacity: 1; transform: translateY(0); }
        .lp-stat-item:nth-child(1) { transition-delay: 0s; }
        .lp-stat-item:nth-child(2) { transition-delay: 0.1s; }
        .lp-stat-item:nth-child(3) { transition-delay: 0.2s; }
        .lp-stat-item:nth-child(4) { transition-delay: 0.3s; }
        .lp-stat-icon { font-size: 1.5rem; margin-bottom: 0.5rem; display: block; }
        .lp-stat-num {
          font-size: clamp(2.2rem, 5vw, 3.2rem); font-weight: 900; color: white;
          letter-spacing: -0.03em; display: block; margin-bottom: 0.4rem;
        }
        .lp-stat-label { color: rgba(255,255,255,0.7); font-size: 0.88rem; font-weight: 500; }

        /* ── SECTION HEADERS ──────────────── */
        .lp-section-header {
          text-align: center; margin-bottom: 3.5rem;
          opacity: 0; transform: translateY(24px); transition: all 0.6s ease;
        }
        .lp-section-header.revealed { opacity: 1; transform: translateY(0); }
        .lp-section-tag {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: var(--blue-light); color: var(--blue);
          border: 1px solid var(--blue-mid);
          padding: 0.4rem 1rem; border-radius: 30px;
          font-size: 0.78rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 1px; margin-bottom: 1rem;
        }
        .lp-section-tag::before {
          content: ''; width: 6px; height: 6px; background: var(--blue); border-radius: 50%;
        }
        .lp-section-title {
          font-size: clamp(1.9rem, 4vw, 2.9rem); font-weight: 800; color: var(--dark);
          letter-spacing: -0.025em; margin-bottom: 1rem; line-height: 1.15;
        }
        .lp-section-title span { color: var(--blue); }
        .lp-section-sub {
          color: var(--gray); font-size: clamp(0.95rem, 2vw, 1.05rem);
          max-width: 540px; margin: 0 auto; line-height: 1.75;
        }

        /* ── ATS SCAN ────────────────────── */
        .lp-ats {
          padding: 5rem 1.5rem 2rem;
          background:
            radial-gradient(circle at top left, rgba(37,99,235,0.09), transparent 30%),
            linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .lp-ats-wrap {
          max-width: 1180px;
          margin: 0 auto;
          display: grid;
          gap: 1.5rem;
          grid-template-columns: 1fr;
        }
        @media (min-width: 1024px) {
          .lp-ats-wrap { grid-template-columns: 1.05fr 0.95fr; align-items: start; }
        }
        .lp-ats-panel, .lp-ats-result {
          background: rgba(255,255,255,0.92);
          border: 1px solid #dbe3f0;
          border-radius: 28px;
          padding: 1.5rem;
          box-shadow: 0 18px 50px rgba(15,23,42,0.06);
        }
        .lp-ats-panel h3, .lp-ats-result h3 {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--dark);
          margin-bottom: 0.45rem;
        }
        .lp-ats-panel p, .lp-ats-result p { color: var(--gray); line-height: 1.7; }
        .lp-ats-upload {
          margin-top: 1.25rem;
          border: 1px dashed #93c5fd;
          border-radius: 20px;
          background: #f8fbff;
          padding: 1rem;
        }
        .lp-ats-upload-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
          justify-content: space-between;
        }
        .lp-ats-upload-btn, .lp-ats-submit, .lp-ats-unlock {
          border: none;
          cursor: pointer;
          border-radius: 12px;
          font-weight: 700;
          transition: all 0.2s ease;
        }
        .lp-ats-upload-btn {
          background: var(--dark);
          color: white;
          padding: 0.85rem 1.1rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.45rem;
        }
        .lp-ats-submit, .lp-ats-unlock {
          background: var(--blue);
          color: white;
          padding: 0.95rem 1.2rem;
          width: 100%;
          margin-top: 1rem;
        }
        .lp-ats-upload-btn:hover, .lp-ats-submit:hover, .lp-ats-unlock:hover {
          transform: translateY(-1px);
          filter: brightness(0.98);
        }
        .lp-ats-file { font-size: 0.86rem; font-weight: 600; color: var(--blue); }
        .lp-ats-input, .lp-ats-textarea {
          width: 100%;
          border: 1px solid #cbd5e1;
          border-radius: 16px;
          padding: 0.95rem 1rem;
          font: inherit;
          color: var(--dark);
          background: white;
          resize: vertical;
          margin-top: 0.9rem;
        }
        .lp-ats-textarea { min-height: 180px; }
        .lp-ats-helper {
          margin-top: 0.7rem;
          font-size: 0.82rem;
          color: #64748b;
        }
        .lp-ats-error {
          margin-top: 0.9rem;
          border-radius: 14px;
          padding: 0.85rem 1rem;
          background: #fef2f2;
          color: #b91c1c;
          border: 1px solid #fecaca;
          font-size: 0.88rem;
          font-weight: 600;
        }
        .lp-ats-result-header {
          display: flex;
          gap: 1rem;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          margin-bottom: 1.25rem;
        }
        .lp-ats-score-wrap {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .lp-ats-score {
          width: 84px;
          height: 84px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 1.65rem;
          font-weight: 900;
          background: #eff6ff;
          color: var(--blue);
          border: 8px solid #dbeafe;
        }
        .lp-ats-tone {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          border-radius: 999px;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .lp-ats-tone.strong { background: #dcfce7; color: #166534; }
        .lp-ats-tone.good { background: #dbeafe; color: #1d4ed8; }
        .lp-ats-tone.needs-work { background: #fef3c7; color: #b45309; }
        .lp-ats-preview-grid {
          display: grid;
          gap: 1rem;
          grid-template-columns: 1fr;
          margin-top: 1rem;
        }
        @media (min-width: 640px) {
          .lp-ats-preview-grid { grid-template-columns: repeat(2, 1fr); }
        }
        .lp-ats-preview-card, .lp-ats-locked {
          border-radius: 20px;
          border: 1px solid #e2e8f0;
          background: #fff;
          padding: 1.1rem;
          min-height: 180px;
          position: relative;
          overflow: hidden;
        }
        .lp-ats-preview-card h4, .lp-ats-locked h4 {
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--dark);
          margin-bottom: 0.75rem;
        }
        .lp-ats-list {
          list-style: none;
          display: grid;
          gap: 0.7rem;
        }
        .lp-ats-list li {
          display: flex;
          gap: 0.65rem;
          font-size: 0.9rem;
          line-height: 1.55;
          color: #334155;
        }
        .lp-ats-list span {
          width: 22px;
          height: 22px;
          flex-shrink: 0;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .lp-ats-list-positive span { background: #dcfce7; color: #166534; }
        .lp-ats-list-warning span { background: #dbeafe; color: #1d4ed8; }
        .lp-ats-locked::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0.9));
          backdrop-filter: blur(8px);
        }
        .lp-ats-locked-inner {
          position: relative;
          z-index: 1;
        }
        .lp-ats-fake-lines {
          display: grid;
          gap: 0.65rem;
          margin: 1rem 0 1.2rem;
        }
        .lp-ats-fake-lines div {
          height: 11px;
          border-radius: 999px;
          background: linear-gradient(90deg, #dbeafe, #eff6ff, #dbeafe);
          background-size: 200% 100%;
          animation: lpShimmer 1.8s linear infinite;
        }
        .lp-ats-fake-lines div:nth-child(1) { width: 100%; }
        .lp-ats-fake-lines div:nth-child(2) { width: 76%; }
        .lp-ats-fake-lines div:nth-child(3) { width: 92%; }
        .lp-ats-fake-lines div:nth-child(4) { width: 68%; }
        @keyframes lpShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        /* ── BENTO FEATURES GRID ──────────── */
        .lp-features { padding: 6rem 1.5rem 3rem; background: white; }
        .lp-bento-grid {
          max-width: 1100px; margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          grid-template-rows: auto;
          gap: 1.25rem;
        }
        @media (min-width: 640px) { .lp-bento-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .lp-bento-grid { grid-template-columns: repeat(3, 1fr); } }
        .lp-bento-card {
          padding: 2rem; border-radius: 24px;
          border: 1px solid #e2e8f0; background: white;
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
          position: relative; overflow: hidden;
          opacity: 0; transform: translateY(30px);
        }
        .lp-bento-card.revealed { opacity: 1; transform: translateY(0); }
        .lp-bento-card:nth-child(1) { transition-delay: 0.05s; }
        .lp-bento-card:nth-child(2) { transition-delay: 0.1s; }
        .lp-bento-card:nth-child(3) { transition-delay: 0.15s; }
        .lp-bento-card:nth-child(4) { transition-delay: 0.2s; }
        .lp-bento-card:nth-child(5) { transition-delay: 0.25s; }
        .lp-bento-card:nth-child(6) { transition-delay: 0.3s; }
        @media (min-width: 1024px) {
          .lp-bento-wide { grid-column: span 2; }
        }
        .lp-bento-card::before {
          content: ''; position: absolute; inset: -1px; border-radius: 25px;
          background: linear-gradient(135deg, var(--blue), #60a5fa, var(--blue-dark), #93c5fd);
          background-size: 300% 300%;
          animation: lpGradBorder 4s ease infinite;
          z-index: -1; opacity: 0; transition: opacity 0.4s ease;
        }
        .lp-bento-card::after {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.72) 45%, transparent 70%);
          transform: translateX(-120%);
          transition: transform 0.8s ease;
          pointer-events: none;
        }
        @keyframes lpGradBorder {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .lp-bento-card:hover { transform: translateY(-6px); box-shadow: 0 24px 48px rgba(37,99,235,0.1); border-color: transparent; }
        .lp-bento-card:hover::before { opacity: 1; }
        .lp-bento-card:hover::after { transform: translateX(120%); }
        .lp-bento-highlight {
          background: linear-gradient(135deg, var(--blue-light) 0%, white 100%);
        }
        .lp-bento-icon {
          width: 56px; height: 56px; border-radius: 16px;
          background: var(--blue-light); border: 1px solid var(--blue-mid);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.6rem; margin-bottom: 1.25rem; transition: all 0.35s ease;
        }
        .lp-bento-card:hover .lp-bento-icon { background: var(--blue); transform: scale(1.1) rotate(-5deg); }
        .lp-bento-title { font-size: 1.1rem; font-weight: 700; color: var(--dark); margin-bottom: 0.6rem; }
        .lp-bento-desc { color: var(--gray); font-size: 0.9rem; line-height: 1.65; }
        .lp-bento-badge {
          display: inline-block; margin-top: 1rem;
          background: var(--blue); color: white;
          padding: 0.25rem 0.7rem; border-radius: 20px;
          font-size: 0.72rem; font-weight: 700;
        }

        /* ── LIVE ACTIVITY FEED ───────────── */
        .lp-activity {
          padding: 5rem 0;
          background: var(--blue-light);
          border-top: 1px solid var(--blue-mid);
          border-bottom: 1px solid var(--blue-mid);
          overflow: hidden;
        }
        .lp-activity-header {
          text-align: center; margin-bottom: 2.5rem; padding: 0 1.5rem;
        }
        .lp-activity-label {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(37,99,235,0.12); color: var(--blue);
          border: 1px solid var(--blue-mid); border-radius: 30px;
          padding: 0.4rem 1rem; font-size: 0.8rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.75rem;
        }
        .lp-activity-live-dot {
          width: 7px; height: 7px; background: #22c55e;
          border-radius: 50%; animation: lpPulse 1.5s infinite;
        }
        .lp-activity-title { font-size: clamp(1.5rem, 3vw, 2rem); font-weight: 800; color: var(--dark); }
        .lp-activity-scroll-row {
          display: flex; gap: 1rem; width: max-content;
          animation: lpFeedLeft 35s linear infinite;
          padding: 0.5rem 0;
        }
        .lp-activity-scroll-row:hover { animation-play-state: paused; }
        @keyframes lpFeedLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .lp-activity-card {
          flex-shrink: 0; display: flex; align-items: center; gap: 0.75rem;
          background: white; border: 1px solid var(--blue-mid);
          border-radius: 14px; padding: 0.9rem 1.25rem;
          white-space: nowrap; transition: all 0.3s;
          box-shadow: 0 2px 8px rgba(37,99,235,0.06);
        }
        .lp-activity-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(37,99,235,0.12); border-color: var(--blue); }
        .lp-activity-icon { font-size: 1.1rem; }
        .lp-activity-text { font-size: 0.88rem; font-weight: 600; color: var(--dark); }
        .lp-activity-time { font-size: 0.75rem; color: var(--gray); padding-left: 0.75rem; border-left: 1px solid #e2e8f0; }

        .lp-campus {
          padding: 5rem 1.5rem;
          background:
            radial-gradient(circle at top right, rgba(37,99,235,0.08), transparent 28%),
            linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .lp-campus-wrap {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: center;
          opacity: 0;
          transform: translateY(28px);
          transition: all 0.7s ease;
        }
        .lp-campus-wrap.revealed { opacity: 1; transform: translateY(0); }
        @media (min-width: 960px) {
          .lp-campus-wrap { grid-template-columns: 1fr 1fr; }
        }
        .lp-campus-copy { text-align: left; }
        .lp-campus-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin: 1.5rem 0 2rem;
        }
        .lp-campus-pills span {
          padding: 0.7rem 1rem;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: white;
          color: #1e3a8a;
          font-size: 0.85rem;
          font-weight: 700;
          box-shadow: 0 10px 24px rgba(37,99,235,0.08);
        }
        .lp-campus-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.9rem;
        }
        .lp-campus-card {
          border: 1px solid #dbeafe;
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(239,246,255,0.94) 100%);
          border-radius: 28px;
          padding: 1.5rem;
          box-shadow: 0 24px 60px rgba(37,99,235,0.10);
        }
        .lp-campus-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .lp-campus-badge,
        .lp-campus-count {
          border-radius: 999px;
          padding: 0.55rem 0.9rem;
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .lp-campus-badge {
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
        }
        .lp-campus-count {
          background: white;
          border: 1px solid #e2e8f0;
          color: #334155;
        }
        .lp-campus-visual {
          border-radius: 24px;
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 48%, #60a5fa 100%);
          padding: 1.5rem;
          color: white;
        }
        .lp-campus-visual img {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(255,255,255,0.96);
          padding: 0.45rem;
          margin-bottom: 1.25rem;
        }
        .lp-campus-visual-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .lp-campus-visual-grid div {
          border: 1px solid rgba(255,255,255,0.18);
          background: rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 1rem;
          backdrop-filter: blur(10px);
        }
        .lp-campus-visual-grid strong {
          display: block;
          font-size: 0.92rem;
          margin-bottom: 0.35rem;
        }
        .lp-campus-visual-grid span {
          display: block;
          font-size: 0.82rem;
          line-height: 1.6;
          color: rgba(255,255,255,0.84);
        }
        .lp-campus-strip {
          padding: 0 0 4rem;
          background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
          overflow: hidden;
        }
        .lp-campus-strip-head {
          max-width: 1200px;
          margin: 0 auto 1.25rem;
          padding: 0 1.5rem;
        }
        .lp-campus-strip-track {
          display: flex;
          gap: 1rem;
          width: max-content;
          animation: lpTickerLeft 24s linear infinite;
          padding: 0.4rem 0;
        }
        .lp-campus-strip-track:hover { animation-play-state: paused; }
        .lp-campus-pill {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.15rem;
          border-radius: 999px;
          border: 1px solid #dbeafe;
          background: rgba(255,255,255,0.92);
          box-shadow: 0 14px 36px rgba(37,99,235,0.08);
          backdrop-filter: blur(16px);
        }
        .lp-campus-pill-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb, #60a5fa);
          box-shadow: 0 0 0 6px rgba(37,99,235,0.08);
        }
        .lp-campus-pill strong {
          font-size: 0.9rem;
          color: var(--dark);
        }
        .lp-campus-pill span {
          font-size: 0.78rem;
          color: var(--gray);
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 700;
        }
        .lp-campus-cta {
          padding: 0 1.5rem 6rem;
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .lp-campus-cta-box {
          max-width: 1200px;
          margin: 0 auto;
          border-radius: 36px;
          padding: 2.1rem;
          border: 1px solid rgba(37,99,235,0.14);
          background:
            radial-gradient(circle at top left, rgba(37,99,235,0.12), transparent 26%),
            radial-gradient(circle at 85% 20%, rgba(96,165,250,0.16), transparent 24%),
            linear-gradient(135deg, #ffffff 0%, #f8fbff 52%, #eef4ff 100%);
          box-shadow: 0 30px 80px rgba(37,99,235,0.10);
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.75rem;
          align-items: center;
          position: relative;
          overflow: hidden;
        }
        @media (min-width: 960px) {
          .lp-campus-cta-box {
            grid-template-columns: 1.1fr 0.9fr;
            padding: 2.6rem 2.8rem;
          }
        }
        .lp-campus-cta-copy p {
          max-width: 640px;
        }
        .lp-campus-cta-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.9rem;
          margin-top: 1.5rem;
        }
        .lp-campus-cta-mini {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }
        .lp-campus-cta-mini div {
          border-radius: 24px;
          border: 1px solid rgba(37,99,235,0.12);
          background: rgba(255,255,255,0.92);
          padding: 1.1rem;
          box-shadow: 0 16px 40px rgba(37,99,235,0.06);
          transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
        }
        .lp-campus-cta-mini div:hover {
          transform: translateY(-4px);
          border-color: rgba(37,99,235,0.24);
          box-shadow: 0 20px 46px rgba(37,99,235,0.10);
        }
        .lp-campus-cta-mini strong {
          display: block;
          font-size: 1.1rem;
          color: var(--dark);
          margin-bottom: 0.3rem;
        }
        .lp-campus-cta-mini span {
          display: block;
          font-size: 0.82rem;
          color: var(--gray);
          line-height: 1.6;
        }

        /* ── ALL REFERRALS TICKER ─────────── */
        .lp-all-refs {
          padding: 2rem 0 4rem; background: white; overflow: hidden;
        }
        .lp-all-refs-header { padding: 0 1.5rem; max-width: 1200px; margin: 0 auto 1.5rem; }
        .lp-ticker-wrap { position: relative; overflow: hidden; margin-bottom: 0; }
        .lp-ticker-row {
          display: flex; gap: 1.25rem;
          animation: lpTickerLeft 40s linear infinite;
          width: max-content; padding: 0.5rem 0;
        }
        .lp-ticker-row:hover { animation-play-state: paused; }
        @keyframes lpTickerLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .lp-ref-card {
          flex-shrink: 0; width: 280px; height: 240px;
          background: white; border-radius: 20px;
          border: 1px solid #e2e8f0; padding: 1.25rem;
          transition: all 0.3s cubic-bezier(0.4,0,0.2,1);
          position: relative; overflow: hidden; cursor: pointer;
          display: flex; flex-direction: column;
        }
        .lp-ref-card::before {
          content: ''; position: absolute;
          top: 0; left: 0; right: 0; height: 3px;
          background: var(--blue);
          transform: scaleX(0); transform-origin: left; transition: transform 0.3s;
        }
        .lp-ref-card:hover { box-shadow: 0 16px 40px rgba(37,99,235,0.12); transform: translateY(-4px); border-color: var(--blue-mid); }
        .lp-ref-card:hover::before { transform: scaleX(1); }
        .lp-ref-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
        .lp-ref-co-icon {
          width: 40px; height: 40px; border-radius: 10px;
          background: var(--blue-light); display: flex; align-items: center;
          justify-content: center; font-size: 1.2rem; transition: all 0.3s;
        }
        .lp-ref-card:hover .lp-ref-co-icon { background: var(--blue); }
        .lp-ref-badge {
          display: flex; align-items: center; gap: 4px;
          background: #f0fdf4; color: #16a34a;
          border: 1px solid #bbf7d0; border-radius: 20px;
          padding: 0.2rem 0.55rem; font-size: 0.7rem; font-weight: 700;
        }
        .lp-ref-badge-dot { width: 5px; height: 5px; background: #16a34a; border-radius: 50%; animation: lpPulse 1.5s infinite; }
        .lp-ref-job-title {
          font-size: 0.95rem; font-weight: 800; color: var(--dark);
          margin-bottom: 0.15rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .lp-ref-company { font-size: 0.82rem; color: var(--blue); font-weight: 600; margin-bottom: 0.5rem; }
        .lp-ref-meta { display: flex; gap: 0.5rem; overflow: hidden; margin-bottom: 0.5rem; }
        .lp-ref-meta-row { display: flex; align-items: center; gap: 0.3rem; font-size: 0.75rem; color: #64748b; white-space: nowrap; }
        .lp-ref-skills { display: flex; gap: 0.3rem; overflow: hidden; margin-bottom: 0; }
        .lp-ref-skill {
          background: var(--blue-light); color: var(--blue);
          padding: 0.18rem 0.55rem; border-radius: 6px;
          font-size: 0.68rem; font-weight: 600; white-space: nowrap; flex-shrink: 0;
        }
        .lp-ref-apply {
          display: flex; align-items: center; justify-content: center; gap: 0.4rem;
          width: 100%; padding: 0.6rem; background: var(--dark); color: white; border-radius: 10px;
          font-size: 0.82rem; font-weight: 700; cursor: pointer;
          transition: all 0.3s; text-decoration: none; margin-top: auto; flex-shrink: 0;
        }
        .lp-ref-apply:hover { background: var(--blue); }
        .lp-ticker-fade-l, .lp-ticker-fade-r {
          position: absolute; top: 0; bottom: 0; width: 120px; z-index: 5; pointer-events: none;
        }
        .lp-ticker-fade-l { left: 0; background: linear-gradient(90deg, white, transparent); }
        .lp-ticker-fade-r { right: 0; background: linear-gradient(270deg, white, transparent); }
        .lp-refs-show-all { text-align: center; margin-top: 2.5rem; padding: 0 1.25rem; }
        @media (max-width: 640px) { .lp-ref-card { width: 230px; height: 220px; padding: 1rem; } }

        /* ── HOW IT WORKS ─────────────────── */
        .lp-how { padding: 6rem 1.5rem; background: #f8faff; }
        .lp-how-grid {
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr; gap: 1.5rem;
        }
        @media (min-width: 640px) { .lp-how-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (min-width: 1024px) { .lp-how-grid { grid-template-columns: repeat(4, 1fr); position: relative; } }
        .lp-step {
          text-align: center; padding: 2.5rem 1.5rem;
          border-radius: 24px; background: white;
          border: 1px solid #e2e8f0; transition: all 0.35s ease;
          opacity: 0; transform: translateY(28px); position: relative; z-index: 1;
        }
        .lp-step.revealed { opacity: 1; transform: translateY(0); }
        .lp-step:nth-child(1) { transition-delay: 0.05s; }
        .lp-step:nth-child(2) { transition-delay: 0.15s; }
        .lp-step:nth-child(3) { transition-delay: 0.25s; }
        .lp-step:nth-child(4) { transition-delay: 0.35s; }
        .lp-step:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(37,99,235,0.1); border-color: var(--blue-mid); }
        .lp-step-num-badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 28px; height: 28px; background: var(--blue); color: white;
          border-radius: 8px; font-size: 0.72rem; font-weight: 800; margin-bottom: 1.25rem;
        }
        .lp-step-icon {
          font-size: 2rem; width: 64px; height: 64px; border-radius: 18px;
          background: var(--blue-light); border: 1px solid var(--blue-mid);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 1rem; transition: all 0.3s;
        }
        .lp-step:hover .lp-step-icon { background: var(--blue); }
        .lp-step-title { font-size: 1rem; font-weight: 700; color: var(--dark); margin-bottom: 0.6rem; }
        .lp-step-desc { color: var(--gray); font-size: 0.86rem; line-height: 1.65; }

        /* ── CALLOUT STRIP ────────────────── */
        .lp-callout {
          padding: 6rem 1.5rem;
          background: var(--blue);
          position: relative; overflow: hidden; text-align: center;
        }
        .lp-callout::before {
          content: '';
          position: absolute; inset: 0;
          background-image: radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 24px 24px;
        }
        .lp-callout-glow {
          position: absolute; width: 500px; height: 500px; border-radius: 50%;
          background: rgba(255,255,255,0.06); filter: blur(80px);
          top: 50%; left: 50%; transform: translate(-50%, -50%);
          animation: lpGlowPulse 6s ease-in-out infinite;
        }
        .lp-callout-inner { position: relative; z-index: 1; max-width: 800px; margin: 0 auto; }
        .lp-callout-eyebrow {
          display: inline-flex; align-items: center; gap: 0.5rem;
          background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.9);
          border: 1px solid rgba(255,255,255,0.2); border-radius: 30px;
          padding: 0.4rem 1rem; font-size: 0.78rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1.5rem;
        }
        .lp-callout h2 {
          font-size: clamp(2.4rem, 6vw, 4.5rem); font-weight: 900; color: white;
          line-height: 1.08; letter-spacing: -0.03em; margin-bottom: 1.5rem;
        }
        .lp-callout h2 em {
          font-style: normal;
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(219,234,254,0.9));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .lp-callout p { color: rgba(255,255,255,0.75); font-size: 1.1rem; max-width: 480px; margin: 0 auto 2.5rem; line-height: 1.7; }
        .lp-callout-btns { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
        .lp-callout-btn-white {
          background: white; color: var(--blue); border: none;
          padding: 0.9rem 2rem; border-radius: 12px; font-weight: 700; font-size: 1rem;
          cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden;
        }
        .lp-callout-btn-white::after {
          content: ''; position: absolute; top: -50%; left: -75%;
          width: 50%; height: 200%; background: rgba(37,99,235,0.06);
          transform: skewX(-20deg); transition: left 0.5s;
        }
        .lp-callout-btn-white:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
        .lp-callout-btn-white:hover::after { left: 130%; }
        .lp-callout-btn-white:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        .lp-callout-btn-ghost {
          background: transparent; color: white;
          border: 1.5px solid rgba(255,255,255,0.4); padding: 0.9rem 2rem; border-radius: 12px;
          font-weight: 600; font-size: 1rem; cursor: pointer; text-decoration: none;
          transition: all 0.3s; display: inline-flex; align-items: center;
        }
        .lp-callout-btn-ghost:hover { border-color: white; background: rgba(255,255,255,0.1); transform: translateY(-2px); }
        .lp-callout-reveal { opacity: 0; transform: translateY(30px); transition: all 0.7s ease; }
        .lp-callout-reveal.revealed { opacity: 1; transform: translateY(0); }

        /* ── TESTIMONIALS ─────────────────── */
        .lp-testimonials { padding: 6rem 1.5rem; background: white; }
        .lp-testi-grid {
          max-width: 960px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr; gap: 1.25rem;
        }
        @media (min-width: 768px) { .lp-testi-grid { grid-template-columns: repeat(2, 1fr); } }
        .lp-testi-card {
          background: #fafcff; border: 1px solid var(--blue-mid);
          border-radius: 24px; padding: 2rem;
          transition: all 0.35s ease;
          opacity: 0; transform: translateY(24px); position: relative; overflow: hidden;
        }
        .lp-testi-card.revealed { opacity: 1; transform: translateY(0); }
        .lp-testi-card.active {
          border-color: rgba(37,99,235,0.4);
          box-shadow: 0 24px 50px rgba(37,99,235,0.14);
          background: linear-gradient(180deg, #ffffff, #f5f9ff);
        }
        .lp-testi-card:nth-child(1) { transition-delay: 0.05s; }
        .lp-testi-card:nth-child(2) { transition-delay: 0.1s; }
        .lp-testi-card:nth-child(3) { transition-delay: 0.15s; }
        .lp-testi-card:nth-child(4) { transition-delay: 0.2s; }
        .lp-testi-card:hover { transform: translateY(-6px); box-shadow: 0 20px 40px rgba(37,99,235,0.1); border-color: var(--blue); }
        .lp-testi-card::after {
          content: '"'; position: absolute; top: 0.75rem; right: 1.25rem;
          font-size: 6rem; color: var(--blue-mid); font-family: Georgia, serif; line-height: 1;
        }
        .lp-testi-card::before {
          content: ''; position: absolute; left: -10%; bottom: -20%;
          width: 140px; height: 140px; border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.12), rgba(37,99,235,0));
          opacity: 0; transition: opacity 0.35s ease;
        }
        .lp-testi-card.active::before { opacity: 1; }
        .lp-testi-stars { color: #f59e0b; font-size: 0.85rem; margin-bottom: 0.75rem; letter-spacing: 1px; }
        .lp-testi-quote {
          font-size: 0.95rem; color: var(--dark); line-height: 1.75;
          margin-bottom: 1.25rem; position: relative; z-index: 1; font-style: italic;
        }
        .lp-testi-author { display: flex; align-items: center; gap: 0.75rem; }
        .lp-testi-avatar {
          width: 44px; height: 44px; border-radius: 50%;
          background: var(--blue); color: white;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 1rem; flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(37,99,235,0.3);
        }
        .lp-testi-name { font-weight: 700; font-size: 0.9rem; color: var(--dark); }
        .lp-testi-role { font-size: 0.78rem; color: var(--gray); margin-top: 0.1rem; }

        /* ── FOOTER (WHITE) ───────────────── */
        .lp-footer {
          background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          border-top: 1px solid #e2e8f0;
          color: var(--gray);
          padding: 4rem 1.5rem 2rem;
        }
        .lp-footer-inner {
          max-width: 1100px; margin: 0 auto;
          display: grid; grid-template-columns: 1fr; gap: 2.5rem;
        }
        @media (min-width: 640px) { .lp-footer-inner { grid-template-columns: 2fr 1fr 1fr 1fr; } }
        .lp-footer-logo { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 1rem; }
        .lp-footer-logo img { width: 30px; height: 30px; border-radius: 7px; }
        .lp-footer-logo span { font-size: 1.2rem; font-weight: 800; color: var(--dark); }
        .lp-footer-desc { color: #94a3b8; font-size: 0.875rem; line-height: 1.7; }
        .lp-footer-col h4 { color: var(--dark); font-weight: 700; font-size: 0.9rem; margin-bottom: 1rem; }
        .lp-footer-col ul { list-style: none; display: flex; flex-direction: column; gap: 0.6rem; }
        .lp-footer-col a {
          color: #64748b;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s, transform 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
        }
        .lp-footer-col a:hover { color: var(--blue); transform: translateX(3px); }
        .lp-footer-bottom {
          max-width: 1100px; margin: 3rem auto 0;
          padding-top: 2rem; border-top: 1px solid #f1f5f9;
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 1rem; color: #94a3b8; font-size: 0.82rem;
        }
        .lp-footer-badge {
          display: inline-flex; align-items: center; gap: 0.4rem;
          background: var(--blue-light); color: var(--blue);
          border: 1px solid var(--blue-mid); border-radius: 20px;
          padding: 0.3rem 0.75rem; font-size: 0.75rem; font-weight: 600;
          margin-top: 1rem;
        }

        /* ── ERROR ────────────────────────── */
        .lp-error {
          background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;
          padding: 0.9rem 1rem; border-radius: 10px; margin-top: 1rem;
          font-size: 0.9rem; display: flex; justify-content: space-between; align-items: center;
        }
        .lp-error-close { background: none; border: none; color: #dc2626; font-size: 1.2rem; cursor: pointer; }

        /* ── KEYFRAMES ────────────────────── */
        @keyframes lpFadeUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes lpFadeDown { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }

        /* ── SCROLL MARGIN ────────────────── */
        #hero, #features, #how-it-works, #live-jobs { scroll-margin-top: 70px; }

        /* ── MOBILE ───────────────────────── */
        @media (max-width: 480px) {
          .lp-hero { padding: 5.5rem 1rem 3rem; }
          .lp-nav-inner { padding: 0 1rem; }
          .lp-logo-text { font-size: 1.05rem; }
          .lp-hero-inner { gap: 2.5rem; }
          .lp-hero-badge { max-width: 100%; text-align: center; }
          .lp-hero-signals { margin-bottom: 1.4rem; }
          .lp-signal-pill { width: 100%; justify-content: center; }
          .lp-hero-ctas { flex-direction: column; }
          .lp-btn-primary, .lp-btn-secondary, .lp-mobile-menu-btn { justify-content: center; width: 100%; }
          .lp-mockup-card { padding: 1.2rem; max-width: 100%; }
          .lp-mockup-float { display: none; }
          .lp-trust-brand { padding: 0.6rem 1rem; }
          .lp-activity-card { padding: 0.85rem 1rem; }
          .lp-activity-text { font-size: 0.82rem; }
          .lp-ref-card { width: 240px; height: 220px; }
          .lp-stats-inner { grid-template-columns: repeat(2, 1fr); gap: 1.5rem; }
          .lp-callout { padding: 4rem 1.25rem; }
        }
      `}</style>

      {/* NAVBAR */}
      <nav className={`lp-nav ${scrolled ? "scrolled" : ""}`}>
        <div className="lp-progress-bar" style={{ width: `${scrollProgress}%` }}></div>
        <div className="lp-nav-inner">
          <a href="#hero" className="lp-logo">
            <img src="/logo.png" alt="ReferralMe" />
            <span className="lp-logo-text"><span className="r">Referral</span><span className="m">Me</span></span>
          </a>
          <ul className="lp-nav-links">
            <li><a href="#hero" className={activeSection === "hero" ? "active" : ""}>Home</a></li>
            <li><a href="#resume-scan" className={activeSection === "resume-scan" ? "active" : ""}>Free ATS Scan</a></li>
            <li><a href="#features" className={activeSection === "features" ? "active" : ""}>Features</a></li>
            <li><a href="#how-it-works" className={activeSection === "how-it-works" ? "active" : ""}>How It Works</a></li>
            <li><a href="#live-jobs" className={activeSection === "live-jobs" ? "active" : ""}>Live Jobs</a></li>
            <li><a href="/campus-ambassador">Campus Program</a></li>
          </ul>
          <div className="lp-nav-right">
            <button className="lp-nav-btn" onClick={handleGetStarted} disabled={isSigningIn}>
              {isSigningIn ? "Signing in…" : "Get Started →"}
            </button>
            <button className={`lp-hamburger ${isMenuOpen ? "open" : ""}`} onClick={() => setIsMenuOpen(o => !o)} aria-label="Menu">
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </nav>

      {/* MOBILE MENU */}
      <div className={`lp-mobile-menu ${isMenuOpen ? "open" : ""}`}>
        <a href="#hero" onClick={() => setIsMenuOpen(false)}>🏠 Home</a>
        <a href="#resume-scan" onClick={() => setIsMenuOpen(false)}>📄 Free ATS Scan</a>
        <a href="#features" onClick={() => setIsMenuOpen(false)}>⚡ Features</a>
        <a href="#how-it-works" onClick={() => setIsMenuOpen(false)}>🔢 How It Works</a>
        <a href="#live-jobs" onClick={() => setIsMenuOpen(false)}>💼 Live Jobs</a>
        <a href="/campus-ambassador" onClick={() => setIsMenuOpen(false)}>🎓 Campus Program</a>
        <button className="lp-mobile-menu-btn" onClick={() => { setIsMenuOpen(false); handleGetStarted(); }}>
          {isSigningIn ? "Signing in…" : "Get Started Free →"}
        </button>
      </div>

      {/* HERO */}
      <section id="hero" className="lp-hero">
        <div className="lp-hero-dot-grid"></div>
        <div className="lp-hero-glow lp-hero-glow-1"></div>
        <div className="lp-hero-glow lp-hero-glow-2"></div>

        <div className="lp-hero-inner">
          <div>
            <div className="lp-hero-badge">
              <span className="lp-hero-badge-dot"></span>
              India's #1 Referral Platform
            </div>
            <h1>Land Your Dream Job as a</h1>
            <div className="lp-hero-role-line">
              {typedRole}<span className="lp-typewriter-cursor"></span>
            </div>
            <p className="lp-hero-sub">
              Connect with verified professionals at top companies. Skip the ATS black hole and get your resume seen by the right people — fast.
            </p>
            <div className="lp-hero-signals">
              <div className="lp-signal-pill">
                <span className="lp-signal-dot"></span>
                Next up: <strong key={heroSignal}>{heroSignal}</strong>
              </div>
              <div className="lp-signal-mini">Live roles from verified referrers</div>
            </div>
            <div className="lp-hero-ctas">
              <button className="lp-btn-primary" onClick={handleGetStarted} disabled={isSigningIn}>
                {isSigningIn ? "Signing in…" : "Start Free Today"} <span>🚀</span>
              </button>
              <a href="#how-it-works" className="lp-btn-secondary">See How It Works</a>
            </div>
            <div className="lp-hero-trust">
              <div className="lp-trust-avatars">
                {["P","R","A","K"].map((l, i) => <div key={i} className="lp-trust-avatar">{l}</div>)}
              </div>
              <span>Trusted by <strong>10,000+</strong> professionals across India</span>
            </div>
            {signInError && (
              <div className="lp-error">
                <span>{signInError}</span>
                <button className="lp-error-close" onClick={() => setSignInError(null)}>×</button>
              </div>
            )}
            <div style={{ marginTop: "1.5rem" }}>
              <LiveAnimatedStats />
            </div>
          </div>

          <div className="lp-hero-visual">
            <div className="lp-mockup-card">
              <div className="lp-mockup-float lp-float-1">
                <span className="lp-float-icon">✅</span> Referral Sent!
              </div>
              <div className="lp-mockup-float lp-float-2">
                <span className="lp-float-icon">🎉</span> Interview Scheduled
              </div>
              <div className="lp-mockup-header">
                <div className="lp-dot lp-dot-r"></div>
                <div className="lp-dot lp-dot-y"></div>
                <div className="lp-dot lp-dot-g"></div>
              </div>
              <div className="lp-mockup-job-icon">💼</div>
              <p className="lp-mockup-company">Google India</p>
              <h3 className="lp-mockup-title">Senior SDE – II</h3>
              <p className="lp-mockup-loc">📍 Bengaluru, Remote OK</p>
              <div className="lp-mockup-tags">
                <span className="lp-mockup-tag">React</span>
                <span className="lp-mockup-tag">Node.js</span>
                <span className="lp-mockup-tag">System Design</span>
              </div>
              <button className="lp-mockup-cta" onClick={handleGetStarted}>Request Referral ✨</button>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="lp-trust-bar">
        <p className="lp-trust-label">Referrals available at top companies</p>
        <div className="lp-trust-track-wrap">
          <div className="lp-trust-scroll">
            {[...trustBrands, ...trustBrands].map((b, i) => (
              <div key={i} className="lp-trust-brand">
                <span className="lp-trust-brand-icon"><b.Icon size={24} color={b.color} /></span>
                <span className="lp-trust-brand-name">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* STATS */}
      <section className="lp-stats">
        <div ref={statsReveal.ref} className="lp-stats-inner">
          {stats.map((s, i) => (
            <div key={i} className={`lp-stat-item ${statsReveal.visible ? "revealed" : ""}`}>
              <span className="lp-stat-icon">{s.icon}</span>
              <span className="lp-stat-num">{s.number}</span>
              <span className="lp-stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FREE ATS SCAN */}
      <section id="resume-scan" className="lp-ats">
        <div ref={atsReveal.ref} className={`lp-section-header ${atsReveal.visible ? "revealed" : ""}`}>
          <div className="lp-section-tag">Lead Magnet</div>
          <h2 className="lp-section-title">Free ATS Resume Scan With a <span>Locked Full Report</span></h2>
          <p className="lp-section-sub">
            See how your resume performs before it reaches a recruiter, then unlock the full personalized report after signup.
          </p>
        </div>

        <div className="lp-ats-wrap">
          <div className="lp-ats-panel">
            <h3>Free ATS Resume Scan</h3>
            <p>
              Understand how your resume is likely to perform in ATS screening and what to improve before you apply.
            </p>

            <div className="lp-ats-upload">
              <div className="lp-ats-upload-row">
                <div>
                  <div className="lp-ats-file">Upload your resume after signup</div>
                  <p className="lp-ats-helper" style={{ marginTop: "0.35rem" }}>
                    Get a deeper ATS report, keyword insights, and improvement guidance inside your seeker dashboard.
                  </p>
                </div>
              </div>
            </div>

            <p className="lp-ats-helper">
              Get a quick preview now. Unlock the complete ATS breakdown, keyword analysis, and resume improvement suggestions after signup.
            </p>

            <div className="lp-ats-preview-grid" style={{ marginTop: "1rem" }}>
              <div className="lp-ats-preview-card">
                <h4>What you get</h4>
                <ul className="lp-ats-list">
                  <li className="lp-ats-list-positive"><span>✓</span>ATS score based on resume quality and relevance</li>
                  <li className="lp-ats-list-positive"><span>✓</span>Keyword gap analysis for stronger applications</li>
                  <li className="lp-ats-list-positive"><span>✓</span>Practical suggestions to improve recruiter visibility</li>
                </ul>
              </div>
              <div className="lp-ats-preview-card">
                <h4>Why it matters</h4>
                <ul className="lp-ats-list">
                  <li className="lp-ats-list-warning"><span>1</span>Spot issues before your resume gets screened out</li>
                  <li className="lp-ats-list-warning"><span>2</span>Improve job-specific keyword alignment</li>
                  <li className="lp-ats-list-warning"><span>3</span>Apply with more confidence through referrals</li>
                </ul>
              </div>
            </div>

            <button className="lp-ats-submit" onClick={handleGetStarted} disabled={isSigningIn}>
              {isSigningIn ? "Signing in..." : "Sign Up for Full ATS Report"}
            </button>
          </div>

          <div className="lp-ats-result">
            <>
              <div className="lp-ats-result-header">
                <div className="lp-ats-score-wrap">
                  <div className="lp-ats-score">84</div>
                  <div>
                    <div className="lp-ats-tone strong">Strong</div>
                    <h3 style={{ marginTop: "0.75rem" }}>ATS score preview</h3>
                    <p>A quick snapshot of how a resume may perform in applicant tracking systems.</p>
                  </div>
                </div>
              </div>

              <div className="lp-ats-preview-grid">
                <div className="lp-ats-preview-card">
                  <h4>Visible Strengths</h4>
                  <ul className="lp-ats-list">
                    <li className="lp-ats-list-positive"><span>+</span>Relevant role-specific keywords are already present</li>
                    <li className="lp-ats-list-positive"><span>+</span>Experience is structured clearly for ATS review</li>
                    <li className="lp-ats-list-positive"><span>+</span>Resume formatting supports better readability</li>
                  </ul>
                </div>

                <div className="lp-ats-preview-card">
                  <h4>Visible Fixes</h4>
                  <ul className="lp-ats-list">
                    <li className="lp-ats-list-warning"><span>1</span>Add more quantified impact to recent work</li>
                    <li className="lp-ats-list-warning"><span>2</span>Strengthen keyword alignment for target roles</li>
                    <li className="lp-ats-list-warning"><span>3</span>Refine summary and skills prioritization</li>
                  </ul>
                </div>

                <div className="lp-ats-locked">
                  <div className="lp-ats-locked-inner">
                    <h4>Locked Full Report</h4>
                    <p>Unlock keyword gaps, matched keywords, deeper score breakdown, and personalized resume guidance after signup.</p>
                    <div className="lp-ats-fake-lines">
                      <div></div>
                      <div></div>
                      <div></div>
                      <div></div>
                    </div>
                    <button className="lp-ats-unlock" onClick={handleGetStarted} disabled={isSigningIn}>
                      {isSigningIn ? "Signing in..." : "Unlock Full ATS Report"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          </div>
        </div>
      </section>

      {/* BENTO FEATURES GRID */}
      <section id="features" className="lp-features">
        <div ref={featuresReveal.ref} className={`lp-section-header ${featuresReveal.visible ? "revealed" : ""}`}>
          <div className="lp-section-tag">Platform Features</div>
          <h2 className="lp-section-title">Everything You Need to <span>Get Hired</span></h2>
          <p className="lp-section-sub">
            From AI-powered resume analysis to direct referrals — every tool to accelerate your career.
          </p>
        </div>
        <div className="lp-bento-grid">
          {features.map((f, i) => (
            <div
              key={i}
              className={`lp-bento-card ${f.wide ? "lp-bento-wide" : ""} ${f.highlight ? "lp-bento-highlight" : ""} ${featuresReveal.visible ? "revealed" : ""}`}
            >
              <div className="lp-bento-icon">{f.icon}</div>
              <h3 className="lp-bento-title">{f.title}</h3>
              <p className="lp-bento-desc">{f.desc}</p>
              {f.highlight && <span className="lp-bento-badge">Most Popular ✨</span>}
            </div>
          ))}
        </div>
      </section>

      {/* LIVE JOBS SCROLL */}
      {/* <LiveJobsSection /> */}

      {/* LIVE ACTIVITY FEED */}
      <section className="lp-activity">
        <div className="lp-activity-header">
          <div className="lp-activity-label">
            <span className="lp-activity-live-dot"></span>
            Live Activity
          </div>
          <h2 className="lp-activity-title">Happening right now on ReferralMe</h2>
        </div>
        <div className="lp-ticker-wrap">
          <div className="lp-activity-scroll-row">
            {[...activityFeed, ...activityFeed].map((a, i) => (
              <div key={i} className="lp-activity-card">
                <span className="lp-activity-icon">{a.icon}</span>
                <span className="lp-activity-text">{a.text}</span>
                <span className="lp-activity-time">{a.time}</span>
              </div>
            ))}
          </div>
          <div className="lp-ticker-fade-l"></div>
          <div className="lp-ticker-fade-r" style={{ background: "linear-gradient(270deg, #eff6ff, transparent)" }}></div>
        </div>
      </section>

      <section id="campus-program" className="lp-campus">
        <div ref={campusReveal.ref} className={`lp-campus-wrap ${campusReveal.visible ? "revealed" : ""}`}>
          <div className="lp-campus-copy">
            <div className="lp-section-tag">Campus Program</div>
            <h2 className="lp-section-title">Build ReferralMe inside your <span>college</span></h2>
            <p className="lp-section-sub">
              The ReferralMe Campus Ambassador Program is live for students who want to lead growth, run campus visibility, complete weekly missions, and earn real recognition.
            </p>
            <div className="lp-campus-pills">
              <span>Weekly missions</span>
              <span>Certificates & rewards</span>
              <span>Campus leadership</span>
              <span>Public recognition</span>
            </div>
            <div className="lp-campus-actions">
              <a href="/campus-ambassador" className="lp-btn-primary">Explore Campus Program</a>
              <a href="/campus-ambassador/apply" className="lp-btn-secondary">Apply as Ambassador</a>
            </div>
          </div>
          <div className="lp-campus-card">
            <div className="lp-campus-card-top">
              <div className="lp-campus-badge">ReferralMe Campus Ambassador</div>
              <div className="lp-campus-count">Now live</div>
            </div>
            <div className="lp-campus-visual">
              <img src="/logo.png" alt="ReferralMe Campus Program" />
              <div className="lp-campus-visual-grid">
                <div>
                  <strong>Program</strong>
                  <span>Student ambassadors across colleges</span>
                </div>
                <div>
                  <strong>Focus</strong>
                  <span>Visibility, growth, and community momentum</span>
                </div>
                <div>
                  <strong>Rewards</strong>
                  <span>Certificate, merch, and top performer recognition</span>
                </div>
                <div>
                  <strong>Flow</strong>
                  <span>Landing page, apply form, dashboard, and admin review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-campus-strip">
        <div className="lp-campus-strip-head">
          <div className="lp-section-tag">Now Active in Colleges</div>
        </div>
        <div className="lp-ticker-wrap">
          <div className="lp-campus-strip-track">
            {[
              { name: "DTU", label: "Campus momentum" },
              { name: "VIT", label: "Student growth" },
              { name: "SRCC", label: "Leadership" },
              { name: "NMIMS", label: "Referral awareness" },
              { name: "Dronacharya", label: "Ambassador activity" },
              { name: "Amity", label: "Campus visibility" },
              { name: "Manipal", label: "Weekly missions" },
              { name: "Christ", label: "Program expansion" },
              { name: "DTU", label: "Campus momentum" },
              { name: "VIT", label: "Student growth" },
              { name: "SRCC", label: "Leadership" },
              { name: "NMIMS", label: "Referral awareness" },
            ].map((college, index) => (
              <div key={`${college.name}-${index}`} className="lp-campus-pill">
                <span className="lp-campus-pill-dot"></span>
                <div>
                  <strong>{college.name}</strong>
                  <span>{college.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="lp-ticker-fade-l"></div>
          <div className="lp-ticker-fade-r" style={{ background: "linear-gradient(270deg, #ffffff, transparent)" }}></div>
        </div>
      </section>

      {/* ALL REAL REFERRALS — SCROLLING TICKER */}
      <section id="all-referrals" className="lp-all-refs">
        <div ref={allJobsReveal.ref} className={`lp-section-header lp-all-refs-header ${allJobsReveal.visible ? "revealed" : ""}`}>
          <div className="lp-section-tag">Live Referral Board</div>
          <h2 className="lp-section-title">Browse All <span>Active Referrals</span></h2>
          <p className="lp-section-sub">
            Real job postings from verified professionals — updated live. Hover to pause, click to apply.
          </p>
        </div>

        {allJobs.length > 0 && (
          <div className="lp-ticker-wrap">
            <div className="lp-ticker-row">
              {[...allJobs, ...allJobs].map((job, i) => (
                <Link key={`r1-${i}`} href={`/job-details/${job.id}`}>
                  <div className="lp-ref-card">
                    <div className="lp-ref-card-top">
                      <div className="lp-ref-co-icon">💼</div>
                      <span className="lp-ref-badge"><span className="lp-ref-badge-dot"></span>Open</span>
                    </div>
                    <h3 className="lp-ref-job-title">{job.title}</h3>
                    <p className="lp-ref-company">{job.company}</p>
                    <div className="lp-ref-meta">
                      <div className="lp-ref-meta-row">📍 <span>{job.location}</span></div>
                      {job.salary && <div className="lp-ref-meta-row">₹ <span>{job.salary}</span></div>}
                    </div>
                    {job.skills && job.skills.length > 0 && (
                      <div className="lp-ref-skills">
                        {job.skills.slice(0, 3).map((sk, si) => <span key={si} className="lp-ref-skill">{sk}</span>)}
                        {job.skills.length > 3 && <span className="lp-ref-skill">+{job.skills.length - 3}</span>}
                      </div>
                    )}
                    <span className="lp-ref-apply">Apply Now →</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="lp-ticker-fade-l"></div>
            <div className="lp-ticker-fade-r"></div>
          </div>
        )}

        <div className="lp-refs-show-all">
          <button className="lp-btn-primary" onClick={handleGetStarted} disabled={isSigningIn} style={{ margin: "0 auto" }}>
            {isSigningIn ? "Signing in…" : "Sign Up to Apply to All Referrals 🚀"}
          </button>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="lp-how">
        <div ref={howReveal.ref} className={`lp-section-header ${howReveal.visible ? "revealed" : ""}`}>
          <div className="lp-section-tag">The Process</div>
          <h2 className="lp-section-title">Get Referred in <span>4 Simple Steps</span></h2>
          <p className="lp-section-sub">
            Our streamlined process gets you from signup to referral in minutes, not weeks.
          </p>
        </div>
        <div className="lp-how-grid">
          {steps.map((s, i) => (
            <div key={i} className={`lp-step ${howReveal.visible ? "revealed" : ""}`}>
              <div className="lp-step-num-badge">{s.num}</div>
              <div className="lp-step-icon">{s.icon}</div>
              <h3 className="lp-step-title">{s.title}</h3>
              <p className="lp-step-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* BOLD CALLOUT STRIP */}
      <section className="lp-callout">
        <div className="lp-callout-glow"></div>
        <div ref={calloutReveal.ref} className={`lp-callout-inner lp-callout-reveal ${calloutReveal.visible ? "revealed" : ""}`}>
          <div className="lp-callout-eyebrow">⚡ The Fastest Path to Your Dream Job</div>
          <h2>The referral that changes<br /><em>everything.</em></h2>
          <p>One referral can be the difference between getting ignored and getting hired. ReferralMe makes it happen — at scale, in India.</p>
          <div className="lp-callout-btns">
            <button className="lp-callout-btn-white" onClick={handleGetStarted} disabled={isSigningIn}>
              {isSigningIn ? "Signing in…" : "Get My First Referral"}
            </button>
            <a href="#features" className="lp-callout-btn-ghost">Explore Features →</a>
          </div>
        </div>
      </section>

      <section className="lp-campus-cta">
        <div className="lp-campus-cta-box">
          <div className="lp-campus-cta-copy">
            <div className="lp-section-tag">Students Also Join ReferralMe</div>
            <h2 className="lp-section-title">Students can use ReferralMe for <span>careers</span> too</h2>
            <p className="lp-section-sub">
              The campus ambassador program is only one side. Students can also join ReferralMe directly to access referrals, scan their resumes, and discover live opportunities from verified professionals.
            </p>
            <div className="lp-campus-cta-actions">
              <button className="lp-btn-primary" onClick={handleGetStarted} disabled={isSigningIn}>
                {isSigningIn ? "Signing in…" : "Join ReferralMe"}
              </button>
              <a href="/campus-ambassador" className="lp-btn-secondary">Explore Campus Program</a>
            </div>
          </div>
          <div className="lp-campus-cta-mini">
            <div>
              <strong>Free ATS Scan</strong>
              <span>Students can test and improve resume quality before applying.</span>
            </div>
            <div>
              <strong>Real Referrals</strong>
              <span>Access verified professionals and live opportunities on one platform.</span>
            </div>
            <div>
              <strong>Campus Growth</strong>
              <span>Ambassadors can represent ReferralMe and build college visibility.</span>
            </div>
            <div>
              <strong>Career Momentum</strong>
              <span>One platform for referrals, jobs, visibility, and student growth.</span>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="lp-testimonials">
        <div ref={testimonialsReveal.ref} className={`lp-section-header ${testimonialsReveal.visible ? "revealed" : ""}`}>
          <div className="lp-section-tag">Success Stories</div>
          <h2 className="lp-section-title">People Who <span>Got Hired</span></h2>
          <p className="lp-section-sub">
            Real stories from real people who landed their dream jobs through ReferralMe.
          </p>
        </div>
        <div className="lp-testi-grid">
          {testimonials.map((t, i) => (
            <div key={i} className={`lp-testi-card ${testimonialsReveal.visible ? "revealed" : ""} ${activeTestimonial === i ? "active" : ""}`}>
              <div className="lp-testi-stars">★★★★★</div>
              <p className="lp-testi-quote">"{t.text}"</p>
              <div className="lp-testi-author">
                <div className="lp-testi-avatar" style={{ background: t.color }}>{t.avatar}</div>
                <div>
                  <div className="lp-testi-name">{t.name}</div>
                  <div className="lp-testi-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER — WHITE */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div>
            <div className="lp-footer-logo">
              <img src="/logo.png" alt="ReferralMe" />
              <span>ReferralMe</span>
            </div>
            <p className="lp-footer-desc">
              India's leading professional referral platform. Connecting talent with opportunity through authentic, human connections.
            </p>
            <div className="lp-footer-badge">🇮🇳 Made in India</div>
          </div>
          <div className="lp-footer-col">
            <h4>Platform</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><a href="#live-jobs">Live Jobs</a></li>
              <li><a href="/campus-ambassador">Campus Program</a></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/campus-ambassador">Campus Ambassador</a></li>
              <li><a href="mailto:info@referralme.in">Contact</a></li>
            </ul>
          </div>
          <div className="lp-footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
              <li><a href="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a></li>
              <li><a href="mailto:info@referralme.in">Support</a></li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2025 ReferralMe. Built with ❤️ in India.</span>
          <span>Making careers happen, one referral at a time.</span>
        </div>
      </footer>
    </div>
  );
}
