import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { fetchActivity, logCheckIn, logMeal } from '../services/coachApi';
import { useAppStore } from '../store/appStore';
import type { DailySignals } from '../types/agent';

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function LogScreen() {
  const profile = useAppStore((s) => s.profile);
  const setPlan = useAppStore((s) => s.setPlan);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const setLastSignals = useAppStore((s) => s.setLastSignals);
  const [sleep, setSleep] = useState(7);
  const [energy, setEnergy] = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [injury, setInjury] = useState(false);
  const [injuryNote, setInjuryNote] = useState('');
  const [meal, setMeal] = useState('chicken and rice');
  const [pantry, setPantry] = useState('eggs, oats, frozen veg, chicken');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const signalsPreview = useMemo(
    () => `sleep ${sleep} · energy ${energy} · soreness ${soreness}`,
    [sleep, energy, soreness],
  );

  async function submitCheckIn() {
    if (!profile) return;
    setBusy(true);
    setMsg('');
    try {
      const signals: DailySignals = {
        user_id: profile.user_id,
        date: today(),
        sleep,
        energy,
        soreness,
        injury_flag: injury,
        injury_note: injuryNote,
        weather_summary: '',
        precip_mm: 0,
      };
      const result = await logCheckIn(profile.user_id, signals);
      setLastSignals(result.signals);
      if (result.adaptation && typeof result.adaptation === 'object' && result.adaptation !== null) {
        const adapt = result.adaptation as { plan?: unknown; decision?: { reason?: string } };
        if (adapt.plan) setPlan(adapt.plan as never);
        setMsg(adapt.decision?.reason || 'Check-in saved; Adaptation ran.');
      } else {
        setMsg('Check-in saved. Signals look fine — no forced replan.');
      }
      setDecisions(await fetchActivity(profile.user_id));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Check-in failed');
    } finally {
      setBusy(false);
    }
  }

  async function submitMeal() {
    if (!profile) return;
    setBusy(true);
    try {
      const pantryList = pantry
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const result = await logMeal(profile.user_id, meal, pantryList);
      setSuggestions(result.nutrition_state?.suggestions ?? []);
      setMsg(result.reason);
      setDecisions(await fetchActivity(profile.user_id));
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Meal log failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Daily Log</Text>
      <Text style={styles.sub}>Manual check-ins power Recovery until wearables are wired.</Text>

      <Text style={styles.section}>Morning check-in</Text>
      <Stepper label="Sleep" value={sleep} onChange={setSleep} />
      <Stepper label="Energy" value={energy} onChange={setEnergy} />
      <Stepper label="Soreness" value={soreness} onChange={setSoreness} />
      <Pressable style={[styles.chip, injury && styles.chipOn]} onPress={() => setInjury((v) => !v)}>
        <Text style={[styles.chipText, injury && styles.chipTextOn]}>
          {injury ? 'Injury flag ON' : 'Injury flag off'}
        </Text>
      </Pressable>
      {injury ? (
        <TextInput
          style={styles.input}
          placeholder="Injury note"
          placeholderTextColor="#6B7A90"
          value={injuryNote}
          onChangeText={setInjuryNote}
        />
      ) : null}
      <Text style={styles.meta}>{signalsPreview}</Text>
      <Pressable style={styles.primary} onPress={submitCheckIn} disabled={busy}>
        {busy ? <ActivityIndicator color="#0B1220" /> : <Text style={styles.primaryText}>Save check-in</Text>}
      </Pressable>

      <Text style={styles.section}>Nutrition</Text>
      <TextInput
        style={styles.input}
        placeholder="What did you eat?"
        placeholderTextColor="#6B7A90"
        value={meal}
        onChangeText={setMeal}
      />
      <TextInput
        style={styles.input}
        placeholder="Pantry items (comma-separated)"
        placeholderTextColor="#6B7A90"
        value={pantry}
        onChangeText={setPantry}
      />
      <Pressable style={styles.secondary} onPress={submitMeal} disabled={busy}>
        <Text style={styles.secondaryText}>Log meal (Nutrition Agent)</Text>
      </Pressable>

      {suggestions.map((s) => (
        <Text key={s} style={styles.suggestion}>
          • {s}
        </Text>
      ))}
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
    </ScrollView>
  );
}

function Stepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepLabel}>
        {label}: {value}/10
      </Text>
      <View style={styles.stepActions}>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.max(1, value - 1))}>
          <Text style={styles.stepBtnText}>-</Text>
        </Pressable>
        <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(10, value + 1))}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#0B1220', gap: 10 },
  title: { fontSize: 24, fontWeight: '700', color: '#F4F7FB' },
  sub: { color: '#9AA8BC', marginBottom: 8 },
  section: { color: '#F4F7FB', fontWeight: '700', marginTop: 12 },
  stepper: {
    backgroundColor: '#121A2B',
    borderRadius: 12,
    padding: 12,
    borderColor: '#1E2A40',
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepLabel: { color: '#F4F7FB' },
  stepActions: { flexDirection: 'row', gap: 8 },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E2A40',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: '#F4F7FB', fontSize: 18, fontWeight: '700' },
  chip: {
    borderWidth: 1,
    borderColor: '#1E2A40',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
  },
  chipOn: { backgroundColor: '#FF7B72', borderColor: '#FF7B72' },
  chipText: { color: '#9AA8BC' },
  chipTextOn: { color: '#0B1220', fontWeight: '700' },
  input: {
    backgroundColor: '#121A2B',
    borderColor: '#1E2A40',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    color: '#F4F7FB',
  },
  meta: { color: '#6B7A90' },
  primary: {
    backgroundColor: '#3DDC97',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  primaryText: { color: '#0B1220', fontWeight: '700' },
  secondary: {
    borderColor: '#3DDC97',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  secondaryText: { color: '#3DDC97', fontWeight: '600' },
  suggestion: { color: '#C5D0E0' },
  msg: { color: '#9AA8BC', lineHeight: 20, marginBottom: 24 },
});
