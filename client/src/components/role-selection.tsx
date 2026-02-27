import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { CheckCircle, Handshake, Search } from "lucide-react";
import { useDemoAuth } from "../hooks/useDemoAuth";


export default function RoleSelection() {
  const [isLoading, setIsLoading] = useState(false);
  const { user, updateUserRole } = useDemoAuth();

  const handleRoleSelect = async (role: "seeker" | "referrer") => {
    if (!user) return;

    setIsLoading(true);
    try {
      await updateUserRole(role);


      // Redirect to appropriate dashboard
      setTimeout(() => {
        // NO AUTOMATIC DASHBOARD REDIRECT - role selection complete
      }, 1000);

    } catch (error) {
      console.error("Error setting user role:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <img src={"/logo.png"} alt="ReferralMe" className="w-8 h-8 rounded-lg" />
              <span className="text-xl font-bold text-gray-900">ReferralMe</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to ReferralMe! 🎉
            </h1>
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">
              Choose Your Role
            </h2>
            <p className="text-lg text-gray-600">
              How would you like to use our platform? Select the option that best describes your goals.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <Card className="border-2 border-transparent hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Handshake className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">I'm a Referrer</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">Help talented professionals by referring them to opportunities at your company or network.</p>
                <div className="bg-white rounded-lg p-4 text-sm text-gray-700 space-y-2 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Post active job openings</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Review applications & resumes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Approve/reject candidates</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Build professional network</span>
                  </div>
                </div>
                <Button 
                  size="lg"
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                  onClick={() => handleRoleSelect("referrer")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Setting up...
                    </div>
                  ) : (
                    "Join as Referrer"
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-transparent hover:border-blue-500 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">I'm a Job Seeker</h3>
                <p className="text-gray-600 mb-6 leading-relaxed">Looking for your next career opportunity? Get referred to top companies by industry professionals.</p>
                <div className="bg-white rounded-lg p-4 text-sm text-gray-700 space-y-2 mb-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span>Browse verified job opportunities</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span>Apply with resume & cover letter</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span>Track application status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-blue-500" />
                    <span>Chat with referrers</span>
                  </div>
                </div>
                <Button 
                  size="lg"
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                  onClick={() => handleRoleSelect("seeker")}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Setting up...
                    </div>
                  ) : (
                    "Join as Job Seeker"
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              You can always change your role later in settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
