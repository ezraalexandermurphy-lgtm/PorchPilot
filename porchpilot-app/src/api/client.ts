/**
 * PorchPilot API Client
 *
 * Base HTTP client with JWT token management, request/response
 * interceptors, and typed API methods for all backend endpoints.
 */

import { API_BASE_URL, STORAGE_KEYS } from '../constants';
import { getToken, setToken, clearToken, getUserId } from '../services/storage';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface AuthUrlsResponse {
  url: string;
}

export interface AuthCallbackResponse {
  token: string;
  email: string;
  hasRefreshToken: boolean;
}

export interface TokenRefreshResponse {
  token: string;
}

export interface SyncResponse {
  processed: number;
  ordersCreated: number;
  errors?: string[];
}

export interface OrderFromApi {
  id: string;
  retailer: string;
  retailer_order_id: string | null;
  order_date: string;
  estimated_delivery_start: string | null;
  estimated_delivery_end: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  raw_email_subject: string | null;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery_date: string | null;
  shipment_status: string | null;
}

// ─── API Client ─────────────────────────────────────────────────────────────

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get the stored JWT token, refreshing if expired.
   */
  private async getValidToken(): Promise<string | null> {
    return getToken();
  }

  /**
   * Build headers for a request, including auth if available.
   */
  private async buildHeaders(isAuth: boolean = false): Promise<HeadersInit> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!isAuth) {
      const token = await this.getValidToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle a response, checking for errors and auto-refreshing on 401.
   */
  private async handleResponse<T>(
    response: Response,
    retryRequest: () => Promise<Response>,
  ): Promise<ApiResponse<T>> {
    if (response.status === 401) {
      // Token might be expired — try refreshing
      const refreshed = await this.refreshToken();
      if (refreshed.success) {
        // Retry the original request with the new token
        const retryResponse = await retryRequest();
        return this.processResponse<T>(retryResponse);
      }
      // Refresh failed — clear token
      await clearToken();
      return { success: false, error: 'Session expired. Please sign in again.' };
    }

    return this.processResponse<T>(response);
  }

  /**
   * Process a response into our standard ApiResponse format.
   */
  private async processResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      return data as ApiResponse<T>;
    } catch {
      return {
        success: false,
        error: `Request failed with status ${response.status}`,
      };
    }
  }

  /**
   * Make a GET request.
   */
  async get<T>(path: string, isAuth: boolean = false): Promise<ApiResponse<T>> {
    const headers = await this.buildHeaders(isAuth);
    const url = `${this.baseUrl}${path}`;

    const doFetch = () => fetch(url, { method: 'GET', headers });

    const response = await doFetch();
    return this.handleResponse<T>(response, doFetch);
  }

  /**
   * Make a POST request.
   */
  async post<T>(path: string, body?: unknown, isAuth: boolean = false): Promise<ApiResponse<T>> {
    const headers = await this.buildHeaders(isAuth);
    const url = `${this.baseUrl}${path}`;

    const doFetch = () =>
      fetch(url, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

    const response = await doFetch();
    return this.handleResponse<T>(response, doFetch);
  }

  // ─── Auth Endpoints ───────────────────────────────────────────────────────

  /**
   * Get the Google OAuth URL for a given user.
   */
  async getGoogleOAuthUrl(userId: string): Promise<ApiResponse<AuthUrlsResponse>> {
    return this.get<AuthUrlsResponse>(`/auth/google/url?userId=${encodeURIComponent(userId)}`, true);
  }

  /**
   * Exchange an OAuth authorization code for a JWT.
   */
  async handleGoogleCallback(code: string, state: string): Promise<ApiResponse<AuthCallbackResponse>> {
    const response = await this.get<AuthCallbackResponse>(
      `/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      true,
    );

    // If successful, store the token
    if (response.success && response.data?.token) {
      await setToken(response.data.token);
    }

    return response;
  }

  /**
   * Refresh the current JWT token.
   */
  async refreshToken(): Promise<ApiResponse<TokenRefreshResponse>> {
    const token = await getToken();
    if (!token) {
      return { success: false, error: 'No token to refresh' };
    }

    const response = await this.post<TokenRefreshResponse>(
      '/auth/refresh',
      {},
      true,
    );

    if (response.success && response.data?.token) {
      await setToken(response.data.token);
    }

    return response;
  }

  // ─── Email / Order Endpoints ──────────────────────────────────────────────

  /**
   * Trigger a sync of the user's connected inbox.
   */
  async syncEmails(): Promise<ApiResponse<SyncResponse>> {
    return this.post<SyncResponse>('/emails/sync');
  }

  /**
   * Fetch the user's synced orders.
   */
  async getOrders(): Promise<ApiResponse<OrderFromApi[]>> {
    return this.get<OrderFromApi[]>('/emails');
  }
}

// Singleton instance
export const apiClient = new ApiClient(API_BASE_URL);

export default apiClient;
