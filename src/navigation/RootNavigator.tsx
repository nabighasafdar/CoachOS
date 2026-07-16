import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { AgentsScreen } from '../screens/AgentsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LogScreen } from '../screens/LogScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B1220',
    card: '#121A2B',
    primary: '#3DDC97',
    text: '#F4F7FB',
    border: '#1E2A40',
  },
};

export function RootNavigator() {
  return (
    <NavigationContainer theme={theme}>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#121A2B' },
          headerTintColor: '#F4F7FB',
          tabBarStyle: { backgroundColor: '#121A2B', borderTopColor: '#1E2A40' },
          tabBarActiveTintColor: '#3DDC97',
          tabBarInactiveTintColor: '#9AA8BC',
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Plan" component={PlanScreen} />
        <Tab.Screen name="Log" component={LogScreen} />
        <Tab.Screen name="Agents" component={AgentsScreen} options={{ title: 'Agents' }} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
