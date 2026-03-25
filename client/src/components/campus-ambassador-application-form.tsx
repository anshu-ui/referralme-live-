import { useState } from "react";
import { ArrowRight, BadgeCheck, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { useToast } from "../hooks/use-toast";
import { createCampusAmbassadorApplication } from "../lib/campus-firestore";

type ApplicationForm = {
  fullName: string;
  email: string;
  phoneNumber: string;
  collegeName: string;
  course: string;
  graduationYear: string;
  linkedinUrl: string;
  societies: string;
  whyJoin: string;
  availabilityHours: string;
};

const defaultForm: ApplicationForm = {
  fullName: "",
  email: "",
  phoneNumber: "",
  collegeName: "",
  course: "",
  graduationYear: "",
  linkedinUrl: "",
  societies: "",
  whyJoin: "",
  availabilityHours: "",
};

export default function CampusAmbassadorApplicationForm({
  title = "Campus Ambassador Application",
  description = "Fill this once and the ReferralMe team can review your application.",
}: {
  title?: string;
  description?: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<ApplicationForm>(defaultForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const updateField = (key: keyof ApplicationForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      !form.fullName ||
      !form.email ||
      !form.phoneNumber ||
      !form.collegeName ||
      !form.course ||
      !form.graduationYear ||
      !form.whyJoin ||
      !form.availabilityHours
    ) {
      toast({
        title: "A few details are missing",
        description: "Complete the required fields so we can review your application properly.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    setIsSubmitted(false);

    try {
      const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
      await createCampusAmbassadorApplication({
        ...form,
        source: "campus-ambassador-page",
        utmSource: params.get("utm_source") || undefined,
        utmMedium: params.get("utm_medium") || undefined,
        utmCampaign: params.get("utm_campaign") || undefined,
      });

      setForm(defaultForm);
      setIsSubmitted(true);
      toast({
        title: "Application received",
        description: "Your campus ambassador application has been saved into the separate campus program for review.",
      });
    } catch (error) {
      console.error("Error submitting campus ambassador application:", error);
      toast({
        title: "Submission failed",
        description: "We couldn’t save your application right now. Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-[34px] border border-[#0a2222]/10 bg-white/88 shadow-[0_28px_80px_rgba(10,34,34,0.08)]">
      <CardHeader>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#0a2222]/10 bg-[#f3f8ff] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1d4ed8]">
          <Sparkles className="h-3.5 w-3.5" />
          Application form
        </div>
        <CardTitle className="text-2xl tracking-[-0.04em] text-slate-950 sm:text-3xl">{title}</CardTitle>
        <CardDescription className="max-w-2xl text-sm leading-7 text-[#0a2222]/62">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isSubmitted ? (
          <div className="rounded-[28px] border border-[#0a2222]/10 bg-[linear-gradient(135deg,#f6faff_0%,#eef4ff_100%)] p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#1d4ed8] text-white">
                <BadgeCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">Saved successfully</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">Your application is in the system.</h3>
                <p className="mt-2 text-sm leading-7 text-[#0a2222]/66">
                  The campus team can now review your profile, shortlist your application, and unlock dashboard access if selected.
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name *">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" value={form.fullName} onChange={(event) => updateField("fullName", event.target.value)} placeholder="Your full name" />
            </Field>
            <Field label="Email *">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="Phone number *">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" value={form.phoneNumber} onChange={(event) => updateField("phoneNumber", event.target.value)} placeholder="+91..." />
            </Field>
            <Field label="College name *">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" value={form.collegeName} onChange={(event) => updateField("collegeName", event.target.value)} placeholder="Your college" />
            </Field>
            <Field label="Course *">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" value={form.course} onChange={(event) => updateField("course", event.target.value)} placeholder="B.Tech, BBA, MBA..." />
            </Field>
            <Field label="Graduation year *">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" value={form.graduationYear} onChange={(event) => updateField("graduationYear", event.target.value)} placeholder="2027" />
            </Field>
            <Field label="Weekly availability *">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" value={form.availabilityHours} onChange={(event) => updateField("availabilityHours", event.target.value)} placeholder="4-6 hours / week" />
            </Field>
            <Field label="LinkedIn URL">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" value={form.linkedinUrl} onChange={(event) => updateField("linkedinUrl", event.target.value)} placeholder="https://linkedin.com/in/..." />
            </Field>
            <Field label="Club / campus role">
              <Input className="h-12 rounded-2xl border-[#0a2222]/10 bg-[#f8fbff] text-[#0a2222] placeholder:text-[#0a2222]/35" value={form.societies} onChange={(event) => updateField("societies", event.target.value)} placeholder="Coding club, placement cell, fest team..." />
            </Field>
          </div>

          <Field label="Why do you want to join? *">
            <textarea
              value={form.whyJoin}
              onChange={(event) => updateField("whyJoin", event.target.value)}
              placeholder="Tell us why you want to represent ReferralMe on your campus."
              className="min-h-[140px] w-full rounded-[22px] border border-[#0a2222]/10 bg-[#f8fbff] px-4 py-3 text-sm text-[#0a2222] outline-none transition focus:border-[#7fa7ff] focus:ring-4 focus:ring-[#7fa7ff]/20"
            />
          </Field>

          <Button type="submit" size="lg" className="h-12 w-full rounded-full bg-[#1d4ed8] text-white hover:bg-[#1e40af]" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Apply Now"}
            {!isSubmitting ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0a2222]/48">{label}</span>
      {children}
    </label>
  );
}
