/**
 * useOrders hook — fetches and manages order data from the API.
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient, type OrderFromApi } from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

export interface OrdersState {
  orders: OrderFromApi[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastSync: string | null;
}

const CACHE_KEY = STORAGE_KEYS.ORDERS_CACHE;

export function useOrders() {
  const [state, setState] = useState<OrdersState>({
    orders: [],
    isLoading: true,
    isRefreshing: false,
    error: null,
    lastSync: null,
  });

  // Load cached orders and fetch fresh data
  useEffect(() => {
    loadOrders();
  }, []);

  /**
   * Fetch orders from the API, falling back to cache on failure.
   */
  const loadOrders = useCallback(async () => {
    try {
      // Try loading from cache first for instant display
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setState(prev => ({
          ...prev,
          orders: parsed.orders || [],
          lastSync: parsed.lastSync || null,
          isLoading: false,
        }));
      }

      // Fetch fresh data from API
      const response = await apiClient.getOrders();
      if (response.success && response.data) {
        const orders = response.data;
        const lastSync = new Date().toISOString();

        // Update state and cache
        setState(prev => ({
          ...prev,
          orders,
          isLoading: false,
          error: null,
          lastSync,
        }));

        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ orders, lastSync }),
        );
      } else {
        // API failed — keep cached data if we have it
        if (!cached) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: response.error || 'Failed to fetch orders',
          }));
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load orders';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  /**
   * Pull-to-refresh: force fetch from API.
   */
  const refresh = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true }));
    try {
      const response = await apiClient.getOrders();
      if (response.success && response.data) {
        const orders = response.data;
        const lastSync = new Date().toISOString();
        setState(prev => ({
          ...prev,
          orders,
          isRefreshing: false,
          error: null,
          lastSync,
        }));

        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ orders, lastSync }),
        );
      } else {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          error: response.error || 'Refresh failed',
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Refresh failed';
      setState(prev => ({ ...prev, isRefreshing: false, error: message }));
    }
  }, []);

  /**
   * Trigger a full email sync and then refresh orders.
   */
  const syncEmails = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true }));
    try {
      const syncResponse = await apiClient.syncEmails();
      if (syncResponse.success) {
        await refresh();
      } else {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          error: syncResponse.error || 'Sync failed',
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setState(prev => ({ ...prev, isRefreshing: false, error: message }));
    }
  }, [refresh]);

  return {
    ...state,
    refresh,
    syncEmails,
  };
}
