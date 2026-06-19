import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  Bot,
  BriefcaseBusiness,
  Check,
  Clock3,
  FileSearch,
  IndianRupee,
  MessageCircleMore,
  ShieldCheck,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { getMentorsWithActiveProfiles, type FirestoreUser, type MentorshipService } from "../lib/firestore";
import SeoHead from "../components/seo-head";

type PublicMentorService = {
  mentorId: string;
  mentorName: string;
  company?: string;
  service: MentorshipService;
};

const formatInr = (amount: number) =>
  `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(amount || 0))} INR`;

export default function PricingPage() {
  const [mentors, setMentors] = useState<FirestoreUser[]>([]);

  useEffect(() => {
    getMentorsWithActiveProfiles()
      .then(setMentors)
      .catch((error) => {
        console.error("Unable to load public mentorship pricing:", error);
        setMentors([]);
      });
  }, []);

  const mentorServices = useMemo<PublicMentorService[]>(
    () =>
      mentors
        .flatMap((mentor) =>
          (mentor.mentorshipServices || [])
            .filter((service) => service.isActive && Number(service.price) > 0)
            .map((service) => ({
              mentorId: mentor.uid,
              mentorName: mentor.displayName || "ReferralMe Mentor",
              company: mentor.company,
              service,
            })),
        )
        .sort((a, b) => Number(a.service.price) - Number(b.service.price))
        .slice(0, 12),
    [mentors],
  );

  return (
    <div className="min-h-screen bg-[#f6f8fc] text-slate-950">
      <SeoHead
        title="ReferralMe Pricing | Career Pro and Mentorship Prices in INR"
        description="View ReferralMe Career Pro and live mentorship service pricing in Indian Rupees."
        canonicalPath="/pricing"
      />

      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-black tracking-tight">
            <img src="/logo.png" alt="ReferralMe" className="h-10 w-10 rounded-xl" />
            <span className="text-xl">ReferralMe</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-slate-950 px-4 py-20 text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.2),transparent_35%)]" />
          <div className="relative mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-400/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-100">
              <IndianRupee className="h-4 w-4" />
              Transparent INR pricing
            </div>
            <h1 className="mt-7 text-4xl font-black tracking-tight sm:text-6xl">Choose the support you need.</h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Start free, unlock ReferralMe Career Pro for 30 days, or book a focused online session with a mentor.
              Every payable amount is displayed in Indian Rupees before purchase.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <BriefcaseBusiness className="h-6 w-6 text-slate-700" />
                </div>
                <CardTitle className="pt-3 text-2xl">Free</CardTitle>
                <CardDescription>Explore ReferralMe and create your career profile.</CardDescription>
                <div className="pt-4 text-4xl font-black">₹0 INR</div>
                <p className="text-sm text-slate-500">No payment required</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <Feature text="Create a seeker or referrer profile" />
                <Feature text="Explore live jobs and public profiles" />
                <Feature text="Access available free career tools" />
                <Button asChild variant="outline" className="w-full">
                  <Link href="/">Create free account</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-2 border-blue-600 bg-white shadow-xl shadow-blue-100">
              <div className="absolute right-0 top-0 rounded-bl-2xl bg-blue-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-white">
                Career toolkit
              </div>
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                  <Sparkles className="h-6 w-6 text-blue-700" />
                </div>
                <CardTitle className="pt-3 text-2xl">Career Pro</CardTitle>
                <CardDescription>One month of connected AI career and placement support.</CardDescription>
                <div className="pt-4 text-4xl font-black">₹599 INR</div>
                <p className="text-sm font-semibold text-blue-700">30 days of access · one-time payment</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <Feature text="AI Career Agent and guided career planning" />
                <Feature text="ATS resume analysis and improvement guidance" />
                <Feature text="AI Mentor chat and 30-day placement roadmap" />
                <Feature text="Round-wise interview preparation" />
                <Feature text="Job-fit, referral-kit, and mentor suggestions" />
                <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                  <Link href="/">Create account to purchase</Link>
                </Button>
                <p className="text-center text-xs leading-5 text-slate-500">
                  Access does not renew automatically. A new payment is required for another 30-day period.
                </p>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100">
                  <Video className="h-6 w-6 text-teal-700" />
                </div>
                <CardTitle className="pt-3 text-2xl">1:1 Mentorship</CardTitle>
                <CardDescription>Online sessions delivered by individual ReferralMe mentors.</CardDescription>
                <div className="pt-4 text-3xl font-black">Mentor-set INR price</div>
                <p className="text-sm text-slate-500">Exact price and duration shown before booking</p>
              </CardHeader>
              <CardContent className="space-y-5">
                <Feature text="Resume review, mock interview, or career guidance" />
                <Feature text="Google Meet, Zoom, or another agreed online link" />
                <Feature text="Booking and session status tracked in ReferralMe" />
                <Button asChild variant="outline" className="w-full">
                  <a href="#mentor-pricing">View live mentor prices</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="mentor-pricing" className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Live service catalogue</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Mentorship prices in INR</h2>
              <p className="mt-4 leading-7 text-slate-600">
                Mentors independently choose their service title, duration, and price. The exact amount below is the
                amount charged for that session before any payment is submitted.
              </p>
            </div>

            {mentorServices.length ? (
              <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {mentorServices.map(({ mentorId, mentorName, company, service }) => (
                  <Card key={`${mentorId}-${service.id}`} className="border-slate-200 shadow-sm">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">{service.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {mentorName}{company ? ` · ${company}` : ""}
                          </CardDescription>
                        </div>
                        <div className="shrink-0 rounded-xl bg-teal-50 px-3 py-2 text-sm font-black text-teal-800">
                          {formatInr(service.price)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="min-h-10 text-sm leading-6 text-slate-600">{service.description}</p>
                      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
                          <Clock3 className="h-4 w-4" />
                          {service.duration} minutes
                        </span>
                        <Button asChild size="sm">
                          <Link href={`/referrer/${mentorId}`}>View mentor</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <MessageCircleMore className="mx-auto h-8 w-8 text-slate-500" />
                <p className="mt-3 font-semibold text-slate-800">No mentorship service is currently open for booking.</p>
                <p className="mt-1 text-sm text-slate-500">Active mentor prices will appear here automatically in INR.</p>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
          <div className="grid gap-6 md:grid-cols-3">
            <PolicyNote icon={ShieldCheck} title="Secure payment">
              Payments are processed by an approved third-party payment gateway. ReferralMe does not store complete card details.
            </PolicyNote>
            <PolicyNote icon={FileSearch} title="Refund terms">
              Duplicate charges, failed delivery, cancellations, and completed services are handled under our public refund policy.
            </PolicyNote>
            <PolicyNote icon={Bot} title="No job guarantee">
              ReferralMe provides tools and guidance. A subscription, mentorship session, or referral request never guarantees employment.
            </PolicyNote>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4 text-sm font-semibold">
            <Link href="/terms-of-service" className="text-blue-700 hover:underline">Terms of Service</Link>
            <Link href="/refund-policy" className="text-blue-700 hover:underline">Refund & Cancellation</Link>
            <Link href="/privacy-policy" className="text-blue-700 hover:underline">Privacy Policy</Link>
            <Link href="/contact" className="text-blue-700 hover:underline">Contact & business details</Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Feature({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm leading-6 text-slate-700">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="h-3.5 w-3.5" />
      </span>
      <span>{text}</span>
    </div>
  );
}

function PolicyNote({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <Icon className="h-6 w-6 text-blue-700" />
      <h3 className="mt-4 font-bold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
    </div>
  );
}
