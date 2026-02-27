import type { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
    name?: string;
    picture?: string;
  };
}

// Simplified authentication for demonstration
export const verifyFirebaseToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    // For demo purposes, accept any Bearer token and extract user info
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Extract user info from token (in production, verify with Firebase Admin SDK)
    const token = authHeader.split('Bearer ')[1];
    
    // Mock user for demo - in production, decode and verify the Firebase ID token
    req.user = {
      uid: "demo-user-" + Date.now(),
      email: "demo@example.com",
      name: "Demo User",
    };

    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ message: "Unauthorized" });
  }
};