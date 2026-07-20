import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getMealSlotForDate, MEAL_OPTIONS, type MealSlot } from '../lib/mealTime';
import { recordMealLogged } from '../lib/nutritionStreak';
import type { NutritionStackParamList } from '../navigation/nutritionTypes';
import { fetchActivity, logMeal } from '../services/coachApi';
import { useAppStore } from '../store/appStore';

type Props = NativeStackScreenProps<NutritionStackParamList, 'Scanner'>;

type ScanResult = {
  foodName: string;
  portion: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  mealLabel: string;
  reason: string;
  remaining?: number;
};

type PendingPhoto = {
  base64: string;
  uri?: string;
};

export function FoodScannerScreen({ navigation, route }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const profile = useAppStore((s) => s.profile);
  const setDecisions = useAppStore((s) => s.setDecisions);
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingPhoto | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');

  const suggested = getMealSlotForDate();
  const paramSlot = route.params?.mealSlot as MealSlot | undefined;
  const initialSlot =
    (paramSlot && MEAL_OPTIONS.find((o) => o.slot === paramSlot)?.slot) || suggested.slot;
  const [selectedSlot, setSelectedSlot] = useState<MealSlot>(initialSlot);

  const selectedOption = MEAL_OPTIONS.find((o) => o.slot === selectedSlot) ?? MEAL_OPTIONS[0];

  async function saveWithMealType() {
    if (!profile || !pending) {
      setError('Sign in required.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const response = await logMeal(
        profile.user_id,
        'Scanned meal',
        ['eggs', 'oats', 'frozen veg', 'chicken'],
        pending.base64,
        selectedOption.slot,
        selectedOption.label,
      );
      await recordMealLogged();
      setDecisions(await fetchActivity(profile.user_id));
      setResult({
        foodName: response.identify?.food_name || response.meal?.description || 'Meal',
        portion: response.identify?.portion || '1 serving',
        calories: response.meal?.calories ?? response.macros?.calories,
        protein_g: response.meal?.protein_g ?? response.macros?.protein_g,
        carbs_g: response.meal?.carbs_g ?? response.macros?.carbs_g,
        fat_g: response.meal?.fat_g ?? response.macros?.fat_g,
        mealLabel: response.meal_label || selectedOption.label,
        reason: response.reason,
        remaining: response.remaining_kcal,
      });
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setBusy(false);
    }
  }

  async function capture() {
    if (!cameraRef.current || busy) return;
    try {
      setBusy(true);
      setError('');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.55,
        base64: true,
        shutterSound: false,
      });
      if (!photo?.base64) {
        setError('Could not capture photo.');
        return;
      }
      setSelectedSlot(initialSlot);
      setPending({ base64: photo.base64, uri: photo.uri });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Camera capture failed');
    } finally {
      setBusy(false);
    }
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Photo library permission is required.');
      return;
    }
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.55,
      base64: true,
    });
    if (picked.canceled || !picked.assets?.[0]?.base64) return;
    setSelectedSlot(initialSlot);
    setPending({ base64: picked.assets[0].base64, uri: picked.assets[0].uri });
  }

  function resetScan() {
    setResult(null);
    setPending(null);
    setError('');
    setSelectedSlot(initialSlot);
  }

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.permTitle}>Camera access needed</Text>
        <Text style={styles.permSub}>Allow camera to scan food on your plate.</Text>
        <Pressable style={styles.primary} onPress={requestPermission}>
          <Text style={styles.primaryText}>Enable camera</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView style={styles.resultSafe}>
        <View style={styles.resultHeader}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.resultHeaderTitle}>Scan result</Text>
          <View style={{ width: 44 }} />
        </View>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <View style={styles.resultCard}>
            <Text style={styles.slotPill}>{result.mealLabel}</Text>
            <Text style={styles.resultFood}>{result.foodName}</Text>
            <Text style={styles.resultPortion}>Portion: {result.portion}</Text>
            <Text style={styles.resultKcal}>{result.calories ?? '—'} kcal</Text>
            <Text style={styles.resultMacros}>
              P {result.protein_g ?? '—'}g · C {result.carbs_g ?? '—'}g · F {result.fat_g ?? '—'}g
            </Text>
            {result.remaining != null ? (
              <Text style={styles.resultRemaining}>~{result.remaining} kcal left today</Text>
            ) : null}
            <Text style={styles.resultReason}>{result.reason}</Text>
            <Pressable style={styles.primary} onPress={resetScan}>
              <Text style={styles.primaryText}>Scan another</Text>
            </Pressable>
            <Pressable style={styles.secondary} onPress={() => navigation.navigate('Dashboard')}>
              <Text style={styles.secondaryText}>Back to dashboard</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (pending) {
    return (
      <SafeAreaView style={styles.pickSafe}>
        <View style={styles.resultHeader}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              setPending(null);
              setError('');
            }}
          >
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.pickHeaderTitle}>Which meal?</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.pickScroll} showsVerticalScrollIndicator={false}>
          {pending.uri ? <Image source={{ uri: pending.uri }} style={styles.pickPhoto} /> : null}

          <Text style={styles.pickTitle}>Add this food to</Text>
          <Text style={styles.pickSub}>
            Pick a meal type so it shows under the right card on Calories.
          </Text>

          <View style={styles.optionGrid}>
            {MEAL_OPTIONS.map((option) => {
              const on = option.slot === selectedSlot;
              return (
                <Pressable
                  key={option.slot}
                  style={[styles.optionChip, on && styles.optionChipOn]}
                  onPress={() => setSelectedSlot(option.slot)}
                >
                  <Text style={[styles.optionLabel, on && styles.optionLabelOn]}>{option.label}</Text>
                  <Text style={[styles.optionWindow, on && styles.optionWindowOn]}>
                    {option.window}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.pickError}>{error}</Text> : null}

          <Pressable style={styles.primary} onPress={saveWithMealType} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#0B1220" />
            ) : (
              <Text style={styles.primaryText}>Save to {selectedOption.label}</Text>
            )}
          </Pressable>
          <Pressable
            style={styles.secondary}
            onPress={() => {
              setPending(null);
              setError('');
            }}
            disabled={busy}
          >
            <Text style={styles.secondaryText}>Retake photo</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Scanner</Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.frameWrap}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
            <View style={styles.scanLine} />
          </View>
          <Text style={styles.hint}>Align food in frame · then choose meal type</Text>
        </View>

        <View style={styles.modeRow}>
          <View style={[styles.modeBtn, styles.modeActive]}>
            <Text style={styles.modeActiveText}>Scan Food</Text>
          </View>
          <Pressable style={styles.modeBtn} onPress={pickFromLibrary} disabled={busy}>
            <Text style={styles.modeText}>Library</Text>
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.controls}>
          <Pressable style={styles.sideBtn} onPress={pickFromLibrary} disabled={busy}>
            <Text style={styles.sideBtnText}>Gallery</Text>
          </Pressable>
          <Pressable style={styles.shutter} onPress={capture} disabled={busy}>
            {busy ? <ActivityIndicator color="#1C211C" /> : <View style={styles.shutterInner} />}
          </Pressable>
          <Pressable style={styles.sideBtn} onPress={() => setTorch((v) => !v)} disabled={busy}>
            <Text style={styles.sideBtnText}>{torch ? 'Flash on' : 'Flash off'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: '#0B1220',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#1C211C', fontSize: 32, lineHeight: 34, marginTop: -2 },
  frameWrap: { alignItems: 'center', gap: 12 },
  frame: {
    width: '78%',
    aspectRatio: 1,
    maxWidth: 320,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#FFFFFF',
  },
  tl: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  tr: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  br: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  scanLine: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: '48%',
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  hint: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 6,
    paddingHorizontal: 24,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  modeBtn: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modeActive: { backgroundColor: '#FFFFFF' },
  modeText: { color: '#FFFFFF', fontWeight: '700' },
  modeActiveText: { color: '#1C211C', fontWeight: '800' },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 18,
    paddingHorizontal: 12,
  },
  sideBtn: {
    width: 78,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12, textAlign: 'center' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#1C211C',
  },
  error: { color: '#FFB4B0', textAlign: 'center', paddingHorizontal: 20 },
  permTitle: { color: '#F4F7FB', fontSize: 22, fontWeight: '800' },
  permSub: { color: '#9AA8BC', textAlign: 'center' },
  primary: {
    backgroundColor: '#3DDC97',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: { color: '#0B1220', fontWeight: '800' },
  link: { color: '#9AA8BC', marginTop: 8 },
  pickSafe: { flex: 1, backgroundColor: '#050505' },
  pickHeaderTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  pickScroll: { padding: 20, paddingBottom: 40, gap: 10 },
  pickPhoto: {
    height: 180,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    marginBottom: 8,
  },
  pickTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 8 },
  pickSub: { color: '#8A8A8A', lineHeight: 20, marginBottom: 8 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  optionChip: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#2A2A2A',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  optionChipOn: {
    borderColor: '#D4A017',
    backgroundColor: 'rgba(212,160,23,0.12)',
  },
  optionLabel: { color: '#EDEDED', fontWeight: '800', fontSize: 15 },
  optionLabelOn: { color: '#D4A017' },
  optionWindow: { color: '#6B6B6B', fontSize: 11, marginTop: 4, fontWeight: '600' },
  optionWindowOn: { color: '#A88B3A' },
  pickError: { color: '#FF7B72', marginTop: 4 },
  resultSafe: { flex: 1, backgroundColor: '#050505' },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  resultHeaderTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  resultScroll: { padding: 20, paddingBottom: 40 },
  resultCard: {
    backgroundColor: '#111111',
    borderRadius: 24,
    padding: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1C1C1C',
  },
  slotPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(212,160,23,0.18)',
    color: '#D4A017',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontWeight: '700',
    fontSize: 12,
  },
  resultFood: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 6 },
  resultPortion: { color: '#8A8A8A' },
  resultKcal: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 8 },
  resultMacros: { color: '#8A8A8A', fontWeight: '600' },
  resultRemaining: { color: '#3DDC97', fontWeight: '700', marginTop: 4 },
  resultReason: { color: '#6B6B6B', marginTop: 10, lineHeight: 20 },
  secondary: {
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryText: { color: '#EDEDED', fontWeight: '700' },
});
