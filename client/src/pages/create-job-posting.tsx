import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";

import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { createJobPosting } from "../lib/firestore";
import { 
  ArrowLeft, Building, MapPin, IndianRupee, Clock, 
  Users, Briefcase, Target, Star, AlertCircle,
  Save, Send, Eye, Plus, X, Share2
} from "lucide-react";

import { generateJobDescriptionWithGemini } from "../lib/geminiATS";
import { sendJobPostingConfirmation } from "../lib/emailService";


const jobPostingSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().min(1, "Location is required"),
  salaryMin: z.string().min(1, "Minimum salary is required"),
  salaryMax: z.string().min(1, "Maximum salary is required"),
  jobType: z.enum(["full-time", "part-time", "contract", "internship"]),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead"]),
  description: z.string().min(50, "Description must be at least 50 characters"),
  requirements: z.string().min(20, "Requirements must be at least 20 characters"),
  niceToHave: z.string().optional(),
});

type JobPostingFormData = z.infer<typeof jobPostingSchema>;

export default function CreateJobPosting() {
  const [, setLocation] = useLocation();
  const { user } = useFirebaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [showLinkedInShare, setShowLinkedInShare] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isValid }
  } = useForm<JobPostingFormData>({
    resolver: zodResolver(jobPostingSchema),
    mode: "onChange",
    defaultValues: {
      jobType: "full-time",
      experienceLevel: "mid"
    }
  });

  const watchedValues = watch();

  const addSkill = () => {
    if (newSkill.trim() && !skillTags.includes(newSkill.trim())) {
      setSkillTags([...skillTags, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setSkillTags(skillTags.filter(s => s !== skill));
  };

  // Enhanced generateLinkedInArticle function with comprehensive job details
  const generateLinkedInArticle = (job: any, user: any, referrerLink: string) => {
    const title = `🚀 Exciting ${job.title} Opportunity at ${job.company}!`;
    
    // Build skills section if available
    const skillsText = job.skills && job.skills.length > 0 
      ? `\n🔧 Key Skills Required:\n${job.skills.map((skill: string) => `• ${skill}`).join('\n')}`
      : '';
    
    // Build experience section if available
    const experienceText = job.experience 
      ? `\n📈 Experience Level: ${job.experience}`
      : '';
    
    // Build benefits section if available
    const benefitsText = job.benefits && job.benefits.length > 0
      ? `\n🎁 Benefits & Perks:\n${job.benefits.map((benefit: string) => `• ${benefit}`).join('\n')}`
      : '';
    
    const content = `🎯 I'm excited to share an amazing career opportunity that just opened up!

🚀 ROLE: ${job.title}
🏢 COMPANY: ${job.company}
📍 LOCATION: ${job.location}
💰 SALARY: ${job.salary || 'Competitive package'}
⏰ TYPE: ${job.type || 'Full-time'}${experienceText}

📝 WHAT YOU'LL BE DOING:
${job.description || 'Join an innovative team and make a real impact in your career! You\'ll be working on exciting projects that drive business growth and innovation.'}

🎯 WHAT WE'RE LOOKING FOR:
${job.requirements || 'Passionate individuals ready to take on new challenges and grow with our dynamic team.'}${skillsText}${benefitsText}

✨ WHY THIS IS A GREAT OPPORTUNITY:
✅ Work with cutting-edge technology and innovative solutions
✅ Collaborative and inclusive team environment
✅ Excellent growth and learning opportunities
✅ Competitive compensation and comprehensive benefits
✅ Opportunity to make a real impact in a growing company

🚀 READY TO TAKE THE NEXT STEP IN YOUR CAREER?

👉 Apply through my referral link: ${referrerLink}

As an industry professional${user?.company ? ` at ${user.company}` : ''}, I'm here to help connect talented individuals with great opportunities. Feel free to reach out if you have questions about this role or need career guidance.

${user?.firstName ? `Best regards,\n${user.firstName}` : ''}

#Hiring #JobOpportunity #CareerGrowth #${job.company?.replace(/\s+/g, '')} #Referral #${job.title?.replace(/\s+/g, '')} #Jobs #Career #Opportunity #ReferralMe

---
🔗 Shared via ReferralMe - Connecting talent with opportunity`;

    return { title, content };
  };

  const onSubmit = async (data: JobPostingFormData) => {
    setIsSubmitting(true);
    try {
      if (!user) {
        throw new Error("User must be logged in to post jobs");
      }

      // Add skill tags and resume data to the job posting
      const jobData = {
        title: data.title,
        company: data.company,
        location: data.location,
        description: data.description,
        requirements: data.requirements,
        salary: `₹${data.salaryMin}L - ₹${data.salaryMax}L`,
        referrerId: user.uid,
        referrerName: user.displayName || user.email || "Anonymous",
        referrerEmail: user.email || "",
        isActive: true,
        jobType: data.jobType,
        workArrangement: "hybrid", // default value
        experienceLevel: data.experienceLevel,
        urgency: "medium", // default value
        niceToHave: data.niceToHave || "",
        benefits: "", // no longer collected
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
        skills: skillTags
      };

      console.log("Creating job posting with data:", jobData);
      
      // Actually create the job posting in Firebase
      await createJobPosting(jobData);
      
      // Send job posting confirmation email to referrer
      const referrerName = user.displayName || user.firstName || user.email || "User";
      const referrerEmail = user.email || "";
      
      if (referrerEmail) {
        console.log("📧 Sending job posting confirmation email to:", referrerEmail);
        sendJobPostingConfirmation(referrerName, referrerEmail, jobData)
          .then((result) => {
            if (result) {
              console.log("✅ Job posting confirmation email sent successfully");
            } else {
              console.error("❌ Failed to send job posting confirmation email");
            }
          })
          .catch((error) => {
            console.error("❌ Error sending job posting confirmation:", error);
          });
      }
      
      // Show LinkedIn share popup after successful job posting
      setShowLinkedInShare(true);
    } catch (error) {
      console.error("Error posting job:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateJobDescription = async () => {
    const formData = getValues();
    
    // Check if we have enough data to generate
    if (!formData.title || !formData.company) {
      alert("Please fill in at least Job Title and Company to generate AI description");
      return;
    }

    setIsGeneratingAI(true);
    
    try {
      console.log("🤖 Generating job description with Gemini AI...");
      
      const { title, company, location, experienceLevel } = formData;
      
      // Use Gemini AI to generate professional job description
      const generatedDescription = await generateJobDescriptionWithGemini(
        title,
        company,
        location || "Remote/Hybrid",
        experienceLevel || "mid-level",
        skillTags
      );
      
      // Split the generated content into description and requirements
      const sections = generatedDescription.split('**Required Qualifications:**');
      const description = sections[0].trim();
      const requirements = sections[1] ? `**Required Qualifications:**${sections[1]}` : generatedDescription;
      
      // Set the generated content and remove markers if they persist
      const cleanDescription = description.replace(/\*\*/g, '').replace(/\*/g, '');
      const cleanRequirements = requirements.replace(/\*\*/g, '').replace(/\*/g, '');
      
      setValue("description", cleanDescription);
      setValue("requirements", cleanRequirements);
      
      console.log("✅ Gemini AI job description generated successfully!");
      alert("✅ AI job description generated successfully! Review and edit as needed.");
      
    } catch (error) {
      console.error("AI generation error:", error);
      setIsGeneratingAI(false);
      alert("❌ AI generation failed. Please try again or write the description manually.");
    }
  };

  const handlePreview = () => {
    // Generate preview data
    const previewData = {
      ...watchedValues,
      skills: skillTags,
      salary: `₹${watchedValues.salaryMin}L - ₹${watchedValues.salaryMax}L`
    };
    
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setLocation("/")}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div className="flex items-center gap-2">
                <img src={"/logo.png"} alt="ReferralMe" className="h-8 w-8" />
                <span className="font-semibold text-gray-900 dark:text-white">ReferralMe</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePreview}
                disabled={!isValid}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Job Posting</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Post a new job opportunity and connect with talented candidates through referrals
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Provide the fundamental details about the position
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input
                    id="title"
                    {...register("title")}
                    placeholder="e.g. Senior Frontend Developer"
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500 mt-1">{errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Company *</Label>
                    <Input
                      id="company"
                      {...register("company")}
                      placeholder="e.g. TechCorp Inc"
                      className={errors.company ? "border-red-500" : ""}
                    />
                    {errors.company && (
                      <p className="text-sm text-red-500 mt-1">{errors.company.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      {...register("location")}
                      placeholder="e.g. San Francisco, CA"
                      className={errors.location ? "border-red-500" : ""}
                    />
                    {errors.location && (
                      <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salaryMin">Min Salary (in Lakhs INR) *</Label>
                    <Input
                      id="salaryMin"
                      {...register("salaryMin")}
                      placeholder="12"
                      type="number"
                      className={errors.salaryMin ? "border-red-500" : ""}
                    />
                    {errors.salaryMin && (
                      <p className="text-sm text-red-500 mt-1">{errors.salaryMin.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="salaryMax">Max Salary (in Lakhs INR) *</Label>
                    <Input
                      id="salaryMax"
                      {...register("salaryMax")}
                      placeholder="20"
                      type="number"
                      className={errors.salaryMax ? "border-red-500" : ""}
                    />
                    {errors.salaryMax && (
                      <p className="text-sm text-red-500 mt-1">{errors.salaryMax.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="jobType">Job Type *</Label>
                    <Select 
                      value={watchedValues.jobType} 
                      onValueChange={(value) => setValue("jobType", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full-time</SelectItem>
                        <SelectItem value="part-time">Part-time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level *</Label>
                    <Select 
                      value={watchedValues.experienceLevel} 
                      onValueChange={(value) => setValue("experienceLevel", value as any)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entry">Entry Level (0-2 years)</SelectItem>
                        <SelectItem value="mid">Mid Level (3-5 years)</SelectItem>
                        <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
                        <SelectItem value="lead">Lead/Principal (8+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Key Skills Section */}
                <div>
                  <Label>Key Skills</Label>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {skillTags.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="flex items-center gap-1">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-1 text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a skill (e.g., React, Python, AWS)"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkill();
                          }
                        }}
                      />
                      <Button type="button" onClick={addSkill} size="sm">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Job Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Job Description & Requirements
                </CardTitle>
                <CardDescription>
                  Describe the role, responsibilities, and what you're looking for
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Job Description Generator Section */}
                <div className="mb-6 p-6 bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-lg shadow-lg">
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-purple-800 mb-2">🤖 AI Job Description Generator</h3>
                    <p className="text-purple-700 mb-4">Let AI write your job description automatically, or write your own below</p>
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold px-8 py-3 rounded-lg shadow-lg transform transition-all duration-200 hover:scale-105"
                        onClick={() => generateJobDescription()}
                        disabled={isGeneratingAI}
                      >
                        {isGeneratingAI ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>🤖 Generate Job Description with AI</>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="text-center text-sm text-purple-600">
                    <p><strong>How it works:</strong> Click the button → Fill job details → AI creates professional content → Auto-fills your form</p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Job Description *</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Describe the role, responsibilities, team, and what makes this opportunity exciting..."
                    rows={6}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-1">
                    {watchedValues.description?.length || 0} characters (minimum 50)
                  </p>
                </div>

                <div>
                  <Label htmlFor="requirements">Required Skills & Experience *</Label>
                  <Textarea
                    id="requirements"
                    {...register("requirements")}
                    placeholder="List the essential skills, experience, and qualifications needed for this role..."
                    rows={4}
                    className={errors.requirements ? "border-red-500" : ""}
                  />
                  {errors.requirements && (
                    <p className="text-sm text-red-500 mt-1">{errors.requirements.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="niceToHave">Additional Skills</Label>
                  <Textarea
                    id="niceToHave"
                    {...register("niceToHave")}
                    placeholder="Additional skills or experience that would be beneficial..."
                    rows={3}
                  />
                </div>


              </CardContent>
            </Card>




            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="h-4 w-4" />
                <span>All fields marked with * are required</span>
              </div>
              <div className="flex gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={!isValid || isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Post Job
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* LinkedIn Share Popup */}
      {showLinkedInShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Job Posted Successfully!
              </h3>
              <p className="text-gray-600 mb-6">
                Share your job posting on LinkedIn to reach more qualified candidates
              </p>
              
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    const referrerPublicLink = `${window.location.origin}/referrer/${user?.uid}`;
                    
                    // Create comprehensive job data object
                    const jobData = {
                      title: watchedValues.title,
                      company: watchedValues.company,
                      location: watchedValues.location,
                      salary: `₹${watchedValues.salaryMin}L - ₹${watchedValues.salaryMax}L`,
                      type: watchedValues.jobType,
                      experience: watchedValues.experienceLevel,
                      description: watchedValues.description,
                      requirements: watchedValues.requirements,
                      skills: skillTags,
                      benefits: [] // Add benefits if available
                    };
                    
                    // Generate comprehensive LinkedIn article
                    const linkedInArticle = generateLinkedInArticle(jobData, user, referrerPublicLink);
                    
                    // Mobile-friendly LinkedIn sharing approach
                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                    
                    if (isMobile) {
                      // For mobile: Copy content and open LinkedIn with instructions
                      navigator.clipboard.writeText(linkedInArticle.content).then(() => {
                        console.log('✅ Complete job content copied to clipboard for mobile');
                        
                        // Try LinkedIn app with deep link for sharing
                        const linkedInMobileUrl = `linkedin://sharing?text=${encodeURIComponent(linkedInArticle.content)}`;
                        const linkedInWebUrl = `https://www.linkedin.com/sharing/share-offsite/?text=${encodeURIComponent(linkedInArticle.content)}&url=${encodeURIComponent(referrerPublicLink)}`;
                        
                        // Create invisible link to trigger app
                        const link = document.createElement('a');
                        link.href = linkedInMobileUrl;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Fallback to web if app doesn't respond
                        setTimeout(() => {
                          window.open(linkedInWebUrl, '_blank');
                        }, 1000);
                        
                        alert('📱 LinkedIn will open now!\n\n✅ Complete job post copied to clipboard\n• LinkedIn app will open (if installed)\n• Or web browser will open\n• Paste the content to share your job posting');
                        
                      }).catch(() => {
                        // Fallback without clipboard
                        const linkedInWebUrl = `https://www.linkedin.com/sharing/share-offsite/?text=${encodeURIComponent(linkedInArticle.content)}&url=${encodeURIComponent(referrerPublicLink)}`;
                        window.open(linkedInWebUrl, '_blank');
                        alert('📱 LinkedIn opened in browser with pre-filled job post!');
                      });
                    } else {
                      // For desktop: use LinkedIn sharing with complete job content pre-filled in the main post
                      const linkedInDesktopUrl = `https://www.linkedin.com/sharing/share-offsite/?text=${encodeURIComponent(linkedInArticle.content)}&url=${encodeURIComponent(referrerPublicLink)}`;
                      
                      // Copy to clipboard and open LinkedIn with full content
                      navigator.clipboard.writeText(linkedInArticle.content).then(() => {
                        console.log('✅ Complete job content copied to clipboard');
                        window.open(linkedInDesktopUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                        setTimeout(() => {
                          alert('✅ LinkedIn opened with complete job post pre-filled!\n\nThe post includes:\n• Job title & company details\n• Location & salary information\n• Full job description\n• Requirements & skills needed\n\nAll information is ready in the main post area. Just click "Post" to share!');
                        }, 1000);
                      }).catch(() => {
                        window.open(linkedInDesktopUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
                        setTimeout(() => {
                          alert('LinkedIn opened! The complete job post with all details is ready to be pasted for sharing.');
                        }, 500);
                      });
                    }
                    
                    setShowLinkedInShare(false);
                    setLocation("/referrer-dashboard");
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share on LinkedIn
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowLinkedInShare(false);
                    setLocation("/referrer-dashboard");
                  }}
                  className="flex-1"
                >
                  Skip for Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}