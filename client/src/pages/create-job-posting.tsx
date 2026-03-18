import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { createJobPosting, getSeekersForJobAlerts } from "../lib/firestore";
import { extractJobDetailsWithGemini, generateJobDescriptionWithGemini } from "../lib/geminiATS";
import { sendJobAlertToSeekers, sendJobPostingConfirmation } from "../lib/emailService";
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Eye,
  Globe,
  Import,
  IndianRupee,
  Link2,
  Lock,
  MapPin,
  Plus,
  Send,
  Shield,
  Sparkles,
  Target,
  Users,
  Wand2,
} from "lucide-react";

const jobPostingSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string().min(1, "Location is required"),
  salaryMin: z.string().optional(),
  salaryMax: z.string().optional(),
  jobType: z.enum(["full-time", "part-time", "contract", "internship"]),
  workArrangement: z.enum(["remote", "hybrid", "onsite"]),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead"]),
  description: z.string().min(20, "Add at least a short role description"),
  requirements: z.string().min(10, "Add a few role requirements"),
  quickSummary: z.string().min(12, "Add a short summary for candidates"),
  internalReferralLink: z.string().optional(),
  applicationMode: z.enum(["platform_request", "direct_internal_link", "email_resume"]),
  visibility: z.enum(["public", "private_link", "invite_only"]),
  minAtsScore: z.coerce.number().min(50).max(95),
  maxReferrals: z.coerce.number().min(1).max(50),
  urgency: z.enum(["low", "medium", "high"]),
  niceToHave: z.string().optional(),
});

type JobPostingFormData = z.infer<typeof jobPostingSchema>;

