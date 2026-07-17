import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchActivity, runAccountability } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import type { AgentName } from '../types/agent';

const COLORS: Record<AgentName, string> = {
  planner: '#7AA2FF',
  recovery: '#3DDC97',
  nutrition: '#F0C14A',
  adaptation: '#C084FC',
  accountability: '#FF7B72',
};

export function AgentsScreen() {
  const profile = useAppStore((s) => s.profile);
  const decisions = useAppStore((s) => s.decisions);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const [busy, setBusy] = useState(false);
  const [nudge, setNudge] = useState('');

  const refresh = useCallback(async () => {
    if (!profile) return;
    setBusy(true);
    try {
      setDecisions(await fetchActivity(profile.user_id));
    } finally {
      setBusy(false);
    }
  }, [profile, setDecisions]);

  async function accountability() {
    if (!profile) return;
    setBusy(true);
    try {
      const nudges = await runAccountability(profile.user_id);
      setNudge(nudges[0]?.message ?? 'No nudge');
      setDecisions(await fetchActivity(profile.user_id));
    } catch (e) {
      setNudge(e instanceof Error ? e.message : 'Accountability failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={busy} onRefresh={refresh} tintColor="#3DDC97" />}
    >
      <Text style={styles.title}>Agent Activity</Text>
      <Text style={styles.sub}>Every observe → decide → act step with its reason.</Text>

      <Pressable style={styles.secondary} onPress={accountability}>
        <Text style={styles.secondaryText}>Run Accountability Agent</Text>
      </Pressable>
      {nudge ? <Text style={styles.nudge}>{nudge}</Text> : null}

      {decisions.length === 0 ? (
        <Text style={styles.empty}>No decisions yet. Generate a plan, check in, or skip a workout.</Text>
      ) : (
        decisions.map((d) => (
          <View key={d.id} style={styles.card}>
            <View style={styles.row}>
              <Text style={[styles.agent, { color: COLORS[d.agent] ?? '#F4F7FB' }]}>{d.agent}</Text>
              <Text style={styles.time}>{new Date(d.timestamp).toLocaleString()}</Text>
            </View>
            <Text style={styles.action}>{d.action}</Text>
            <Text style={styles.reason}>{d.reason}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0B1220', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#F4F7FB' },
  sub: { color: '#9AA8BC' },
  secondary: {
    borderColor: '#3DDC97',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#3DDC97', fontWeight: '600' },
  nudge: { color: '#F0C14A', lineHeight: 20 },
  empty: { color: '#9AA8BC', marginTop: 12 },
  card: {
    backgroundColor: '#121A2B',
    borderRadius: 12,
    padding: 14,
    borderColor: '#1E2A40',
    borderWidth: 1,
    gap: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  agent: { fontWeight: '700', textTransform: 'uppercase', fontSize: 12 },
  time: { color: '#6B7A90', fontSize: 11 },
  action: { color: '#F4F7FB', fontWeight: '600' },
  reason: { color: '#C5D0E0', lineHeight: 20 },
});
