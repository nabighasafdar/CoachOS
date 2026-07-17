import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { isSupabaseConfigured } from '../lib/supabase';
import { logout, saveUserProfile } from '../services/auth';
import { useAppStore } from '../store/appStore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export function ProfileScreen() {
  const profile = useAppStore((s) => s.profile);
  const authMode = useAppStore((s) => s.authMode);
  const [pushStatus, setPushStatus] = useState('');

  async function enablePush() {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      setPushStatus('Permission denied');
      return;
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (profile) {
      await saveUserProfile({ ...profile, push_token: token });
    }
    setPushStatus(`Token saved: ${token.slice(0, 24)}…`);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'CoachOS ready',
        body: 'Contextual nudges can reach this device (demo local notification).',
      },
      trigger: null,
    });
  }

  async function demoWeatherNudge() {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Rain at your usual run time',
        body: 'Want me to move today’s conditioning indoors?',
      },
      trigger: null,
    });
    Alert.alert('Nudge sent', 'Local demo notification fired.');
  }

  if (!profile) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.sub}>Not signed in</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.sub}>{profile.display_name || profile.email}</Text>
      <Text style={styles.meta}>
        Auth: {authMode}
        {authMode === 'local' || !isSupabaseConfigured()
          ? ' (Supabase optional — local mode active)'
          : ' (Supabase)'}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Goals</Text>
        <Text style={styles.value}>{profile.goals.join(', ') || '—'}</Text>
        <Text style={styles.label}>Equipment</Text>
        <Text style={styles.value}>{profile.equipment.join(', ') || '—'}</Text>
        <Text style={styles.label}>Days</Text>
        <Text style={styles.value}>{profile.available_days.join(', ') || '—'}</Text>
        <Text style={styles.label}>Injuries</Text>
        <Text style={styles.value}>{profile.injuries.join(', ') || 'none'}</Text>
        <Text style={styles.label}>Level</Text>
        <Text style={styles.value}>{profile.experience_level}</Text>
      </View>

      <Pressable style={styles.secondary} onPress={enablePush}>
        <Text style={styles.secondaryText}>Enable push notifications</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={demoWeatherNudge}>
        <Text style={styles.secondaryText}>Demo weather nudge</Text>
      </Pressable>
      {pushStatus ? <Text style={styles.meta}>{pushStatus}</Text> : null}

      <Pressable style={styles.danger} onPress={() => logout()}>
        <Text style={styles.dangerText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0B1220', gap: 10, flexGrow: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#F4F7FB' },
  sub: { color: '#9AA8BC' },
  meta: { color: '#6B7A90' },
  card: {
    backgroundColor: '#121A2B',
    borderRadius: 12,
    padding: 14,
    borderColor: '#1E2A40',
    borderWidth: 1,
    gap: 4,
  },
  label: { color: '#6B7A90', marginTop: 6, fontSize: 12, textTransform: 'uppercase' },
  value: { color: '#F4F7FB' },
  secondary: {
    borderColor: '#3DDC97',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#3DDC97', fontWeight: '600' },
  danger: {
    borderColor: '#FF7B72',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  dangerText: { color: '#FF7B72', fontWeight: '600' },
});
