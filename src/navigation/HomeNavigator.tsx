import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { RecoveryScreen } from '../screens/RecoveryScreen';
import { NutritionScreen } from '../screens/NutritionScreen';
import { FoodScannerScreen } from '../screens/FoodScannerScreen';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F2F3F0' } }}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="Recovery" component={RecoveryScreen} />
      <Stack.Screen name="Nutrition" component={NutritionScreen} />
      <Stack.Screen
        name="Scanner"
        component={FoodScannerScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'fullScreenModal' }}
      />
    </Stack.Navigator>
  );
}
