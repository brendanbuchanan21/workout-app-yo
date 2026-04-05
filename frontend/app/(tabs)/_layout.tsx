import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../src/constants/theme';
import { Ionicons } from '@expo/vector-icons';


function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string | React.ReactNode> = {
    Home: <Ionicons name="home" size={24} color={focused ? COLORS.accent_primary : COLORS.text_tertiary} />,
    Train: <Ionicons name="barbell-outline" size={24} color={focused ? COLORS.accent_primary : COLORS.text_tertiary} />,
    Nutrition: <Ionicons name="nutrition-outline" size={24} color={focused ? COLORS.accent_primary : COLORS.text_tertiary} />,
    Progress: <Ionicons name="bar-chart" size={24} color={focused ? COLORS.accent_primary : COLORS.text_tertiary} />,
    Settings: <Ionicons name="person-outline" size={24} color={focused ? COLORS.accent_primary : COLORS.text_tertiary} />,
  };
  return (
    <View style={styles.tabIcon}>
      {typeof icons[label] === 'string' ? (
        <Text style={[styles.iconText, focused && styles.iconTextActive]}>
        {icons[label] || '*'}
      </Text>
      ) :
      (
        icons[label]
      )}
      
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
      {/* NUTRITION_HIDDEN */}
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          href: null,
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
      <Tabs.Screen 
        name="settings"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => <TabIcon label="Settings" focused={focused}/>,
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
