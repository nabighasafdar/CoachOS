import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { UserProfile } from '../types/agent';
import { fetchProfile, upsertProfile } from '../services/coachApi';
import { useAppStore } from '../store/appStore';

function blankProfile(userId: string, email: string, displayName = ''): UserProfile {
  return {
    user_id: userId,
    display_name: displayName,
    email,
    goals: [],
    equipment: [],
    injuries: [],
    available_days: ['mon', 'wed', 'fri'],
    experience_level: 'beginner',
    onboarding_complete: false,
  };
}

async function localRegister(email: string, displayName: string) {
  const userId = `local-${email.split('@')[0] || 'user'}-${Date.now().toString(36)}`;
  const profile = blankProfile(userId, email, displayName);
  await useAppStore.getState().persistProfile(profile);
  useAppStore.getState().setAuth(userId, 'local');
  try {
    await upsertProfile(profile);
  } catch {
    // API may be offline during first boot
  }
  return { mode: 'local' as const, profile };
}

export async function registerWithEmail(email: string, password: string, displayName: string) {
  if (!isSupabaseConfigured()) {
    return localRegister(email, displayName);
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) {
    throw new Error('Check your email to confirm your account, then sign in.');
  }

  const profile = blankProfile(userId, email, displayName);
  await useAppStore.getState().persistProfile(profile);
  useAppStore.getState().setAuth(userId, 'supabase');
  try {
    await upsertProfile(profile);
  } catch {
    /* API offline — profile still cached locally */
  }
  return { mode: 'supabase' as const, profile };
}

export async function loginWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    const existing = useAppStore.getState().profile;
    if (existing && existing.email === email) {
      useAppStore.getState().setAuth(existing.user_id, 'local');
      return { mode: 'local' as const, profile: existing };
    }
    return localRegister(email, email.split('@')[0]);
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error('Sign in failed');

  let profile: UserProfile;
  try {
    profile = await fetchProfile(userId);
  } catch {
    profile = blankProfile(userId, email, email.split('@')[0]);
  }
  await useAppStore.getState().persistProfile(profile);
  useAppStore.getState().setAuth(userId, 'supabase');
  return { mode: 'supabase' as const, profile };
}

export async function logout() {
  if (isSupabaseConfigured()) {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
  }
  await useAppStore.getState().signOutLocal();
}

export async function saveUserProfile(profile: UserProfile) {
  await useAppStore.getState().persistProfile(profile);
  await upsertProfile(profile);
}
