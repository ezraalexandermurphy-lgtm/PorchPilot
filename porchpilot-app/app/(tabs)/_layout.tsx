import { Tabs } from 'expo-router';
import { colors, typography } from '../../src/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.neutral[500],
        tabBarStyle: {
          backgroundColor: colors.background.primary,
          borderTopColor: colors.border.light,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: typography.fontSize.xs,
          fontWeight: typography.fontWeight.medium,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Deliveries',
          tabBarLabel: 'Deliveries',
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="📦" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <TabIcon label="⚙️" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

// Simple emoji-based tab icon (replace with vector icons later)
function TabIcon({ label }: { label: string; color: string; size?: number }) {
  const { Text } = require('react-native');
  return <Text style={{ fontSize: 22 }}>{label}</Text>;
}
