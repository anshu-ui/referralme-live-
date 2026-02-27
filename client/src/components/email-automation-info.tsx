import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Mail, CheckCircle, Clock, Bell } from "lucide-react";

interface EmailAutomationInfoProps {
  userRole: 'seeker' | 'referrer';
}

export default function EmailAutomationInfo({ userRole }: EmailAutomationInfoProps) {
  const emailTypes = {
    seeker: [
      {
        title: "Welcome Email",
        description: "Sent when you complete your profile",
        trigger: "Profile completion",
        status: "active",
        icon: <CheckCircle className="h-4 w-4 text-green-600" />
      },
      {
        title: "Job Alerts",
        description: "New job opportunities posted by referrers",
        trigger: "New job posting",
        status: "active",
        icon: <Bell className="h-4 w-4 text-blue-600" />
      },
      {
        title: "Status Updates",
        description: "When referrers accept or decline your applications",
        trigger: "Application status change",
        status: "active",
        icon: <Mail className="h-4 w-4 text-orange-600" />
      }
    ],
    referrer: [
      {
        title: "Welcome Email",
        description: "Sent when you complete your profile",
        trigger: "Profile completion",
        status: "active",
        icon: <CheckCircle className="h-4 w-4 text-green-600" />
      },
      {
        title: "Application Notifications",
        description: "When seekers apply to your job postings",
        trigger: "New application received",
        status: "active",
        icon: <Bell className="h-4 w-4 text-blue-600" />
      }
    ]
  };

  const emails = emailTypes[userRole];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-600" />
          Email Automation Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {emails.map((email, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {email.icon}
                <div>
                  <h4 className="font-medium text-sm">{email.title}</h4>
                  <p className="text-xs text-gray-600">{email.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    <Clock className="h-3 w-3 inline mr-1" />
                    Trigger: {email.trigger}
                  </p>
                </div>
              </div>
              <Badge variant="default" className="bg-green-100 text-green-700">
                Active
              </Badge>
            </div>
          ))}
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>📧 Email System:</strong> All email notifications are automatically sent via SendGrid. 
              You'll receive real-time updates for all important platform activities.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}