import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type { DailySignals, DecisionLogEntry, UserProfile, WeeklyPlan } from '../types/agent';

const PROFILE_KEY = 'coachos.profile';
const LOCAL_UID_KEY = 'coachos.localUid';

type AppState = {
  ready: boolean;
  userId: string | null;
  profile: UserProfile | null;
  plan: WeeklyPlan | null;
  decisions: DecisionLogEntry[];
  lastSignals: DailySignals | null;
  authMode: 'supabase' | 'local' | null;
  setReady: (ready: boolean) => void;
  setAuth: (userId: string | null, mode: 'supabase' | 'local' | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setPlan: (plan: WeeklyPlan | null) => void;
  setDecisions: (decisions: DecisionLogEntry[]) => void;
  setLastSignals: (signals: DailySignals | null) => void;
  hydrate: () => Promise<void>;
  persistProfile: (profile: UserProfile) => Promise<void>;
  signOutLocal: () => Promise<void>;
};

export const useAppStore = create<AppState>((set) => ({
  ready: false,
  userId: null,
  profile: null,
  plan: null,
  decisions: [],
  lastSignals: null,
  authMode: null,
  setReady: (ready) => set({ ready }),
  setAuth: (userId, mode) => set({ userId, authMode: mode }),
  setProfile: (profile) => set({ profile }),
  setPlan: (plan) => set({ plan }),
  setDecisions: (decisions) => set({ decisions }),
  setLastSignals: (signals) => set({ lastSignals: signals }),
  hydrate: async () => {
    const [rawProfile, localUid] = await Promise.all([
      AsyncStorage.getItem(PROFILE_KEY),
      AsyncStorage.getItem(LOCAL_UID_KEY),
    ]);
    if (rawProfile) {
      const profile = JSON.parse(rawProfile) as UserProfile;
      set({
        profile,
        userId: profile.user_id,
        authMode: localUid ? 'local' : 'supabase',
      });
    } else if (localUid) {
      set({ userId: localUid, authMode: 'local' });
    }
    set({ ready: true });
  },
  persistProfile: async (profile) => {
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    await AsyncStorage.setItem(LOCAL_UID_KEY, profile.user_id);
    set({ profile, userId: profile.user_id });
  },
  signOutLocal: async () => {
    await AsyncStorage.multiRemove([PROFILE_KEY, LOCAL_UID_KEY]);
    set({
      userId: null,
      profile: null,
      plan: null,
      decisions: [],
      lastSignals: null,
      authMode: null,
    });
  },
}));
