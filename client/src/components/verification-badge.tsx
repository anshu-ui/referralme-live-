import { Badge } from "./ui/badge";
import { CheckCircle, Shield } from "lucide-react";

interface VerificationBadgeProps {
  isVerified: boolean;
  type?: "profile" | "company";
  size?: "sm" | "md" | "lg";
}

export default function VerificationBadge({ 
  isVerified, 
  type = "profile",
  size = "sm" 
}: VerificationBadgeProps) {
  if (!isVerified) return null;

  const sizeClasses = {
    sm: "h-4 w-4 text-xs",
    md: "h-5 w-5 text-sm", 
    lg: "h-6 w-6 text-base"
  };

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5"
  };

  return (
    <Badge 
      variant="secondary" 
      className={`${sizeClasses[size]} bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 gap-1 font-medium`}
    >
      {type === "company" ? (
        <Shield className={iconSize[size]} />
      ) : (
        <CheckCircle className={iconSize[size]} />
      )}
      Verified
    </Badge>
  );
}