import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type {
  RankedCompetitionGateway,
  RankedLeaderboardEntry,
} from '@/competition/supabaseCompetitionGateway';

export type GlobalTimedLeaderboardProps = Readonly<{
  gateway: RankedCompetitionGateway;
  userId: string;
}>;

export function GlobalTimedLeaderboard({
  gateway,
  userId,
}: GlobalTimedLeaderboardProps) {
  const [entries, setEntries] = useState<readonly RankedLeaderboardEntry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [reloadKey, setReloadKey] = useState(0);
  const loading = status === 'loading';
  const failed = status === 'failed';

  useEffect(() => {
    let active = true;
    void gateway.getLeaderboard(userId).then(
      (nextEntries) => {
        if (!active) return;
        setEntries(nextEntries);
        setStatus('ready');
      },
      () => {
        if (!active) return;
        setStatus('failed');
      },
    );
    return () => {
      active = false;
    };
  }, [gateway, reloadKey, userId]);

  const reload = () => {
    setStatus('loading');
    setReloadKey((current) => current + 1);
  };

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>Global Timed Scoreboard</Text>
      <Text style={styles.notice}>
        Signed-in daily ranked results. Scores and timing are verified by the server; only generated Subnetter aliases are shown.
      </Text>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.cardTitle}>TODAY&apos;S TOP 50</Text>
          <Pressable
            accessibilityLabel={failed ? 'Retry global timed scoreboard' : 'Refresh global timed scoreboard'}
            accessibilityRole="button"
            disabled={loading}
            onPress={reload}
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            <Text style={styles.refreshText}>{failed ? 'Retry' : 'Refresh'}</Text>
          </Pressable>
        </View>
        {loading ? (
          <ActivityIndicator
            accessibilityLabel="Loading global timed scoreboard"
            accessibilityRole="progressbar"
            color="#F6C857"
          />
        ) : null}
        {!loading && failed ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            The global timed scoreboard could not be loaded. Try again.
          </Text>
        ) : null}
        {!loading && !failed && entries.length === 0 ? (
          <Text style={styles.emptyText}>No completed ranked attempts yet today.</Text>
        ) : null}
        {!loading && !failed ? entries.map((entry) => (
          <View
            key={`${entry.rank}-${entry.alias}`}
            style={[styles.row, entry.isCurrentUser && styles.currentUserRow]}>
            <Text style={styles.rank}>#{entry.rank}</Text>
            <Text numberOfLines={1} style={styles.alias}>
              {entry.isCurrentUser ? `${entry.alias} (You)` : entry.alias}
            </Text>
            <Text style={styles.score}>{entry.score}</Text>
            <Text style={styles.elapsed}>{entry.elapsedSeconds}s</Text>
          </View>
        )) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14, marginTop: 28 },
  title: { color: '#F5F8FB', fontSize: 30, fontWeight: '900', lineHeight: 38 },
  notice: {
    backgroundColor: '#172554',
    borderColor: '#818CF8',
    borderRadius: 12,
    borderWidth: 1,
    color: '#E0E7FF',
    fontSize: 15,
    lineHeight: 23,
    padding: 16,
  },
  card: {
    backgroundColor: '#111C2D',
    borderColor: '#334155',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: '#F5F8FB', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  refreshButton: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  refreshText: { color: '#F6C857', fontSize: 14, fontWeight: '800' },
  emptyText: { color: '#94A3B8', fontSize: 14, lineHeight: 21 },
  errorText: { color: '#FFB4B4', fontSize: 14, lineHeight: 21 },
  row: {
    alignItems: 'center',
    borderTopColor: '#334155',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 42,
    paddingTop: 9,
  },
  currentUserRow: { backgroundColor: '#1E293B' },
  rank: { color: '#F6C857', fontSize: 14, fontWeight: '900', width: 34 },
  alias: { color: '#E2E8F0', flex: 1, fontSize: 14, fontWeight: '700' },
  score: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', textAlign: 'right', width: 44 },
  elapsed: { color: '#94A3B8', fontSize: 13, textAlign: 'right', width: 38 },
  pressed: { opacity: 0.7 },
});
