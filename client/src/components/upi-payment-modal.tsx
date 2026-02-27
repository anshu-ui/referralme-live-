import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { 
  Smartphone, QrCode, CheckCircle, AlertCircle, 
  Copy, ExternalLink, RefreshCw, Timer, IndianRupee
} from "lucide-react";
import { generateUPILink, generateUPIQRData, isUPISupported, UPI_APPS, UPIPaymentData } from "../lib/upi";
import QRCode from "qrcode";

interface UPIPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentData: UPIPaymentData;
  onPaymentComplete: (transactionId: string) => void;
  onPaymentFailed: (error: string) => void;
}

export default function UPIPaymentModal({ 
  isOpen, 
  onClose, 
  paymentData,
  onPaymentComplete,
  onPaymentFailed 
}: UPIPaymentModalProps) {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending');
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [qrData, setQrData] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [upiLink, setUpiLink] = useState("");

  useEffect(() => {
    if (isOpen) {
      const qr = generateUPIQRData(paymentData);
      const link = generateUPILink(paymentData);
      setQrData(qr);
      setUpiLink(link);
      
      // Generate QR code image
      QRCode.toDataURL(qr, { width: 200, margin: 2 })
        .then(url => setQrCodeUrl(url))
        .catch(err => console.error('Error generating QR code:', err));
    }
  }, [isOpen, paymentData]);

  // Countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOpen && timeLeft > 0 && paymentStatus === 'pending') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setPaymentStatus('failed');
            onPaymentFailed('Payment timeout');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, timeLeft, paymentStatus, onPaymentFailed]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(paymentData.upiId);
    } catch (error) {
    }
  };

  const handleOpenUPIApp = (appPackage?: string) => {
    try {
      setPaymentStatus('processing');
      
      // For mobile devices, try to open the UPI link directly
      if (isUPISupported()) {
        if (appPackage) {
          // Try to open specific UPI app first
          const intentUrl = `intent://pay?pa=${paymentData.upiId}&pn=${encodeURIComponent(paymentData.merchantName)}&am=${paymentData.amount}&cu=INR&tn=${encodeURIComponent(paymentData.transactionNote)}#Intent;scheme=upi;package=${appPackage};end`;
          window.location.href = intentUrl;
        } else {
          // Fallback to generic UPI link
          window.location.href = upiLink;
        }
      } else {
        // On desktop, show QR code message
        setPaymentStatus('pending');
        return;
      }
      
      // Ask user to confirm payment after a delay
      setTimeout(() => {
        if (paymentStatus === 'processing') {
        }
      }, 5000);
      
    } catch (error) {
      setPaymentStatus('pending');
    }
  };

  const handlePaymentConfirmation = () => {
    // Ask user to confirm they made the payment
    const confirmed = window.confirm(
      "⚠️ IMPORTANT: Please confirm only if you have successfully completed the UPI payment and money has been deducted from your account.\n\nHave you completed the payment?"
    );
    
    if (confirmed) {
      setPaymentStatus('completed');
      const transactionId = `upi_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      
      // Close the modal after a short delay to show the success message
      setTimeout(() => {
        onPaymentComplete(transactionId);
      }, 1500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5 text-green-600" />
            UPI Payment
          </DialogTitle>
          <DialogDescription>
            Pay ₹{paymentData.amount} to {paymentData.merchantName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Timer */}
          {paymentStatus === 'pending' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-amber-800">Time remaining:</span>
                <Badge variant="outline" className="text-amber-700 text-xs">
                  <Timer className="h-3 w-3 mr-1" />
                  {formatTime(timeLeft)}
                </Badge>
              </div>
            </div>
          )}

          {/* Payment Details */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-semibold text-lg text-green-600">₹{paymentData.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-medium">{paymentData.merchantName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">UPI ID:</span>
                <div className="flex items-center gap-1">
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                    {paymentData.upiId}
                  </code>
                  <Button size="sm" variant="ghost" onClick={handleCopyUPI} className="h-6 w-6 p-0">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          {paymentStatus === 'processing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <RefreshCw className="h-8 w-8 text-blue-600 mx-auto mb-2 animate-spin" />
              <p className="text-blue-800 font-medium">Processing payment...</p>
              <p className="text-blue-600 text-sm">Complete the payment in your UPI app</p>
            </div>
          )}

          {paymentStatus === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-800 font-medium">Payment Successful!</p>
              <p className="text-green-600 text-sm">Your session has been booked</p>
            </div>
          )}

          {paymentStatus === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-800 font-medium">Payment Failed</p>
              <p className="text-red-600 text-sm">Please try again</p>
            </div>
          )}

          {/* UPI Apps */}
          {paymentStatus === 'pending' && (
            <div>
              <h4 className="font-medium mb-2 text-sm">Choose UPI App</h4>
              <div className="grid grid-cols-3 gap-2">
                {UPI_APPS.slice(0, 6).map((app) => (
                  <Button
                    key={app.name}
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenUPIApp(app.package)}
                    className="justify-center text-xs p-2 h-auto"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-lg">{app.icon}</span>
                      <span className="text-xs">{app.name}</span>
                    </div>
                  </Button>
                ))}
              </div>
              
              <Button
                variant="outline"
                onClick={() => handleOpenUPIApp()}
                className="w-full mt-2 text-sm"
                size="sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Other UPI App
              </Button>
            </div>
          )}

          {/* QR Code Option */}
          {paymentStatus === 'pending' && (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Or scan QR code with any UPI app</p>
              <div className="bg-white border-2 border-gray-200 rounded-lg p-3 inline-block">
                {qrCodeUrl ? (
                  <img 
                    src={qrCodeUrl} 
                    alt="UPI Payment QR Code" 
                    className="h-32 w-32 mx-auto"
                  />
                ) : (
                  <QrCode className="h-32 w-32 text-gray-400 mx-auto" />
                )}
                <p className="text-xs text-gray-500 mt-2">Scan to Pay ₹{paymentData.amount}</p>
              </div>
            </div>
          )}

          {/* Payment Instructions */}
          {paymentStatus === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-blue-800 font-medium text-sm mb-1">After completing payment:</p>
              <p className="text-blue-600 text-xs">1. Check that money is deducted from your account</p>
              <p className="text-blue-600 text-xs">2. Click "I've Completed Payment" below</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            {paymentStatus === 'pending' && (
              <>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handlePaymentConfirmation}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  I've Completed Payment
                </Button>
              </>
            )}
            
            {(paymentStatus === 'completed' || paymentStatus === 'failed') && (
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}