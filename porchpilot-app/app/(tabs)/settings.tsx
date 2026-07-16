import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { APP_NAME, APP_TAGLINE } from '../../src/constants';

interface SettingRowProps {
  label: string;
  description?: string;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  showCaret?: boolean;
}

function SettingRow({ label, description, value, onToggle, onPress, showCaret }: SettingRowProps) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress && !onToggle}
    >
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      {onToggle && (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: colors.neutral[300], true: colors.primary[300] }}
          thumbColor={value ? colors.primary[500] : colors.neutral[100]}
        />
      )}
      {showCaret && <Text style={styles.caret}>›</Text>}
    </TouchableOpacity>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [calendarReminders, setCalendarReminders] = useState(true);

  const handleDisconnectEmail = () => {
    Alert.alert(
      'Disconnect Email',
      'This will remove your email connection and all tracked orders. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Disconnect', style: 'destructive', onPress: () => {} },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      'Reset All Data',
      'This will clear all app data including email connections, orders, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive' },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Account section */}
        <SectionHeader title="Account" />
        <View style={styles.settingsGroup}>
          <SettingRow
            label="Connected Email"
            description="Not connected — tap to set up"
            onPress={() => router.push('/(auth)/email-connect')}
            showCaret
          />
        </View>

        {/* Notifications section */}
        <SectionHeader title="Notifications" />
        <View style={styles.settingsGroup}>
          <SettingRow
            label="Push Notifications"
            description="Get alerts when packages are out for delivery"
            value={notifications}
            onToggle={setNotifications}
          />
          <View style={styles.divider} />
          <SettingRow
            label="Calendar Reminders"
            description="Add delivery reminders to your calendar"
            value={calendarReminders}
            onToggle={setCalendarReminders}
          />
        </View>

        {/* Widget section */}
        <SectionHeader title="Home Screen" />
        <View style={styles.settingsGroup}>
          <SettingRow
            label="Home Screen Widget"
            description="View your upcoming deliveries at a glance"
            onPress={() => {}}
            showCaret
          />
        </View>

        {/* Support section */}
        <SectionHeader title="Support" />
        <View style={styles.settingsGroup}>
          <SettingRow label="Help & FAQ" onPress={() => {}} showCaret />
          <View style={styles.divider} />
          <SettingRow label="Contact Support" onPress={() => {}} showCaret />
          <View style={styles.divider} />
          <SettingRow label="Privacy Policy" onPress={() => {}} showCaret />
          <View style={styles.divider} />
          <SettingRow label="Terms of Service" onPress={() => {}} showCaret />
        </View>

        {/* Danger zone */}
        <SectionHeader title="Data" />
        <View style={styles.settingsGroup}>
          <SettingRow
            label="Disconnect Email"
            description="Remove email connection and order data"
            onPress={handleDisconnectEmail}
            showCaret
          />
          <View style={styles.divider} />
          <TouchableOpacity style={styles.dangerRow} onPress={handleResetApp}>
            <Text style={styles.dangerText}>Reset All Data</Text>
          </TouchableOpacity>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.appTagline}>{APP_TAGLINE}</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingTop: spacing['5xl'],
    paddingHorizontal: spacing['2xl'],
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['6xl'],
  },
  sectionHeader: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing['2xl'],
    marginBottom: spacing.sm,
    paddingHorizontal: spacing['2xl'],
  },
  settingsGroup: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing['2xl'],
    ...shadows.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    minHeight: 52,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  settingDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginLeft: spacing.lg,
  },
  caret: {
    fontSize: 20,
    color: colors.neutral[400],
  },
  dangerRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dangerText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.error,
  },
  appInfo: {
    alignItems: 'center',
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['4xl'],
  },
  appName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  appTagline: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  version: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
});