export default function CreateJobPosting() {
  const [, setLocation] = useLocation();
  const { user } = useFirebaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const [newSkill, setNewSkill] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [showLinkedInShare, setShowLinkedInShare] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid },
  } = useForm<JobPostingFormData>({
    resolver: zodResolver(jobPostingSchema),
    mode: "onChange",
    defaultValues: {
      jobType: "full-time",
      workArrangement: "hybrid",
      experienceLevel: "mid",
      applicationMode: "platform_request",
      visibility: "private_link",
      minAtsScore: 75,
      maxReferrals: 8,
      urgency: "medium",
      quickSummary: "Internal referral opportunity shared by a verified company referrer.",
      description: "Fast-track internal referral opening with direct referrer review.",
      requirements: "Relevant experience, strong role fit, and ATS-ready resume.",
    },
  });

  const values = watch();

  const addSkill = () => {
    const skill = newSkill.trim();
    if (!skill || skillTags.includes(skill)) return;
    setSkillTags((current) => [...current, skill]);
    setNewSkill("");
  };

  const removeSkill = (skill: string) => {
    setSkillTags((current) => current.filter((item) => item !== skill));
  };

  const importFromText = async () => {
    if (!sourceText.trim()) {
      alert("Paste the internal JD, hiring mail, or opening text first.");
      return;
    }

    setIsImporting(true);
    try {
      const imported = await extractJobDetailsWithGemini(sourceText);
      setValue("title", imported.title, { shouldValidate: true });
      setValue("company", imported.company, { shouldValidate: true });
      setValue("location", imported.location, { shouldValidate: true });
      setValue("experienceLevel", imported.experienceLevel, { shouldValidate: true });
      setValue("description", imported.description, { shouldValidate: true });
      setValue("requirements", imported.requirements, { shouldValidate: true });
      setValue("quickSummary", imported.quickSummary, { shouldValidate: true });

      if (imported.suggestedSkills?.length) {
        setSkillTags(Array.from(new Set([...skillTags, ...imported.suggestedSkills])).slice(0, 10));
      }
    } catch (error) {
      console.error("Job import failed:", error);
      alert("Import failed. You can still use quick post manually.");
    } finally {
      setIsImporting(false);
    }
  };

  const generateJobDescription = async () => {
    const formData = getValues();
    if (!formData.title || !formData.company) {
      alert("Add at least the title and company before using AI assist.");
      return;
    }

    setIsGeneratingAI(true);
    try {
      const generatedDescription = await generateJobDescriptionWithGemini(
        formData.title,
        formData.company,
        formData.location || "Remote / Hybrid",
        formData.experienceLevel,
        skillTags,
      );
      const sections = generatedDescription.split("Required Qualifications:");
      setValue("description", sections[0]?.trim() || generatedDescription, { shouldValidate: true });
      setValue("requirements", sections[1]?.trim() || "Role-specific skills and strong job fit.", { shouldValidate: true });
    } catch (error) {
      console.error("AI generation error:", error);
      alert("AI assist failed. You can keep the quick summary and post manually.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const onSubmit = async (data: JobPostingFormData) => {
    if (!user) {
      alert("You must be logged in to post a referral opportunity.");
      return;
    }

    setIsSubmitting(true);
    try {
      const salary =
        data.salaryMin || data.salaryMax
          ? `₹${data.salaryMin || "?"}L - ₹${data.salaryMax || "?"}L`
          : undefined;

      const jobData = {
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        requirements: data.requirements,
        salary,
        referrerId: user.uid,
        referrerName: user.displayName || user.email || "Anonymous",
        referrerEmail: user.email || "",
        isActive: true,
        jobType: data.jobType,
        workArrangement: data.workArrangement,
        experienceLevel: data.experienceLevel,
        urgency: data.urgency,
        niceToHave: data.niceToHave || "",
        benefits: "",
        applicationDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        skills: skillTags,
        quickSummary: data.quickSummary,
        internalReferralLink: data.internalReferralLink?.trim() || "",
        applicationMode: data.applicationMode,
        visibility: data.visibility,
        minAtsScore: Number(data.minAtsScore),
        maxReferrals: Number(data.maxReferrals),
        sourceType: sourceText.trim() ? "ai_import" : "quick_post",
      } as const;

      await createJobPosting(jobData);

      const referrerName = user.displayName || user.firstName || user.email || "User";
      const referrerEmail = user.email || "";
      if (referrerEmail) {
        await sendJobPostingConfirmation(referrerName, referrerEmail, jobData);
      }

      try {
        const seekers = await getSeekersForJobAlerts();
        await sendJobAlertToSeekers(jobData, referrerName, seekers);
      } catch (error) {
        console.error("Error sending job alerts:", error);
      }

      setShowLinkedInShare(true);
    } catch (error) {
      console.error("Error posting job:", error);
      alert("Posting failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreview = () => {
    const previewData = getValues();
    alert(
      `Preview\n\n${previewData.title} at ${previewData.company}\n${previewData.location}\n` +
        `Visibility: ${previewData.visibility}\nATS cutoff: ${previewData.minAtsScore}\n` +
        `Application mode: ${previewData.applicationMode}`,
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/referrer-dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <p className="text-sm font-medium text-blue-600">Low-effort referral publishing</p>
              <h1 className="text-xl font-semibold text-slate-900">Quick Referral Opportunity</h1>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handlePreview} disabled={!isValid}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Import className="h-5 w-5 text-blue-600" />
                Import From Internal JD or Hiring Mail
              </CardTitle>
              <CardDescription>
                Paste the internal job text once. ReferralMe extracts the role, summary, and skills so you only review and publish.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value)}
                placeholder="Paste an internal referral post, hiring email, or copied job text here..."
                className="min-h-[160px] bg-white"
              />
              <div className="flex flex-wrap gap-3">
                <Button type="button" onClick={importFromText} disabled={isImporting}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isImporting ? "Importing..." : "Import Into Draft"}
                </Button>
                <Button type="button" variant="outline" onClick={generateJobDescription} disabled={isGeneratingAI}>
                  <Bot className="h-4 w-4 mr-2" />
                  {isGeneratingAI ? "Generating..." : "AI Polish Description"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-700" />
                Why This Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <p>Publish internal opportunities without rewriting the JD.</p>
              <p>Control who sees sensitive links or details.</p>
              <p>Only ATS-qualified seekers can apply.</p>
              <p>Limit volume with referral caps instead of manual screening overload.</p>
            </CardContent>
          </Card>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Quick Post Details
              </CardTitle>
              <CardDescription>
                These are the only fields referrers usually care about. Everything else can stay lightweight.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="title">Role Title *</Label>
                  <Input id="title" {...register("title")} placeholder="Senior Backend Engineer" />
                  {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>}
                </div>
                <div>
                  <Label htmlFor="company">Company *</Label>
                  <Input id="company" {...register("company")} placeholder="Google, Amazon, StartupX" />
                  {errors.company && <p className="text-sm text-red-500 mt-1">{errors.company.message}</p>}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input id="location" {...register("location")} placeholder="Bengaluru / Remote" />
                </div>
                <div>
                  <Label>Work Arrangement</Label>
                  <Select value={values.workArrangement} onValueChange={(value) => setValue("workArrangement", value as JobPostingFormData["workArrangement"], { shouldValidate: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Experience Level</Label>
                  <Select value={values.experienceLevel} onValueChange={(value) => setValue("experienceLevel", value as JobPostingFormData["experienceLevel"], { shouldValidate: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry</SelectItem>
                      <SelectItem value="mid">Mid</SelectItem>
                      <SelectItem value="senior">Senior</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="quickSummary">Fast Summary *</Label>
                <Textarea
                  id="quickSummary"
                  {...register("quickSummary")}
                  placeholder="Short note candidates should see before they decide to apply."
                  className="min-h-[90px]"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="salaryMin">Min Salary (Optional, in LPA)</Label>
                  <Input id="salaryMin" type="number" {...register("salaryMin")} placeholder="18" />
                </div>
                <div>
                  <Label htmlFor="salaryMax">Max Salary (Optional, in LPA)</Label>
                  <Input id="salaryMax" type="number" {...register("salaryMax")} placeholder="28" />
                </div>
              </div>

              <div>
                <Label>Core Skills</Label>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {skillTags.map((skill) => (
                      <Badge key={skill} variant="secondary" className="flex items-center gap-1">
                        {skill}
                        <button type="button" onClick={() => removeSkill(skill)}>×</button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      placeholder="React, Node.js, System Design"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <Button type="button" variant="outline" onClick={addSkill}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Candidate-Facing Content
              </CardTitle>
              <CardDescription>
                Keep this concise. If you imported a JD, most of it should already be filled in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="description">Opportunity Description *</Label>
                <Textarea id="description" {...register("description")} className="min-h-[150px]" />
              </div>
              <div>
                <Label htmlFor="requirements">Must-Have Requirements *</Label>
                <Textarea id="requirements" {...register("requirements")} className="min-h-[110px]" />
              </div>
              <div>
                <Label htmlFor="niceToHave">Nice to Have</Label>
                <Textarea id="niceToHave" {...register("niceToHave")} className="min-h-[80px]" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-amber-700" />
                Privacy, Application, and ATS Controls
              </CardTitle>
              <CardDescription>
                These settings reduce manual effort and keep internal referral links protected.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Visibility</Label>
                  <Select value={values.visibility} onValueChange={(value) => setValue("visibility", value as JobPostingFormData["visibility"], { shouldValidate: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public listing</SelectItem>
                      <SelectItem value="private_link">Private link after review</SelectItem>
                      <SelectItem value="invite_only">Invite-only / manual approval</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Application Mode</Label>
                  <Select value={values.applicationMode} onValueChange={(value) => setValue("applicationMode", value as JobPostingFormData["applicationMode"], { shouldValidate: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="platform_request">Platform request only</SelectItem>
                      <SelectItem value="direct_internal_link">Approve then share internal link</SelectItem>
                      <SelectItem value="email_resume">Collect resumes, refer manually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Urgency</Label>
                  <Select value={values.urgency} onValueChange={(value) => setValue("urgency", value as JobPostingFormData["urgency"], { shouldValidate: true })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="minAtsScore">Mandatory ATS Cutoff</Label>
                  <Input id="minAtsScore" type="number" min={50} max={95} {...register("minAtsScore")} />
                  <p className="text-xs text-slate-500 mt-1">Seekers must run ATS analysis and hit this score before applying.</p>
                </div>
                <div>
                  <Label htmlFor="maxReferrals">Max Applications You Want</Label>
                  <Input id="maxReferrals" type="number" min={1} max={50} {...register("maxReferrals")} />
                  <p className="text-xs text-slate-500 mt-1">Use a cap to avoid inbox overload.</p>
                </div>
              </div>

              {values.applicationMode === "direct_internal_link" && (
                <div>
                  <Label htmlFor="internalReferralLink">Internal Referral Link</Label>
                  <div className="relative">
                    <Link2 className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                    <Input id="internalReferralLink" {...register("internalReferralLink")} placeholder="https://internal.company.com/referral/..." className="pl-9" />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    This is stored with the opportunity but should only be shared after approval if visibility is private.
                  </p>
                </div>
              )}

              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Shield className="h-4 w-4 text-slate-600" /> Privacy-aware</p>
                  <p className="text-xs text-slate-600 mt-2">Protect sensitive internal URLs and only expose what candidates should see.</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Target className="h-4 w-4 text-slate-600" /> ATS-gated</p>
                  <p className="text-xs text-slate-600 mt-2">Referrers spend time only on candidates who meet a minimum readiness score.</p>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 flex items-center gap-2"><Users className="h-4 w-4 text-slate-600" /> Volume-controlled</p>
                  <p className="text-xs text-slate-600 mt-2">Cap the referral load before manual review becomes a burden.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
            <p className="text-sm text-slate-500">
              Best results: import the internal JD, keep the summary short, and use a private visibility mode for sensitive links.
            </p>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setLocation("/referrer-dashboard")}>
                Cancel
              </Button>
              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isSubmitting ? "Publishing..." : "Publish Referral Opportunity"}
                <Send className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </form>
      </div>

      {showLinkedInShare && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-900">Referral opportunity published</h3>
              <p className="text-sm text-slate-600">
                Your post is live with ATS and privacy controls enabled. You can share it now or review candidates from the dashboard.
              </p>
            </div>
            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <p className="flex items-center gap-2"><Globe className="h-4 w-4" /> Visibility: {values.visibility}</p>
              <p className="flex items-center gap-2"><Target className="h-4 w-4" /> ATS cutoff: {values.minAtsScore}</p>
              <p className="flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Salary: {values.salaryMin || values.salaryMax ? `₹${values.salaryMin || "?"}L - ₹${values.salaryMax || "?"}L` : "Not shared"}</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowLinkedInShare(false)}>
                Stay Here
              </Button>
              <Button className="flex-1" onClick={() => setLocation("/referrer-dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
