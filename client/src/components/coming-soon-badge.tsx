import { Badge } from "../components/ui/badge";
import { Clock, Star, Sparkles } from "lucide-react";

interface ComingSoonBadgeProps {
  feature?: string;
  variant?: "default" | "sparkle" | "star";
  size?: "sm" | "md" | "lg";
}

export default function ComingSoonBadge({ 
  feature = "Coming Soon", 
  variant = "default",
  size = "md" 
}: ComingSoonBadgeProps) {
  const getIcon = () => {
    switch (variant) {
      case "sparkle":
        return <Sparkles className="h-3 w-3 mr-1" />;
      case "star":
        return <Star className="h-3 w-3 mr-1" />;
      default:
        return <Clock className="h-3 w-3 mr-1" />;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return "text-xs px-2 py-1";
      case "lg":
        return "text-sm px-3 py-2";
      default:
        return "text-xs px-2.5 py-1.5";
    }
  };

  return (
    <Badge 
      variant="secondary" 
      className={`flex items-center bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 border-purple-200 dark:from-purple-900 dark:to-blue-900 dark:text-purple-300 dark:border-purple-700 ${getSizeClass()}`}
    >
      {getIcon()}
      {feature}
    </Badge>
  );
}