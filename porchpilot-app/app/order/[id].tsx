import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../src/constants';

// Demo order data lookup
const DEMO_ORDERS: Record<string, any> = {
  'ord-001': {
    id: 'ord-001',
    retailer: 'Amazon',
    title: 'Wireless Bluetooth Headphones',
    description: 'Noise-cancelling over-ear headphones with 30hr battery life.',
    status: 'out_for_delivery',
    estimatedDelivery: 'Today by 8 PM',
    trackingNumber: '1Z999AA10123456784',
    carrier: 'UPS',
    price: '$49.99',
    imageUrl: null,
  },
  'ord-002': {
    id: 'ord-002',
    retailer: 'Chewy',
    title: 'Premium Dog Food - 30lb Bag',
    description: 'Grain-free chicken recipe dry dog food.',
    status: 'in_transit',
    estimatedDelivery: 'Tomorrow, Jul 14',
    trackingNumber: '9400111899223456789012',
    carrier: 'USPS',
    price: '$64.99',
    imageUrl: null,
  },
  'ord-003': {
    id: 'ord-003',
    retailer: 'Walgreens',
    title: 'Vitamins & Supplements Bundle',
    description: 'Daily multivitamin pack, 30-day supply.',
    status: 'shipped',
    estimatedDelivery: 'Fri, Jul 18',
    trackingNumber: '1Z12345E0205271688',
    carrier: 'UPS',
    price: '$32.50',
    imageUrl: null,
  },
  'ord-004': {
    id: 'ord-004',
    retailer: 'Amazon',
    title: 'USB-C Charging Cable 6ft',
    description: 'Fast-charging USB-C to USB-C cable, 6ft.',
    status: 'delivered',
    estimatedDelivery: 'Delivered Jul 11',
    deliveredAt: 'July 11, 2026 at 2:34 PM',
    trackingNumber: 'TBA1234567890',
    carrier: 'Amazon Logistics',
    price: '$12.99',
    imageUrl: null,
  },
  'ord-005': {
    id: 'ord-005',
    retailer: 'Target',
    title: 'Kitchen Appliance Set',
    description: '3-piece kitchen appliance set including blender, toaster, and kettle.',
    status: 'delayed',
    estimatedDelivery: 'Delayed - Updated ETA TBD',
    trackingNumber: '1Z45678E0298765432',
    carrier: 'FedEx',
    price: '$89.99',
    imageUrl: null,
  },
};

function getRetailerColor(retailer: string): string {
  const colors_map: Record<string, string> = {
    Amazon: '#FF9900',
    Chewy: '#00A1E0',
    Walgreens: '#E31837',
    Target: '#CC0000',
  };
  return colors_map[retailer] || colors.neutral[500];
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const order = DEMO_ORDERS[id || ''];
  const statusColor = ORDER_STATUS_COLORS[order?.status] || colors.neutral[500];
  const statusLabel = ORDER_STATUS_LABELS[order?.status] || order?.status;

  const handleAddReminder = () => {
    Alert.alert(
      'Add Calendar Reminder',
      'This will add a delivery reminder to your calendar.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Add Reminder', onPress: () => Alert.alert('Success', 'Reminder added to your calendar!') },
      ]
    );
  };

  const handleTrackPackage = () => {
    Alert.alert(
      'Track Package',
      `Tracking: ${order?.trackingNumber}\nCarrier: ${order?.carrier}`,
      [{ text: 'OK' }]
    );
  };

  if (!order) {
    return (
      <View style={styles.container}>
        <View style={styles.errorState}>
          <Text style={styles.errorEmoji}>🔍</Text>
          <Text style={styles.errorTitle}>Order Not Found</Text>
          <Text style={styles.errorSubtitle}>This order could not be found.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <Text style={styles.backArrowText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusColor + '15' }]}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <View style={styles.statusInfo}>
            <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
            <Text style={styles.statusDate}>{order.estimatedDelivery}</Text>
          </View>
        </View>

        {/* Order info card */}
        <View style={styles.card}>
          <View style={styles.retailerRow}>
            <View style={[styles.retailerDot, { backgroundColor: getRetailerColor(order.retailer) }]} />
            <Text style={styles.retailerName}>{order.retailer}</Text>
          </View>
          <Text style={styles.orderTitle}>{order.title}</Text>
          {order.description && (
            <Text style={styles.description}>{order.description}</Text>
          )}
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceValue}>{order.price}</Text>
          </View>
        </View>

        {/* Tracking info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Tracking Information</Text>
          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>Carrier</Text>
            <Text style={styles.trackingValue}>{order.carrier}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.trackingRow}>
            <Text style={styles.trackingLabel}>Tracking Number</Text>
            <Text style={styles.trackingValueMono}>{order.trackingNumber}</Text>
          </View>
          <TouchableOpacity style={styles.trackButton} onPress={handleTrackPackage}>
            <Text style={styles.trackButtonText}>Track Package</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddReminder}>
            <Text style={styles.actionIcon}>📅</Text>
            <Text style={styles.actionText}>Add Calendar Reminder</Text>
          </TouchableOpacity>
        </View>

        {/* Share / Help */}
        <View style={styles.helpRow}>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpText}>Share Order</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpButton}>
            <Text style={styles.helpText}>Get Help</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backArrow: {
    paddingRight: spacing.md,
  },
  backArrowText: {
    fontSize: typography.fontSize.md,
    color: colors.text.link,
    fontWeight: typography.fontWeight.medium,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['6xl'],
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing['2xl'],
    marginTop: spacing['2xl'],
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.md,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
  statusDate: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.background.card,
    marginHorizontal: spacing['2xl'],
    marginTop: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing['2xl'],
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  retailerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  retailerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  retailerName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.lg,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  priceLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  priceValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  trackingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  trackingLabel: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  trackingValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  trackingValueMono: {
    fontSize: typography.fontSize.sm,
    fontFamily: 'monospace',
    color: colors.text.primary,
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
  },
  trackButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary[50],
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  trackButtonText: {
    color: colors.primary[500],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  actionsCard: {
    marginHorizontal: spacing['2xl'],
    marginTop: spacing.lg,
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    gap: spacing.md,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  helpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing['2xl'],
    marginTop: spacing['3xl'],
    paddingHorizontal: spacing['2xl'],
  },
  helpButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  helpText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.link,
    fontWeight: typography.fontWeight.medium,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing['4xl'],
  },
  errorEmoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  errorTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  errorSubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  backButton: {
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['3xl'],
    borderRadius: borderRadius['2xl'],
  },
  backButtonText: {
    color: colors.text.inverse,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});
