import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchActivity, logWorkout } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import type { WorkoutSession } from '../types/agent';

export function PlanScreen() {
  const profile = useAppStore((s) => s.profile);
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState('');

  async function mark(session: WorkoutSession, status: 'done' | 'skipped') {
    if (!profile) return;
    setBusyId(session.id);
    setMsg('');
    try {
      const result = await logWorkout(profile.user_id, session.id, status);
      setPlan(result.plan);
      const decisions = await fetchActivity(profile.user_id);
      setDecisions(decisions);
      setMsg(
        status === 'skipped'
          ? 'Skipped — Adaptation Agent re-resolved the week.'
          : 'Nice — session marked done.',
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  }

  if (!plan) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>Weekly Plan</Text>
        <Text style={styles.sub}>No plan yet. Finish onboarding or tap Rebuild on Home.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Weekly Plan</Text>
      <Text style={styles.sub}>
        Week of {plan.week_start} · v{plan.version}
      </Text>
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}

      {plan.sessions.map((session) => (
        <View key={session.id} style={styles.card}>
          <Text style={styles.cardTitle}>{session.title}</Text>
          <Text style={styles.meta}>
            {session.focus} · {session.duration_min} min · {session.status}
          </Text>
          {session.exercises.map((ex) => (
            <Text key={ex} style={styles.ex}>
              • {ex}
            </Text>
          ))}
          {session.notes ? <Text style={styles.notes}>{session.notes}</Text> : null}
          {session.status === 'planned' || session.status === 'moved' ? (
            <View style={styles.actions}>
              <Pressable style={styles.done} onPress={() => mark(session, 'done')} disabled={!!busyId}>
                {busyId === session.id ? (
                  <ActivityIndicator color="#0B1220" />
                ) : (
                  <Text style={styles.doneText}>Done</Text>
                )}
              </Pressable>
              <Pressable style={styles.skip} onPress={() => mark(session, 'skipped')} disabled={!!busyId}>
                <Text style={styles.skipText}>Skip</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0B1220', gap: 12 },
  empty: { flex: 1, backgroundColor: '#0B1220', padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: '#F4F7FB' },
  sub: { color: '#9AA8BC' },
  msg: { color: '#3DDC97' },
  card: {
    backgroundColor: '#121A2B',
    borderRadius: 12,
    padding: 14,
    borderColor: '#1E2A40',
    borderWidth: 1,
    gap: 4,
  },
  cardTitle: { color: '#F4F7FB', fontWeight: '700', fontSize: 16 },
  meta: { color: '#9AA8BC', marginBottom: 4 },
  ex: { color: '#C5D0E0' },
  notes: { color: '#3DDC97', marginTop: 6 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  done: {
    flex: 1,
    backgroundColor: '#3DDC97',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  doneText: { color: '#0B1220', fontWeight: '700' },
  skip: {
    flex: 1,
    borderColor: '#FF7B72',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
  },
  skipText: { color: '#FF7B72', fontWeight: '600' },
});
