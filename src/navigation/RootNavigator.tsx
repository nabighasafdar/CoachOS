import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import {
  HomeTabIcon,
  InsightsTabIcon,
  LogTabIcon,
  PlanTabIcon,
  ProfileTabIcon,
  tabBarOptions,
} from '../components/TabBarIcons';
import { AgentsScreen } from '../screens/AgentsScreen';
import { AuthScreen, type AuthStackParamList } from '../screens/AuthScreen';
import { InsightsScreen } from '../screens/InsightsScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { fetchActivity, fetchPlan } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import { UI } from '../theme/ui';
import { HomeNavigator } from './HomeNavigator';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: UI.bg,
    card: UI.card,
    primary: UI.accent,
    text: UI.ink,
    border: UI.border,
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: UI.bg },
        headerTintColor: UI.ink,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: UI.bg },
      }}
    >
      <AuthStack.Screen name="Welcome" component={AuthScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Home"
        component={HomeNavigator}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused, color }) => <HomeTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarLabel: 'Plan',
          tabBarIcon: ({ focused, color }) => <PlanTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Log"
        component={AgentsScreen}
        options={{
          tabBarLabel: 'Log',
          tabBarIcon: ({ focused, color }) => <LogTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Insights"
        component={InsightsScreen}
        options={{
          tabBarLabel: 'Insights',
          tabBarIcon: ({ focused, color }) => <InsightsTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused, color }) => <ProfileTabIcon focused={focused} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const ready = useAppStore((s) => s.ready);
  const profile = useAppStore((s) => s.profile);
  const userId = useAppStore((s) => s.userId);
  const hydrate = useAppStore((s) => s.hydrate);
  const setPlan = useAppStore((s) => s.setPlan);
  const setDecisions = useAppStore((s) => s.setDecisions);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!profile?.onboarding_complete) return;
    void (async () => {
      try {
        setPlan(await fetchPlan(profile.user_id));
      } catch {
        /* no plan yet */
      }
      try {
        setDecisions(await fetchActivity(profile.user_id));
      } catch {
        /* api offline */
      }
    })();
  }, [profile?.user_id, profile?.onboarding_complete, setDecisions, setPlan]);

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: UI.bg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color={UI.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: UI.bg } }}
      >
        {!userId || !profile ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !profile.onboarding_complete ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
