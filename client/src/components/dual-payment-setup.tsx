import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { 
  CreditCard, CheckCircle, AlertCircle, ExternalLink, 
  Smartphone, IndianRupee, Shield, Zap, Building2, 
  ArrowRight, Clock, DollarSign
} from "lucide-react";
import { updateUser, FirestoreUser } from "../lib/firestore";
import { validateUPIId } from "../lib/upi";

interface DualPaymentSetupProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirestoreUser;
  onPaymentSetup: (method: string, accountId: string) => void;
}

export default function DualPaymentSetup({ 
  isOpen, 
  onClose, 
  user, 
  onPaymentSetup 
}: DualPaymentSetupProps) {
  const [razorpayAccountId, setRazorpayAccountId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [activeTab, setActiveTab] = useState("upi");

  const handleUPISetup = async () => {
    if (!upiId.trim()) {
      setValidationError("Please enter your UPI ID");
      return;
    }

    if (!validateUPIId(upiId.trim())) {
      setValidationError("Invalid UPI ID format. Use format: name@bank or phone@bank");
      return;
    }

    setIsLoading(true);
    try {
      await updateUser(user.uid, {
        upiId: upiId.trim(),
        paymentMethod: "upi",
        paymentSetupCompleted: true
      });

      onPaymentSetup("upi", upiId.trim());
      onClose();

    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleRazorpaySetup = async () => {
    if (!razorpayAccountId.trim()) {
      setValidationError("Please enter your Razorpay Key ID");
      return;
    }

    // Validate Razorpay Key ID format
    if (!razorpayAccountId.startsWith('rzp_')) {
      setValidationError("Razorpay Key ID should start with 'rzp_'");
      return;
    }

    setIsLoading(true);
    try {
      // Store in localStorage for immediate use
      localStorage.setItem('razorpay_key_id', razorpayAccountId.trim());
      
      await updateUser(user.uid, {
        razorpayKeyId: razorpayAccountId.trim(),
        paymentMethod: "razorpay",
        paymentSetupCompleted: true
      });

      onPaymentSetup("razorpay", razorpayAccountId.trim());
      onClose();

    } catch (error) {
    } finally {
      setIsLoading(false);
    }
  };

  const clearValidationError = () => {
    setValidationError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Payment Method Setup
          </DialogTitle>
          <DialogDescription>
            Choose your preferred payment method to receive mentorship payments
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upi" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              UPI Payment
            </TabsTrigger>
            <TabsTrigger value="razorpay" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Razorpay
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upi" className="space-y-6">
            {/* UPI Setup */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200">
                  <CardContent className="p-4 text-center">
                    <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Instant Payments</h4>
                    <p className="text-xs text-gray-600">Money in seconds</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Simple Setup</h4>
                    <p className="text-xs text-gray-600">Just your UPI ID</p>
                  </CardContent>
                </Card>
                <Card className="border-purple-200">
                  <CardContent className="p-4 text-center">
                    <IndianRupee className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Zero Fees</h4>
                    <p className="text-xs text-gray-600">No charges</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label htmlFor="upiId">Your UPI ID</Label>
                <Input
                  id="upiId"
                  type="text"
                  placeholder="yourname@bank or 9876543210@paytm"
                  value={upiId}
                  onChange={(e) => {
                    setUpiId(e.target.value);
                    clearValidationError();
                  }}
                  className={validationError && activeTab === "upi" ? "border-red-500" : ""}
                />
                {validationError && activeTab === "upi" && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {validationError}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to find your UPI ID:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Open Google Pay, PhonePe, Paytm, or any UPI app</li>
                  <li>• Go to Profile or Settings</li>
                  <li>• Find "UPI ID" or "Virtual Payment Address"</li>
                  <li>• Copy your ID (format: name@bank)</li>
                </ul>
              </div>

              <Button 
                onClick={handleUPISetup}
                disabled={!upiId || isLoading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isLoading ? "Setting up..." : "Setup UPI Payment"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="razorpay" className="space-y-6">
            {/* Razorpay Setup */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200">
                  <CardContent className="p-4 text-center">
                    <Building2 className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Business Ready</h4>
                    <p className="text-xs text-gray-600">Professional setup</p>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4 text-center">
                    <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Secure</h4>
                    <p className="text-xs text-gray-600">Bank-grade security</p>
                  </CardContent>
                </Card>
                <Card className="border-purple-200">
                  <CardContent className="p-4 text-center">
                    <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h4 className="font-semibold text-sm">Scheduled</h4>
                    <p className="text-xs text-gray-600">Auto payouts</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Label htmlFor="razorpayId">Razorpay Key ID</Label>
                <Input
                  id="razorpayId"
                  type="text"
                  placeholder="rzp_test_xxxxxxxxxxxxxxxxxx"
                  value={razorpayAccountId}
                  onChange={(e) => {
                    setRazorpayAccountId(e.target.value);
                    clearValidationError();
                  }}
                  className={validationError && activeTab === "razorpay" ? "border-red-500" : ""}
                />
                {validationError && activeTab === "razorpay" && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {validationError}
                  </p>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">How to get your Razorpay Key ID:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Go to Razorpay Dashboard → Settings → API Keys</li>
                  <li>• Copy the "Key ID" (starts with rzp_test_ or rzp_live_)</li>
                  <li>• For testing, use Test Key ID (rzp_test_)</li>
                  <li>• For production, use Live Key ID (rzp_live_)</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-3" asChild>
                  <a href="https://dashboard.razorpay.com/app/keys" target="_blank">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Get API Keys
                  </a>
                </Button>
              </div>

              <Button 
                onClick={handleRazorpaySetup}
                disabled={!razorpayAccountId || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? "Setting up..." : "Setup Razorpay Payment"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <Badge variant="outline" className="text-xs">
            Choose the payment method that works best for you
          </Badge>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}