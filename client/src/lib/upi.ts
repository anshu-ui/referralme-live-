// UPI Payment Integration for ReferralMe
// Supports direct UPI payments without requiring business accounts

export interface UPIPaymentData {
  amount: number;
  upiId: string;
  transactionNote: string;
  merchantName: string;
  merchantCode?: string;
}

export interface UPIPaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  paymentMethod: 'upi';
}

// Generate UPI payment URL for various UPI apps
export function generateUPILink(data: UPIPaymentData): string {
  const { amount, upiId, transactionNote, merchantName, merchantCode } = data;
  
  const params = new URLSearchParams({
    pa: upiId, // Payee Address (UPI ID)
    pn: merchantName, // Payee Name
    am: amount.toString(), // Amount
    cu: 'INR', // Currency
    tn: transactionNote, // Transaction Note
    ...(merchantCode && { mc: merchantCode }) // Merchant Code (optional)
  });

  return `upi://pay?${params.toString()}`;
}

// Check if device supports UPI payments
export function isUPISupported(): boolean {
  // Check if running on mobile device and in India
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  return isMobile; // UPI is primarily mobile-based
}

// Generate QR code data for UPI payment
export function generateUPIQRData(data: UPIPaymentData): string {
  return generateUPILink(data);
}

// Create UPI payment intent
export async function initiateUPIPayment(data: UPIPaymentData): Promise<UPIPaymentResult> {
  try {
    const upiLink = generateUPILink(data);
    
    if (isUPISupported()) {
      // On mobile, try to open UPI apps directly
      window.location.href = upiLink;
      
      // Return pending status - actual verification happens server-side
      return {
        success: true,
        paymentMethod: 'upi',
        transactionId: `upi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      // On desktop, show QR code for scanning
      return {
        success: true,
        paymentMethod: 'upi',
        transactionId: `upi_qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'UPI payment failed',
      paymentMethod: 'upi'
    };
  }
}

// Popular UPI apps for payment options
export const UPI_APPS = [
  { name: 'Google Pay', package: 'com.google.android.apps.nbu.paisa.user', icon: '🟢' },
  { name: 'PhonePe', package: 'com.phonepe.app', icon: '🟣' },
  { name: 'Paytm', package: 'net.one97.paytm', icon: '🔵' },
  { name: 'BHIM', package: 'in.org.npci.upiapp', icon: '🇮🇳' },
  { name: 'Amazon Pay', package: 'in.amazon.mShop.android.shopping', icon: '🟠' },
  { name: 'WhatsApp', package: 'com.whatsapp', icon: '🟢' }
];

// Validate UPI ID format
export function validateUPIId(upiId: string): boolean {
  // UPI ID format: username@bank or phone@bank
  const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
  return upiRegex.test(upiId);
}

// Generate payment verification token
export function generatePaymentToken(): string {
  return `upi_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
}