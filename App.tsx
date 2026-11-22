import { useEffect, useState } from 'react';
import {
  AppState, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native';

import { previewClient, type SharedProfile } from './src/supabase/preview';

const copy = {
  en: {
    heading: 'SQDLY Gym Dev',
    subtitle: 'Preview · Shared account',
    setupMissing: 'Preview sign-in is available in a configured development build.',
    instructions: 'Sign in with an existing SQDLY Preview account.',
    email: 'Email address',
    password: 'Password',
    signIn: 'Sign in',
    signingIn: 'Signing in…',
    signInError: 'Could not sign in. Check your Preview credentials and connection.',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    signOutError: 'Could not sign out. Try again.',
    profile: 'Shared profile',
    loadingProfile: 'Loading your profile…',
    profileError: 'Could not load your profile. Check your connection and try again.',
    profileMissing: 'Your account has no shared profile in Preview.',
    retry: 'Retry',
    name: 'Display name',
    member: 'Member number',
    location: 'Location',
    language: 'Saved language',
    noValue: 'Not set',
    photo: 'Profile image',
  },
  de: {
    heading: 'SQDLY Gym Dev',
    subtitle: 'Preview · Gemeinsames Konto',
    setupMissing: 'Die Preview-Anmeldung ist in einer konfigurierten Entwicklungsversion verfügbar.',
    instructions: 'Melde dich mit einem bestehenden SQDLY-Preview-Konto an.',
    email: 'E-Mail-Adresse',
    password: 'Passwort',
    signIn: 'Anmelden',
    signingIn: 'Anmeldung läuft…',
    signInError: 'Anmeldung fehlgeschlagen. Prüfe deine Preview-Zugangsdaten und die Verbindung.',
    signOut: 'Abmelden',
    signingOut: 'Abmeldung läuft…',
    signOutError: 'Abmeldung fehlgeschlagen. Versuch es erneut.',
    profile: 'Gemeinsames Profil',
    loadingProfile: 'Profil wird geladen…',
    profileError: 'Profil konnte nicht geladen werden. Prüfe deine Verbindung und versuch es erneut.',
    profileMissing: 'Dein Konto hat kein gemeinsames Profil in Preview.',
    retry: 'Erneut versuchen',
    name: 'Anzeigename',
    member: 'Mitgliedsnummer',
    location: 'Ort',
    language: 'Gespeicherte Sprache',
    noValue: 'Nicht angegeben',
    photo: 'Profilbild',
  },
};

type Labels = (typeof copy)[keyof typeof copy];
type Client = NonNullable<typeof previewClient>;

export default function App() {
  const [locale, setLocale] = useState<keyof typeof copy>('en');
  const labels = copy[locale];

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>{labels.heading}</Text>
          <Text style={styles.body}>{labels.subtitle}</Text>
          {previewClient
            ? <PreviewAccount client={previewClient} labels={labels} />
            : <Text style={styles.body}>{labels.setupMissing}</Text>}
          <Pressable
            accessibilityRole="button"
            onPress={() => setLocale(locale === 'en' ? 'de' : 'en')}
            style={styles.secondary}
          >
            <Text style={styles.body}>{locale === 'en' ? 'Deutsch' : 'English'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PreviewAccount({ client, labels }: { client: Client; labels: Labels }) {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    const refresh = (state: string | null | undefined) => {
      if (state === 'active') void client.auth.startAutoRefresh();
      else void client.auth.stopAutoRefresh();
    };
    refresh(AppState.currentState);
    const listener = AppState.addEventListener('change', refresh);
    return () => {
      subscription.unsubscribe();
      listener.remove();
      void client.auth.stopAutoRefresh();
    };
  }, [client]);

  return userId
    ? <Profile key={userId} client={client} labels={labels} />
    : <SignIn client={client} labels={labels} />;
}

function SignIn({ client, labels }: { client: Client; labels: Labels }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const canSubmit = !busy && email.trim() !== '' && password !== '';

  async function signIn() {
    if (!canSubmit) return;
    setBusy(true);
    setFailed(false);
    setPassword('');
    try {
      const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
      setFailed(Boolean(error));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.section}>
      <Text style={styles.body}>{labels.instructions}</Text>
      <TextInput
        accessibilityLabel={labels.email}
        autoCapitalize="none"
        autoComplete="email"
        editable={!busy}
        keyboardType="email-address"
        placeholder={labels.email}
        placeholderTextColor="#54677d"
        style={styles.input}
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        accessibilityLabel={labels.password}
        autoComplete="current-password"
        editable={!busy}
        placeholder={labels.password}
        placeholderTextColor="#54677d"
        secureTextEntry
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={() => void signIn()}
      />
      {failed && <Text accessibilityRole="alert" style={styles.error}>{labels.signInError}</Text>}
      <Action label={busy ? labels.signingIn : labels.signIn} disabled={!canSubmit} onPress={() => void signIn()} />
    </View>
  );
}

function Profile({ client, labels }: { client: Client; labels: Labels }) {
  const [result, setResult] = useState<SharedProfile | 'loading' | 'error' | null>('loading');
  const [attempt, setAttempt] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);

  useEffect(() => {
    let current = true;
    const loadProfile = async () => {
      try {
        const { data, error } = await client.rpc('get_my_shared_profile').maybeSingle();
        if (current) setResult(error ? 'error' : data);
      } catch {
        if (current) setResult('error');
      }
    };
    void loadProfile();
    return () => { current = false; };
  }, [client, attempt]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFailed(false);
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      setSignOutFailed(Boolean(error));
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  const profile = typeof result === 'object' ? result : null;
  const place = profile && [profile.city, profile.country_code].filter(Boolean).join(', ');
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{labels.profile}</Text>
      {result === 'loading' && <Text accessibilityLiveRegion="polite" style={styles.body}>{labels.loadingProfile}</Text>}
      {result === 'error' && (
        <>
          <Text accessibilityRole="alert" style={styles.error}>{labels.profileError}</Text>
          <Action label={labels.retry} onPress={() => {
            setResult('loading');
            setAttempt((previous) => previous + 1);
          }} />
        </>
      )}
      {result === null && <Text style={styles.body}>{labels.profileMissing}</Text>}
      {profile && (
        <>
          {profile.avatar_url?.startsWith('https://') && (
            <Image accessibilityLabel={labels.photo} source={{ uri: profile.avatar_url }} style={styles.avatar} />
          )}
          <Field label={labels.name} value={profile.display_name || labels.noValue} />
          <Field label={labels.member} value={profile.member_number?.toString() ?? labels.noValue} />
          <Field label={labels.location} value={place || labels.noValue} />
          <Field label={labels.language} value={profile.saved_language?.toUpperCase() ?? labels.noValue} />
        </>
      )}
      {signOutFailed && <Text accessibilityRole="alert" style={styles.error}>{labels.signOutError}</Text>}
      <Action label={signingOut ? labels.signingOut : labels.signOut} disabled={signingOut} onPress={() => void signOut()} />
    </View>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <Text style={styles.body}><Text style={styles.fieldLabel}>{label}: </Text>{value}</Text>;
}

function Action({ label, disabled = false, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={[styles.button, disabled && styles.disabled]}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 64 },
  content: { width: '100%', maxWidth: 420, gap: 12 },
  section: { gap: 12, marginTop: 8 },
  title: { color: '#142033', fontSize: 34, fontWeight: '700' },
  sectionTitle: { color: '#142033', fontSize: 22, fontWeight: '700' },
  body: { color: '#25364c', fontSize: 17 },
  fieldLabel: { fontWeight: '600' },
  error: { color: '#8b2424', fontSize: 16 },
  input: {
    minHeight: 52, borderColor: '#8191a6', borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, color: '#142033', backgroundColor: '#fff', fontSize: 17,
  },
  button: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: '#173958' },
  disabled: { opacity: 0.55 },
  buttonText: { color: '#ffffff', fontSize: 17, fontWeight: '600', textAlign: 'center' },
  secondary: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center', paddingRight: 16 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#e0e7ef' },
});
