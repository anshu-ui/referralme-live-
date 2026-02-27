import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Camera, Upload, X, Plus } from "lucide-react";
import { updateUser, type FirestoreUser } from "../lib/firestore";
import FirebaseFileUpload from "../components/firebase-file-upload";
import { useFirebaseAuth } from "../hooks/useFirebaseAuth";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirestoreUser;
  onUserUpdated: (updatedUser: FirestoreUser) => void;
}

export default function ProfileEditModal({ isOpen, onClose, user, onUserUpdated }: ProfileEditModalProps) {
  console.log("ProfileEditModal rendered with props:", { isOpen, user: !!user });
  
  // Early return if user is null
  if (!user) {
    return null;
  }
  
  const [, setLocation] = useLocation();
  const { refreshUser } = useFirebaseAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [profileData, setProfileData] = useState({
    displayName: user.displayName || "",
    email: user.email || "",
    phoneNumber: user.phoneNumber || "",
    experience: user.experience || "",
    designation: user.designation || "",
    company: user.company || "",
    location: user.location || "",
    linkedin: user.linkedinUrl || "",
    bio: user.bio || "",
    skills: user.skills || [],
    profileImageUrl: user.profileImageUrl || "",
  });
  
  const [newSkill, setNewSkill] = useState("");

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
      setProfileData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setProfileData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };



  const handleSave = async () => {
    console.log("Profile edit form submitted with data:", profileData);
    console.log("User UID:", user.uid);
    
    // Validation - check all required fields
    const requiredFields = [
      { field: 'displayName', label: 'Name' },
      { field: 'email', label: 'Email' },
      { field: 'phoneNumber', label: 'Phone Number' },
      { field: 'experience', label: 'Experience' },
      { field: 'designation', label: 'Job Title' },
      { field: 'company', label: 'Company' },
      { field: 'location', label: 'Location' },
      { field: 'bio', label: 'Bio' }
    ];

    const emptyFields = requiredFields.filter(({ field }) => !(profileData as any)[field]?.trim());
    
    if (emptyFields.length > 0) {
      setErrors(emptyFields.map(({ label }) => `${label} is required`));
      return;
    }
    
    // Clear any previous errors
    setErrors([]);


    
    setIsLoading(true);
    try {
      console.log("About to update user profile...");
      // Update user in Firestore
      await updateUser(user.uid, profileData);
      console.log("User profile updated successfully");
      
      // Update the user object with new data and trigger refresh
      const updatedUser = { ...user, ...profileData };
      onUserUpdated(updatedUser);
      
      // Refresh user data from Firestore to ensure all components show updated information
      await refreshUser();
      
      // Close modal and show success message
      onClose();
      console.log("✅ Profile updated successfully - modal closed");
      
    } catch (error) {
      console.error("Error updating profile:", error);
      // Handle specific error types
      if (error instanceof Error && error.message.includes('storage')) {
        setErrors(["Profile saved successfully, but image upload had issues. Your profile information has been saved."]);
      } else {
        setErrors(["Failed to save profile. Please check your internet connection and try again."]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] w-[95vw] sm:w-full overflow-y-auto animate-fade-in-up">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-lg sm:text-xl font-bold">Edit Profile</DialogTitle>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Update your profile information. Fields marked with * are required.
          </p>
          
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="text-red-800 text-sm font-medium mb-1">Please fix the following errors:</div>
              <ul className="text-red-700 text-sm space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="flex items-center">
                    <span className="mr-2">•</span>
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 hover-scale">
                <AvatarImage src={profileData.profileImageUrl} alt={profileData.displayName} />
                <AvatarFallback className="text-lg sm:text-xl">
                  {profileData.displayName?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 w-full">
                <Label className="text-sm sm:text-base font-medium">Profile Picture</Label>
                <FirebaseFileUpload
                  onFileUploaded={(fileUrl: string, fileName: string) => {
                    handleInputChange("profileImageUrl", fileUrl);
                  }}
                  acceptedTypes="image/*"
                  maxSizeMB={2}
                  label="Upload Profile Picture"
                  description="Upload a profile picture (JPG, PNG, max 2MB)"
                  currentFile={profileData.profileImageUrl}
                />
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-medium">Full Name *</Label>
              <Input
                id="displayName"
                value={profileData.displayName}
                onChange={(e) => handleInputChange("displayName", e.target.value)}
                placeholder="Enter your full name (required)"
                className="h-10 sm:h-11 text-sm sm:text-base"
                data-testid="input-displayName"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your@email.com (required)"
                className="h-10 sm:h-11 text-sm sm:text-base"
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                value={profileData.phoneNumber}
                onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                placeholder="+1 (555) 123-4567 (required)"
              />
            </div>
            <div>
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={profileData.location}
                onChange={(e) => handleInputChange("location", e.target.value)}
                placeholder="City, Country (required)"
              />
            </div>
          </div>

          {/* Professional Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="designation">Current Designation *</Label>
              <Input
                id="designation"
                value={profileData.designation}
                onChange={(e) => handleInputChange("designation", e.target.value)}
                placeholder="e.g., Software Engineer (required)"
              />
            </div>
            <div>
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={profileData.company}
                onChange={(e) => handleInputChange("company", e.target.value)}
                placeholder="Current company name (required)"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="experience">Years of Experience *</Label>
            <Input
              id="experience"
              value={profileData.experience}
              onChange={(e) => handleInputChange("experience", e.target.value)}
              placeholder="e.g., 3-5 years (required)"
            />
          </div>

          <div>
            <Label htmlFor="linkedin">LinkedIn Profile</Label>
            <Input
              id="linkedin"
              value={profileData.linkedin}
              onChange={(e) => handleInputChange("linkedin", e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
            />
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio *</Label>
            <Textarea
              id="bio"
              value={profileData.bio}
              onChange={(e) => handleInputChange("bio", e.target.value)}
              placeholder="Tell us about yourself, your interests, and career goals..."
              rows={3}
            />
          </div>

          {/* Skills */}
          <div>
            <Label>Skills</Label>
            <div className="space-y-3">
              <div className="flex space-x-2">
                <Input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill"
                  onKeyPress={(e) => e.key === "Enter" && addSkill()}
                />
                <Button 
                  type="button" 
                  onClick={addSkill}
                  size="sm"
                  className="whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {profileData.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {skill}
                    <X 
                      className="h-3 w-3 cursor-pointer hover:text-red-500" 
                      onClick={() => removeSkill(skill)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}