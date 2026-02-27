import { useState, useEffect } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";
import { FirestoreUser, getUser, createUser, acceptReferralInvitation, initializeReferralCode } from "../lib/firestore";
import { trackUserSignup, trackUserLogin } from "../lib/analytics";

export function useFirebaseAuth() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      
      if (user) {
        // Get or create user in Firestore
        try {
          let userData = await getUser(user.uid);
          
          if (!userData) {
            // Create new user in Firestore
            const newUserData = {
              uid: user.uid,
              email: user.email || "",
              displayName: user.displayName || "",
              photoURL: user.photoURL || undefined,
            };
            await createUser(newUserData);
            
            // Initialize referral code
            await initializeReferralCode(user.uid, user.displayName || user.email || "User");
            
            // Check for referral code in URL params
            const urlParams = new URLSearchParams(window.location.search);
            const referralCode = urlParams.get('ref');
            
            if (referralCode) {
              try {
                await acceptReferralInvitation(referralCode, user.uid);
                console.log("Referral accepted successfully");
              } catch (error) {
                console.error("Error accepting referral:", error);
              }
            }
            
            userData = await getUser(user.uid);
          }
          
          setFirestoreUser(userData);
        } catch (error) {
          console.error("Error handling user data:", error);
          setFirestoreUser(null);
        }
      } else {
        setFirestoreUser(null);
      }
      
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Track login or signup based on whether user exists
      if (result.user) {
        const existingUser = await getUser(result.user.uid);
        if (existingUser) {
          trackUserLogin('google');
        } else {
          trackUserSignup('google');
        }
      }
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (firebaseUser) {
      try {
        const userData = await getUser(firebaseUser.uid);
        setFirestoreUser(userData);
      } catch (error) {
        console.error("Error refreshing user data:", error);
      }
    }
  };

  const logout = async () => {
    try {
      console.log("Logging out user...");
      await signOut(auth);
      console.log("User logged out successfully");
      // Clear any cached data
      setFirestoreUser(null);
      setFirebaseUser(null);
      // The onAuthStateChanged listener will handle the state updates
      // No need for hard redirect - let the routing handle it naturally
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  return {
    user: firestoreUser,
    firebaseUser,
    isLoading,
    isAuthenticated: !!firebaseUser,
    signInWithGoogle,
    logout,
    refreshUser,
  };
}