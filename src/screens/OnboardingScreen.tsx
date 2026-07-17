import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { saveUserProfile } from '../services/auth';
import { generatePlan } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import type { ExperienceLevel, UserProfile } from '../types/agent';

const GOAL_OPTIONS = ['strength', 'fat loss', 'endurance', 'consistency', 'mobility'];
const EQUIP_OPTIONS = ['bodyweight', 'dumbbells', 'barbell', 'bands', 'pull-up bar', 'gym'];
const DAY_OPTIONS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function toggle(list: string[], value: string) {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function OnboardingScreen() {
  const profile = useAppStore((s) => s.profile);
  const setPlan = useAppStore((s) => s.setPlan);
  const [goals, setGoals] = useState(profile?.goals ?? ['strength']);
  const [equipment, setEquipment] = useState(profile?.equipment ?? ['bodyweight']);
  const [days, setDays] = useState(profile?.available_days ?? ['mon', 'wed', 'fri']);
  const [injuries, setInjuries] = useState(profile?.injuries?.join(', ') ?? '');
  const [level, setLevel] = useState<ExperienceLevel>(profile?.experience_level ?? 'beginner');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function finish() {
    if (!profile) return;
    setBusy(true);
    setError('');
    try {
      const next: UserProfile = {
        ...profile,
        goals,
        equipment,
        available_days: days,
        injuries: injuries
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experience_level: level,
        onboarding_complete: true,
      };
      await saveUserProfile(next);
      const plan = await generatePlan(next.user_id, next, true);
      setPlan(plan);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Onboarding failed — is the API running?');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Set up your coaching profile</Text>
      <Text style={styles.sub}>Goals, equipment, schedule, and injuries feed every agent.</Text>

      <Text style={styles.label}>Goals</Text>
      <View style={styles.row}>
        {GOAL_OPTIONS.map((g) => (
          <Chip key={g} label={g} active={goals.includes(g)} onPress={() => setGoals(toggle(goals, g))} />
        ))}
      </View>

      <Text style={styles.label}>Equipment</Text>
      <View style={styles.row}>
        {EQUIP_OPTIONS.map((g) => (
          <Chip
            key={g}
            label={g}
            active={equipment.includes(g)}
            onPress={() => setEquipment(toggle(equipment, g))}
          />
        ))}
      </View>

      <Text style={styles.label}>Available days</Text>
      <View style={styles.row}>
        {DAY_OPTIONS.map((g) => (
          <Chip key={g} label={g} active={days.includes(g)} onPress={() => setDays(toggle(days, g))} />
        ))}
      </View>

      <Text style={styles.label}>Experience</Text>
      <View style={styles.row}>
        {(['beginner', 'intermediate', 'advanced'] as ExperienceLevel[]).map((g) => (
          <Chip key={g} label={g} active={level === g} onPress={() => setLevel(g)} />
        ))}
      </View>

      <Text style={styles.label}>Injuries (comma-separated)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. left knee"
        placeholderTextColor="#6B7A90"
        value={injuries}
        onChangeText={setInjuries}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.primary} onPress={finish} disabled={busy || days.length === 0}>
        {busy ? <ActivityIndicator color="#0B1220" /> : <Text style={styles.primaryText}>Generate my plan</Text>}
      </Pressable>
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0B1220', gap: 10 },
  title: { fontSize: 28, fontWeight: '700', color: '#F4F7FB' },
  sub: { color: '#9AA8BC', marginBottom: 8 },
  label: { color: '#F4F7FB', fontWeight: '600', marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#1E2A40',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: { backgroundColor: '#3DDC97', borderColor: '#3DDC97' },
  chipText: { color: '#9AA8BC' },
  chipTextActive: { color: '#0B1220', fontWeight: '700' },
  input: {
    backgroundColor: '#121A2B',
    borderColor: '#1E2A40',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: '#F4F7FB',
  },
  primary: {
    backgroundColor: '#3DDC97',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 40,
  },
  primaryText: { color: '#0B1220', fontWeight: '700' },
  error: { color: '#FF7B72' },
});
