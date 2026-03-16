import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../src/constants/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '~',
    Train: '#',
    Nutrition: '%',
    Progress: '^',
  };
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.iconText, focused && styles.iconTextActive]}>
        {icons[label] || '*'}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bg_primary,
          borderTopColor: COLORS.border_subtle,
          borderTopWidth: 1,
          paddingTop: 8,
          height: 85,
        },
        tabBarActiveTintColor: COLORS.accent_primary,
        tabBarInactiveTintColor: COLORS.text_tertiary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="train"
        options={{
          title: 'Train',
          tabBarIcon: ({ focused }) => <TabIcon label="Train" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ focused }) => <TabIcon label="Nutrition" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ focused }) => <TabIcon label="Progress" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text_tertiary,
  },
  iconTextActive: {
    color: COLORS.accent_primary,
  },
});
