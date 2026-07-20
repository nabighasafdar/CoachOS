import { View, StyleSheet, Text } from 'react-native';
import type { ReactNode } from 'react';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

/** Exact symbols from the product mock. */
export const TAB_SYMBOLS = {
  Home: '⌂', // U+2302 HOUSE
  Plan: '◫', // U+25EB WHITE SQUARE WITH LEFT HALF BLACK
  Calories: '⊛', // U+229B CIRCLED ASTERISK OPERATOR
  Agents: '⬡', // U+2B21 WHITE HEXAGON
  Profile: '○', // U+25CB WHITE CIRCLE
} as const;

const ACTIVE = '#8EB4FF';
const INACTIVE = '#7A8499';

type TabIconProps = {
  focused: boolean;
  color: string;
  symbol: string;
};

function IconWrap({
  focused,
  children,
  activeColor = ACTIVE,
}: {
  focused: boolean;
  children: ReactNode;
  activeColor?: string;
}) {
  return (
    <View style={styles.wrap}>
      {children}
      {focused ? (
        <View style={[styles.dot, { backgroundColor: activeColor, shadowColor: activeColor }]} />
      ) : (
        <View style={styles.dotSpacer} />
      )}
    </View>
  );
}

export function TabSymbolIcon({ focused, color, symbol }: TabIconProps) {
  return (
    <IconWrap focused={focused}>
      <Text
        style={[
          styles.symbol,
          { color },
          focused && styles.symbolActive,
          symbol === TAB_SYMBOLS.Profile && focused && styles.profileGlow,
        ]}
      >
        {symbol}
      </Text>
    </IconWrap>
  );
}

export function HomeTabIcon({ focused, color }: Omit<TabIconProps, 'symbol'>) {
  return <TabSymbolIcon focused={focused} color={color} symbol={TAB_SYMBOLS.Home} />;
}

export function PlanTabIcon({ focused, color }: Omit<TabIconProps, 'symbol'>) {
  return <TabSymbolIcon focused={focused} color={color} symbol={TAB_SYMBOLS.Plan} />;
}

export function CaloriesTabIcon({ focused, color }: Omit<TabIconProps, 'symbol'>) {
  return <TabSymbolIcon focused={focused} color={color} symbol={TAB_SYMBOLS.Calories} />;
}

export function AgentsTabIcon({ focused, color }: Omit<TabIconProps, 'symbol'>) {
  const activeColor = focused ? '#C084FC' : color;
  return (
    <IconWrap focused={focused} activeColor="#C084FC">
      <Text
        style={[
          styles.symbol,
          { color: activeColor },
          focused && { textShadowColor: 'rgba(192,132,252,0.9)', textShadowRadius: 8 },
        ]}
      >
        {TAB_SYMBOLS.Agents}
      </Text>
    </IconWrap>
  );
}

export function ProfileTabIcon({ focused, color }: Omit<TabIconProps, 'symbol'>) {
  return (
    <IconWrap focused={focused} activeColor={ACTIVE}>
      <Text
        style={[
          styles.symbol,
          { color },
          focused && styles.symbolActive,
          focused && styles.profileGlow,
        ]}
      >
        {TAB_SYMBOLS.Profile}
      </Text>
    </IconWrap>
  );
}

export const tabBarOptions: BottomTabNavigationOptions = {
  headerStyle: { backgroundColor: '#0B0B0C' },
  headerTintColor: '#F4F7FB',
  tabBarStyle: {
    backgroundColor: '#0B0B0C',
    borderTopColor: '#2A2A2E',
    borderTopWidth: StyleSheet.hairlineWidth,
    height: 90,
    paddingTop: 10,
    paddingBottom: 22,
  },
  tabBarActiveTintColor: ACTIVE,
  tabBarInactiveTintColor: INACTIVE,
  tabBarLabelStyle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: 2,
  },
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', minHeight: 36 },
  symbol: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '400',
    textAlign: 'center',
  },
  symbolActive: {
    textShadowColor: 'rgba(142,180,255,0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  profileGlow: {
    fontSize: 24,
    lineHeight: 28,
    textShadowColor: 'rgba(142,180,255,0.95)',
    textShadowRadius: 10,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE,
    marginTop: 5,
    shadowColor: ACTIVE,
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  dotSpacer: { width: 4, height: 4, marginTop: 5 },
});
