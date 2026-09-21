import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AccountIdentity } from '@/auth/accountAuth';
import { CATALOG_VERSION } from '@/domain/questions/catalog';
import type {
  LeaderboardEntry,
  LeaderboardProfile,
  LeaderboardService,
} from '@/leaderboard/leaderboard';

const EMPTY_PROFILE: LeaderboardProfile = Object.freeze({ publicName: null, optedIn: false });

export function GlobalScoreboard({
  identity,
  service,
}: Readonly<{
  identity: AccountIdentity | null;
  service: LeaderboardService | null;
}>) {
  const [entries, setEntries] = useState<readonly LeaderboardEntry[]>([]);
  const [profile, setProfile] = useState<LeaderboardProfile>(EMPTY_PROFILE);
  const [publicName, setPublicName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = async (activeService: LeaderboardService) => {
    const loaded = await activeService.listEntries(CATALOG_VERSION);
    setEntries(loaded);
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      await Promise.resolve();
      if (!active) return;
      setLoading(true);
      setError(null);
      setProfile(EMPTY_PROFILE);
      setPublicName('');
      if (service === null) {
        setEntries([]);
        setLoading(false);
        return;
      }

      try {
        const loadedEntries = await service.listEntries(CATALOG_VERSION);
        if (!active) return;
        setEntries(loadedEntries);
        if (identity !== null) {
          const loadedProfile = await service.getProfile(identity.userId);
          if (!active) return;
          setProfile(loadedProfile);
          setPublicName(loadedProfile.publicName ?? '');
        }
      } catch {
        if (active) setError('The global scoreboard could not be loaded. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => { active = false; };
  }, [identity, service]);

  const updateVisibility = async (optedIn: boolean) => {
    if (identity === null || service === null) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await service.updateProfile(identity.userId, publicName, optedIn);
      setProfile(updated);
      setPublicName(updated.publicName ?? publicName);
      await loadEntries(service);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Scoreboard settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} testID="global-scoreboard-page">
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>Global Scoreboard</Text>
        <Text style={styles.intro}>
          An opt-in ranking based on synced Journey completions. Email addresses are never shown.
        </Text>
        <Text style={styles.notice}>
          This is self-reported practice progress. It is not a proctored result, certification, credential, or guarantee of mastery.
        </Text>

        {identity === null ? (
          <View style={styles.settingsCard}>
            <Text style={styles.cardTitle}>Want to participate?</Text>
            <Text style={styles.body}>Create or sign in to an account to choose a public name and join. Participation is optional.</Text>
          </View>
        ) : (
          <View style={styles.settingsCard}>
            <Text style={styles.cardTitle}>Your scoreboard privacy</Text>
            <Text style={styles.body}>
              {profile.optedIn && profile.publicName !== null
                ? `You are visible as ${profile.publicName}.`
                : 'You are not listed publicly.'}
            </Text>
            <TextInput
              accessibilityLabel="Public scoreboard name"
              autoCapitalize="words"
              editable={!saving}
              maxLength={24}
              onChangeText={setPublicName}
              placeholder="Choose a public name"
              placeholderTextColor="#6F879D"
              style={styles.input}
              value={publicName}
            />
            <Text style={styles.nameHelp}>3–24 characters. Do not use your email address.</Text>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => { void updateVisibility(!profile.optedIn); }}
              style={({ pressed }) => [
                profile.optedIn ? styles.leaveButton : styles.joinButton,
                (pressed || saving) && styles.pressed,
              ]}>
              <Text style={profile.optedIn ? styles.leaveButtonText : styles.joinButtonText}>
                {profile.optedIn ? 'LEAVE SCOREBOARD' : 'JOIN SCOREBOARD'}
              </Text>
            </Pressable>
          </View>
        )}

        {error === null ? null : (
          <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>
        )}

        <View style={styles.boardHeader}>
          <Text style={styles.boardTitle}>Journey standings</Text>
          <Text style={styles.boardMeta}>{entries.length} public learners</Text>
        </View>
        {loading ? (
          <ActivityIndicator accessibilityLabel="Loading global scoreboard" color="#F6C857" size="large" />
        ) : entries.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No public rankings yet</Text>
            <Text style={styles.body}>The first learner who opts in will appear here.</Text>
          </View>
        ) : (
          <View style={styles.board}>
            {entries.map((entry) => (
              <View key={`${entry.rank}-${entry.publicName}`} style={styles.entry}>
                <Text accessibilityLabel={`Rank ${entry.rank}`} style={styles.rank}>#{entry.rank}</Text>
                <View style={styles.entryIdentity}>
                  <Text style={styles.publicName}>{entry.publicName}</Text>
                  <Text style={styles.completed}>{entry.completedCount} completed</Text>
                </View>
              </View>
            ))}
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
    maxWidth: 780,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 24,
    width: '100%',
  },
  title: { color: '#F5F8FB', fontSize: 32, fontWeight: '900', lineHeight: 40 },
  intro: { color: '#D5E0EA', fontSize: 16, lineHeight: 24, marginTop: 10 },
  notice: {
    backgroundColor: '#173A43',
    borderColor: '#47E5BC',
    borderRadius: 12,
    borderWidth: 1,
    color: '#D9FFF5',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 16,
    padding: 14,
  },
  settingsCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 20,
    padding: 18,
  },
  cardTitle: { color: '#F5F8FB', fontSize: 19, fontWeight: '900', lineHeight: 27 },
  body: { color: '#C8D4E0', fontSize: 15, lineHeight: 23 },
  input: {
    backgroundColor: '#07111F',
    borderColor: '#31516F',
    borderRadius: 10,
    borderWidth: 1,
    color: '#F5F8FB',
    fontSize: 16,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  nameHelp: { color: '#9FB2C5', fontSize: 12, lineHeight: 18 },
  joinButton: {
    alignItems: 'center',
    backgroundColor: '#F6C857',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  joinButtonText: { color: '#101820', fontSize: 14, fontWeight: '900' },
  leaveButton: {
    alignItems: 'center',
    borderColor: '#FFB4B4',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  leaveButtonText: { color: '#FFB4B4', fontSize: 14, fontWeight: '900' },
  error: { color: '#FFB4B4', fontSize: 14, lineHeight: 21, marginTop: 14 },
  boardHeader: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 28,
  },
  boardTitle: { color: '#F5F8FB', fontSize: 22, fontWeight: '900' },
  boardMeta: { color: '#9FB2C5', fontSize: 12, fontWeight: '700' },
  emptyCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
    padding: 18,
  },
  board: { gap: 10 },
  entry: {
    alignItems: 'center',
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rank: { color: '#F6C857', fontSize: 20, fontWeight: '900', minWidth: 52 },
  entryIdentity: { flex: 1 },
  publicName: { color: '#F5F8FB', fontSize: 17, fontWeight: '900' },
  completed: { color: '#69F0CB', fontSize: 13, fontWeight: '800', marginTop: 3 },
  pressed: { opacity: 0.7 },
});
