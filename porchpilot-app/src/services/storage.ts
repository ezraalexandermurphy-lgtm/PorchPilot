/**
 * Secure token and data storage service.
 *
 * Uses expo-secure-store for sensitive data (JWT tokens)
 * and AsyncStorage for non-sensitive persisted data.
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from '../constants';

// ─── Secure Storage (JWT Token) ─────────────────────────────────────────────

const TOKEN_KEY = `${STORAGE_KEYS.EMAIL_CONNECTION}_jwt`;

/**
 * Store the JWT token securely.
 */
export async function setToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    // Fall back to AsyncStorage on web (SecureStore not available)
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}

/**
 * Retrieve the stored JWT token.
 */
export async function getToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Remove the stored JWT token (sign out).
 */
export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

// ─── User Data Storage ──────────────────────────────────────────────────────

const USER_ID_KEY = `${STORAGE_KEYS.EMAIL_CONNECTION}_user_id`;
const USER_EMAIL_KEY = `${STORAGE_KEYS.EMAIL_CONNECTION}_user_email`;

/**
 * Store the current user ID.
 */
export async function setUserId(userId: string): Promise<void> {
  await AsyncStorage.setItem(USER_ID_KEY, userId);
}

/**
 * Retrieve the stored user ID.
 */
export async function getUserId(): Promise<string | null> {
  return AsyncStorage.getItem(USER_ID_KEY);
}

/**
 * Generate a local user ID if none exists.
 */
export async function getOrCreateUserId(): Promise<string> {
  let userId = await getUserId();
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await setUserId(userId);
  }
  return userId;
}

/**
 * Store the user's email address.
 */
export async function setUserEmail(email: string): Promise<void> {
  await AsyncStorage.setItem(USER_EMAIL_KEY, email);
}

/**
 * Retrieve the stored email address.
 */
export async function getUserEmail(): Promise<string | null> {
  return AsyncStorage.getItem(USER_EMAIL_KEY);
}

// ─── Connection Status ──────────────────────────────────────────────────────

const CONNECTED_KEY = `${STORAGE_KEYS.EMAIL_CONNECTION}_connected`;

/**
 * Mark the user as having completed OAuth.
 */
export async function setConnected(email: string): Promise<void> {
  await AsyncStorage.setItem(CONNECTED_KEY, 'true');
  await setUserEmail(email);
}

/**
 * Check if the user has connected their email.
 */
export async function isConnected(): Promise<boolean> {
  const val = await AsyncStorage.getItem(CONNECTED_KEY);
  return val === 'true';
}

/**
 * Clear all stored data (sign out / reset).
 */
export async function clearAllData(): Promise<void> {
  await clearToken();
  await AsyncStorage.multiRemove([
    USER_ID_KEY,
    USER_EMAIL_KEY,
    CONNECTED_KEY,
    STORAGE_KEYS.SETTINGS,
    STORAGE_KEYS.ORDERS_CACHE,
  ]);
}
