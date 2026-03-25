import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { useFirebaseAuth } from "./hooks/useFirebaseAuth";
import { useCampusAuth } from "./hooks/useCampusAuth";
import { useEffect, useMemo, useState } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { updateUser, isProfileComplete, type PlatformAnnouncement, subscribeToPlatformAnnouncements } from "./lib/firestore";
import { isAdminUser } from "./lib/admin";
import { Bell, ChevronRight } from "lucide-react";
import NotFound from "./pages/not-found";
import ComprehensiveReferrerDashboard from "./pages/comprehensive-referrer-dashboard";
import CleanSeekerDashboard from "./pages/clean-seeker-dashboard";
import NewLanding from "./pages/new-landing";
import AdminDashboard from "./pages/admin-dashboard";
import RoleSelection from "./pages/role-selection";
import ProfileEdit from "./pages/profile-edit";
import CreateJobPosting from "./pages/create-job-posting";
import JobDetails from "./pages/job-details";
import PublicReferrerProfile from "./pages/public-referrer-profile";
import JobPostingPage from "./pages/job-posting-page";
import PaymentSetup from "./pages/payment-setup";
import PrivacyPolicy from "./pages/privacy-policy";
import TermsOfService from "./pages/terms-of-service";
import CampusAmbassadorLanding from "./pages/campus-ambassador";
import CampusAmbassadorApplyPage from "./pages/campus-ambassador-apply";
import CampusAmbassadorAdminPage from "./pages/campus-ambassador-admin";
import CampusAmbassadorDashboard from "./pages/campus-ambassador-dashboard";
import { isCampusFirebaseConfigured } from "./lib/campus-firebase";

const CAMPUS_ADMIN_EMAIL = "amit@referralme.in";

function Router() {
  const { user, firebaseUser, isLoading, refreshUser, signInWithGoogle, logout } = useFirebaseAuth();
  const {
    campusUser,
    isLoading: campusAuthLoading,
    isConfigured: campusConfigured,
    signInWithGoogle: signInToCampus,
    logout: logoutCampus,
  } = useCampusAuth();
  const adminAccess = isAdminUser(user, firebaseUser);
  const campusAdminAccess = (campusUser?.email || "").toLowerCase() === CAMPUS_ADMIN_EMAIL;
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);
  
  // Track page views when routes change
  useAnalytics();

  useEffect(() => {
    const unsubscribe = subscribeToPlatformAnnouncements(setAnnouncements);
    return () => unsubscribe();
  }, []);

  const visibleAnnouncements = useMemo(() => {
    const role = user?.role;

    return announcements.filter((announcement) => {
      if (announcement.status !== "published") return false;
      if (announcement.audience === "all") return true;
      if (!role) return false;
      if (announcement.audience === "seekers") return role === "seeker";
      if (announcement.audience === "referrers") return role === "referrer";
      if (announcement.audience === "admins") return adminAccess;
      return false;
    });
  }, [adminAccess, announcements, user?.role]);

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

  if (firebaseUser && user?.isSuspended && !adminAccess) {
    return <SuspendedAccessScreen onLogout={logout} />;
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
    <>
      <PlatformAnnouncementRail announcements={visibleAnnouncements} />
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
        if (adminAccess) {
          window.location.href = "/admin";
          return <AdminDashboard />;
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
        if (adminAccess) {
          window.location.href = "/admin";
          return <AdminDashboard />;
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
        if (adminAccess) {
          window.location.href = "/admin";
          return <AdminDashboard />;
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
        if (adminAccess) {
          return <AdminDashboard />;
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
        if (adminAccess) {
          window.location.href = "/admin";
          return <AdminDashboard />;
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
        if (adminAccess) {
          window.location.href = "/admin";
          return <AdminDashboard />;
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

      <Route path="/admin" component={() => {
        if (!firebaseUser) {
          return <AdminAccessScreen onSignIn={signInWithGoogle} />;
        }

        if (firebaseUser && !user) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading admin access...</p>
              </div>
            </div>
          );
        }

        if (!adminAccess) {
          return <AdminAccessScreen currentEmail={firebaseUser.email || user?.email} onSwitchAccount={async () => {
            await logout();
            await signInWithGoogle();
          }} />;
        }

        return <AdminDashboard />;
      }} />

      <Route path="/campus-ambassador/admin" component={() => {
        if (!campusConfigured || !isCampusFirebaseConfigured) {
          return (
            <AdminAccessScreen
              currentEmail={null}
              footerNote="Campus admin uses a separate Firebase project. Add VITE_CAMPUS_FIREBASE_* variables before using this route."
            />
          );
        }

        if (campusAuthLoading) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading campus admin access...</p>
              </div>
            </div>
          );
        }

        if (!campusUser) {
          return <AdminAccessScreen onSignIn={signInToCampus} footerNote="This campus admin route uses a separate campus Firebase login." />;
        }

        if (!campusAdminAccess) {
          return <AdminAccessScreen currentEmail={campusUser.email} onSwitchAccount={async () => {
            await logoutCampus();
            await signInToCampus();
          }} />;
        }

        return <CampusAmbassadorAdminPage />;
      }} />

      <Route path="/campus-ambassador/dashboard" component={() => {
        if (!campusConfigured || !isCampusFirebaseConfigured) {
          return (
            <AdminAccessScreen
              currentEmail={null}
              footerNote="Campus dashboard uses a separate Firebase project. Add VITE_CAMPUS_FIREBASE_* variables before using this route."
            />
          );
        }

        return <CampusAmbassadorDashboard />;
      }} />
      
      {/* Other protected routes */}
      <Route path="/post-job" component={JobPostingPage} />
      <Route path="/job-posting-form" component={CreateJobPosting} />
      <Route path="/create-job" component={CreateJobPosting} />
      <Route path="/payment-setup" component={PaymentSetup} />
      
      {/* PUBLIC ROUTES - No authentication required */}
      <Route path="/campus-ambassador" component={CampusAmbassadorLanding} />
      <Route path="/campus-ambassador/apply" component={CampusAmbassadorApplyPage} />
      <Route path="/job/:id" component={({ params }) => <JobDetails jobId={params.id} />} />
      <Route path="/referrer/:id" component={({ params }) => <PublicReferrerProfile referrerId={params.id} />} />
      
      {/* ROOT PATH - ALWAYS SHOW LANDING PAGE (MUST BE LAST TO AVOID CONFLICTS) */}
      <Route path="/" component={NewLanding} />
      
      {/* Fallback - always show landing page */}
        <Route component={NewLanding} />
      </Switch>
    </>
  );
}

function SuspendedAccessScreen({ onLogout }: { onLogout: () => Promise<void> }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-red-700">
          Account Restricted
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Your account is suspended</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Admin has temporarily restricted access to this account. Contact support if you believe this is a mistake.
        </p>
        <button
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => onLogout()}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}

