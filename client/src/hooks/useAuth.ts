import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFirebaseAuth } from "./useFirebaseAuth";
import { apiRequest } from "../lib/queryClient";

export function useAuth() {
  const { user: firebaseUser, isLoading: firebaseLoading, isAuthenticated: firebaseAuth, signInWithGoogle, logout: firebaseLogout } = useFirebaseAuth();
  const queryClient = useQueryClient();

  // Fetch user data from our backend
  const { data: userData, isLoading: userDataLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: firebaseAuth && !!firebaseUser,
    meta: {
      authToken: firebaseUser?.accessToken,
    },
  });

  // Sync Firebase user with our backend
  const syncUserMutation = useMutation({
    mutationFn: async () => {
      if (!firebaseUser) return;
      
      const token = await firebaseUser.getIdToken();
      
      return apiRequest("/api/auth/sync", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          firstName: firebaseUser.displayName?.split(' ')[0] || '',
          lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
          profileImageUrl: firebaseUser.photoURL,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });

  // Auto-sync when Firebase user changes
  React.useEffect(() => {
    if (firebaseUser && !userData) {
      syncUserMutation.mutate();
    }
  }, [firebaseUser, userData]);

  const logout = async () => {
    await firebaseLogout();
    queryClient.clear();
  };

  return {
    user: userData,
    firebaseUser,
    isLoading: firebaseLoading || userDataLoading,
    isAuthenticated: firebaseAuth && !!userData,
    signInWithGoogle,
    logout,
  };
}
