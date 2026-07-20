import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

type MealResult = {
  description?: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  source?: string;
};

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
  const [meal, setMeal] = useState('');
  const [pantry, setPantry] = useState('eggs, oats, frozen veg, chicken');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [mealResult, setMealResult] = useState<MealResult | null>(null);
  const [remainingKcal, setRemainingKcal] = useState<number | null>(null);

  const signalsPreview = useMemo(
    () => `sleep ${sleep} · energy ${energy} · soreness ${soreness}`,
    [sleep, energy, soreness],
  );

  async function pickImage(fromCamera: boolean) {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMsg(fromCamera ? 'Camera permission is required.' : 'Photo library permission is required.');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.55,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.55,
          base64: true,
        });

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setPhotoUri(asset.uri);
    setPhotoBase64(asset.base64 ?? null);
    setMsg('');
    setMealResult(null);
  }

  function clearPhoto() {
    setPhotoUri(null);
    setPhotoBase64(null);
  }

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
    if (!photoBase64 && !meal.trim()) {
      setMsg('Add a meal photo or type what you ate.');
      return;
    }

    setBusy(true);
    setMsg('');
    try {
      const pantryList = pantry
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const result = await logMeal(profile.user_id, meal.trim() || 'Meal photo', pantryList, photoBase64);
      setSuggestions(result.nutrition_state?.suggestions ?? []);
      setMealResult(result.meal ?? null);
      setRemainingKcal(typeof result.remaining_kcal === 'number' ? result.remaining_kcal : null);
      setMsg(result.reason);
      setDecisions(await fetchActivity(profile.user_id));
      if (result.identify?.food_name && !meal.trim()) {
        setMeal(result.identify.food_name);
      }
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

      <Text style={styles.section}>Nutrition — meal photo</Text>
      <Text style={styles.meta}>
        Photo → Gemini identifies food → API Ninjas macros → pantry next-meal suggestion.
      </Text>

      {photoUri ? (
        <View style={styles.photoWrap}>
          <Image source={{ uri: photoUri }} style={styles.photo} />
          <Pressable style={styles.clearPhoto} onPress={clearPhoto}>
            <Text style={styles.clearPhotoText}>Remove photo</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlaceholderText}>No meal photo yet</Text>
        </View>
      )}

      <View style={styles.row}>
        <Pressable style={styles.halfBtn} onPress={() => pickImage(true)} disabled={busy}>
          <Text style={styles.halfBtnText}>Take photo</Text>
        </Pressable>
        <Pressable style={styles.halfBtn} onPress={() => pickImage(false)} disabled={busy}>
          <Text style={styles.halfBtnText}>Gallery</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Or type what you ate (optional with photo)"
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
        {busy ? (
          <ActivityIndicator color="#3DDC97" />
        ) : (
          <Text style={styles.secondaryText}>Log with Nutrition Agent</Text>
        )}
      </Pressable>

      {mealResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Logged meal</Text>
          <Text style={styles.resultLine}>{mealResult.description}</Text>
          <Text style={styles.resultLine}>
            {mealResult.calories ?? '—'} kcal · P {mealResult.protein_g ?? '—'}g · C{' '}
            {mealResult.carbs_g ?? '—'}g · F {mealResult.fat_g ?? '—'}g
          </Text>
          {remainingKcal !== null ? (
            <Text style={styles.resultLine}>~{remainingKcal} kcal left today</Text>
          ) : null}
          <Text style={styles.resultSource}>Source: {mealResult.source || 'text'}</Text>
        </View>
      ) : null}

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
  container: { padding: 24, backgroundColor: '#0B1220', gap: 10, paddingBottom: 40 },
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
    minHeight: 48,
    justifyContent: 'center',
  },
  secondaryText: { color: '#3DDC97', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10 },
  halfBtn: {
    flex: 1,
    borderColor: '#1E2A40',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#121A2B',
  },
  halfBtnText: { color: '#F4F7FB', fontWeight: '600' },
  photoWrap: { gap: 8 },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#121A2B',
  },
  clearPhoto: { alignSelf: 'flex-start' },
  clearPhotoText: { color: '#FF7B72', fontWeight: '600' },
  photoPlaceholder: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E2A40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121A2B',
  },
  photoPlaceholderText: { color: '#6B7A90' },
  resultCard: {
    backgroundColor: '#121A2B',
    borderRadius: 12,
    borderColor: '#1E2A40',
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  resultTitle: { color: '#3DDC97', fontWeight: '700', marginBottom: 4 },
  resultLine: { color: '#F4F7FB' },
  resultSource: { color: '#6B7A90', marginTop: 4, fontSize: 12 },
  suggestion: { color: '#C5D0E0' },
  msg: { color: '#9AA8BC', lineHeight: 20, marginBottom: 24 },
});
