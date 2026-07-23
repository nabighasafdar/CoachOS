import * as Notifications from 'expo-notifications';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { logout } from '../services/auth';
import { useAppStore } from '../store/appStore';
import { AGENT_LABELS, UI } from '../theme/ui';
import type { AgentName } from '../types/agent';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const AGENTS: { key: AgentName; mode: string }[] = [
  { key: 'planner', mode: 'Acts automatically' },
  { key: 'recovery', mode: 'Acts automatically' },
  { key: 'nutrition', mode: 'Suggests only' },
  { key: 'adaptation', mode: 'Acts automatically' },
  { key: 'accountability', mode: 'Suggests only' },
];

const CONNECTIONS = [
  { icon: 'watch-outline' as const, title: 'Google Fit', sub: 'Sleep, HRV, activity' },
  { icon: 'calendar-outline' as const, title: 'Calendar', sub: 'Scheduling conflicts' },
  { icon: 'cloud-outline' as const, title: 'Weather', sub: 'Outdoor session rerouting' },
];

export function ProfileScreen() {
  const profile = useAppStore((s) => s.profile);
  const plan = useAppStore((s) => s.plan);

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

  const initial = (profile.display_name || profile.email || 'A').charAt(0).toUpperCase();
  const cycleLabel = profile.goals[0]
    ? `${profile.goals[0].replace(/\b\w/g, (c) => c.toUpperCase())} cycle`
    : 'Training cycle';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View>
              <Text style={styles.name}>{profile.display_name || 'Alex Rivera'}</Text>
              <Text style={styles.cycle}>
                {cycleLabel}
                {plan ? ` · week ${plan.version}` : ''}
              </Text>
            </View>
          </View>
          <Ionicons name="settings-outline" size={22} color={UI.inkMuted} />
        </View>

        <Text style={styles.sectionTitle}>Agent permissions</Text>
        {AGENTS.map((a) => (
          <View key={a.key} style={styles.rowCard}>
            <View style={[styles.dot, { backgroundColor: UI.agents[a.key] }]} />
            <Text style={styles.rowTitle}>{AGENT_LABELS[a.key]}</Text>
            <View style={styles.modeBadge}>
              <MaterialCommunityIcons name="sync" size={12} color={UI.inkMuted} />
              <Text style={styles.modeText}>{a.mode}</Text>
            </View>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Connections</Text>
        {CONNECTIONS.map((c) => (
          <View key={c.title} style={styles.connCard}>
            <Ionicons name={c.icon} size={22} color={UI.inkMuted} />
            <View style={styles.connBody}>
              <Text style={styles.connTitle}>{c.title}</Text>
              <Text style={styles.connSub}>{c.sub}</Text>
            </View>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>
        ))}

        <Pressable style={styles.signOut} onPress={() => logout()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: UI.bg },
  container: { padding: 20, paddingBottom: 40, gap: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: UI.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  name: { color: UI.ink, fontSize: 22, fontWeight: '800' },
  cycle: { color: UI.inkMuted, fontSize: 14, marginTop: 2 },
  title: { fontSize: 28, fontWeight: '800', color: UI.ink },
  sub: { color: UI.inkMuted },
  sectionTitle: { color: UI.ink, fontWeight: '800', fontSize: 17, marginTop: 12, marginBottom: 4 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.card,
    borderRadius: UI.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowTitle: { flex: 1, color: UI.ink, fontWeight: '700', fontSize: 15 },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: UI.bg,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeText: { color: UI.inkMuted, fontSize: 11, fontWeight: '600' },
  connCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: UI.card,
    borderRadius: UI.radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: UI.border,
  },
  connBody: { flex: 1, gap: 2 },
  connTitle: { color: UI.ink, fontWeight: '800', fontSize: 15 },
  connSub: { color: UI.inkMuted, fontSize: 13 },
  connectedBadge: {
    backgroundColor: '#E6F7F2',
    borderRadius: UI.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  connectedText: { color: '#2A9D7A', fontSize: 11, fontWeight: '800' },
  signOut: {
    marginTop: 16,
    backgroundColor: UI.card,
    borderRadius: UI.radius.md,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: UI.border,
  },
  signOutText: { color: UI.inkMuted, fontWeight: '700' },
});
