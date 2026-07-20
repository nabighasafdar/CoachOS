import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

function titleCaseList(items: string[]) {
  if (!items.length) return '—';
  return items
    .map((item) => item.replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(' · ');
}

function titleCaseDay(day: string) {
  return day.slice(0, 1).toUpperCase() + day.slice(1, 3);
}

export function ProfileScreen() {
  const profile = useAppStore((s) => s.profile);
  const authMode = useAppStore((s) => s.authMode);
  const [pushEnabled, setPushEnabled] = useState(!!profile?.push_token);
  const [pushStatus, setPushStatus] = useState('');

  async function togglePush(next: boolean) {
    if (!next) {
      setPushEnabled(false);
      setPushStatus('Push notifications off');
      return;
    }
    const { status: existing } = await Notifications.getPermissionsAsync();
    let status = existing;
    if (existing !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      status = req.status;
    }
    if (status !== 'granted') {
      setPushEnabled(false);
      setPushStatus('Permission denied');
      return;
    }
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    if (profile) {
      await saveUserProfile({ ...profile, push_token: token });
    }
    setPushEnabled(true);
    setPushStatus('Push notifications on');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'CoachOS ready',
        body: 'Agent nudges and plan updates can reach this device.',
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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.container}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.sub}>Not signed in</Text>
        </View>
      </SafeAreaView>
    );
  }

  const initial = (profile.display_name || profile.email || 'U').charAt(0).toUpperCase();
  const authLabel =
    authMode === 'supabase' && isSupabaseConfigured() ? 'SUPABASE AUTH' : 'LOCAL AUTH';

  const rows = [
    { label: 'Goals', value: titleCaseList(profile.goals) },
    { label: 'Equipment', value: titleCaseList(profile.equipment) },
    {
      label: 'Training days',
      value: profile.available_days.map(titleCaseDay).join(' · ') || '—',
    },
    {
      label: 'Experience',
      value: profile.experience_level.replace(/\b\w/g, (c) => c.toUpperCase()),
    },
    {
      label: 'Injuries',
      value: profile.injuries.length ? profile.injuries.join(' · ') : 'None',
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.name}>{profile.display_name || 'Athlete'}</Text>
            <Text style={styles.email}>{profile.email || 'No email'}</Text>
            <View style={styles.authBadge}>
              <Text style={styles.authBadgeText}>{authLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>TRAINING PROFILE</Text>
          {rows.map((row, index) => (
            <View
              key={row.label}
              style={[styles.infoRow, index < rows.length - 1 && styles.infoRowBorder]}
            >
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
          <View style={styles.notifyRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.notifyTitle}>Push notifications</Text>
              <Text style={styles.notifySub}>Agent nudges and plan updates</Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={(v) => void togglePush(v)}
              trackColor={{ false: '#2A2A2E', true: 'rgba(61,220,151,0.45)' }}
              thumbColor={pushEnabled ? '#3DDC97' : '#8A8A8A'}
            />
          </View>
          {pushStatus ? <Text style={styles.pushStatus}>{pushStatus}</Text> : null}
        </View>

        <Pressable style={styles.weatherBtn} onPress={demoWeatherNudge}>
          <Text style={styles.weatherBtnText}>Demo weather nudge</Text>
        </Pressable>

        <Pressable style={styles.dangerBtn} onPress={() => logout()}>
          <Text style={styles.dangerBtnText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0B0B0C' },
  container: { padding: 20, paddingBottom: 40, gap: 14 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
  sub: { color: '#8A8A8A' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1A1A1C',
    borderWidth: 1,
    borderColor: '#2A2A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#8EB4FF', fontSize: 24, fontWeight: '800' },
  userMeta: { flex: 1, gap: 3 },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  email: { color: '#8A8A8A', fontSize: 14 },
  authBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3DDC97',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  authBadgeText: {
    color: '#3DDC97',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  card: {
    backgroundColor: '#121214',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },
  sectionLabel: {
    color: '#6B6B6B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 12,
  },
  infoRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A2A2E',
  },
  infoLabel: { color: '#8A8A8A', fontSize: 14, flexShrink: 0 },
  infoValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
  },
  notifyRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 4 },
  notifyTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  notifySub: { color: '#8A8A8A', fontSize: 13, marginTop: 3 },
  pushStatus: { color: '#6B6B6B', fontSize: 12, marginTop: 10 },
  weatherBtn: {
    backgroundColor: '#12182A',
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2B3A5C',
  },
  weatherBtnText: { color: '#8EB4FF', fontWeight: '700', fontSize: 15 },
  dangerBtn: {
    backgroundColor: '#1A1010',
    borderRadius: 16,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3A2020',
  },
  dangerBtnText: { color: '#FF8A84', fontWeight: '700', fontSize: 15 },
});
