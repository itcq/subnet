import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import {
  buildLocalBadgeShareMessage,
  calculateAchievementSummary,
  LOCAL_RANKS,
  type LocalTimedResult,
} from '@/domain/achievements/achievements';

export function LocalAchievements({ results }: { results: readonly LocalTimedResult[] }) {
  const summary = useMemo(() => calculateAchievementSummary(results), [results]);
  const [shareError, setShareError] = useState<string | null>(null);
  const rankIndex = LOCAL_RANKS.findIndex(({ id }) => id === summary.rank.id);
  const nextRank = LOCAL_RANKS[rankIndex + 1];
  const progressMaximum = nextRank?.minimumScore ?? Math.max(summary.totalScore, summary.rank.minimumScore, 1);
  const progressNow = Math.min(summary.totalScore, progressMaximum);

  async function shareBadge(badgeId: string, badgeName: string) {
    setShareError(null);
    try {
      await Share.share({
        message: buildLocalBadgeShareMessage(summary, badgeId),
        title: `${badgeName} — Subnet Game`,
      });
    } catch {
      setShareError('The share sheet could not be opened. Your badge is still available here.');
    }
  }

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Local Rank & Badges
      </Text>
      <Text style={styles.notice}>
        This practice profile is stored locally. It is not a public leaderboard or a server-verified credential.
      </Text>

      <View style={styles.rankCard}>
        <Text style={styles.eyebrow}>CURRENT LOCAL RANK</Text>
        <Text style={styles.rankName}>{summary.rank.name}</Text>
        <Text style={styles.points}>{summary.totalScore.toLocaleString('en-US')} local points</Text>
        <View
          accessible
          accessibilityLabel={
            nextRank === undefined
              ? `Rank progress complete at ${summary.totalScore} local points`
              : `Rank progress ${summary.totalScore} of ${nextRank.minimumScore} local points toward ${nextRank.name}`
          }
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: progressMaximum, now: progressNow }}
          style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${progressMaximum === 0 ? 0 : (progressNow / progressMaximum) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.nextRank}>
          {nextRank === undefined
            ? 'Highest local practice rank reached.'
            : `${Math.max(0, nextRank.minimumScore - summary.totalScore).toLocaleString('en-US')} points to ${nextRank.name}`}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Earned badges</Text>
      {summary.badges.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No timed badges yet</Text>
          <Text style={styles.bodyText}>Complete an optional timed challenge to earn your first local badge.</Text>
        </View>
      ) : (
        summary.badges.map((badge) => (
          <View key={badge.id} style={styles.badgeCard}>
            <View style={styles.badgeIcon}>
              <Text style={styles.badgeIconText}>◆</Text>
            </View>
            <View style={styles.badgeContent}>
              <Text style={styles.badgeName}>{badge.name}</Text>
              <Text style={styles.bodyText}>{badge.description}</Text>
              <Text style={styles.verificationLabel}>LOCAL PRACTICE ACHIEVEMENT</Text>
              <Pressable
                accessibilityLabel={`Share ${badge.name} badge`}
                accessibilityRole="button"
                onPress={() => void shareBadge(badge.id, badge.name)}
                style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
                <Text style={styles.shareButtonText}>SHARE BADGE</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}
      {shareError !== null && (
        <Text accessibilityLiveRegion="assertive" style={styles.shareError}>
          {shareError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  title: { color: '#F5F8FB', fontSize: 30, fontWeight: '900', lineHeight: 38 },
  notice: {
    backgroundColor: '#173A43',
    borderColor: '#47E5BC',
    borderRadius: 12,
    borderWidth: 1,
    color: '#D9FFF5',
    fontSize: 15,
    lineHeight: 23,
    padding: 16,
  },
  rankCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#F6C857',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
    padding: 20,
  },
  eyebrow: { color: '#F6C857', fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
  rankName: { color: '#F5F8FB', fontSize: 28, fontWeight: '900', lineHeight: 36, marginTop: 6 },
  points: { color: '#69F0CB', fontSize: 16, fontWeight: '800', lineHeight: 24 },
  progressTrack: {
    backgroundColor: '#23364A',
    borderRadius: 999,
    height: 10,
    marginTop: 18,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: '#F6C857', borderRadius: 999, height: '100%' },
  nextRank: { color: '#AFC2D3', fontSize: 13, lineHeight: 20, marginTop: 8 },
  sectionTitle: { color: '#F5F8FB', fontSize: 22, fontWeight: '900', lineHeight: 30, marginTop: 10 },
  emptyCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  emptyTitle: { color: '#F5F8FB', fontSize: 18, fontWeight: '800' },
  badgeCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    padding: 18,
  },
  badgeIcon: {
    alignItems: 'center',
    backgroundColor: '#173A43',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  badgeIconText: { color: '#F6C857', fontSize: 24 },
  badgeContent: { flex: 1, gap: 7 },
  badgeName: { color: '#F5F8FB', fontSize: 18, fontWeight: '900', lineHeight: 25 },
  bodyText: { color: '#C8D4E0', fontSize: 15, lineHeight: 23 },
  verificationLabel: { color: '#69F0CB', fontSize: 11, fontWeight: '900', letterSpacing: 0.8 },
  shareButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#F6C857',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  shareButtonText: { color: '#F6C857', fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.72 },
  shareError: { color: '#FFB4B4', fontSize: 14, lineHeight: 21 },
});
