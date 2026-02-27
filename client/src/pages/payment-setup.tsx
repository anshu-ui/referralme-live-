import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { 
  CreditCard, 
  Key, 
  Shield, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink,
  Copy,
  Eye,
  EyeOff
} from "lucide-react";

export default function PaymentSetup() {
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isTestMode, setIsTestMode] = useState(true);

  const handleSaveKeys = () => {
    if (!razorpayKeyId || !razorpayKeySecret) {
      return;
    }

    // In a real app, these would be saved securely on the backend
    // For demo purposes, we'll store them in localStorage
    localStorage.setItem('razorpay_key_id', razorpayKeyId);
    localStorage.setItem('razorpay_key_secret', razorpayKeySecret);
    localStorage.setItem('razorpay_test_mode', isTestMode.toString());

  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Payment Gateway Setup</h1>
          <p className="text-gray-600">Configure Razorpay for secure mentorship payments</p>
        </div>

        {/* Razorpay Setup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              Razorpay Integration
            </CardTitle>
            <CardDescription>
              Set up Razorpay to accept payments in Indian Rupees with UPI, Cards, Net Banking, and Wallets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">How to get your Razorpay API Keys:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Go to <a href="https://dashboard.razorpay.com/" target="_blank" rel="noopener noreferrer" className="underline">Razorpay Dashboard</a></li>
                <li>2. Sign up for a free account or log in</li>
                <li>3. Go to Settings → API Keys</li>
                <li>4. Generate or copy your Key ID and Key Secret</li>
                <li>5. Start with Test mode, switch to Live mode when ready</li>
              </ol>
            </div>

            {/* Test vs Live Mode */}
            <div className="flex items-center gap-4">
              <Label>Mode:</Label>
              <div className="flex gap-2">
                <Button
                  variant={isTestMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsTestMode(true)}
                >
                  Test Mode
                </Button>
                <Button
                  variant={!isTestMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsTestMode(false)}
                >
                  Live Mode
                </Button>
              </div>
              {isTestMode ? (
                <Badge variant="secondary" className="text-orange-700 bg-orange-100">
                  Safe for Testing
                </Badge>
              ) : (
                <Badge variant="destructive">
                  Real Money Transactions
                </Badge>
              )}
            </div>

            <Separator />

            {/* API Key Configuration */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="keyId">
                  Razorpay Key ID {isTestMode && "(Test)"}
                </Label>
                <div className="relative">
                  <Input
                    id="keyId"
                    type="text"
                    placeholder={isTestMode ? "rzp_test_xxxxxxxxxx" : "rzp_live_xxxxxxxxxx"}
                    value={razorpayKeyId}
                    onChange={(e) => setRazorpayKeyId(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => copyToClipboard(razorpayKeyId, "Key ID")}
                    disabled={!razorpayKeyId}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  This is your public key ID (safe to expose in frontend)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keySecret">
                  Razorpay Key Secret {isTestMode && "(Test)"}
                </Label>
                <div className="relative">
                  <Input
                    id="keySecret"
                    type={showSecret ? "text" : "password"}
                    placeholder="Keep this secret and secure"
                    value={razorpayKeySecret}
                    onChange={(e) => setRazorpayKeySecret(e.target.value)}
                    className="pr-20"
                  />
                  <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => copyToClipboard(razorpayKeySecret, "Key Secret")}
                      disabled={!razorpayKeySecret}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  This is your private key (never expose this in frontend)
                </p>
              </div>
            </div>

            <Button onClick={handleSaveKeys} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Save Payment Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Payment Features */}
        <Card>
          <CardHeader>
            <CardTitle>Supported Payment Methods</CardTitle>
            <CardDescription>
              Razorpay supports all major payment methods in India
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center space-y-2">
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">UPI</p>
                  <p className="text-xs text-gray-500">Google Pay, PhonePe</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Cards</p>
                  <p className="text-xs text-gray-500">Credit & Debit</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Net Banking</p>
                  <p className="text-xs text-gray-500">All major banks</p>
                </div>
              </div>
              <div className="text-center space-y-2">
                <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                  <CreditCard className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">Wallets</p>
                  <p className="text-xs text-gray-500">Paytm, Airtel Money</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">Important Security Notice</h4>
                <p className="text-sm text-amber-700 mt-1">
                  In production, API keys should be stored securely on your server, never in the frontend. 
                  This demo stores keys in localStorage for testing purposes only.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}