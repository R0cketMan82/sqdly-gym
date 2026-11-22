import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const previewUrl = 'https://vigxuizwiakfollsetpo.supabase.co';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export type SharedProfile = {
  member_number: number | null;
  display_name: string | null;
  avatar_url: string | null;
  city: string | null;
  country_code: string | null;
  saved_language: 'en' | 'de' | null;
};

type PreviewDatabase = {
  public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      get_my_shared_profile: { Args: never; Returns: SharedProfile[] };
    };
  };
};

export const previewClient =
  __DEV__ && key && /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
    ? createClient<PreviewDatabase>(previewUrl, key, {
        auth: {
          storageKey: 'sqdly-gym-preview-auth',
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;
