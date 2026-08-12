import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AccountAuthService, AccountIdentity } from '@/auth/accountAuth';

type Stage = 'email' | 'code' | 'ready';

export function AccountRegistration({
  onBack,
  onDeleteAccount = null,
  onExportAccountData = null,
  onIdentityChange,
  onSyncProgress = null,
  privacyNoticeUrl = null,
  service,
}: Readonly<{
  onBack(): void;
  onDeleteAccount?: ((identity: AccountIdentity) => Promise<void>) | null;
  onExportAccountData?: ((identity: AccountIdentity) => Promise<void>) | null;
  onIdentityChange?: (identity: AccountIdentity | null) => void;
  onSyncProgress?: (() => Promise<Readonly<{
    completedOrdinals: readonly number[];
    localCount: number;
    remoteCount: number;
  }>>) | null;
  privacyNoticeUrl?: string | null;
  service: AccountAuthService | null;
}>) {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [verifiedEmail, setVerifiedEmail] = useState('');
  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [lifecycleMessage, setLifecycleMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<AccountIdentity | null>(null);
  const identityVersion = useRef(0);
  const mounted = useRef(true);

  useEffect(() => () => {
    mounted.current = false;
    identityVersion.current += 1;
  }, []);

  useEffect(() => {
    let active = true;
    const restoreVersion = identityVersion.current;
    if (service === null) return () => {
      active = false;
    };

    const publishIdentity = (currentIdentity: AccountIdentity | null) => {
      identityVersion.current += 1;
      setIdentity(currentIdentity);
      setBusy(false);
      setError(null);
      setSyncCount(null);
      if (currentIdentity === null) {
        setVerifiedEmail('');
        setStage('email');
        onIdentityChange?.(null);
        return;
      }
      setVerifiedEmail(currentIdentity.email);
      setStage('ready');
      onIdentityChange?.(currentIdentity);
    };

    const stopListening = service.subscribeToAccountChanges?.((currentIdentity) => {
      if (active) publishIdentity(currentIdentity);
    }) ?? (() => undefined);

    void service.getCurrentAccount()
      .then((currentIdentity) => {
        if (
          !active
          || identityVersion.current !== restoreVersion
        ) return;
        publishIdentity(currentIdentity);
      })
      .catch(() => {
        if (active && identityVersion.current === restoreVersion) {
          setError('Account session could not be restored. Please sign in again.');
        }
      });

    return () => {
      active = false;
      stopListening();
    };
  }, [onIdentityChange, service]);

  const requestCode = async () => {
    const activeService = service;
    if (activeService === null) return;
    const operationVersion = identityVersion.current;
    setBusy(true);
    setError(null);
    try {
      await activeService.requestRegistrationCode(email);
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setStage('code');
    } catch (caught) {
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setError(caught instanceof Error ? caught.message : 'Account request failed.');
    } finally {
      if (mounted.current && identityVersion.current === operationVersion) setBusy(false);
    }
  };

  const verifyCode = async () => {
    const activeService = service;
    if (activeService === null) return;
    const operationVersion = identityVersion.current;
    setBusy(true);
    setError(null);
    try {
      const verifiedIdentity = await activeService.verifyRegistrationCode(email, code);
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setBusy(false);
      identityVersion.current += 1;
      setIdentity(verifiedIdentity);
      setVerifiedEmail(verifiedIdentity.email);
      setStage('ready');
      onIdentityChange?.(verifiedIdentity);
    } catch (caught) {
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setError(caught instanceof Error ? caught.message : 'Verification failed.');
    } finally {
      if (mounted.current && identityVersion.current === operationVersion) setBusy(false);
    }
  };

  const syncProgress = async () => {
    if (onSyncProgress === null || identity === null) return;
    const operationVersion = identityVersion.current;
    setBusy(true);
    setError(null);
    try {
      const result = await onSyncProgress();
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setSyncCount(result.localCount);
    } catch {
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setError('Progress could not be synced. Please try again.');
    } finally {
      if (mounted.current && identityVersion.current === operationVersion) setBusy(false);
    }
  };

  const signOut = async () => {
    const activeService = service;
    if (activeService === null) return;
    const operationVersion = identityVersion.current;
    setBusy(true);
    setError(null);
    try {
      await activeService.signOut();
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setBusy(false);
      identityVersion.current += 1;
      setIdentity(null);
      setVerifiedEmail('');
      setEmail('');
      setCode('');
      setSyncCount(null);
      setStage('email');
      onIdentityChange?.(null);
    } catch {
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setError('Sign out could not be completed. Please try again.');
    } finally {
      if (mounted.current && identityVersion.current === operationVersion) setBusy(false);
    }
  };

  const exportAccountData = async () => {
    if (onExportAccountData === null || identity === null) return;
    const operationVersion = identityVersion.current;
    setBusy(true);
    setError(null);
    setLifecycleMessage(null);
    try {
      await onExportAccountData(identity);
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setLifecycleMessage('Your account data download is ready.');
    } catch {
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setError('Account export could not be completed. Please try again.');
    } finally {
      if (mounted.current && identityVersion.current === operationVersion) setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (onDeleteAccount === null || identity === null || deleteConfirmation !== 'DELETE') return;
    const operationVersion = identityVersion.current;
    setBusy(true);
    setError(null);
    setLifecycleMessage(null);
    try {
      await onDeleteAccount(identity);
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setDeleteConfirmation('');
      setLifecycleMessage('Your account was deleted. Finishing secure session cleanup…');
    } catch {
      if (!mounted.current || identityVersion.current !== operationVersion) return;
      setError('Account deletion could not be completed. Please try again.');
    } finally {
      if (mounted.current && identityVersion.current === operationVersion) setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Pressable
          accessibilityLabel="Back to main menu"
          accessibilityRole="button"
          onPress={onBack}
          style={styles.backButton}>
          <Text style={styles.backText}>‹ Back to main menu</Text>
        </Pressable>

        {service === null ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>Accounts are not available yet</Text>
            <Text style={styles.body}>
              This build is not connected to the account service. Local Journey progress still works in this browser.
            </Text>
            <Text style={styles.note}>
              No registration or account data is collected while the account service is not configured.
            </Text>
          </View>
        ) : stage === 'ready' ? (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>Account ready</Text>
            <Text style={styles.body}>Signed in as</Text>
            <Text style={styles.email}>{verifiedEmail}</Text>
            <Text style={styles.note}>
              Sync is a manual snapshot of progress completed while signed in. Anonymous browser progress is never uploaded. Sync again after completing more signed-in challenges.
            </Text>
            <Text style={styles.note}>
              Signing out returns this Journey to anonymous browser progress. Account progress remains stored in this browser for your next sign-in.
            </Text>
            {syncCount === null ? null : (
              <Text accessibilityLiveRegion="polite" style={styles.syncSuccess}>
                {syncCount === 1
                  ? '1 completed challenge is synced.'
                  : `${syncCount} completed challenges are synced.`}
              </Text>
            )}

            {error === null ? null : (
              <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
            )}
            {lifecycleMessage === null ? null : (
              <Text accessibilityLiveRegion="polite" style={styles.syncSuccess}>{lifecycleMessage}</Text>
            )}
            {onSyncProgress === null ? (
              <Text style={styles.note}>Progress sync is not configured in this build.</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={syncProgress}
                style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}>
                {busy ? (
                  <ActivityIndicator accessibilityLabel="Syncing Journey progress" color="#101820" />
                ) : (
                  <Text style={styles.primaryText}>SYNC MY JOURNEY PROGRESS</Text>
                )}
              </Pressable>
            )}
            {onExportAccountData === null ? null : (
              <Pressable
                accessibilityRole="button"
                disabled={busy}
                onPress={exportAccountData}
                style={({ pressed }) => [styles.secondaryButton, (pressed || busy) && styles.pressed]}>
                <Text style={styles.secondaryText}>DOWNLOAD MY ACCOUNT DATA</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={signOut}
              style={({ pressed }) => [styles.secondaryButton, (pressed || busy) && styles.pressed]}>
              <Text style={styles.secondaryText}>SIGN OUT</Text>
            </Pressable>
            {onDeleteAccount === null ? null : (
              <View style={styles.dangerZone}>
                <Text style={styles.dangerTitle}>Delete account</Text>
                <Text style={styles.note}>
                  This permanently deletes your account and synced progress. Anonymous progress in this browser is not deleted. Download your account data first if you want a copy.
                </Text>
                <TextInput
                  accessibilityLabel="Type DELETE to confirm account deletion"
                  autoCapitalize="characters"
                  editable={!busy}
                  onChangeText={setDeleteConfirmation}
                  placeholder="Type DELETE"
                  placeholderTextColor="#6F879D"
                  style={styles.input}
                  value={deleteConfirmation}
                />
                <Pressable
                  accessibilityRole="button"
                  disabled={busy || deleteConfirmation !== 'DELETE'}
                  onPress={deleteAccount}
                  style={({ pressed }) => [
                    styles.dangerButton,
                    (pressed || busy || deleteConfirmation !== 'DELETE') && styles.pressed,
                  ]}>
                  <Text style={styles.dangerText}>DELETE MY ACCOUNT</Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.card}>
            <Text accessibilityRole="header" style={styles.title}>Create or sign in to your account</Text>
            <Text style={styles.body}>
              Use a verified email, complete challenges while signed in, and choose when to sync them across browsers and devices.
            </Text>
            <Text style={styles.note}>
              Anonymous browser progress stays separate and is never uploaded. Sync is a manual snapshot of progress completed while signed in.
            </Text>
            <Text style={styles.note}>
              Creating an account does not subscribe you to marketing email.
            </Text>
            {privacyNoticeUrl === null ? null : (
              <Pressable
                accessibilityRole="link"
                onPress={() => { void Linking.openURL(privacyNoticeUrl); }}
                style={styles.privacyLink}>
                <Text style={styles.privacyLinkText}>READ THE ACCOUNT PRIVACY NOTICE</Text>
              </Pressable>
            )}

            <TextInput
              accessibilityLabel="Email address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!busy && stage === 'email'}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#6F879D"
              style={styles.input}
              value={email}
            />

            {stage === 'code' ? (
              <>
                <Text style={styles.codeHelp}>Enter the six-digit code sent to your email.</Text>
                <TextInput
                  accessibilityLabel="Six-digit verification code"
                  autoComplete="one-time-code"
                  editable={!busy}
                  keyboardType="number-pad"
                  maxLength={6}
                  onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  placeholderTextColor="#6F879D"
                  style={styles.input}
                  value={code}
                />
              </>
            ) : null}

            {error === null ? null : (
              <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
            )}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={stage === 'email' ? requestCode : verifyCode}
              style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}>
              {busy ? (
                <ActivityIndicator accessibilityLabel="Submitting account request" color="#101820" />
              ) : (
                <Text style={styles.primaryText}>
                  {stage === 'email' ? 'EMAIL ME A CODE' : 'VERIFY AND CONTINUE'}
                </Text>
              )}
            </Pressable>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 620,
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
  },
  backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  backText: { color: '#D7E4EF', fontSize: 15, fontWeight: '700' },
  card: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 22,
  },
  title: { color: '#F5F8FB', fontSize: 30, fontWeight: '900', lineHeight: 38 },
  body: { color: '#D5E0EA', fontSize: 16, lineHeight: 24, marginTop: 14 },
  note: { color: '#9FB2C5', fontSize: 14, lineHeight: 21, marginTop: 10 },
  email: { color: '#69F0CB', fontSize: 18, fontWeight: '800', marginTop: 6 },
  codeHelp: { color: '#C8D4E0', fontSize: 14, lineHeight: 21, marginTop: 18 },
  input: {
    backgroundColor: '#07111F',
    borderColor: '#31516F',
    borderRadius: 12,
    borderWidth: 1,
    color: '#F5F8FB',
    fontSize: 17,
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  error: { color: '#FF9E9E', fontSize: 14, lineHeight: 21, marginTop: 14 },
  syncSuccess: { color: '#69F0CB', fontSize: 15, fontWeight: '700', lineHeight: 22, marginTop: 14 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F6C857',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryText: { color: '#101820', fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
  secondaryButton: {
    alignItems: 'center',
    borderColor: '#6F879D',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  secondaryText: { color: '#D7E4EF', fontSize: 14, fontWeight: '800' },
  dangerZone: {
    borderColor: '#A85050',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 22,
    padding: 16,
  },
  dangerTitle: { color: '#FFB2B2', fontSize: 18, fontWeight: '900' },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: '#A32929',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 48,
    paddingHorizontal: 18,
  },
  dangerText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  privacyLink: { alignSelf: 'flex-start', justifyContent: 'center', marginTop: 14, minHeight: 44 },
  privacyLinkText: {
    color: '#69F0CB',
    fontSize: 14,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.7 },
});
