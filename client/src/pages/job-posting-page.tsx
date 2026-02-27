import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { Briefcase, FileText, Target, ArrowLeft, Send, AlertCircle, MapPin, IndianRupee } from "lucide-react";
import { addDoc, collection } from "firebase/firestore";
import { db } from "../lib/firebase";

const jobPostingSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().min(1, "Location is required"),
  salary: z.string().optional(),
  description: z.string().min(50, "Description must be at least 50 characters"),
  requirements: z.string().min(30, "Requirements must be at least 30 characters"),
});

type JobPostingFormData = z.infer<typeof jobPostingSchema>;

export default function JobPostingPage() {
  const [, navigate] = useLocation();
  const { user: firestoreUser, firebaseUser: authUser, isLoading: authLoading } = useFirebaseAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<JobPostingFormData>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      title: "",
      company: "",
      location: "",
      salary: "",
      description: "",
      requirements: "",
    },
  });

  const handleCreateJob = async (data: JobPostingFormData) => {
    console.log("Auth check:", { authUser: !!authUser, firestoreUser: !!firestoreUser, authLoading });
    
    if (!authUser || !firestoreUser) {
      return;
    }

    setIsSubmitting(true);

    try {
      const newJob = {
        ...data,
        referrerId: authUser.uid,
        referrerName: firestoreUser.displayName || firestoreUser.email || "Unknown",
        referrerEmail: firestoreUser.email,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await addDoc(collection(db, "jobPostings"), newJob);


      form.reset();
      navigate("/referrer-dashboard");
    } catch (error) {
      console.error("Error creating job posting:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => navigate("/referrer-dashboard")}
                className="h-12 px-6 text-lg"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Post New Job</h1>
                <p className="text-sm md:text-base text-gray-600">Create a new job opportunity for your network</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <form onSubmit={form.handleSubmit(handleCreateJob)} className="space-y-6">
          {/* Basic Information Card */}
          <Card className="shadow-md border bg-white">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Basic Information
              </CardTitle>
              <CardDescription className="text-sm md:text-base">Essential details about the position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 md:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-sm font-medium text-gray-800">Job Title *</Label>
                  <Input
                    id="title"
                    {...form.register("title")}
                    placeholder="e.g., Senior Software Engineer"
                    className="h-11 border border-gray-200 focus:border-blue-500 rounded-md transition-all duration-200"
                  />
                  {form.formState.errors.title && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="text-sm font-medium text-gray-800">Company *</Label>
                  <Input
                    id="company"
                    {...form.register("company")}
                    placeholder="e.g., TechCorp Inc"
                    className="h-11 border border-gray-200 focus:border-blue-500 rounded-md transition-all duration-200"
                  />
                  {form.formState.errors.company && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {form.formState.errors.company.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium text-gray-800 flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    Location *
                  </Label>
                  <Input
                    id="location"
                    {...form.register("location")}
                    placeholder="e.g., San Francisco, CA (Remote)"
                    className="h-11 border border-gray-200 focus:border-blue-500 rounded-md transition-all duration-200"
                  />
                  {form.formState.errors.location && (
                    <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {form.formState.errors.location.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm font-medium text-gray-800 flex items-center gap-1">
                    <IndianRupee className="h-4 w-4" />
                    Salary Range (in INR)
                  </Label>
                  <Input
                    id="salary"
                    {...form.register("salary")}
                    placeholder="e.g., ₹12L - ₹20L"
                    className="h-11 border border-gray-200 focus:border-blue-500 rounded-md transition-all duration-200"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Description Card */}
          <Card className="shadow-md border bg-white">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Job Description
              </CardTitle>
              <CardDescription className="text-sm md:text-base">Describe the role and what makes it exciting</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-gray-800">
                  Detailed Description *
                </Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="• What will the candidate be working on?&#10;• What technologies and tools will they use?&#10;• What impact will they have on the company?&#10;• What makes this role exciting and unique?"
                  className="min-h-[120px] border border-gray-200 focus:border-green-500 rounded-md transition-all duration-200 resize-none"
                />
                {form.formState.errors.description && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Requirements Card */}
          <Card className="shadow-md border bg-white">
            <CardHeader className="p-4 md:p-6">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                Requirements & Qualifications
              </CardTitle>
              <CardDescription className="text-sm md:text-base">What skills and experience are needed for success</CardDescription>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <div className="space-y-2">
                <Label htmlFor="requirements" className="text-sm font-medium text-gray-800">
                  Required Skills & Experience *
                </Label>
                <Textarea
                  id="requirements"
                  {...form.register("requirements")}
                  placeholder="• Required programming languages and frameworks&#10;• Years of experience needed&#10;• Educational background or certifications&#10;• Technical skills and competencies"
                  className="min-h-[120px] border border-gray-200 focus:border-purple-500 rounded-md transition-all duration-200 resize-none"
                />
                {form.formState.errors.requirements && (
                  <p className="text-red-600 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {form.formState.errors.requirements.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-gray-200">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => navigate("/referrer-dashboard")}
              className="h-11 px-6 border border-gray-300 hover:border-gray-400 transition-all duration-200"
              disabled={isSubmitting}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button 
              type="submit"
              className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg"
              disabled={isSubmitting || authLoading || !authUser || !firestoreUser}
            >
              <Send className="mr-2 h-4 w-4" />
              {authLoading ? "Loading..." : isSubmitting ? "Posting..." : "Post Job Opportunity"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}