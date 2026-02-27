import { useState, useEffect } from "react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { useLocation } from "wouter";
import { getUserProfile } from "../lib/firestore";

import AnimatedStats from "../components/animated-stats";
import LiveAnimatedStats from "../components/live-animated-stats";
import LiveJobsSection from "../components/live-jobs-section";
export default function NewLanding() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const { user, isLoading, refreshUser } = useFirebaseAuth();
  const [, setLocation] = useLocation();

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setSignInError(null);
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Sign-in error:", error);
      setSignInError(error.message || "Failed to sign in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      const sections = ["hero", "features", "how-it-works", "testimonials"];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // No automatic redirects - users stay on homepage until they click Get Started

  const handleGetStarted = async () => {
    console.log("handleGetStarted called");
    
    // If user is already authenticated, redirect directly to their dashboard
    if (user) {
      console.log("User already authenticated, checking profile...");
      
      if (user.role && user.profileCompleted) {
        // User has complete profile - go directly to dashboard
        const dashboardPath = user.role === "seeker" ? "/seeker-dashboard" : "/referrer-dashboard";
        console.log("User has complete profile, redirecting directly to:", dashboardPath);
        setLocation(dashboardPath);
        return;
      } else if (user.role) {
        // User has role but incomplete profile - go to profile edit
        console.log("Role set but profile incomplete, redirecting to profile edit");
        setLocation("/profile-edit");
        return;
      } else {
        // User without role - go to role selection
        console.log("No role set, redirecting to role selection");
        setLocation("/role-selection");
        return;
      }
    }
    
    // User needs to sign in first - show Google account picker
    try {
      setIsSigningIn(true);
      setSignInError(null);
      console.log("Starting Firebase signInWithPopup with account selection...");
      
      // Use signInWithPopup which will show Google's account picker
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Firebase auth result:", result);
      
      if (result.user) {
        console.log("User signed in successfully:", result.user.email);
        // Simply refresh user data and let the auth context handle the rest
        await refreshUser();
        console.log("User data refreshed after sign-in");
        
        // Navigate based on the updated user data without page reload
        const userData = await getUserProfile(result.user.uid);
        
        if (userData?.role && userData?.profileCompleted) {
          // Existing user with complete profile - go to dashboard
          const dashboardPath = userData.role === "seeker" ? "/seeker-dashboard" : "/referrer-dashboard";
          console.log("Existing user with complete profile, redirecting to:", dashboardPath);
          setLocation(dashboardPath);
        } else if (userData?.role && !userData?.profileCompleted) {
          // User has role but incomplete profile - go to profile edit
          console.log("User has role but incomplete profile, redirecting to profile edit");
          setLocation("/profile-edit");
        } else {
          // New user without role - go to role selection
          console.log("New user without role, redirecting to role selection");
          setLocation("/role-selection");
        }
      }
    } catch (error: any) {
      console.error("Sign-in error:", error);
      setSignInError(error.message || "Failed to sign in. Please try again.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="landing-container">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .landing-container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          font-weight: 400;
          font-size: 1rem;
          line-height: 1.6;
          color: #0f172a;
          overflow-x: hidden;
          background: #ffffff;
        }

        /* Navigation */
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(59, 130, 246, 0.08);
          transition: all 0.3s ease;
          padding: 0.8rem 0;
        }

        .nav-container {
          max-width: 1280px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 1rem;
        }

        @media (min-width: 768px) {
          .navbar {
            padding: 1.2rem 0;
          }
          .nav-container {
            padding: 0 2rem;
          }
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.25rem;
          font-weight: 700;
          color: #2563eb;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        @media (min-width: 768px) {
          .logo {
            gap: 0.8rem;
            font-size: 1.6rem;
          }
        }

        .logo-text {
          display: inline;
          font-size: inherit;
          font-weight: inherit;
          letter-spacing: 0;
        }
        
        .logo-text .referral-part {
          color: #0f172a;
        }
        
        .logo-text .me-part {
          color: #2563eb;
        }

        .logo:hover {
          transform: scale(1.02);
        }

        .logo img {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
        }

        @media (min-width: 768px) {
          .logo img {
            width: 36px;
            height: 36px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
          }
        }

        .nav-links {
          display: none;
          list-style: none;
          gap: 1rem;
          align-items: center;
        }

        @media (min-width: 768px) {
          .nav-links {
            display: flex;
            gap: 2rem;
          }
        }

        .nav-links li a {
          text-decoration: none;
          color: #475569;
          font-weight: 500;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          position: relative;
          padding: 0.5rem 1rem;
          border-radius: 8px;
        }

        .nav-links li a:hover,
        .nav-links li a.active {
          color: #2563eb;
          background: rgba(37, 99, 235, 0.05);
        }

        .nav-cta {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .start-free-btn {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
          position: relative;
          overflow: hidden;
        }

        @media (min-width: 768px) {
          .start-free-btn {
            padding: 0.7rem 1.8rem;
            border-radius: 10px;
            font-size: 0.9rem;
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          }
        }

        .start-free-btn::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s;
        }

        .start-free-btn:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.4);
          background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
        }

        .start-free-btn:hover::before {
          left: 100%;
        }

        .start-free-btn:active {
          transform: translateY(0px) scale(0.98);
          transition: all 0.1s ease;
        }

        .start-free-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .start-free-btn:disabled::before {
          display: none;
        }

        /* Pulse animation for extra attention */
        @keyframes pulse {
          0% {
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          }
          50% {
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4), 0 0 0 4px rgba(37, 99, 235, 0.1);
          }
          100% {
            box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
          }
        }

        .start-free-btn {
          animation: pulse 2s infinite;
        }

        .start-free-btn:hover {
          animation: none;
        }

        /* Hero Section */
        .hero {
          min-height: 100vh;
          display: flex;
          align-items: center;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
          position: relative;
          overflow: hidden;
          padding: 6rem 0 4rem;
        }

        @media (min-width: 768px) {
          .hero {
            padding: 8rem 0 4rem;
          }
        }

        .hero::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: 
            radial-gradient(ellipse at 25% 20%, rgba(37, 99, 235, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse at 75% 80%, rgba(59, 130, 246, 0.06) 0%, transparent 60%);
        }

        .hero-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1rem;
          display: grid;
          grid-template-columns: 1fr;
          gap: 2rem;
          align-items: center;
          position: relative;
          z-index: 1;
          text-align: center;
        }

        @media (min-width: 768px) {
          .hero-container {
            padding: 0 2rem;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 4rem;
            text-align: left;
          }
        }

        .hero-content {
          animation: fadeInUp 0.8s ease-out;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          padding: 0.4rem 0.8rem;
          border-radius: 16px;
          font-size: 0.75rem;
          font-weight: 500;
          margin-bottom: 1rem;
          border: 1px solid rgba(37, 99, 235, 0.1);
          animation: slideInDown 0.6s ease-out;
        }

        @media (min-width: 768px) {
          .hero-badge {
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.85rem;
            margin-bottom: 1.5rem;
          }
        }

        .hero-content h1 {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          color: #0f172a;
          letter-spacing: -0.01em;
        }

        @media (min-width: 768px) {
          .hero-content h1 {
            font-size: 3.5rem;
          }
        }

        .hero-content .highlight {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-content .subtitle {
          font-size: 1rem;
          color: #64748b;
          margin-bottom: 2rem;
          line-height: 1.7;
          max-width: 100%;
        }

        @media (min-width: 768px) {
          .hero-content .subtitle {
            font-size: 1.2rem;
            margin-bottom: 2.5rem;
            max-width: 480px;
          }
        }

        .hero-actions {
          display: flex;
          gap: 0.75rem;
          align-items: center;
          margin-bottom: 2rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        @media (min-width: 768px) {
          .hero-actions {
            gap: 1rem;
            margin-bottom: 2.5rem;
            justify-content: flex-start;
          }
        }

        .cta-primary {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          display: inline-flex;
          white-space: nowrap;
        }

        @media (min-width: 768px) {
          .cta-primary {
            padding: 1rem 2rem;
            border-radius: 12px;
            font-size: 1rem;
          }
        }
          align-items: center;
          gap: 0.5rem;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.25);
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(37, 99, 235, 0.35);
        }

        .cta-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
          font-size: 0.9rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-dismiss {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0;
          margin-left: 1rem;
        }

        .auth-prompt {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          color: #0369a1;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 1rem;
          font-size: 0.9rem;
          text-align: center;
        }

        .cta-secondary {
          background: transparent;
          color: #475569;
          padding: 1rem 2rem;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-weight: 500;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .cta-secondary:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        .hero-stats {
          display: flex;
          gap: 2rem;
          align-items: center;
        }

        .stat {
          text-align: left;
        }

        .stat-number {
          font-size: 1.8rem;
          font-weight: 700;
          color: #2563eb;
          display: block;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #64748b;
          font-weight: 500;
        }

        .hero-visual {
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          animation: fadeInRight 0.8s ease-out 0.2s both;
        }

        .hero-mockup {
          background: white;
          border-radius: 20px;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.08);
          padding: 2rem;
          max-width: 400px;
          width: 100%;
          position: relative;
          transform: rotate(-2deg);
          transition: transform 0.4s ease;
        }

        .hero-mockup:hover {
          transform: rotate(0deg) scale(1.02);
        }

        .mockup-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .mockup-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .dot-red { background: #ef4444; }
        .dot-yellow { background: #f59e0b; }
        .dot-green { background: #10b981; }

        .mockup-content h3 {
          color: #2563eb;
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .mockup-content p {
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .mockup-btn {
          background: #2563eb;
          color: white;
          padding: 0.6rem 1.2rem;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          font-size: 0.9rem;
          width: 100%;
        }

        /* Features Section */
        .features {
          padding: 6rem 2rem;
          background: white;
        }

        .features-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .features-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-badge {
          display: inline-block;
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
          padding: 0.4rem 1rem;
          border-radius: 16px;
          font-size: 0.85rem;
          font-weight: 500;
          margin-bottom: 1rem;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
          transition: all 0.3s ease;
        }

        .section-badge:hover {
          background: rgba(37, 99, 235, 0.12);
          transform: scale(1.05);
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #0f172a;
          letter-spacing: -0.01em;
          animation: fadeInUp 0.6s ease-out;
        }

        .section-subtitle {
          font-size: 1.2rem;
          color: #64748b;
          max-width: 600px;
          margin: 0 auto;
          line-height: 1.6;
          animation: fadeInUp 0.6s ease-out 0.1s;
          animation-fill-mode: both;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 2rem;
        }

        .features-grid .feature-card:nth-child(1) { animation-delay: 0.1s; }
        .features-grid .feature-card:nth-child(2) { animation-delay: 0.2s; }
        .features-grid .feature-card:nth-child(3) { animation-delay: 0.3s; }
        .features-grid .feature-card:nth-child(4) { animation-delay: 0.4s; }
        .features-grid .feature-card:nth-child(5) { animation-delay: 0.5s; }
        .features-grid .feature-card:nth-child(6) { animation-delay: 0.6s; }

        .feature-card {
          background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
          padding: 2.5rem;
          border-radius: 16px;
          border: 1px solid rgba(37, 99, 235, 0.08);
          transition: all 0.4s ease;
          position: relative;
          overflow: hidden;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .feature-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #2563eb, #3b82f6);
        }

        .feature-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.1);
          border-color: rgba(37, 99, 235, 0.15);
        }

        .card-icon {
          width: 60px;
          height: 60px;
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.5rem;
          font-size: 1.5rem;
          color: white;
          transition: all 0.3s ease;
        }

        .feature-card:hover .card-icon {
          transform: scale(1.1) rotate(5deg);
          box-shadow: 0 8px 20px rgba(37, 99, 235, 0.3);
        }

        .card-title {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #0f172a;
        }

        .card-description {
          color: #64748b;
          line-height: 1.6;
        }

        /* How it Works */
        .how-it-works {
          padding: 6rem 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .steps-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }

        .steps-grid .step:nth-child(1) { animation-delay: 0.1s; }
        .steps-grid .step:nth-child(2) { animation-delay: 0.2s; }
        .steps-grid .step:nth-child(3) { animation-delay: 0.3s; }

        .step {
          background: white;
          padding: 2.5rem 2rem;
          border-radius: 16px;
          border: 1px solid rgba(37, 99, 235, 0.08);
          transition: all 0.3s ease;
          text-align: center;
          position: relative;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .step:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
        }

        .step-number {
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1.2rem;
          margin: 0 auto 1.5rem;
          transition: all 0.3s ease;
        }

        .step:hover .step-number {
          transform: scale(1.15);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
        }

        .step-title {
          font-size: 1.2rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #0f172a;
        }

        .step-description {
          color: #64748b;
          line-height: 1.6;
        }

        /* Testimonials */
        .testimonials {
          padding: 6rem 2rem;
          background: white;
        }

        .testimonials-container {
          max-width: 1280px;
          margin: 0 auto;
          text-align: center;
        }

        .testimonials-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 3rem;
        }

        .testimonial {
          background: #f8fafc;
          padding: 2rem;
          border-radius: 16px;
          border: 1px solid rgba(37, 99, 235, 0.08);
          text-align: left;
        }

        .testimonial-text {
          color: #475569;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          font-style: italic;
        }

        .testimonial-author {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .author-avatar {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
        }

        .author-info h4 {
          font-weight: 600;
          color: #0f172a;
          margin-bottom: 0.2rem;
        }

        .author-info p {
          color: #64748b;
          font-size: 0.9rem;
        }

        /* Minimal Professional Testimonials */
        .testimonials-coming-soon {
          margin-top: 3rem;
        }

        .testimonial-placeholder-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .testimonial-placeholder-grid .minimal-testimonial:nth-child(1) { animation-delay: 0.1s; }
        .testimonial-placeholder-grid .minimal-testimonial:nth-child(2) { animation-delay: 0.2s; }
        .testimonial-placeholder-grid .minimal-testimonial:nth-child(3) { animation-delay: 0.3s; }

        .minimal-testimonial {
          background: #fafbfc;
          border: 1px solid #f1f5f9;
          border-radius: 8px;
          padding: 2.5rem 2rem;
          text-align: center;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
        }

        .minimal-testimonial:hover {
          border-color: #e2e8f0;
          background: white;
        }

        .minimal-testimonial.featured {
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border: none;
        }

        .coming-soon-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
        }

        .quote-icon {
          width: 32px;
          height: 32px;
          color: #cbd5e1;
          margin-bottom: 1.5rem;
        }

        .minimal-testimonial.featured .quote-icon {
          color: rgba(255, 255, 255, 0.6);
        }

        .coming-soon-content p {
          color: #64748b;
          font-size: 0.95rem;
          line-height: 1.5;
          margin: 0 0 1.5rem 0;
          max-width: 200px;
        }

        .minimal-testimonial.featured .coming-soon-content p {
          color: rgba(255, 255, 255, 0.9);
          max-width: 250px;
        }

        .coming-label {
          display: inline-block;
          background: #f1f5f9;
          color: #64748b;
          padding: 0.4rem 1rem;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .featured-content {
          text-align: center;
        }

        .featured-content h3 {
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: white;
        }

        .featured-content p {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.5;
          margin-bottom: 1.5rem;
          font-size: 0.95rem;
        }

        .minimal-stats {
          margin-bottom: 2rem;
        }

        .minimal-stats span {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.85rem;
          font-weight: 500;
        }

        .join-early-btn {
          background: white;
          color: #2563eb;
          border: none;
          padding: 0.75rem 1.8rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .join-early-btn:hover {
          background: #f8fafc;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        /* Footer */
        .footer {
          background: #ffffff;
          color: #0f172a;
          padding: 4rem 2rem 2rem;
          border-top: 1px solid #e2e8f0;
        }

        .footer-container {
          max-width: 1280px;
          margin: 0 auto;
        }

        .footer-content {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 3rem;
          margin-bottom: 3rem;
        }

        .footer-brand {
          max-width: 300px;
        }

        .footer-logo {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          font-size: 1.5rem;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 1rem;
        }

        .footer-logo img {
          width: 32px;
          height: 32px;
          border-radius: 6px;
        }

        .footer-description {
          color: #64748b;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .footer-section h3 {
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #0f172a;
        }

        .footer-links {
          list-style: none;
        }

        .footer-links li {
          margin-bottom: 0.5rem;
        }

        .footer-links a {
          color: #64748b;
          text-decoration: none;
          transition: color 0.3s ease;
        }

        .footer-links a:hover {
          color: #2563eb;
        }

        .footer-bottom {
          border-top: 1px solid #e2e8f0;
          padding-top: 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .footer-copyright {
          color: #64748b;
          font-size: 0.9rem;
        }

        .footer-social {
          display: flex;
          gap: 1rem;
        }

        .social-link {
          width: 36px;
          height: 36px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          text-decoration: none;
          transition: all 0.3s ease;
        }

        .social-link:hover {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
        }

        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .nav-links {
            display: none;
          }

          .nav-container {
            padding: 0 1rem;
          }

          .hero {
            padding: 6rem 0 2rem;
          }

          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 3rem;
            padding: 0 1rem;
          }

          .hero-content h1 {
            font-size: 2.5rem;
            line-height: 1.2;
          }

          .hero-content .subtitle {
            font-size: 1.1rem;
            max-width: 100%;
          }

          .hero-actions {
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }

          .cta-primary,
          .cta-secondary {
            width: 100%;
            max-width: 280px;
            text-align: center;
          }

          .hero-stats {
            justify-content: center;
            gap: 1.5rem;
          }

          .features,
          .how-it-works,
          .testimonials {
            padding: 4rem 1rem;
          }

          .section-title {
            font-size: 2.2rem;
          }

          .section-subtitle {
            font-size: 1.1rem;
          }

          .features-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .feature-card {
            padding: 2rem;
          }

          .steps-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .testimonials-grid {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .testimonial-placeholder-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .minimal-testimonial {
            min-height: 180px;
            padding: 2rem 1.5rem;
          }

          .featured-content h3 {
            font-size: 1.2rem;
          }

          .coming-soon-content p,
          .featured-content p {
            max-width: none;
          }

          .footer {
            padding: 3rem 1rem 2rem;
          }

          .footer-content {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .footer-bottom {
            flex-direction: column;
            text-align: center;
            gap: 1.5rem;
          }

          .hero-mockup {
            max-width: 320px;
            padding: 1.5rem;
          }
        }

        @media (max-width: 480px) {
          .hero-content h1 {
            font-size: 2rem;
          }

          .section-title {
            font-size: 1.8rem;
          }

          .hero-stats {
            flex-direction: column;
            gap: 1rem;
          }

          .stat {
            text-align: center;
          }

          .feature-card,
          .step,
          .testimonial {
            padding: 1.5rem;
          }

          .navbar {
            padding: 1rem 0;
          }

          .start-free-btn {
            padding: 0.6rem 1.5rem;
            font-size: 0.85rem;
          }
        }
      `}</style>

      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <a href="#hero" className="logo">
            <img src={"/logo.png"} alt="ReferralMe" />
            <span className="logo-text">
              <span className="referral-part">Referral</span><span className="me-part">Me</span>
            </span>
          </a>
          
          <ul className="nav-links">
            <li><a href="#hero" className={activeSection === "hero" ? "active" : ""}>Home</a></li>
            <li><a href="#features" className={activeSection === "features" ? "active" : ""}>Features</a></li>
            <li><a href="#how-it-works" className={activeSection === "how-it-works" ? "active" : ""}>How it Works</a></li>
            <li><a href="#testimonials" className={activeSection === "testimonials" ? "active" : ""}>Reviews</a></li>
          </ul>

          <div className="nav-cta">
            <button 
              className="start-free-btn" 
              onClick={handleGetStarted}
              disabled={isSigningIn}
            >
              {isSigningIn ? "Opening Email Selection..." : user ? "Get Started" : "Get Started"}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="hero" className="hero">
        <div className="hero-container">
          <div className="hero-content">
            <div className="hero-badge">
              ✨ Connect. Refer. Succeed.
            </div>
            <h1>
              Professional <span className="highlight">Referrals</span><br />
              Made Simple
            </h1>
            <p className="subtitle">
              Bridge the gap between talent and opportunity. Our platform connects job seekers 
              with industry professionals for authentic referrals that make a difference.
            </p>
            <div className="hero-actions">
              <button 
                className="cta-primary" 
                onClick={handleGetStarted}
                disabled={isSigningIn}
              >
                {isSigningIn ? "Opening Email Selection..." : user ? "Start Free Today" : "Start Free Today"}
                <span>→</span>
              </button>
              <a href="#how-it-works" className="cta-secondary">
                See How It Works
              </a>
            </div>
            {signInError && (
              <div className="error-message">
                ⚠️ {signInError}
                <button onClick={() => setSignInError(null)} className="error-dismiss">×</button>
              </div>
            )}
            {!user && (
              <div className="auth-prompt">
                👆 Click "Get Started" to select your email and sign in with Google
              </div>
            )}
            <LiveAnimatedStats />
          </div>
          
          <div className="hero-visual">
            <div className="hero-mockup">
              <div className="mockup-header">
                <div className="mockup-dot dot-red"></div>
                <div className="mockup-dot dot-yellow"></div>
                <div className="mockup-dot dot-green"></div>
              </div>
              <div className="mockup-content">
                <h3>Find Your Next Opportunity</h3>
                <p>Connect with professionals at top companies who can refer you to your dream job.</p>
                <button className="mockup-btn" onClick={handleGetStarted}>Browse Opportunities</button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Live Jobs Section */}
      <LiveJobsSection />

      {/* Features Section */}
      <section id="features" className="features">
        <div className="features-container">
          <div className="features-header">
            <span className="section-badge">Features</span>
            <h2 className="section-title">Built for Both Sides of Success</h2>
            <p className="section-subtitle">
              Whether you're seeking opportunities or offering guidance, our platform empowers 
              meaningful professional connections.
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="card-icon">🎯</div>
              <h3 className="card-title">Smart Job Matching</h3>
              <p className="card-description">
                Advanced algorithms match job seekers with relevant opportunities based on skills, 
                experience, and career goals for higher success rates.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="card-icon">🤝</div>
              <h3 className="card-title">Verified Referrers</h3>
              <p className="card-description">
                Connect with verified employees from top companies who are actively helping 
                candidates succeed in their career journey.
              </p>
            </div>

            <div className="feature-card">
              <div className="card-icon">📊</div>
              <h3 className="card-title">Real-time Tracking</h3>
              <p className="card-description">
                Track your referral requests, application status, and networking progress 
                with comprehensive analytics and insights.
              </p>
            </div>

            <div className="feature-card">
              <div className="card-icon">💬</div>
              <h3 className="card-title">Direct Communication</h3>
              <p className="card-description">
                Seamless messaging system allows direct communication between seekers and 
                referrers for better understanding and collaboration.
              </p>
            </div>

            <div className="feature-card">
              <div className="card-icon">🏆</div>
              <h3 className="card-title">Success Rewards</h3>
              <p className="card-description">
                Referrers earn recognition and rewards for successful placements, creating 
                a thriving ecosystem of mutual benefit.
              </p>
            </div>

            <div className="feature-card">
              <div className="card-icon">🔒</div>
              <h3 className="card-title">Privacy First</h3>
              <p className="card-description">
                Your data is protected with enterprise-grade security. Control your visibility 
                and share information only with verified professionals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="how-it-works">
        <div className="steps-container">
          <div className="features-header">
            <span className="section-badge">Process</span>
            <h2 className="section-title">Simple Steps to Success</h2>
            <p className="section-subtitle">
              Our streamlined process makes professional networking effortless and effective.
            </p>
          </div>
          
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3 className="step-title">Create Your Profile</h3>
              <p className="step-description">
                Sign up and build your professional profile. Choose whether you're seeking 
                opportunities or offering referrals.
              </p>
            </div>
            
            <div className="step">
              <div className="step-number">2</div>
              <h3 className="step-title">Discover Connections</h3>
              <p className="step-description">
                Browse opportunities or talented candidates. Our smart matching system 
                helps you find the perfect connections.
              </p>
            </div>
            
            <div className="step">
              <div className="step-number">3</div>
              <h3 className="step-title">Make Meaningful Connections</h3>
              <p className="step-description">
                Submit referral requests or offer opportunities. Build lasting professional 
                relationships that benefit everyone involved.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="testimonials">
        <div className="testimonials-container">
          <div className="features-header">
            <span className="section-badge">Success Stories</span>
            <h2 className="section-title">What Our Users Say</h2>
            <p className="section-subtitle">
              Your success story could be featured here next. Join our growing community of professionals.
            </p>
          </div>
          
          <div className="testimonials-coming-soon">
            <div className="testimonial-placeholder-grid">
              <div className="minimal-testimonial">
                <div className="coming-soon-content">
                  <div className="quote-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 9a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H12a2 2 0 0 1 2 2v2z"/>
                      <path d="M14 17a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2H12a2 2 0 0 1 2 2v2z"/>
                    </svg>
                  </div>
                  <p>Professional testimonials will appear here as our community grows.</p>
                  <div className="coming-label">Coming Soon</div>
                </div>
              </div>

              <div className="minimal-testimonial featured">
                <div className="featured-content">
                  <h3>Be Our First Success Story</h3>
                  <p>Join today and help us build the future of professional referrals in India.</p>
                  <div className="minimal-stats">
                    <span>2+ Professionals • 1+ Opportunities</span>
                  </div>
                  <button 
                    className="join-early-btn"
                    onClick={handleGetStarted}
                  >
                    Join Early Access
                  </button>
                </div>
              </div>

              <div className="minimal-testimonial">
                <div className="coming-soon-content">
                  <div className="quote-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 9a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2H12a2 2 0 0 1 2 2v2z"/>
                      <path d="M14 17a2 2 0 0 1-2 2H9.5a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2H12a2 2 0 0 1 2 2v2z"/>
                    </svg>
                  </div>
                  <p>Your referral success story could be featured right here.</p>
                  <div className="coming-label">Coming Soon</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo">
                <img src={"/logo.png"} alt="ReferralMe" />
                <span className="logo-text">
                  <span className="referral-part">Referral</span><span className="me-part">Me</span>
                </span>
              </div>
              <p className="footer-description">
                Connecting talent with opportunity through authentic professional referrals. 
                Build meaningful career connections that matter.
              </p>
            </div>
            
            <div className="footer-section">
              <h3>Platform</h3>
              <ul className="footer-links">
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How it Works</a></li>
                <li><a href="/">Home</a></li>
                <li><a href="#testimonials">Success Stories</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>Company</h3>
              <ul className="footer-links">
                <li><a href="#">About Us</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            
            <div className="footer-section">
              <h3>Support</h3>
              <ul className="footer-links">
                <li><a href="#">Help Center</a></li>
                <li><a href="/privacy-policy" target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
                <li><a href="/terms-of-service" target="_blank" rel="noopener noreferrer">Terms of Service</a></li>
                <li><a href="#">Security</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2025 <span className="logo-text">
                <span className="referral-part">Referral</span><span className="me-part">Me</span>
              </span>. Built with ❤️ in India.
            </p>

          </div>
        </div>
      </footer>
    </div>
  );
}