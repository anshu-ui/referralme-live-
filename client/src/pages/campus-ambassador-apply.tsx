import { useEffect } from "react";
import { ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "../components/ui/button";
import CampusAmbassadorApplicationForm from "../components/campus-ambassador-application-form";

export default function CampusAmbassadorApplyPage() {
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
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fbff] text-slate-950">
      <style>{`
        @keyframes campusFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .campus-fade-up {
          animation: campusFadeUp .72s cubic-bezier(.19,1,.22,1) forwards;
        }
        .campus-card {
          transition:
            transform .4s cubic-bezier(.19,1,.22,1),
            box-shadow .4s cubic-bezier(.19,1,.22,1),
            border-color .25s ease;
        }
        .campus-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 24px 60px rgba(29, 78, 216, 0.10);
          border-color: rgba(29, 78, 216, 0.18);
        }
        .reveal-on-scroll {
          opacity: 0;
          transform: translate3d(0, 24px, 0);
          transition:
            opacity .82s cubic-bezier(.19,1,.22,1),
            transform .82s cubic-bezier(.19,1,.22,1);
        }
        .reveal-on-scroll.is-visible {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
      `}</style>

      <div className="relative overflow-hidden border-b border-[#0a2222]/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(223,251,87,0.24),_transparent_24%),radial-gradient(circle_at_85%_10%,_rgba(160,189,255,0.34),_transparent_22%),linear-gradient(180deg,#ffffff_0%,#f6faff_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(10,34,34,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(10,34,34,0.07)_1px,transparent_1px)] bg-[size:36px_36px] opacity-35" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <a href="/campus-ambassador" className="inline-flex items-center gap-2 text-sm font-medium text-[#1d4ed8] transition hover:text-[#1e40af]">
            <ArrowLeft className="h-4 w-4" />
            Back to campus ambassador page
          </a>
          <div className="campus-fade-up mt-6 inline-flex items-center gap-2 rounded-full border border-[#0a2222]/10 bg-white/88 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1d4ed8] shadow-sm">
            <GraduationCap className="h-4 w-4" />
            ReferralMe Campus Ambassador
          </div>
          <h1 className="campus-fade-up mt-6 max-w-4xl text-4xl font-normal leading-[0.9] tracking-[-0.07em] text-slate-950 sm:text-6xl lg:text-[5.4rem]">
            Apply to join the campus ambassador program.
          </h1>
          <p className="campus-fade-up mt-5 max-w-2xl text-base leading-8 text-[#0a2222]/66 sm:text-xl">
            This page is only for applications. Fill the form once and the ReferralMe team can review your profile, campus fit, communication strength, and weekly availability.
          </p>

          <div className="campus-fade-up mt-8 grid gap-4 sm:grid-cols-3">
            <div className="reveal-on-scroll rounded-[26px] border border-[#0a2222]/10 bg-white/82 p-4 sm:p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">Selection</p>
              <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950">Focused</p>
              <p className="mt-2 text-sm text-[#0a2222]/62">We care more about fit and consistency than noise.</p>
            </div>
            <div className="reveal-on-scroll rounded-[26px] border border-[#0a2222]/10 bg-white/82 p-4 sm:p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">Review</p>
              <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950">Structured</p>
              <p className="mt-2 text-sm text-[#0a2222]/62">Applications go into the separate campus system for shortlist and review.</p>
            </div>
            <div className="reveal-on-scroll rounded-[26px] border border-[#0a2222]/10 bg-white/82 p-4 sm:p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">Access</p>
              <p className="mt-3 text-2xl font-black tracking-[-0.05em] text-slate-950">Unlocked later</p>
              <p className="mt-2 text-sm text-[#0a2222]/62">Accepted applicants sign in with the same email to open the dashboard.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8">
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="reveal-on-scroll campus-card rounded-[30px] border border-[#0a2222]/10 bg-white/84 p-5 sm:p-6 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">What we review</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950">Strong campus fit over random hype.</h2>
            <p className="mt-4 text-sm leading-7 text-[#0a2222]/66">
              We care about consistency, communication, community reach, and whether you can help ReferralMe become visible inside your college.
            </p>
          </div>
          <div className="reveal-on-scroll campus-card rounded-[30px] border border-[#0a2222]/10 bg-[#f6faff] p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">Before you apply</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[#0a2222]/66">
              <p>Be clear about your campus role, clubs, or communities.</p>
              <p>Tell us why you want to represent ReferralMe specifically.</p>
              <p>Share realistic weekly availability instead of overcommitting.</p>
            </div>
          </div>
          <div className="reveal-on-scroll campus-card rounded-[30px] border border-[#0a2222]/10 bg-[linear-gradient(180deg,#0f1f4b_0%,#12285f_100%)] p-5 sm:p-6 text-white shadow-[0_20px_60px_rgba(10,34,34,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/45">After submission</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-white/78">
              <p>Applications are reviewed inside the separate campus pipeline.</p>
              <p>Shortlisted students are accepted manually by admin.</p>
              <p>Accepted ambassadors then get dashboard access with the same email.</p>
            </div>
          </div>
        </div>

        <CampusAmbassadorApplicationForm
          title="Campus Ambassador Application"
          description="This form saves into the separate campus ambassador system so the team can shortlist, review, and manage applicants without touching the main ReferralMe product."
        />
      </div>
    </div>
  );
}
