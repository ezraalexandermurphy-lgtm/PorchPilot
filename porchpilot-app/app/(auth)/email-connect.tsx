import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { useAuth } from '../../src/hooks/useAuth';
import { getOrCreateUserId } from '../../src/services/storage';
import { apiClient } from '../../src/api';

type ProviderType = 'gmail' | 'outlook';

export default function EmailConnectScreen() {
  const router = useRouter();
  const { isConnecting, error, startGoogleOAuth, completeGoogleOAuth } = useAuth();
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<ProviderType | null>(null);

  /**
   * Handle connecting with Gmail via OAuth.
   *
   * Flow:
   * 1. Get the OAuth URL from the backend
   * 2. Open it in the system browser via WebBrowser.openAuthSessionAsync
   * 3. The backend handles the Google OAuth callback and returns a JWT
   * 4. After the browser closes, verify the connection by checking stored tokens
   */
  const handleGoogleConnect = useCallback(async () => {
    setConnectingProvider('gmail');

    try {
      // Step 1: Get OAuth URL from backend
      const userId = await getOrCreateUserId();
      const urlResponse = await apiClient.getGoogleOAuthUrl(userId);

      if (!urlResponse.success || !urlResponse.data?.url) {
        Alert.alert('Error', urlResponse.error || 'Failed to initialize Google sign-in');
        setConnectingProvider(null);
        return;
      }

      // Step 2: Open OAuth URL in browser
      // The backend's redirect URI is configured to its own /google/callback endpoint.
      // After successful auth, the backend stores the tokens and returns JSON with JWT.
      const result = await WebBrowser.openAuthSessionAsync(
        urlResponse.data.url,
        // Use the backend's callback URL as the return URL so the session
        // captures the redirect back to our backend
      );

      // Step 3: Handle the result
      if (result.type === 'success') {
        // The browser completed — the backend handled the OAuth callback
        // and stored the token. Check if we can now authenticate.
        // Note: For production, the backend should redirect to a deep link
        // (e.g., porchpilot://oauth/callback) with the token in the URL.
        // For now, we attempt to verify the connection succeeded.

        // Try to fetch orders to verify the connection worked
        const ordersResponse = await apiClient.getOrders();
        if (ordersResponse.success) {
          Alert.alert(
            'Connected!',
            'Your Gmail account has been connected. We\'ll start tracking your deliveries.',
            [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') }]
          );
        } else {
          // Token may not be stored yet — check the callback URL for params
          const callbackUrl = result.url;
          if (callbackUrl) {
            // Try to extract code and state from the callback URL
            const urlObj = new URL(callbackUrl);
            const code = urlObj.searchParams.get('code');
            const state = urlObj.searchParams.get('state');

            if (code && state) {
              const success = await completeGoogleOAuth(code, state);
              if (success) {
                Alert.alert(
                  'Connected!',
                  'Your Gmail account has been connected.',
                  [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') }]
                );
                setConnectingProvider(null);
                return;
              }
            }
          }
          // Fallback: ask user to check
          Alert.alert(
            'Connection Pending',
            'Please check if the authorization completed in your browser. Try syncing from the dashboard.',
            [{ text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') }]
          );
        }
      } else if (result.type === 'cancel') {
        // User cancelled the flow
        setConnectingProvider(null);
      } else if (result.type === 'dismiss') {
        setConnectingProvider(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed';
      Alert.alert('Error', message);
    }

    setConnectingProvider(null);
  }, [completeGoogleOAuth, router]);

  /**
   * Handle Outlook connection (not yet implemented).
   */
  const handleOutlookConnect = useCallback(() => {
    setConnectingProvider('outlook');
    Alert.alert(
      'Coming Soon',
      'Outlook/Office 365 email connection is coming soon. In the meantime, try connecting with Gmail or skip to explore the demo.',
      [
        { text: 'OK', onPress: () => setConnectingProvider(null) },
      ]
    );
  }, []);

  const handleConnect = () => {
    if (selectedProvider === 'gmail') {
      handleGoogleConnect();
    } else if (selectedProvider === 'outlook') {
      handleOutlookConnect();
    } else {
      Alert.alert('Select Provider', 'Please select an email provider to continue.');
    }
  };

  const isInProgress = connectingProvider !== null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={isInProgress}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Text style={styles.title}>Connect Your Email</Text>
        <Text style={styles.subtitle}>
          We'll scan your inbox for shipping confirmations so you never miss a delivery.
        </Text>

        {/* Provider selection */}
        <Text style={styles.sectionLabel}>Email Provider</Text>
        <View style={styles.providerRow}>
          <TouchableOpacity
            style={[
              styles.providerCard,
              selectedProvider === 'gmail' && styles.providerCardSelected,
            ]}
            onPress={() => setSelectedProvider('gmail')}
            disabled={isInProgress}
          >
            <Text style={styles.providerIcon}>📧</Text>
            <Text style={[
              styles.providerLabel,
              selectedProvider === 'gmail' && styles.providerLabelSelected,
            ]}>
              Gmail
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.providerCard,
              selectedProvider === 'outlook' && styles.providerCardSelected,
            ]}
            onPress={() => setSelectedProvider('outlook')}
            disabled={isInProgress}
          >
            <Text style={styles.providerIcon}>💼</Text>
            <Text style={[
              styles.providerLabel,
              selectedProvider === 'outlook' && styles.providerLabelSelected,
            ]}>
              Outlook
            </Text>
          </TouchableOpacity>
        </View>

        {/* Manual email input - shown for reference */}
        <Text style={styles.sectionLabel}>Connected Email</Text>
        <View style={styles.emailInputContainer}>
          <Text style={styles.emailPlaceholder}>
            {selectedProvider === 'gmail'
              ? 'Your Gmail address (set via OAuth)'
              : selectedProvider === 'outlook'
              ? 'Your Outlook address (set via OAuth)'
              : 'Select a provider above'}
          </Text>
        </View>

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          🔒 We only read shipping confirmation emails. Your data is encrypted and never shared.
        </Text>

        {/* Error display */}
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Connect button */}
        <TouchableOpacity
          style={[styles.connectButton, isInProgress && styles.connectButtonDisabled]}
          activeOpacity={0.8}
          onPress={handleConnect}
          disabled={isInProgress}
        >
          {isInProgress ? (
            <View style={styles.connectingRow}>
              <ActivityIndicator color={colors.text.inverse} size="small" />
              <Text style={styles.connectText}>
                {' '}Connecting {connectingProvider === 'gmail' ? 'Gmail' : 'Outlook'}...
              </Text>
            </View>
          ) : (
            <Text style={styles.connectText}>
              {selectedProvider
                ? `Connect with ${selectedProvider === 'gmail' ? 'Gmail' : 'Outlook'}`
                : 'Select a Provider'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)/dashboard')}
          disabled={isInProgress}
        >
          <Text style={styles.skipText}>Skip for now — try the demo</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    paddingTop: spacing['5xl'],
  },
  backButton: {
    marginBottom: spacing['2xl'],
  },
  backText: {
    color: colors.text.link,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing['2xl'],
  },
  sectionLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  providerCard: {
    flex: 1,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  providerCardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  providerIcon: {
    fontSize: 28,
    marginBottom: spacing.sm,
  },
  providerLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
  },
  providerLabelSelected: {
    color: colors.primary[500],
  },
  emailInputContainer: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.lg,
  },
  emailPlaceholder: {
    fontSize: typography.fontSize.md,
    color: colors.neutral[500],
  },
  privacyNote: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    color: colors.text.error,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  connectButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.lg,
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  connectButtonDisabled: {
    opacity: 0.7,
  },
  connectText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  connectingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  skipText: {
    color: colors.text.tertiary,
    fontSize: typography.fontSize.sm,
  },
});
