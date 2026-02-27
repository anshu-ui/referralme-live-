import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { ArrowLeft, Upload, User, Save, Loader2 } from "lucide-react";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";
import { updateUserProfile, getUserProfile, isProfileComplete, type FirestoreUser } from "../lib/firestore";
import FirebaseFileUpload from "../components/firebase-file-upload";
import { trackProfileCompletion } from "../lib/analytics";
import { isUserVerified } from "../lib/firestore";
import { sendWelcomeEmail } from "../lib/emailService";

export default function ProfileEdit() {
  const [, setLocation] = useLocation();
  const { user, refreshUser } = useFirebaseAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    designation: "",
    company: "",
    experience: "",
    location: "",
    bio: "",
    skills: [] as string[],
    linkedinUrl: "",
    githubUrl: "",
    websiteUrl: "",
    profileImageUrl: ""
  });
  
  const [skillInput, setSkillInput] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load user profile data
  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const profile = await getUserProfile(user.uid);
      if (profile) {
        setFormData({
          firstName: profile.firstName || "",
          lastName: profile.lastName || "",
          email: profile.email || user.email || "",
          phoneNumber: profile.phoneNumber || "",
          designation: profile.designation || "",
          company: profile.company || "",
          experience: profile.experience || "",
          location: profile.location || "",
          bio: profile.bio || "",
          skills: profile.skills || [],
          linkedinUrl: profile.linkedinUrl || "",
          githubUrl: profile.githubUrl || "",
          websiteUrl: profile.websiteUrl || "",
          profileImageUrl: profile.profileImageUrl || ""
        });
      } else {
        // Pre-fill with Firebase auth data for new users
        setFormData(prev => ({
          ...prev,
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          email: user.email || "",
          skills: [],
          profileImageUrl: "",
          // Keep location and other fields that user might have filled
          location: prev.location || ""
        }));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (fileUrl: string, fileName: string) => {
    setFormData(prev => ({
      ...prev,
      profileImageUrl: fileUrl
    }));
    // Profile image uploaded - no toast notification
    console.log("Profile image uploaded successfully:", fileUrl);
  };

  const handleSave = async () => {
    if (!user) return;

    // Comprehensive validation - check all required fields
    const requiredFields = [
      { field: 'firstName', label: 'First Name' },
      { field: 'lastName', label: 'Last Name' },
      { field: 'email', label: 'Email' },
      { field: 'phoneNumber', label: 'Phone Number' },
      { field: 'experience', label: 'Experience' },
      { field: 'designation', label: 'Job Title' },
      { field: 'company', label: 'Company' },
      { field: 'location', label: 'Location' },
      { field: 'bio', label: 'Bio' }
    ];

    const emptyFields = requiredFields.filter(({ field }) => !formData[field as keyof typeof formData]?.toString().trim());
    
    if (emptyFields.length > 0) {
      // Show validation error to user
      const fieldNames = emptyFields.map(f => f.label).join(', ');
      alert(`Please fill in all required fields: ${fieldNames}`);
      console.log("Missing required fields:", fieldNames);
      return;
    }



    setIsSaving(true);
    try {
      // Get current user profile to include role and other fields
      const currentProfile = await getUserProfile(user.uid);
      
      const updateData: Partial<FirestoreUser> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        designation: formData.designation.trim(),
        company: formData.company.trim(),
        experience: formData.experience.trim(),
        location: formData.location.trim(),
        bio: formData.bio.trim(),
        skills: formData.skills,
        linkedinUrl: formData.linkedinUrl.trim(),
        githubUrl: formData.githubUrl.trim(),
        websiteUrl: formData.websiteUrl.trim(),
        profileImageUrl: formData.profileImageUrl.trim()
      };

      // Check if profile will be complete after this update
      const tempUser = { ...currentProfile, ...updateData } as FirestoreUser;
      const wasProfileIncomplete = !currentProfile?.profileCompleted;
      if (isProfileComplete(tempUser)) {
        updateData.profileCompleted = true;
        // Track profile completion only if it wasn't completed before
        if (wasProfileIncomplete) {
          trackProfileCompletion(currentProfile?.role || 'unknown');
        }
      }

      // Check if user qualifies for verification badge
      if (isUserVerified(tempUser)) {
        updateData.isVerified = true;
      }

      await updateUserProfile(user.uid, updateData);
      
      console.log("Profile updated successfully in Firestore");
      
      // FIXED: Get role from multiple sources to ensure correct dashboard
      const userRole = currentProfile?.role || user?.role || 'seeker';
      console.log("🔍 DEBUG: Current profile role:", currentProfile?.role);
      console.log("🔍 DEBUG: Firebase user role:", user?.role);
      console.log("🔍 DEBUG: Final user role:", userRole);
      
      const dashboardPath = userRole === "referrer" ? "/referrer-dashboard" : "/seeker-dashboard";
      console.log("🎯 FINAL: User role:", userRole, "Dashboard path:", dashboardPath);
      
      // Send welcome email for all profile completions (including recreated accounts)  
      if (updateData.profileCompleted) {
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        console.log("✅ SENDING WELCOME EMAIL:");
        console.log("  - Name:", fullName);
        console.log("  - Email:", formData.email);
        console.log("  - Role:", userRole);
        console.log("  - Was incomplete before:", wasProfileIncomplete);
        
        // Send welcome email regardless of previous completion status
        sendWelcomeEmail(fullName, formData.email, userRole)
          .then((result) => {
            console.log("✅ Welcome email sent successfully:", result);
          })
          .catch((err) => {
            console.error("❌ Welcome email failed:", err);
          });
      }
      
      // Refresh user data first
      console.log("Refreshing user data...");
      await refreshUser();
      console.log("User data refreshed");
      
      // Add a small delay to ensure Firestore data propagates
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log("✅ Profile saved! Navigating to:", dashboardPath);
      
      // Use window.location.href for a full page refresh to ensure fresh data
      window.location.href = dashboardPath;
      
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      setIsSaving(false);
      // Show error but don't block user - they can try again
      console.error("Failed to update profile. Please try again.");
    }
  };

  const handleBack = () => {
    // Navigate back to appropriate dashboard
    if (user) {
      getUserProfile(user.uid).then(profile => {
        if (profile?.role === "referrer") {
          setLocation("/referrer-dashboard");
        } else {
          setLocation("/seeker-dashboard");
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={handleBack}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600 mt-2">Update your professional information and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Personal Information
            </CardTitle>
            <CardDescription>
              Keep your profile up to date to help with job matching and networking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Picture Section */}
            <div className="flex items-center space-x-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={formData.profileImageUrl} alt="Profile" />
                <AvatarFallback className="text-lg">
                  {formData.firstName?.[0]}{formData.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Label className="text-sm font-medium">Profile Picture</Label>
                <div className="mt-2">
                  <FirebaseFileUpload
                    onFileUploaded={handleFileUpload}
                    acceptedTypes=".jpg,.jpeg,.png,.gif"
                    maxSizeMB={5}
                    label="Upload Photo"
                    description="Choose a professional photo (JPG, PNG, or GIF, max 5MB)"
                    currentFile={formData.profileImageUrl}
                  />
                </div>
              </div>
            </div>

            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  placeholder="Enter your first name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  placeholder="Enter your last name"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="Enter your email"
                  className="mt-1"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="phoneNumber">Phone Number *</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                  placeholder="Enter your phone number (required)"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Professional Information */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Professional Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="designation">Job Title / Designation *</Label>
                  <Input
                    id="designation"
                    value={formData.designation}
                    onChange={(e) => handleInputChange("designation", e.target.value)}
                    placeholder="Software Engineer, Product Manager, etc. (required)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company *</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleInputChange("company", e.target.value)}
                    placeholder="Google, Microsoft, Startup, etc. (required)"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="experience">Years of Experience *</Label>
                  <Select 
                    value={formData.experience} 
                    onValueChange={(value) => handleInputChange("experience", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select experience level (required)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="college student">College Student</SelectItem>
                      <SelectItem value="0-1">0-1 years</SelectItem>
                      <SelectItem value="1-2">1-2 years</SelectItem>
                      <SelectItem value="2-3">2-3 years</SelectItem>
                      <SelectItem value="4-6">4-6 years</SelectItem>
                      <SelectItem value="7-10">7-10 years</SelectItem>
                      <SelectItem value="10+">10+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="location">Location *</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleInputChange("location", e.target.value)}
                    placeholder="San Francisco, New York, Remote, etc. (required)"
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Professional Bio *</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  placeholder="Tell us about your professional background, skills, and interests... (required)"
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.bio.length}/500 characters
                </p>
              </div>
            </div>

            {/* Social Links */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Professional Links</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="linkedinUrl">LinkedIn Profile</Label>
                  <Input
                    id="linkedinUrl"
                    value={formData.linkedinUrl}
                    onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="githubUrl">GitHub Profile</Label>
                  <Input
                    id="githubUrl"
                    value={formData.githubUrl}
                    onChange={(e) => handleInputChange("githubUrl", e.target.value)}
                    placeholder="https://github.com/yourusername"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="websiteUrl">Personal Website</Label>
                  <Input
                    id="websiteUrl"
                    value={formData.websiteUrl}
                    onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                    placeholder="https://yourwebsite.com"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="border-t pt-6 flex justify-end space-x-4">
              <Button variant="outline" onClick={handleBack}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}