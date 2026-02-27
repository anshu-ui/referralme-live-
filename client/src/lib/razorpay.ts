// Razorpay Payment Integration for Indian Users
import { FirestoreUser } from './firestore';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentOptions {
  amount: number; // Amount in paise (multiply by 100)
  currency: string;
  orderId: string;
  name: string;
  description: string;
  image?: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  theme: {
    color: string;
  };
}

export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const initiatePayment = async (
  options: PaymentOptions,
  onSuccess: (response: any) => void,
  onFailure: (error: any) => void
) => {
  // Check if API keys are configured
  const razorpayKeyId = localStorage.getItem('razorpay_key_id');
  
  if (!razorpayKeyId) {
    onFailure(new Error('Razorpay Key ID not configured. Please set up your Razorpay credentials first.'));
    return;
  }

  const isLoaded = await loadRazorpayScript();
  
  if (!isLoaded) {
    onFailure(new Error('Razorpay SDK failed to load. Please check your internet connection.'));
    return;
  }

  const razorpayOptions = {
    key: razorpayKeyId,
    amount: options.amount,
    currency: options.currency,
    name: options.name,
    description: options.description,
    image: options.image || '/logo.png',
    order_id: options.orderId,
    handler: function (response: any) {
      onSuccess(response);
    },
    prefill: options.prefill,
    theme: options.theme,
    modal: {
      ondismiss: function () {
        onFailure(new Error('Payment cancelled by user'));
      },
    },
  };

  try {
    const paymentObject = new window.Razorpay(razorpayOptions);
    paymentObject.open();
  } catch (error) {
    console.error('Error initializing Razorpay:', error);
    onFailure(new Error('Failed to initialize payment gateway. Please try again.'));
  }
};

export const createMentorshipPayment = (
  user: FirestoreUser,
  mentorName: string,
  sessionTitle: string,
  amount: number,
  orderId: string
): PaymentOptions => {
  return {
    amount: amount * 100, // Convert to paise
    currency: 'INR',
    orderId,
    name: 'ReferralMe Mentorship',
    description: `${sessionTitle} with ${mentorName}`,
    prefill: {
      name: user.displayName || user.firstName || '',
      email: user.email,
      contact: user.phoneNumber || '',
    },
    theme: {
      color: '#3B82F6', // Blue theme matching our app
    },
  };
};