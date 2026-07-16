/**
 * useAuth hook — manages authentication state and OAuth flow.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api';
import {
  getToken,
  clearToken,
  setConnected,
  isConnected,
  getOrCreateUserId,
  clearAllData,
} from '../services/storage';
import { Platform } from 'react-native';

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
    isConnecting: false,
    error: null,
  });

  // Check stored auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      const connected = await isConnected();
      setState(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: !!token && connected,
      }));
    } catch {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  /**
   * Initiate Google OAuth flow.
   * Returns the OAuth URL to open in a browser.
   */
  const startGoogleOAuth = useCallback(async (): Promise<string | null> => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    try {
      const userId = await getOrCreateUserId();
      const response = await apiClient.getGoogleOAuthUrl(userId);

      if (response.success && response.data?.url) {
        return response.data.url;
      }
      throw new Error(response.error || 'Failed to get OAuth URL');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OAuth initialization failed';
      setState(prev => ({ ...prev, isConnecting: false, error: message }));
      return null;
    }
  }, []);

  /**
   * Complete the OAuth flow by exchanging the auth code for a JWT.
   */
  const completeGoogleOAuth = useCallback(async (code: string, state: string): Promise<boolean> => {
    try {
      const response = await apiClient.handleGoogleCallback(code, state);

      if (response.success && response.data?.token) {
        await setConnected(response.data.email);
        setState(prev => ({
          ...prev,
          isAuthenticated: true,
          isConnecting: false,
          error: null,
        }));
        return true;
      }
      throw new Error(response.error || 'OAuth callback failed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OAuth completion failed';
      setState(prev => ({ ...prev, isConnecting: false, error: message }));
      return false;
    }
  }, []);

  /**
   * Sign out — clear all stored data.
   */
  const signOut = useCallback(async () => {
    await clearAllData();
    setState({
      isLoading: false,
      isAuthenticated: false,
      isConnecting: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    startGoogleOAuth,
    completeGoogleOAuth,
    signOut,
    checkAuth,
  };
}
