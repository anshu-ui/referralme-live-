import { useEffect, useState } from "react";
import { User, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "firebase/auth";
import { campusAuth, campusGoogleProvider, isCampusFirebaseConfigured } from "../lib/campus-firebase";

export function useCampusAuth() {
  const [campusUser, setCampusUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!campusAuth || !isCampusFirebaseConfigured) {
      setCampusUser(null);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(campusAuth, (user) => {
      setCampusUser(user);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!campusAuth) {
      throw new Error("Campus Firebase is not configured yet.");
    }
    try {
      await signInWithPopup(campusAuth, campusGoogleProvider);
    } catch (error: any) {
      if (error?.code === "auth/popup-blocked" || error?.code === "auth/popup-closed-by-user" || error?.code === "auth/web-storage-unsupported") {
        await signInWithRedirect(campusAuth, campusGoogleProvider);
        return;
      }
      throw error;
    }
  };

  const logout = async () => {
    if (!campusAuth) return;
    await signOut(campusAuth);
  };

  return {
    campusUser,
    isLoading,
    isConfigured: isCampusFirebaseConfigured,
    signInWithGoogle,
    logout,
  };
}
