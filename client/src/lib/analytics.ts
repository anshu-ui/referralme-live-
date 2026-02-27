// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Google Analytics is already loaded via HTML script tag
// This file provides helper functions for tracking events

// GA_MEASUREMENT_ID is now read from environment variables

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

  if (!measurementId) {
    console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    return;
  }

  // Add Google Analytics script to the head
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  // Initialize gtag
  const script2 = document.createElement('script');
  script2.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}');
  `;
  document.head.appendChild(script2);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
};

// Specific tracking functions for ReferralMe events
export const trackUserSignup = (method: string = 'google') => {
  trackEvent('sign_up', 'auth', method);
};

export const trackUserLogin = (method: string = 'google') => {
  trackEvent('login', 'auth', method);
};

export const trackRoleSelection = (role: string) => {
  trackEvent('role_selected', 'onboarding', role);
};

export const trackProfileCompletion = (role: string) => {
  trackEvent('profile_completed', 'onboarding', role);
};

export const trackJobPosting = (jobTitle: string) => {
  trackEvent('job_posted', 'referrer_action', jobTitle);
};

export const trackJobApplication = (jobTitle: string) => {
  trackEvent('job_applied', 'seeker_action', jobTitle);
};

export const trackApplicationStatusChange = (status: string) => {
  trackEvent('application_status_changed', 'referrer_action', status);
};

export const trackProfileView = (viewedRole: string) => {
  trackEvent('profile_viewed', 'discovery', viewedRole);
};

export const trackTabSwitch = (tabName: string, userRole: string) => {
  trackEvent('tab_switched', 'navigation', `${userRole}_${tabName}`);
};

export const trackReferralInvite = (method: string) => {
  trackEvent('referral_invited', 'viral_growth', method);
};

export const trackAchievementUnlocked = (achievementName: string) => {
  trackEvent('achievement_unlocked', 'gamification', achievementName);
};

export const trackSearchQuery = (query: string, resultsCount: number) => {
  trackEvent('search_performed', 'discovery', query, resultsCount);
};

export const trackFilterUsage = (filterType: string, filterValue: string) => {
  trackEvent('filter_applied', 'discovery', `${filterType}_${filterValue}`);
};

export const trackButtonClick = (buttonName: string, location: string) => {
  trackEvent('button_clicked', 'engagement', `${location}_${buttonName}`);
};