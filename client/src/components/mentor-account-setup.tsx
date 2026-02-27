import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  CreditCard, ExternalLink, CheckCircle, AlertCircle, 
  IndianRupee, Shield, Users, TrendingUp, Smartphone, Zap 
} from "lucide-react";
import { updateUser } from "../lib/firestore";
import { FirestoreUser } from "../lib/firestore";
import { validateUPIId } from "../lib/upi";

interface MentorAccountSetupProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirestoreUser;
  onAccountSetup: (accountId: string) => void;
}

export default function MentorAccountSetup({ 
  isOpen, 
  onClose, 
  user, 
  onAccountSetup 
}: MentorAccountSetupProps) {
  const [razorpayAccountId, setRazorpayAccountId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<"razorpay" | "upi">("upi");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"select" | "setup" | "success">("select");
  const [validationError, setValidationError] = useState("");

  const handleSetupAccount = async () => {
    if (!razorpayAccountId.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      // Update user's Razorpay account ID in Firestore
      await updateUser(user.uid, {
        razorpayAccountId: razorpayAccountId.trim()
      });

      onAccountSetup(razorpayAccountId.trim());
      setStep("success");
      
    } catch (error) {
      console.error("Error setting up account:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    setStep("info");
    setRazorpayAccountId("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Mentor Payment Account Setup
          </DialogTitle>
          <DialogDescription>
            Connect your Razorpay account to receive payments directly from students
          </DialogDescription>
        </DialogHeader>

        {step === "info" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IndianRupee className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-800">Direct Payments</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Students pay directly to your Razorpay account
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">95% Earnings</span>
                  </div>
                  <p className="text-sm text-green-700">
                    You keep 95% of all payments (5% platform fee)
                  </p>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Why do I need a Razorpay account?</strong>
                <br />
                This allows students to pay you directly instead of going through a central account. 
                You'll receive payments instantly and have full control over your earnings.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <h3 className="font-semibold">Setup Steps:</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Create Razorpay Account</p>
                    <p className="text-sm text-gray-600">
                      Sign up at{" "}
                      <a 
                        href="https://dashboard.razorpay.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        dashboard.razorpay.com
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Complete KYC & Get Account ID</p>
                    <p className="text-sm text-gray-600">
                      Complete your business verification and get your Account ID from Settings
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-700">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Connect Your Account</p>
                    <p className="text-sm text-gray-600">
                      Enter your Razorpay Account ID below to start receiving payments
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Set Up Later
              </Button>
              <Button onClick={() => setStep("setup")} className="flex-1">
                Connect Account Now
              </Button>
            </div>
          </div>
        )}

        {step === "setup" && (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You'll need your Razorpay Account ID from your Razorpay dashboard under Settings → Account Details
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account-id">Razorpay Account ID</Label>
                <Input
                  id="account-id"
                  placeholder="acc_xxxxxxxxxxxxxxx"
                  value={razorpayAccountId}
                  onChange={(e) => setRazorpayAccountId(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-gray-500">
                  This should start with "acc_" followed by alphanumeric characters
                </p>
              </div>

              <Card className="border-amber-200 bg-amber-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">Security Note</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Your Account ID is safe to share and is used only for receiving payments. 
                        Never share your API Keys or Secret Keys.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("info")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleSetupAccount} disabled={isLoading} className="flex-1">
                {isLoading ? "Connecting..." : "Connect Account"}
              </Button>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                Account Connected Successfully!
              </h3>
              <p className="text-gray-600 mt-2">
                You can now receive payments directly to your Razorpay account. 
                Students will be able to book and pay for your mentorship sessions.
              </p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-green-700">
                <Users className="h-5 w-5" />
                <span className="font-medium">Ready to Receive Payments</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Your mentorship services are now active for bookings
              </p>
            </div>

            <Button onClick={handleComplete} className="w-full">
              Start Mentoring
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}