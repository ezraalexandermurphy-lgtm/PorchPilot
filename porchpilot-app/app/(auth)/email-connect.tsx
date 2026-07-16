import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

type ProviderType = 'gmail' | 'outlook';

export default function EmailConnectScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<ProviderType | null>(null);

  const handleConnect = () => {
    if (!email.trim()) {
      Alert.alert('Email Required', 'Please enter your email address to continue.');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // TODO: Implement actual OAuth flow with backend
    // For now, navigate to dashboard as demo
    Alert.alert(
      'Coming Soon',
      'Full email integration is under development. For now, you can explore the demo dashboard.',
      [
        { text: 'Go to Dashboard', onPress: () => router.replace('/(tabs)/dashboard') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Back button */}
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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

        {/* Email input */}
        <Text style={styles.sectionLabel}>Or enter manually</Text>
        <TextInput
          style={styles.emailInput}
          placeholder="you@example.com"
          placeholderTextColor={colors.neutral[500]}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Privacy note */}
        <Text style={styles.privacyNote}>
          🔒 We only read shipping confirmation emails. Your data is encrypted and never shared.
        </Text>

        {/* Connect button */}
        <TouchableOpacity
          style={styles.connectButton}
          activeOpacity={0.8}
          onPress={handleConnect}
        >
          <Text style={styles.connectText}>
            {selectedProvider ? `Connect with ${selectedProvider === 'gmail' ? 'Gmail' : 'Outlook'}` : 'Connect Email'}
          </Text>
        </TouchableOpacity>

        {/* Skip */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/(tabs)/dashboard')}
        >
          <Text style={styles.skipText}>Skip for now — try the demo</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  emailInput: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.lg,
  },
  privacyNote: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: typography.fontSize.xs * typography.lineHeight.normal,
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
  connectText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
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
