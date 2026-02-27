import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { updateUser, isProfileComplete } from "./lib/firestore";
import NotFound from "./pages/not-found";
import ComprehensiveReferrerDashboard from "./pages/comprehensive-referrer-dashboard";
import CleanSeekerDashboard from "./pages/clean-seeker-dashboard";
import NewLanding from "./pages/new-landing";
import RoleSelection from "./pages/role-selection";
import ProfileEdit from "./pages/profile-edit";
import CreateJobPosting from "./pages/create-job-posting";
import JobDetails from "./pages/job-details";
import PublicReferrerProfile from "./pages/public-referrer-profile";
import JobPostingPage from "./pages/job-posting-page";
import PaymentSetup from "./pages/payment-setup";
import PrivacyPolicy from "./pages/privacy-policy";
import TermsOfService from "./pages/terms-of-service";


function Router() {
  const { user, firebaseUser, isLoading, refreshUser } = useFirebaseAuth();
  
  // Track page views when routes change
  useAnalytics();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleRoleSelected = async (role: "seeker" | "referrer") => {
    if (!firebaseUser || !user) {
      console.error("No user found when trying to update role");
      console.error("Firebase user:", firebaseUser);
      console.error("Firestore user:", user);
      alert("Authentication error. Please refresh and try again.");
      return;
    }
    
    const userUID = firebaseUser.uid || user.uid;
    if (!userUID) {
      console.error("User UID is missing from both Firebase and Firestore user");
      console.error("Firebase user:", firebaseUser);
      console.error("Firestore user:", user);
      alert("User ID error. Please refresh and try again.");
      return;
    }
    
    try {
      console.log(`Updating user role to: ${role} for UID: ${userUID}`);
      
      // Update user role in Firestore
      await updateUser(userUID, { role, profileCompleted: false });
      console.log("User role updated successfully");
      
      // Send welcome email after role selection
      const userName = firebaseUser.displayName || user?.firstName || user?.displayName || "User";
      const userEmail = firebaseUser.email || user?.email || "";
      
      if (userEmail) {
        console.log("🎯 Sending welcome email after role selection:", { userName, userEmail, role });
        try {
          const response = await fetch('/api/email/welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: userName,
              email: userEmail,
              role: role
            })
          });
          
          if (response.ok) {
            console.log("✅ Welcome email sent successfully after role selection");
          } else {
            console.error("❌ Failed to send welcome email:", await response.text());
          }
        } catch (error) {
          console.error("❌ Error sending welcome email:", error);
        }
      }
      
      // Refresh user data to get the updated role
      await refreshUser();
      console.log("User data refreshed");
      
      // Role updated successfully - redirect to profile edit
      console.log("Role updated successfully, redirecting to profile edit");
      window.location.href = "/profile-edit";
      
    } catch (error) {
      console.error("Error updating user role:", error);
      console.error("Firebase user:", firebaseUser);
      console.error("Firestore user:", user);
      console.error("Role selected:", role);
      // Show a basic alert for debugging
      alert(`Error updating role: ${(error as any).message || 'Unknown error'}. Please try again.`);
    }
  };

  // CRITICAL: HOMEPAGE MUST ALWAYS SHOW FOR UNAUTHENTICATED USERS
  return (
    <Switch>
      {/* Public routes - always accessible */}

      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-of-service" component={TermsOfService} />
      
      {/* Authentication flow routes - PROTECTED */}
      <Route path="/role-selection" component={() => {
        console.log("Role Selection - Firebase User:", !!firebaseUser);
        if (!firebaseUser) {
          console.log("Not authenticated for role selection - redirecting to home");
          window.location.href = "/";
          return <NewLanding />;
        }
        return <RoleSelection onRoleSelected={handleRoleSelected} />;
      }} />
      <Route path="/profile-edit" component={() => {
        console.log("Profile Edit - Firebase User:", !!firebaseUser, "User Role:", user?.role);
        if (!firebaseUser) {
          console.log("Not authenticated for profile edit - redirecting to home");
          window.location.href = "/";
          return <NewLanding />;
        }
        if (!user?.role) {
          console.log("No role set for profile edit - redirecting to role selection");
          window.location.href = "/role-selection";
          return <RoleSelection onRoleSelected={handleRoleSelected} />;
        }
        return <ProfileEdit />;
      }} />
      <Route path="/edit-profile" component={() => {
        console.log("Edit Profile - Firebase User:", !!firebaseUser, "User Role:", user?.role);
        if (!firebaseUser) {
          console.log("Not authenticated for edit profile - redirecting to home");
          window.location.href = "/";
          return <NewLanding />;
        }
        if (!user?.role) {
          console.log("No role set for edit profile - redirecting to role selection");
          window.location.href = "/role-selection";
          return <RoleSelection onRoleSelected={handleRoleSelected} />;
        }
        return <ProfileEdit />;
      }} />
      
      {/* Dashboard routes - PROTECTED - require authentication */}
      <Route path="/dashboard" component={() => {
        console.log("Dashboard route - Firebase User:", !!firebaseUser, "Firestore User:", !!user, "User Role:", user?.role);
        if (!firebaseUser) {
          console.log("No Firebase user - redirecting to landing");
          window.location.href = "/";
          return <NewLanding />;
        }
        if (!user?.role) {
          console.log("No user role - redirecting to role selection");
          window.location.href = "/role-selection";
          return <RoleSelection onRoleSelected={handleRoleSelected} />;
        }
        if (!isProfileComplete(user)) {
          console.log("Profile incomplete - redirecting to profile edit");
          window.location.href = "/profile-edit";
          return <ProfileEdit />;
        }
        return user.role === 'referrer' ? <ComprehensiveReferrerDashboard /> : <CleanSeekerDashboard />;
      }} />
      <Route path="/referrer-dashboard" component={() => {
        console.log("Referrer Dashboard - Firebase User:", !!firebaseUser, "User Role:", user?.role);
        if (!firebaseUser) {
          console.log("Not authenticated - redirecting to home");
          window.location.href = "/";
          return <NewLanding />;
        }
        
        // Show loading while user data is still being fetched
        if (firebaseUser && !user) {
          console.log("User data still loading...");
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading your dashboard...</p>
              </div>
            </div>
          );
        }
        
        if (!user?.role || user.role !== 'referrer') {
          console.log("Wrong role or no role - redirecting to role selection");
          window.location.href = "/role-selection";
          return <RoleSelection onRoleSelected={handleRoleSelected} />;
        }
        if (!isProfileComplete(user)) {
          console.log("Profile incomplete - redirecting to profile edit");
          window.location.href = "/profile-edit";
          return <ProfileEdit />;
        }
        return <ComprehensiveReferrerDashboard />;
      }} />
      <Route path="/seeker-dashboard" component={() => {
        console.log("Seeker Dashboard - Firebase User:", !!firebaseUser, "User Role:", user?.role);
        if (!firebaseUser) {
          console.log("Not authenticated - redirecting to home");
          window.location.href = "/";
          return <NewLanding />;
        }
        
        // Show loading while user data is still being fetched
        if (firebaseUser && !user) {
          console.log("User data still loading...");
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading your dashboard...</p>
              </div>
            </div>
          );
        }
        
        if (!user?.role || user.role !== 'seeker') {
          console.log("Wrong role or no role - redirecting to role selection");
          window.location.href = "/role-selection";
          return <RoleSelection onRoleSelected={handleRoleSelected} />;
        }
        if (!isProfileComplete(user)) {
          console.log("Profile incomplete - redirecting to profile edit");
          window.location.href = "/profile-edit";
          return <ProfileEdit />;
        }
        return <CleanSeekerDashboard />;
      }} />
      
      {/* Other protected routes */}
      <Route path="/post-job" component={JobPostingPage} />
      <Route path="/job-posting-form" component={CreateJobPosting} />
      <Route path="/create-job" component={CreateJobPosting} />
      <Route path="/payment-setup" component={PaymentSetup} />
      
      {/* PUBLIC ROUTES - No authentication required */}
      <Route path="/job/:id" component={({ params }) => <JobDetails jobId={params.id} />} />
      <Route path="/referrer/:id" component={({ params }) => <PublicReferrerProfile referrerId={params.id} />} />
      
      {/* ROOT PATH - ALWAYS SHOW LANDING PAGE (MUST BE LAST TO AVOID CONFLICTS) */}
      <Route path="/" component={NewLanding} />
      
      {/* Fallback - always show landing page */}
      <Route component={NewLanding} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    // Verify required environment variable is present
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;