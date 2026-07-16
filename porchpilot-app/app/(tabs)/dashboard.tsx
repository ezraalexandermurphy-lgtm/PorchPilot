import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius, shadows } from '../../src/theme';
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from '../../src/constants';

// Demo data for the placeholder dashboard
const DEMO_ORDERS = [
  {
    id: 'ord-001',
    retailer: 'Amazon',
    title: 'Wireless Bluetooth Headphones',
    status: 'out_for_delivery' as const,
    estimatedDelivery: 'Today by 8 PM',
    imageUrl: null,
    price: '$49.99',
  },
  {
    id: 'ord-002',
    retailer: 'Chewy',
    title: 'Premium Dog Food - 30lb Bag',
    status: 'in_transit' as const,
    estimatedDelivery: 'Tomorrow, Jul 14',
    imageUrl: null,
    price: '$64.99',
  },
  {
    id: 'ord-003',
    retailer: 'Walgreens',
    title: 'Vitamins & Supplements Bundle',
    status: 'shipped' as const,
    estimatedDelivery: 'Fri, Jul 18',
    imageUrl: null,
    price: '$32.50',
  },
  {
    id: 'ord-004',
    retailer: 'Amazon',
    title: 'USB-C Charging Cable 6ft',
    status: 'delivered' as const,
    estimatedDelivery: 'Delivered Jul 11',
    imageUrl: null,
    price: '$12.99',
  },
  {
    id: 'ord-005',
    retailer: 'Target',
    title: 'Kitchen Appliance Set',
    status: 'delayed' as const,
    estimatedDelivery: 'Delayed - Updated ETA TBD',
    imageUrl: null,
    price: '$89.99',
  },
];

function getRetailerColor(retailer: string): string {
  const colors_map: Record<string, string> = {
    Amazon: '#FF9900',
    Chewy: '#00A1E0',
    Walgreens: '#E31837',
    Target: '#CC0000',
  };
  return colors_map[retailer] || colors.neutral[500];
}

function StatusBadge({ status }: { status: string }) {
  const label = ORDER_STATUS_LABELS[status] || status;
  const color = ORDER_STATUS_COLORS[status] || colors.neutral[500];

  const bgColors: Record<string, string> = {
    out_for_delivery: '#FFF3E0',
    in_transit: '#FFF8E1',
    shipped: '#E3F2FD',
    delivered: '#E8F5E9',
    delayed: '#FFEBEE',
    exception: '#FFEBEE',
  };

  return (
    <View style={[styles.badge, { backgroundColor: bgColors[status] || colors.neutral[100] }]}>
      <View style={[styles.badgeDot, { backgroundColor: color }]} />
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1500);
  };

  const todayItems = DEMO_ORDERS.filter(o =>
    o.status === 'out_for_delivery' || o.status === 'delivered'
  );
  const upcomingItems = DEMO_ORDERS.filter(o =>
    o.status === 'in_transit' || o.status === 'shipped'
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Your Deliveries</Text>
          <Text style={styles.subtitle}>
            {DEMO_ORDERS.filter(o => o.status !== 'delivered').length} active packages
          </Text>
        </View>
        <TouchableOpacity
          style={styles.connectBadge}
          onPress={() => router.push('/(auth)/email-connect')}
        >
          <Text style={styles.connectBadgeText}>Connect</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[500]} />
        }
      >
        {/* Today's deliveries section */}
        {todayItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            {todayItems.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/order/${order.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.retailerIndicator, { backgroundColor: getRetailerColor(order.retailer) }]} />
                <View style={styles.orderInfo}>
                  <View style={styles.retailerRow}>
                    <Text style={styles.retailerName}>{order.retailer}</Text>
                    <Text style={styles.price}>{order.price}</Text>
                  </View>
                  <Text style={styles.orderTitle} numberOfLines={1}>{order.title}</Text>
                  <View style={styles.orderMeta}>
                    <StatusBadge status={order.status} />
                    <Text style={styles.deliveryDate}>{order.estimatedDelivery}</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Upcoming section */}
        {upcomingItems.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming</Text>
            {upcomingItems.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/order/${order.id}`)}
                activeOpacity={0.7}
              >
                <View style={[styles.retailerIndicator, { backgroundColor: getRetailerColor(order.retailer) }]} />
                <View style={styles.orderInfo}>
                  <View style={styles.retailerRow}>
                    <Text style={styles.retailerName}>{order.retailer}</Text>
                    <Text style={styles.price}>{order.price}</Text>
                  </View>
                  <Text style={styles.orderTitle} numberOfLines={1}>{order.title}</Text>
                  <View style={styles.orderMeta}>
                    <StatusBadge status={order.status} />
                    <Text style={styles.deliveryDate}>{order.estimatedDelivery}</Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Delivered / Past section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Past Deliveries</Text>
          {DEMO_ORDERS.filter(o => o.status === 'delivered').map((order) => (
            <TouchableOpacity
              key={order.id}
              style={[styles.orderCard, styles.deliveredCard]}
              onPress={() => router.push(`/order/${order.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.retailerIndicator, { backgroundColor: getRetailerColor(order.retailer) }]} />
              <View style={styles.orderInfo}>
                <View style={styles.retailerRow}>
                  <Text style={styles.retailerName}>{order.retailer}</Text>
                  <Text style={styles.price}>{order.price}</Text>
                </View>
                <Text style={styles.orderTitle} numberOfLines={1}>{order.title}</Text>
                <View style={styles.orderMeta}>
                  <StatusBadge status={order.status} />
                  <Text style={styles.deliveryDate}>{order.estimatedDelivery}</Text>
                </View>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Empty state (shown when no orders) — hidden in demo */}
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📭</Text>
          <Text style={styles.emptyTitle}>No deliveries yet</Text>
          <Text style={styles.emptySubtitle}>
            Connect your email to start tracking orders automatically.
          </Text>
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  greeting: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  connectBadge: {
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius['2xl'],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  connectBadgeText: {
    color: colors.primary[500],
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing['6xl'],
  },
  section: {
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing['2xl'],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderCard: {
    flexDirection: 'row',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  deliveredCard: {
    opacity: 0.75,
  },
  retailerIndicator: {
    width: 4,
  },
  orderInfo: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  retailerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  retailerName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  price: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  orderTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  deliveryDate: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  chevron: {
    fontSize: 20,
    color: colors.neutral[400],
    alignSelf: 'center',
    paddingRight: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing['6xl'],
    paddingHorizontal: spacing['4xl'],
    display: 'none', // Hidden in demo since we have sample data
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
});
