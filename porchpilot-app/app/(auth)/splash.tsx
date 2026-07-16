import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { APP_NAME, APP_TAGLINE, APP_DESCRIPTION } from '../../src/constants';

export default function SplashScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo / Brand Mark */}
      <View style={styles.logoContainer}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoIcon}>📦</Text>
        </View>
      </View>

      {/* Tagline */}
      <Text style={styles.appName}>{APP_NAME}</Text>
      <Text style={styles.tagline}>{APP_TAGLINE}</Text>

      {/* Description */}
      <Text style={styles.description}>{APP_DESCRIPTION}</Text>

      {/* CTA Button */}
      <TouchableOpacity
        style={styles.ctaButton}
        activeOpacity={0.8}
        onPress={() => router.push('/(auth)/email-connect')}
      >
        <Text style={styles.ctaText}>Get Started</Text>
      </TouchableOpacity>

      {/* Secondary option */}
      <TouchableOpacity
        style={styles.secondaryButton}
        activeOpacity={0.7}
        onPress={() => {
          // TODO: Skip to dashboard with demo data for testing
          router.replace('/(tabs)/dashboard');
        }}
      >
        <Text style={styles.secondaryText}>Skip to Dashboard (Demo)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary[700],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  logoContainer: {
    marginBottom: spacing['2xl'],
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.accent[500],
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoIcon: {
    fontSize: 48,
  },
  appName: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.inverse,
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    color: colors.accent[400],
    marginBottom: spacing['2xl'],
    textAlign: 'center',
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.neutral[300],
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing['4xl'],
    paddingHorizontal: spacing.lg,
  },
  ctaButton: {
    backgroundColor: colors.accent[500],
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['5xl'],
    borderRadius: borderRadius['2xl'],
    width: '100%',
    alignItems: 'center',
    shadowColor: colors.accent[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  secondaryButton: {
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
  },
  secondaryText: {
    color: colors.neutral[400],
    fontSize: typography.fontSize.sm,
  },
});
