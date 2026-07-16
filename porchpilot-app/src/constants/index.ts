/**
 * PorchPilot app constants
 */

export const APP_NAME = 'PorchPilot';
export const APP_TAGLINE = 'Never leave a package on the porch.';
export const APP_DESCRIPTION = 'Track all your deliveries in one place. Connect your email, and we\'ll automatically find your shipping confirmations.';

export const STORAGE_KEYS = {
  EMAIL_CONNECTION: '@porchpilot/email_connection',
  SETTINGS: '@porchpilot/settings',
  ONBOARDING_COMPLETED: '@porchpilot/onboarding_completed',
  ORDERS_CACHE: '@porchpilot/orders_cache',
} as const;

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

export const REDIRECT_URI = process.env.EXPO_PUBLIC_REDIRECT_URI || 'porchpilot://oauth/callback';

export const GOOGLE_AUTH_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  shipped: 'Shipped',
  in_transit: 'In Transit',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  delayed: 'Delayed',
  exception: 'Delivery Exception',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  shipped: '#2980B9',
  in_transit: '#F5B122',
  out_for_delivery: '#E67E22',
  delivered: '#2E7D32',
  delayed: '#C0392B',
  exception: '#C0392B',
};

export const PROVIDER_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  other: 'Other',
};

export const RETAILER_COLORS: Record<string, string> = {
  amazon: '#FF9900',
  walmart: '#0071DC',
  target: '#CC0000',
  chewy: '#00A1E0',
  walgreens: '#E31837',
  bestbuy: '#0046BE',
  homedepot: '#F96302',
};
