import { Bell } from "lucide-react";
import { Button } from "../components/ui/button";
import type { User } from "@shared/schema";

interface HeaderProps {
  user: User;
}

export default function Header({ user }: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary">ReferralMe</h1>
            </div>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
              Dashboard
            </a>
            {user.role === 'seeker' && (
              <>
                <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                  Browse Referrals
                </a>
                <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                  My Requests
                </a>
              </>
            )}
            {user.role === 'referrer' && (
              <>
                <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                  My Postings
                </a>
                <a href="#" className="text-gray-700 hover:text-primary px-3 py-2 text-sm font-medium">
                  Requests
                </a>
              </>
            )}
          </nav>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm">
              <Bell className="h-5 w-5 text-gray-700" />
              <span className="sr-only">Notifications</span>
            </Button>
            {user.profileImageUrl ? (
              <img 
                className="h-8 w-8 rounded-full object-cover" 
                src={user.profileImageUrl} 
                alt="User profile" 
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {user.firstName?.[0] || user.email?.[0] || 'U'}
                </span>
              </div>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/api/logout'}
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
