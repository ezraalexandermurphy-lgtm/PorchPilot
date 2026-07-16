/**
 * PorchPilot type definitions
 */

/** A tracked order extracted from a shipping confirmation email */
export interface Order {
  id: string;
  retailer: string;
  retailerLogo?: string;
  title: string;
  description?: string;
  status: OrderStatus;
  estimatedDelivery: string; // ISO date string
  deliveredAt?: string; // ISO date string
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  imageUrl?: string;
  price?: string;
  emailId?: string; // reference to source email
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | 'shipped'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delayed'
  | 'exception';

/** Email account connection */
export interface EmailConnection {
  id: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'other';
  connectedAt: string;
  lastSyncAt?: string;
  isActive: boolean;
}

/** Calendar reminder */
export interface DeliveryReminder {
  id: string;
  orderId: string;
  reminderDate: string; // ISO date string
  reminderType: 'day_before' | 'morning_of' | 'custom';
  calendarEventId?: string;
  isEnabled: boolean;
}

/** App settings */
export interface AppSettings {
  defaultReminder: 'day_before' | 'morning_of' | 'none';
  notificationsEnabled: boolean;
  widgetEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  emailSyncInterval: number; // minutes
}

/** Navigation param lists */
export type RootStackParamList = {
  '(auth)': undefined;
  '(tabs)': undefined;
  'order/[id]': { id: string };
};

export type AuthStackParamList = {
  splash: undefined;
  'email-connect': undefined;
};

export type TabParamList = {
  dashboard: undefined;
  settings: undefined;
};
