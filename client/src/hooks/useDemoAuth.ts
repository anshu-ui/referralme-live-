import { useState, useEffect } from "react";

interface DemoUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role?: "seeker" | "referrer";
}

export function useDemoAuth() {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('demoUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const signInWithGoogle = async () => {
    // Simulate Google sign-in
    const demoUser: DemoUser = {
      uid: 'demo-user-' + Date.now(),
      email: 'demo@example.com',
      displayName: 'Demo User',
      photoURL: 'https://via.placeholder.com/150/0066cc/ffffff?text=DU'
    };
    
    setUser(demoUser);
    localStorage.setItem('demoUser', JSON.stringify(demoUser));
    return demoUser;
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('demoUser');
  };

  const updateUserRole = async (role: "seeker" | "referrer") => {
    if (!user) return;
    
    const updatedUser = { ...user, role };
    setUser(updatedUser);
    localStorage.setItem('demoUser', JSON.stringify(updatedUser));
  };

  return {
    user,
    isLoading,
    signInWithGoogle,
    signOut,
    updateUserRole
  };
}