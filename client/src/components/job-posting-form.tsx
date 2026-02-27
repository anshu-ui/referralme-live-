import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { X, Briefcase, MapPin, DollarSign, FileText, Users } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { apiRequest } from "../lib/queryClient";

const jobPostingSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  location: z.string().min(1, "Location is required"),
  salary: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  requirements: z.string().optional(),
  workType: z.enum(["remote", "onsite", "hybrid"]).optional(),
  experienceLevel: z.enum(["entry", "mid", "senior", "lead"]).optional(),
  department: z.string().optional(),
});

type JobPostingFormData = z.infer<typeof jobPostingSchema>;

interface JobPostingFormProps {
  isOpen: boolean;
  onClose: () => void;
  onJobPosted?: (job: any) => void;
}

export default function JobPostingForm({ isOpen, onClose, onJobPosted }: JobPostingFormProps) {
  const queryClient = useQueryClient();
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isValid }
  } = useForm<JobPostingFormData>({
    resolver: zodResolver(jobPostingSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      company: "",
      location: "",
      salary: "",
      description: "",
      requirements: "",
      workType: "remote",
      experienceLevel: "mid",
      department: "",
    }
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: JobPostingFormData) => {
      const jobData = {
        ...data,
        skills: skills.join(", "), // Convert skills array to string
      };
      return await apiRequest("/api/job-postings", JSON.stringify(jobData));
    },
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/job-postings/my"] });
      reset();
      setSkills([]);
      onJobPosted?.(newJob);
      onClose();
    },
    onError: (error: Error) => {
    },
  });

  const addSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const onSubmit = (data: JobPostingFormData) => {
    createJobMutation.mutate(data);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto animate-fade-in-up">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0 pb-4">
          <div className="flex-1">
            <CardTitle className="text-lg sm:text-xl font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Post a Job Opportunity
            </CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Share a job opportunity with job seekers in your network
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="hover-lift self-end sm:self-center">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 animate-fade-in-up">
            {/* Basic Information */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="text-lg sm:text-xl font-medium">Basic Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium">
                    <Briefcase className="h-3 w-3 sm:h-4 sm:w-4" />
                    Job Title *
                  </Label>
                  <Input
                    id="title"
                    {...register("title")}
                    placeholder="e.g. Senior Software Engineer"
                    className={`h-10 sm:h-11 text-sm sm:text-base ${errors.title ? "border-red-500" : ""}`}
                    data-testid="input-title"
                  />
                  {errors.title && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.title.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company" className="flex items-center gap-2 text-sm font-medium">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                    Company *
                  </Label>
                  <Input
                    id="company"
                    {...register("company")}
                    placeholder="e.g. Google"
                    className={`h-10 sm:h-11 text-sm sm:text-base ${errors.company ? "border-red-500" : ""}`}
                    data-testid="input-company"
                  />
                  {errors.company && (
                    <p className="text-xs sm:text-sm text-red-500">{errors.company.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location *
                  </Label>
                  <Input
                    id="location"
                    {...register("location")}
                    placeholder="e.g. San Francisco, CA"
                    className={errors.location ? "border-red-500" : ""}
                  />
                  {errors.location && (
                    <p className="text-sm text-red-500">{errors.location.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Salary Range
                  </Label>
                  <Input
                    id="salary"
                    {...register("salary")}
                    placeholder="e.g. $120k - $150k"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    {...register("department")}
                    placeholder="e.g. Engineering"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workType">Work Type</Label>
                  <Select onValueChange={(value) => setValue("workType", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="remote">Remote</SelectItem>
                      <SelectItem value="onsite">On-site</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="experienceLevel">Experience Level</Label>
                  <Select onValueChange={(value) => setValue("experienceLevel", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entry">Entry Level</SelectItem>
                      <SelectItem value="mid">Mid Level</SelectItem>
                      <SelectItem value="senior">Senior Level</SelectItem>
                      <SelectItem value="lead">Lead Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Skills Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Required Skills</h3>
              
              <div className="space-y-2">
                <Label htmlFor="skills">Add Skills</Label>
                <div className="flex gap-2">
                  <Input
                    id="skills"
                    value={currentSkill}
                    onChange={(e) => setCurrentSkill(e.target.value)}
                    placeholder="e.g. React, Node.js, Python"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                  />
                  <Button type="button" onClick={addSkill} variant="outline">
                    Add
                  </Button>
                </div>
              </div>

              {skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Description & Requirements */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Job Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Job Description *
                </Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  rows={4}
                  placeholder="Describe the role, responsibilities, and what the candidate will be doing..."
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea
                  id="requirements"
                  {...register("requirements")}
                  rows={3}
                  placeholder="List the required qualifications, experience, and skills..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createJobMutation.isPending || !isValid}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createJobMutation.isPending ? "Posting..." : "Post Job"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}