import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Users, Briefcase, CheckCircle } from "lucide-react";
import { trackRoleSelection } from "../lib/analytics";


interface RoleSelectionProps {
  onRoleSelected: (role: "seeker" | "referrer") => void;
}

export default function RoleSelection({ onRoleSelected }: RoleSelectionProps) {
  const [selectedRole, setSelectedRole] = useState<"seeker" | "referrer" | null>(null);

  const handleRoleSelection = (role: "seeker" | "referrer") => {
    console.log("Role selection button clicked:", role);
    setSelectedRole(role);
    trackRoleSelection(role);
    console.log("Calling onRoleSelected...");
    onRoleSelected(role);
    console.log("onRoleSelected called successfully");
    // The redirect will be handled by the parent component after Firestore update
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img src={"/logo.png"} alt="ReferralMe" className="h-12 w-12 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">ReferralMe</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Choose Your Role
          </h2>
          <p className="text-gray-600 text-lg">
            Select how you'd like to participate in the referral network
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Job Seeker Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl border-2 ${
              selectedRole === "seeker" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-300"
            }`}
            onClick={() => setSelectedRole("seeker")}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-fit">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                Job Seeker
                {selectedRole === "seeker" && <CheckCircle className="h-5 w-5 text-blue-600" />}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Looking for job opportunities and referrals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Feature
                  </Badge>
                  <span className="text-sm text-gray-700">Browse job opportunities</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Feature
                  </Badge>
                  <span className="text-sm text-gray-700">Request referrals from professionals</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Feature
                  </Badge>
                  <span className="text-sm text-gray-700">Track application status</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Feature
                  </Badge>
                  <span className="text-sm text-gray-700">Get mentorship and career guidance</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    Tool
                  </Badge>
                  <span className="text-sm text-gray-700">ATS resume analyzer</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referrer Card */}
          <Card 
            className={`cursor-pointer transition-all duration-300 hover:shadow-xl border-2 ${
              selectedRole === "referrer" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-green-300"
            }`}
            onClick={() => setSelectedRole("referrer")}
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-fit">
                <Briefcase className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
                Referrer
                {selectedRole === "referrer" && <CheckCircle className="h-5 w-5 text-green-600" />}
              </CardTitle>
              <CardDescription className="text-gray-600">
                Help others by posting opportunities and providing referrals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Feature
                  </Badge>
                  <span className="text-sm text-gray-700">Post job opportunities</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Feature
                  </Badge>
                  <span className="text-sm text-gray-700">Manage referral requests</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Feature
                  </Badge>
                  <span className="text-sm text-gray-700">Offer mentorship</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Feature
                  </Badge>
                  <span className="text-sm text-gray-700">Build professional network</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Analytics
                  </Badge>
                  <span className="text-sm text-gray-700">Track referral success rates</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={() => selectedRole && handleRoleSelection(selectedRole)}
            disabled={!selectedRole}
            className={`px-8 py-3 text-lg font-semibold ${
              selectedRole === "seeker" 
                ? "bg-blue-600 hover:bg-blue-700" 
                : selectedRole === "referrer"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-400"
            }`}
          >
            Continue to Profile Setup
          </Button>
          
          {selectedRole && (
            <p className="text-sm text-gray-600 mt-4">
              You can change your role anytime in settings
            </p>
          )}
        </div>
      </div>
    </div>
  );
}