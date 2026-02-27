import { Link } from "wouter";

export default function DashboardFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="flex items-center space-x-6">
            <div className="text-sm text-gray-600">
              © 2025 ReferralMe. All rights reserved.
            </div>
            <div className="text-sm text-gray-500">
              Built with ❤️ in India
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <a 
              href="/privacy-policy" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Privacy Policy
            </a>
            <a 
              href="/terms-of-service" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Terms of Service
            </a>
            <a 
              href="mailto:amit@referralme.in" 
              className="text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              Support
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}