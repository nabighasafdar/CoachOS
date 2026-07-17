import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import { AgentsScreen } from '../screens/AgentsScreen';
import { AuthScreen, type AuthStackParamList } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LogScreen } from '../screens/LogScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { fetchActivity, fetchPlan } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

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

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0B1220' },
        headerTintColor: '#F4F7FB',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#0B1220' },
      }}
    >
      <AuthStack.Screen
        name="Welcome"
        component={AuthScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
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
      <Tab.Screen name="Agents" component={AgentsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
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
      <View style={{ flex: 1, backgroundColor: '#0B1220', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#3DDC97" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B1220' } }}>
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
