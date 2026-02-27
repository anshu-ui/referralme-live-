import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { 
  CalendarIcon, Clock, DollarSign, Video, User, Star, 
  CreditCard, CheckCircle, AlertCircle, Phone
} from "lucide-react";
import { format, addDays, setHours, setMinutes } from "date-fns";
import { cn } from "../lib/utils";
import { createMentorshipSession, MentorshipSession } from "../lib/firestore";
import { FirestoreUser } from "../lib/firestore";
import { Timestamp } from "firebase/firestore";
import { initiatePayment, createMentorshipPayment } from "../lib/razorpay";
import { videoCallManager } from "../lib/videoCall";
import { generateUPILink, UPIPaymentData } from "../lib/upi";
import UPIPaymentModal from "./upi-payment-modal";

interface MentorshipBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  mentor: FirestoreUser;
  user: FirestoreUser;
  onSessionBooked?: (session: MentorshipSession) => void;
}

// Default session types for reference (removed - using mentor's actual services)

export default function MentorshipBookingModal({ 
  isOpen, 
  onClose, 
  mentor, 
  user,
  onSessionBooked 
}: MentorshipBookingModalProps) {
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [step, setStep] = useState<"select" | "schedule" | "payment" | "confirmation">("select");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "upi">("razorpay");
  const [isUPIPaymentOpen, setIsUPIPaymentOpen] = useState(false);
  const [upiPaymentData, setUpiPaymentData] = useState<UPIPaymentData | null>(null);

  // Get available services from mentor's profile
  const availableServices = mentor.mentorshipServices?.filter(service => service.isActive) || [];
  const [isBooking, setIsBooking] = useState(false);
  const [bookedSession, setBookedSession] = useState<MentorshipSession | null>(null);

  const selectedService = availableServices.find(service => service.id === selectedServiceId);

  // Generate available time slots
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30"
  ];

  const handleServiceSelect = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    setStep("schedule");
  };

  const handleScheduleNext = () => {
    if (!selectedDate || !selectedTime) {
      return;
    }

    // Check if mentor has payment setup
    if (!mentor.paymentSetupCompleted) {
      return;
    }

    // Set default payment method based on mentor's preference
    if (mentor.paymentMethod) {
      setPaymentMethod(mentor.paymentMethod as "razorpay" | "upi");
    }

    setStep("payment");
  };

  const handleUPIPayment = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !mentor.upiId) return;

    const paymentData: UPIPaymentData = {
      upiId: mentor.upiId,
      amount: selectedService.price,
      merchantName: mentor.displayName || "Mentor",
      transactionNote: `${selectedService.title} session booking`,
      merchantCode: "EDUCATION"
    };

    setUpiPaymentData(paymentData);
    setIsUPIPaymentOpen(true);
  };

  const handleUPIPaymentComplete = async (transactionId: string) => {
    console.log("UPI Payment completed:", transactionId);
    setIsUPIPaymentOpen(false);
    setIsBooking(true);
    
    try {
      await handleBookSession(transactionId, `upi_${Date.now()}`);
      
      // Force page refresh to show updated data
      // NO AUTOMATIC PAGE RELOAD - payment completed successfully
      console.log("UPI payment completed successfully - no reload");
      
    } catch (error) {
      console.error("Error booking session after UPI payment:", error);
      setIsBooking(false);
    }
  };

  const handleUPIPaymentFailed = (error: string) => {
    console.error("UPI Payment failed:", error);
    setIsUPIPaymentOpen(false);
    setIsBooking(false);
  };

  const handleRazorpayPayment = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;

    setIsBooking(true);
    try {
      // Handle Razorpay payment flow
      const orderResponse = await fetch('/api/razorpay/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedService.price,
          currency: 'INR',
          receipt: `mentorship_${Date.now()}_${user.uid.slice(0, 8)}`,
          mentorId: mentor.uid
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        if (errorData.error === 'MENTOR_ACCOUNT_NOT_SET') {
          setIsBooking(false);
          return;
        }
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const order = await orderResponse.json();
      
      // Create payment options with backend order
      const paymentOptions = {
        amount: order.amount,
        currency: order.currency,
        orderId: order.id,
        name: "ReferralMe Mentorship",
        description: `${selectedService.title} - ${selectedService.duration} minutes`,
        prefill: {
          name: user.displayName || 'User',
          email: user.email || '',
          contact: user.phone || ''
        },
        theme: {
          color: '#3B82F6'
        }
      };

      // Initiate Razorpay payment
      await initiatePayment(
        paymentOptions,
        async (response: any) => {
          // Payment successful - verify on backend
          console.log("Payment successful:", response);
          
          try {
            const verifyResponse = await fetch('/api/razorpay/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }),
            });

            const verification = await verifyResponse.json();
            
            if (verification.verified) {
              await handleBookSession(response.razorpay_payment_id, order.id);
            } else {
              throw new Error('Payment verification failed');
            }
          } catch (verifyError) {
            console.error("Payment verification error:", verifyError);
            setIsBooking(false);
          }
        },
        (error: any) => {
          // Payment failed
          console.error("Payment failed:", error);
          setIsBooking(false);
        }
      );
    } catch (error) {
      console.error("Error initiating payment:", error);
      setIsBooking(false);
    }
  };

  const handleBookSession = async (paymentId: string, orderId: string) => {
    if (!selectedService || !selectedDate || !selectedTime) return;

    try {
      // Create scheduled date with time
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const scheduledDateTime = setMinutes(setHours(selectedDate, hours), minutes);
      
      // Create video call room
      const videoRoom = await videoCallManager.createRoom(orderId, selectedService.duration);
      
      const sessionData = {
        mentorId: mentor.uid,
        mentorName: mentor.displayName || "Mentor",
        mentorEmail: mentor.email,
        menteeId: user.uid,
        menteeName: user.displayName || "User",
        menteeEmail: user.email,
        title: selectedService.title,
        description: selectedService.description,
        duration: selectedService.duration,
        price: selectedService.price,
        scheduledAt: Timestamp.fromDate(scheduledDateTime),
        status: "confirmed" as const,
        paymentStatus: "paid" as const,
        stripePaymentIntentId: paymentId,
        meetingUrl: videoRoom.url,
        notes: notes.trim() || undefined,
      };

      const sessionId = await createMentorshipSession(sessionData);
      
      const newSession: MentorshipSession = {
        ...sessionData,
        id: sessionId,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      setBookedSession(newSession);
      setStep("confirmation");
      

      onSessionBooked?.(newSession);
    } catch (error) {
      console.error("Error booking session:", error);
    } finally {
      setIsBooking(false);
    }
  };

  const handlePayment = async () => {
    if (paymentMethod === "upi") {
      await handleUPIPayment();
    } else {
      await handleRazorpayPayment();
    }
  };

  const resetModal = () => {
    setSelectedServiceId("");
    setSelectedDate(undefined);
    setSelectedTime("");
    setNotes("");
    setStep("select");
    setBookedSession(null);
    setIsBooking(false);
    setPaymentMethod("razorpay");
    setIsUPIPaymentOpen(false);
    setUpiPaymentData(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-5 w-5 text-blue-600" />
            Book Mentorship Session
          </DialogTitle>
          <DialogDescription>
            Schedule a 1-on-1 video call with {mentor.displayName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mentor Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{mentor.displayName}</h3>
                  <p className="text-sm text-gray-600">{mentor.designation} at {mentor.company}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${
                            i < Math.floor(mentor.mentorshipRating || 5) 
                              ? 'fill-yellow-400 text-yellow-400' 
                              : 'text-gray-300'
                          }`} 
                        />
                      ))}
                    </div>
                    <span className="text-xs text-gray-500">
                      {mentor.mentorshipRating || 5.0} ({mentor.totalMentorshipSessions || 0} sessions)
                    </span>
                  </div>
                </div>
                <Badge variant="secondary">Verified Mentor</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Step Content */}
          {step === "select" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Choose Session Type</h3>
              {availableServices.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No services available</p>
                  <p className="text-sm text-gray-400 mt-1">This mentor hasn't set up any services yet</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {availableServices.map((service) => (
                    <Card 
                      key={service.id} 
                      className={cn(
                        "cursor-pointer transition-all hover:shadow-md border-2",
                        selectedServiceId === service.id ? "border-blue-500 bg-blue-50" : "border-gray-200"
                      )}
                      onClick={() => handleServiceSelect(service.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium">{service.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Clock className="h-4 w-4" />
                                {service.duration} mins
                              </div>
                              <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                                <DollarSign className="h-4 w-4" />
                                ₹{service.price}
                              </div>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            Select
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === "schedule" && selectedService && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Schedule Your Session</h3>
                <Button variant="outline" size="sm" onClick={() => setStep("select")}>
                  Change Type
                </Button>
              </div>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{selectedService.title}</span>
                    </div>
                    <Badge variant="outline">{selectedService.duration} mins</Badge>
                    <Badge variant="outline">₹{selectedService.price}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label>Select Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        disabled={(date) => date < new Date() || date > addDays(new Date(), 30)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-3">
                  <Label>Select Time</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Additional Notes (Optional)</Label>
                <Textarea
                  placeholder="Any specific topics you'd like to discuss or questions you have..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>

              <Button onClick={handleScheduleNext} className="w-full" disabled={!selectedDate || !selectedTime}>
                Continue to Payment
              </Button>
            </div>
          )}

          {step === "payment" && selectedService && selectedDate && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Payment & Confirmation</h3>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Session Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span>Session Type:</span>
                    <span className="font-medium">{selectedService.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{selectedService.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{format(selectedDate, "PPP")} at {selectedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mentor:</span>
                    <span>{mentor.displayName}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span>₹{selectedService.price}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Method Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payment Method</CardTitle>
                  <CardDescription>
                    This mentor accepts {mentor.paymentMethod === 'upi' ? 'UPI' : mentor.paymentMethod === 'razorpay' ? 'Razorpay' : 'multiple'} payment{mentor.paymentMethod === 'both' ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mentor.paymentMethod === 'upi' || !mentor.paymentMethod ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="upi"
                        name="payment"
                        value="upi"
                        checked={paymentMethod === "upi"}
                        onChange={(e) => setPaymentMethod(e.target.value as "upi")}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="upi" className="flex items-center gap-2 cursor-pointer">
                        <Phone className="h-4 w-4 text-green-600" />
                        <span>UPI Payment (Direct)</span>
                        <Badge variant="outline" className="text-xs text-amber-700">Manual Confirmation</Badge>
                      </Label>
                    </div>
                  ) : null}
                  
                  {(mentor.paymentMethod === 'razorpay' || !mentor.paymentMethod) && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="razorpay"
                        name="payment"
                        value="razorpay"
                        checked={paymentMethod === "razorpay"}
                        onChange={(e) => setPaymentMethod(e.target.value as "razorpay")}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="razorpay" className="flex items-center gap-2 cursor-pointer">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <span>Razorpay (Cards, UPI, Net Banking)</span>
                        <Badge variant="default" className="text-xs bg-blue-600">Recommended</Badge>
                      </Label>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Method Info */}
              {paymentMethod === "upi" ? (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-800">UPI Direct Payment</h4>
                        <p className="text-sm text-green-700 mt-1">
                          Pay directly to mentor's UPI ID. Instant transfer, zero fees, but requires manual confirmation.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800">Razorpay Secure Payment</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Pay securely using UPI, Credit/Debit Cards, Net Banking, or Wallets. Instant confirmation and automatic booking.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Video className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800">Video Call Included</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        A private video call room will be created for your session. You'll receive the meeting link after payment.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("schedule")} className="flex-1">
                  Back to Schedule
                </Button>
                <Button onClick={handlePayment} disabled={isBooking} className="flex-1">
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isBooking ? "Processing..." : `Pay ₹${selectedService.price}`}
                </Button>
              </div>
            </div>
          )}

          {step === "confirmation" && bookedSession && (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-green-800">Session Booked Successfully!</h3>
                <p className="text-gray-600 mt-1">
                  Your mentorship session has been scheduled with {mentor.displayName}
                </p>
              </div>

              <Card>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Session ID:</span>
                    <span className="font-mono text-sm">{bookedSession.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date & Time:</span>
                    <span>{format(bookedSession.scheduledAt.toDate(), "PPP 'at' p")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{bookedSession.duration} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant="default" className="bg-green-600">Confirmed & Paid</Badge>
                  </div>
                  {bookedSession.meetingUrl && (
                    <div className="flex justify-between">
                      <span>Video Call:</span>
                      <span className="text-blue-600 font-medium">Link Ready</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">What's Next?</h4>
                <ul className="text-sm text-blue-700 space-y-1 text-left">
                  <li>• Payment confirmed - Your session is booked!</li>
                  <li>• Video call room has been created</li>
                  <li>• You'll receive email notifications with session details</li>
                  <li>• Join the video call 5 minutes before your scheduled time</li>
                </ul>
              </div>

              {bookedSession.meetingUrl && (
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      if (bookedSession.meetingUrl) {
                        window.open(bookedSession.meetingUrl, '_blank');
                      }
                    }}
                  >
                    <Video className="h-4 w-4 mr-2" />
                    Open Video Call Link
                  </Button>
                  <p className="text-xs text-gray-500 text-center">
                    Save this link - you'll need it for your session
                  </p>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* UPI Payment Modal */}
      {isUPIPaymentOpen && upiPaymentData && (
        <UPIPaymentModal
          isOpen={isUPIPaymentOpen}
          onClose={() => {
            setIsUPIPaymentOpen(false);
            setUpiPaymentData(null);
            setIsBooking(false);
          }}
          paymentData={upiPaymentData}
          onPaymentComplete={async (transactionId: string) => {
            await handleBookSession(transactionId, `upi_${Date.now()}`);
            setIsUPIPaymentOpen(false);
            setUpiPaymentData(null);
          }}
          onPaymentFailed={(error: string) => {
            setIsUPIPaymentOpen(false);
            setUpiPaymentData(null);
            setIsBooking(false);
          }}
        />
      )}
    </Dialog>
  );
}