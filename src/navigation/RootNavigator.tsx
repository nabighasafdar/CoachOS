import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import { useEffect } from 'react';
import {
  AgentsTabIcon,
  CaloriesTabIcon,
  HomeTabIcon,
  PlanTabIcon,
  ProfileTabIcon,
  tabBarOptions,
} from '../components/TabBarIcons';
import { AgentsScreen } from '../screens/AgentsScreen';
import { AuthScreen, type AuthStackParamList } from '../screens/AuthScreen';
import { FoodScannerScreen } from '../screens/FoodScannerScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { NutritionDashboardScreen } from '../screens/NutritionDashboardScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { PlanScreen } from '../screens/PlanScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SignInScreen } from '../screens/SignInScreen';
import { fetchActivity, fetchPlan } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import type { NutritionStackParamList } from './nutritionTypes';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const NutritionStack = createNativeStackNavigator<NutritionStackParamList>();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0B0B0C',
    card: '#111111',
    primary: '#D4A017',
    text: '#F4F7FB',
    border: '#1A1A1C',
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
      <AuthStack.Screen name="Welcome" component={AuthScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </AuthStack.Navigator>
  );
}

function NutritionNavigator() {
  return (
    <NutritionStack.Navigator screenOptions={{ headerShown: false }}>
      <NutritionStack.Screen name="Dashboard" component={NutritionDashboardScreen} />
      <NutritionStack.Screen
        name="Scanner"
        component={FoodScannerScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
      />
    </NutritionStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={tabBarOptions}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'HOME',
          tabBarIcon: ({ focused, color }) => <HomeTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Plan"
        component={PlanScreen}
        options={{
          tabBarLabel: 'PLAN',
          tabBarIcon: ({ focused, color }) => <PlanTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Calories"
        component={NutritionNavigator}
        options={{
          title: 'Calories',
          headerShown: false,
          tabBarLabel: 'CALORIES',
          tabBarIcon: ({ focused, color }) => <CaloriesTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Agents"
        component={AgentsScreen}
        options={{
          tabBarLabel: 'AGENTS',
          tabBarActiveTintColor: '#C084FC',
          tabBarIcon: ({ focused, color }) => <AgentsTabIcon focused={focused} color={color} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'PROFILE',
          tabBarActiveTintColor: '#8EB4FF',
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
          backgroundColor: '#0B0B0C',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={theme}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B0C' } }}
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
