import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  Smartphone, CheckCircle, AlertCircle, QrCode, 
  ArrowRight, Shield, Zap, IndianRupee
} from "lucide-react";
import { validateUPIId, UPI_APPS } from "../lib/upi";
import { updateUserProfile, FirestoreUser } from "../lib/firestore";

interface UPISetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirestoreUser;
  onUPISetup: (upiId: string) => void;
}

export default function UPISetupModal({ 
  isOpen, 
  onClose, 
  user,
  onUPISetup 
}: UPISetupModalProps) {
  const [upiId, setUpiId] = useState(user?.upiId || "");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState("");

  const handleUPIValidation = (value: string) => {
    setUpiId(value);
    setValidationError("");
    
    if (value && !validateUPIId(value)) {
      setValidationError("Invalid UPI ID format. Use format: username@bank or phone@bank");
    }
  };

  const handleSaveUPI = async () => {
    if (!upiId.trim()) {
      setValidationError("Please enter your UPI ID");
      return;
    }

    if (!validateUPIId(upiId)) {
      setValidationError("Invalid UPI ID format");
      return;
    }

    setIsValidating(true);

    try {
      // Update user profile with UPI ID
      await updateUserProfile(user.uid, {
        upiId: upiId.trim(),
        paymentMethod: 'upi',
        paymentSetupCompleted: true
      });

      onUPISetup(upiId.trim());
      onClose();

    } catch (error) {
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-green-600" />
            UPI Payment Setup
          </DialogTitle>
          <DialogDescription>
            Set up your UPI ID to receive mentorship payments directly. No business account required!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Benefits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200">
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-semibold text-sm">Instant Payments</h4>
                <p className="text-xs text-gray-600">Receive money in seconds</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200">
              <CardContent className="p-4 text-center">
                <Shield className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <h4 className="font-semibold text-sm">Secure & Safe</h4>
                <p className="text-xs text-gray-600">Bank-grade security</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200">
              <CardContent className="p-4 text-center">
                <IndianRupee className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-semibold text-sm">Zero Fees</h4>
                <p className="text-xs text-gray-600">No transaction charges</p>
              </CardContent>
            </Card>
          </div>

          {/* UPI ID Input */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="upiId">Your UPI ID</Label>
              <Input
                id="upiId"
                type="text"
                placeholder="your.name@bank or 9876543210@paytm"
                value={upiId}
                onChange={(e) => handleUPIValidation(e.target.value)}
                className={validationError ? "border-red-500" : ""}
              />
              {validationError && (
                <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {validationError}
                </p>
              )}
              {upiId && !validationError && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Valid UPI ID format
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">How to find your UPI ID:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Open any UPI app (Google Pay, PhonePe, Paytm, etc.)</li>
                <li>• Go to Profile or Settings section</li>
                <li>• Look for "UPI ID" or "Virtual Payment Address"</li>
                <li>• Copy the ID (usually yourname@bankname)</li>
              </ul>
            </div>
          </div>

          {/* Popular UPI Apps */}
          <div>
            <h4 className="font-semibold mb-3">Popular UPI Apps</h4>
            <div className="grid grid-cols-3 gap-3">
              {UPI_APPS.slice(0, 6).map((app) => (
                <div key={app.name} className="flex items-center gap-2 p-2 border rounded-lg">
                  <span className="text-lg">{app.icon}</span>
                  <span className="text-sm font-medium">{app.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveUPI}
              disabled={!upiId || !!validationError || isValidating}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {isValidating ? (
                "Setting up..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Save UPI ID
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}