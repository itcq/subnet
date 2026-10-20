import { useCallback, useEffect, useRef, useState } from 'react';
import type { NativeSyntheticEvent, TextInputKeyPressEventData } from 'react-native';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type {
  RankedAttempt,
  RankedCompetitionGateway,
  RankedLeaderboardEntry,
} from '@/competition/supabaseCompetitionGateway';

export type RankedDailyChallengeProps = Readonly<{
  gateway: RankedCompetitionGateway;
  onBack: () => void;
  userId: string;
}>;

const emptyAnswer = ['', '', '', ''] as const;

function normalizeOctet(value: string): string {
  return value.replace(/\D/g, '').slice(0, 3);
}

function secondsUntil(expiresAt: string, nowMilliseconds: number): number {
  const expiresMilliseconds = Date.parse(expiresAt);
  if (!Number.isFinite(expiresMilliseconds)) return 0;
  return Math.max(0, Math.ceil((expiresMilliseconds - nowMilliseconds) / 1000));
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function RankedDailyChallenge({
  gateway,
  onBack,
  userId,
}: RankedDailyChallengeProps) {
  const [attempt, setAttempt] = useState<RankedAttempt | null>(null);
  const [answerOctets, setAnswerOctets] = useState<readonly string[]>(emptyAnswer);
  const [leaderboard, setLeaderboard] = useState<readonly RankedLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [nowMilliseconds, setNowMilliseconds] = useState(0);
  const octetRefs = useRef<(TextInput | null)[]>([]);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    try {
      const entries = await gateway.getLeaderboard(userId);
      setLeaderboard(entries);
    } catch {
      setFeedback('The leaderboard could not be loaded. You can try again.');
    } finally {
      setLeaderboardLoading(false);
    }
  }, [gateway, userId]);

  useEffect(() => {
    let active = true;
    void gateway.getLeaderboard(userId)
      .then((entries) => {
        if (active) setLeaderboard(entries);
      })
      .catch(() => {
        if (active) setFeedback('The leaderboard could not be loaded. You can try again.');
      })
      .finally(() => {
        if (active) setLeaderboardLoading(false);
      });
    return () => {
      active = false;
    };
  }, [gateway, userId]);

  const remainingSeconds = attempt === null
    ? 0
    : secondsUntil(attempt.expiresAt, nowMilliseconds);
  const locallyExpired = attempt?.status === 'active' && remainingSeconds === 0;

  useEffect(() => {
    if (attempt?.status !== 'active' || locallyExpired) return undefined;
    const timer = setInterval(() => setNowMilliseconds(Date.now()), 250);
    return () => clearInterval(timer);
  }, [attempt?.status, locallyExpired]);

  async function startAttempt() {
    setBusy(true);
    setFeedback(null);
    try {
      const nextAttempt = await gateway.startAttempt(userId);
      setNowMilliseconds(Date.now());
      setAttempt(nextAttempt);
      setAnswerOctets(emptyAnswer);
    } catch {
      setFeedback('We could not start the ranked challenge. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function updateOctet(index: number, value: string) {
    const next = [...answerOctets];
    next[index] = normalizeOctet(value);
    setAnswerOctets(next);
    setFeedback(null);
  }

  function handleOctetKeyPress(
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) {
    if (event.nativeEvent.key === '.' && index < 3) {
      octetRefs.current[index + 1]?.focus();
    }
  }

  async function submitAnswer() {
    if (attempt === null || locallyExpired || answerOctets.some((octet) => octet === '')) {
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const result = await gateway.submitAnswer(
        userId,
        attempt.attemptId,
        answerOctets.join('.'),
      );
      setAttempt(result);
      setNowMilliseconds(Date.now());
      if (result.answerCorrect) {
        await loadLeaderboard();
      } else if (result.status === 'expired') {
        setFeedback("Today's ranked attempt has ended.");
      } else {
        setFeedback('Not correct. The server recorded a 100-point deduction; the timer keeps running.');
      }
    } catch {
      setFeedback('Your answer could not be submitted. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  const answerComplete = answerOctets.every((octet) => octet !== '');

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
        <Text style={styles.backButtonText}>‹ Back to timed modes</Text>
      </Pressable>

      <Text accessibilityRole="header" style={styles.title}>Daily Ranked Challenge</Text>
      <Text style={styles.intro}>
        One ranked attempt per UTC day. Everyone receives the same daily subnet question and the server controls the two-minute clock.
      </Text>

      <View style={styles.rulesCard}>
        <Text style={styles.cardTitle}>RANKED SCORING</Text>
        <Text style={styles.rule}>Start with 1,000 points.</Text>
        <Text style={styles.rule}>Lose 5 points for each server-timed second.</Text>
        <Text style={styles.rule}>Each incorrect answer deducts 100 points; 10 incorrect submissions end the attempt.</Text>
        <Text style={styles.rule}>A correct answer is worth at least 100 points.</Text>
        <Text style={styles.rule}>Ties break by elapsed time, then earliest completion.</Text>
        <Text style={styles.rule}>The timer starts immediately and does not pause if you leave the page.</Text>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>What other players see</Text>
        <Text style={styles.privacyText}>
          Rankings use an automatically generated Subnetter alias. Student names and emails are never shown. Your alias, score, elapsed time, and completion time are visible to signed-in players today. Attempts remain in your account export and are removed when you delete your account.
        </Text>
      </View>

      {attempt === null ? (
        <Pressable
          accessibilityLabel="Start today's ranked challenge"
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void startAttempt()}
          style={({ pressed }) => [styles.primaryButton, (pressed || busy) && styles.pressed]}>
          {busy ? <ActivityIndicator color="#07111F" /> : (
            <Text style={styles.primaryButtonText}>START TODAY&apos;S RANKED CHALLENGE</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.challengeCard}>
          <Text style={styles.dateLabel}>DAILY QUESTION · {attempt.challengeDate}</Text>
          <Text style={styles.question}>{attempt.targetIp} /{attempt.prefix}</Text>

          {attempt.status === 'active' && !locallyExpired ? (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.timer}>
                {formatTime(remainingSeconds)}
              </Text>
              <Text style={styles.answerLabel}>NETWORK ADDRESS</Text>
              <View style={styles.octetRow}>
                {answerOctets.map((octet, index) => (
                  <View key={index} style={styles.octetGroup}>
                    <TextInput
                      accessibilityLabel={`Network address octet ${index + 1}`}
                      keyboardType="number-pad"
                      maxLength={3}
                      onChangeText={(value) => updateOctet(index, value)}
                      onKeyPress={(event) => handleOctetKeyPress(index, event)}
                      ref={(input) => {
                        octetRefs.current[index] = input;
                      }}
                      selectTextOnFocus
                      style={styles.octetInput}
                      value={octet}
                    />
                    {index < 3 ? <Text style={styles.period}>.</Text> : null}
                  </View>
                ))}
              </View>
              <Text style={styles.failureCount}>Incorrect answers: {attempt.failureCount}</Text>
              <Pressable
                accessibilityLabel="Submit ranked answer"
                accessibilityRole="button"
                disabled={!answerComplete || busy}
                onPress={() => void submitAnswer()}
                style={({ pressed }) => [
                  styles.submitButton,
                  (!answerComplete || busy) && styles.disabled,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.submitButtonText}>SUBMIT RANKED ANSWER</Text>
              </Pressable>
            </>
          ) : null}

          {attempt.status === 'correct' ? (
            <Text accessibilityLiveRegion="polite" style={styles.success}>
              Ranked score: {attempt.score} · {attempt.elapsedSeconds}s
            </Text>
          ) : null}
          {(attempt.status === 'expired' || locallyExpired) ? (
            <Text accessibilityLiveRegion="polite" style={styles.expired}>
              Today&apos;s ranked attempt has ended. A new challenge opens at 00:00 UTC.
            </Text>
          ) : null}
        </View>
      )}

      {feedback !== null ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>{feedback}</Text>
      ) : null}

      <View style={styles.leaderboardCard}>
        <View style={styles.leaderboardHeader}>
          <Text style={styles.leaderboardTitle}>TODAY&apos;S TOP 50</Text>
          <Pressable accessibilityRole="button" onPress={() => void loadLeaderboard()}>
            <Text style={styles.refreshText}>Refresh</Text>
          </Pressable>
        </View>
        {leaderboardLoading ? <ActivityIndicator color="#F6C857" /> : null}
        {!leaderboardLoading && leaderboard.length === 0 ? (
          <Text style={styles.emptyText}>No completed ranked attempts yet today.</Text>
        ) : null}
        {leaderboard.map((entry) => (
          <View key={`${entry.rank}-${entry.alias}`} style={[
            styles.leaderboardRow,
            entry.isCurrentUser && styles.currentUserRow,
          ]}>
            <Text style={styles.rank}>#{entry.rank}</Text>
            <Text numberOfLines={1} style={styles.alias}>
              {entry.isCurrentUser ? `${entry.alias} (You)` : entry.alias}
            </Text>
            <Text style={styles.score}>{entry.score}</Text>
            <Text style={styles.elapsed}>{entry.elapsedSeconds}s</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { backgroundColor: '#07111F', flexGrow: 1, gap: 16, padding: 20, paddingBottom: 48 },
  backButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  backButtonText: { color: '#F6C857', fontSize: 15, fontWeight: '800' },
  title: { color: '#F5F8FB', fontSize: 30, fontWeight: '900' },
  intro: { color: '#C8D4E0', fontSize: 16, lineHeight: 24 },
  rulesCard: { backgroundColor: '#F1F5F9', borderRadius: 18, gap: 7, padding: 18 },
  cardTitle: { color: '#0F172A', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  rule: { color: '#334155', fontSize: 15, lineHeight: 22 },
  privacyCard: { backgroundColor: '#EEF2FF', borderColor: '#A5B4FC', borderRadius: 16, borderWidth: 1, gap: 5, padding: 16 },
  privacyTitle: { color: '#312E81', fontSize: 16, fontWeight: '900' },
  privacyText: { color: '#3730A3', fontSize: 14, lineHeight: 21 },
  primaryButton: { alignItems: 'center', backgroundColor: '#F6C857', borderRadius: 14, justifyContent: 'center', minHeight: 52, padding: 14 },
  primaryButtonText: { color: '#07111F', fontSize: 14, fontWeight: '900', letterSpacing: 0.4 },
  challengeCard: { backgroundColor: '#FFFFFF', borderRadius: 18, gap: 13, padding: 18 },
  dateLabel: { color: '#64748B', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  question: { color: '#0F172A', fontSize: 27, fontWeight: '900' },
  timer: { color: '#B45309', fontSize: 34, fontVariant: ['tabular-nums'], fontWeight: '900' },
  answerLabel: { color: '#475569', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  octetRow: { alignItems: 'center', flexDirection: 'row', flexWrap: 'nowrap', justifyContent: 'center' },
  octetGroup: { alignItems: 'center', flexDirection: 'row', flexShrink: 1 },
  octetInput: { backgroundColor: '#F8FAFC', borderColor: '#94A3B8', borderRadius: 10, borderWidth: 2, color: '#0F172A', fontSize: 18, fontWeight: '800', maxWidth: 70, minHeight: 50, minWidth: 48, paddingHorizontal: 6, textAlign: 'center' },
  period: { color: '#0F172A', fontSize: 22, fontWeight: '900', marginHorizontal: 3 },
  failureCount: { color: '#64748B', fontSize: 14 },
  submitButton: { alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 14, justifyContent: 'center', minHeight: 50, padding: 13 },
  submitButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  success: { backgroundColor: '#DCFCE7', borderRadius: 12, color: '#166534', fontSize: 17, fontWeight: '900', padding: 14 },
  expired: { backgroundColor: '#FEF3C7', borderRadius: 12, color: '#92400E', fontSize: 15, lineHeight: 22, padding: 14 },
  feedback: { backgroundColor: '#FFF7ED', borderRadius: 12, color: '#9A3412', fontSize: 15, lineHeight: 22, padding: 14 },
  leaderboardCard: { backgroundColor: '#111C2D', borderColor: '#334155', borderRadius: 18, borderWidth: 1, gap: 10, padding: 16 },
  leaderboardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  leaderboardTitle: { color: '#F5F8FB', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  refreshText: { color: '#F6C857', fontSize: 14, fontWeight: '800', padding: 8 },
  emptyText: { color: '#94A3B8', fontSize: 14, lineHeight: 21 },
  leaderboardRow: { alignItems: 'center', borderTopColor: '#334155', borderTopWidth: 1, flexDirection: 'row', gap: 8, minHeight: 42, paddingTop: 9 },
  currentUserRow: { backgroundColor: '#1E293B' },
  rank: { color: '#F6C857', fontSize: 14, fontWeight: '900', width: 34 },
  alias: { color: '#E2E8F0', flex: 1, fontSize: 14, fontWeight: '700' },
  score: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', textAlign: 'right', width: 44 },
  elapsed: { color: '#94A3B8', fontSize: 13, textAlign: 'right', width: 38 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
});
