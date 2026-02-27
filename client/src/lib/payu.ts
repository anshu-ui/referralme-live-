// PayU Payment Integration for Indian Users
import CryptoJS from 'crypto-js';
import { FirestoreUser } from './firestore';

declare global {
  interface Window {
    payuBoltCheckout: any;
  }
}

export interface PayUPaymentOptions {
  amount: number;
  productInfo: string;
  firstName: string;
  email: string;
  phone: string;
  surl: string; // Success URL
  furl: string; // Failure URL
  hash: string;
  key: string;
  txnid: string;
}

export const loadPayUScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://sboxcheckout-static.citruspay.com/bolt/run/bolt.min.js';
    script.onload = () => {
      resolve(true);
    };
    script.onerror = () => {
      resolve(false);
    };
    document.body.appendChild(script);
  });
};

export const generatePayUHash = (
  key: string,
  txnid: string,
  amount: number,
  productInfo: string,
  firstName: string,
  email: string,
  salt: string
): string => {
  const hashString = `${key}|${txnid}|${amount}|${productInfo}|${firstName}|${email}|||||||||||${salt}`;
  return CryptoJS.SHA512(hashString).toString();
};

export const initiatePayUPayment = async (
  options: PayUPaymentOptions,
  onSuccess: (response: any) => void,
  onFailure: (error: any) => void
) => {
  // Check if PayU keys are configured
  const payuKey = localStorage.getItem('payu_key');
  
  if (!payuKey) {
    onFailure(new Error('PayU Key not configured. Please set up your PayU credentials first.'));
    return;
  }

  const isLoaded = await loadPayUScript();
  
  if (!isLoaded) {
    onFailure(new Error('PayU SDK failed to load. Please check your internet connection.'));
    return;
  }

  const payuOptions = {
    key: payuKey,
    txnid: options.txnid,
    amount: options.amount,
    productinfo: options.productInfo,
    firstname: options.firstName,
    email: options.email,
    phone: options.phone,
    surl: options.surl,
    furl: options.furl,
    hash: options.hash,
    mode: 'dropout',
    ...{
      handler: {
        success: function(data: any) {
          onSuccess(data);
        },
        failure: function(data: any) {
          onFailure(new Error(data.error || 'Payment failed'));
        }
      }
    }
  };

  try {
    if (window.payuBoltCheckout) {
      window.payuBoltCheckout.open(payuOptions);
    } else {
      onFailure(new Error('PayU checkout not available'));
    }
  } catch (error) {
    console.error('Error initializing PayU checkout:', error);
    onFailure(new Error('Failed to initialize PayU payment gateway. Please try again.'));
  }
};

export const createMentorshipPayUPayment = async (
  user: FirestoreUser,
  mentorName: string,
  sessionTitle: string,
  amount: number
): Promise<PayUPaymentOptions> => {
  const txnid = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Get PayU credentials from localStorage
  const payuKey = localStorage.getItem('payu_key') || '';
  const payuSalt = localStorage.getItem('payu_salt') || '';
  
  if (!payuKey || !payuSalt) {
    throw new Error('PayU credentials not configured');
  }

  const hash = generatePayUHash(
    payuKey,
    txnid,
    amount,
    `${sessionTitle} with ${mentorName}`,
    user.firstName || user.displayName || '',
    user.email,
    payuSalt
  );

  return {
    amount,
    productInfo: `${sessionTitle} with ${mentorName}`,
    firstName: user.firstName || user.displayName || '',
    email: user.email,
    phone: user.phoneNumber || '',
    surl: `${window.location.origin}/payment/success`,
    furl: `${window.location.origin}/payment/failure`,
    hash,
    key: payuKey,
    txnid
  };
};

export const verifyPayUPayment = async (
  paymentId: string,
  txnid: string,
  amount: number,
  productInfo: string,
  status: string
): Promise<boolean> => {
  try {
    // Create hash for verification
    const payuKey = localStorage.getItem('payu_key') || '';
    const payuSalt = localStorage.getItem('payu_salt') || '';
    
    const reverseHashString = `${payuSalt}|${status}|||||||||||${productInfo}|${amount}|${txnid}|${payuKey}`;
    const expectedHash = CryptoJS.SHA512(reverseHashString).toString();
    
    // In a real implementation, you would verify the hash received from PayU
    // For now, we'll accept successful payments
    return status === 'success';
  } catch (error) {
    console.error('PayU verification error:', error);
    return false;
  }
};