function PlatformAnnouncementRail({ announcements }: { announcements: PlatformAnnouncement[] }) {
  const topAnnouncement = announcements[0];

  if (!topAnnouncement) return null;

  const toneClass =
    topAnnouncement.priority === "critical"
      ? "border-blue-300/80 bg-gradient-to-r from-blue-700 via-blue-600 to-sky-500 text-white"
      : topAnnouncement.priority === "important"
        ? "border-blue-200 bg-gradient-to-r from-blue-100 via-white to-sky-100 text-slate-900"
        : "border-blue-100 bg-white/90 text-slate-800";

  return (
    <div className={`sticky top-0 z-40 border-b backdrop-blur ${toneClass}`}>
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{topAnnouncement.title}</p>
          <p className="truncate text-xs opacity-85">{topAnnouncement.message}</p>
        </div>
        {topAnnouncement.ctaHref && topAnnouncement.ctaLabel ? (
          <a
            href={topAnnouncement.ctaHref}
            className="inline-flex items-center gap-1 rounded-full border border-current/20 px-3 py-2 text-xs font-semibold transition hover:bg-white/10"
          >
            {topAnnouncement.ctaLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function AdminAccessScreen({
  currentEmail,
  onSignIn,
  onSwitchAccount,
  footerNote,
}: {
  currentEmail?: string | null;
  onSignIn?: () => Promise<void>;
  onSwitchAccount?: () => Promise<void>;
  footerNote?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
          Admin Access
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-950">Admin login required</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This route is reserved for an authorized admin account. Sign in with your approved admin email to continue.
        </p>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current account</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{currentEmail || "Not signed in"}</p>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {onSignIn && (
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              onClick={() => onSignIn()}
            >
              Sign In as Admin
            </button>
          )}
          {onSwitchAccount && (
            <button
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              onClick={() => onSwitchAccount()}
            >
              Switch Account
            </button>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500">
          {footerNote || "If this should be your admin account, make sure the exact login email is included in `VITE_ADMIN_EMAILS` or assign your Firestore role as `admin`."}
        </p>
      </div>
    </div>
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
