import { create } from 'zustand';

type UserProfile = {
  displayName?: string;
  goals?: string[];
  equipment?: string[];
  onboardingComplete: boolean;
};

type AppState = {
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
};

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
}));
