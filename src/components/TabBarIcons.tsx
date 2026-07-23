import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import { UI } from '../theme/ui';

const ACTIVE = UI.ink;
const INACTIVE = '#A8A8A4';

type TabIconProps = { focused: boolean; color: string };

function TabIcon({
  focused,
  color,
  children,
}: TabIconProps & { children: ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

export function HomeTabIcon({ focused, color }: TabIconProps) {
  return (
    <TabIcon focused={focused} color={color}>
      <Ionicons name={focused ? 'home' : 'home-outline'} size={22} color={color} />
    </TabIcon>
  );
}

export function PlanTabIcon({ focused, color }: TabIconProps) {
  return (
    <TabIcon focused={focused} color={color}>
      <MaterialCommunityIcons
        name={focused ? 'format-list-checks' : 'format-list-checks'}
        size={22}
        color={color}
      />
    </TabIcon>
  );
}

export function LogTabIcon({ focused, color }: TabIconProps) {
  return (
    <TabIcon focused={focused} color={color}>
      <Ionicons name={focused ? 'pulse' : 'pulse-outline'} size={22} color={color} />
    </TabIcon>
  );
}

export function InsightsTabIcon({ focused, color }: TabIconProps) {
  return (
    <TabIcon focused={focused} color={color}>
      <Ionicons name={focused ? 'trending-up' : 'trending-up-outline'} size={22} color={color} />
    </TabIcon>
  );
}

export function ProfileTabIcon({ focused, color }: TabIconProps) {
  return (
    <TabIcon focused={focused} color={color}>
      <Ionicons name={focused ? 'person' : 'person-outline'} size={22} color={color} />
    </TabIcon>
  );
}

export const tabBarOptions: BottomTabNavigationOptions = {
  headerShown: false,
  tabBarStyle: {
    backgroundColor: UI.card,
    borderTopColor: UI.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 84,
    paddingTop: 8,
    paddingBottom: 24,
  },
  tabBarActiveTintColor: ACTIVE,
  tabBarInactiveTintColor: INACTIVE,
  tabBarLabelStyle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', height: 28 },
});
