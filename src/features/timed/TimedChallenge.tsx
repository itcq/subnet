import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { LocalTimedResult } from '@/domain/achievements/achievements';
import {
  availableTimedScore,
  completeTimedAttempt,
  createTimedAttempt,
  DEFAULT_TIMED_ATTEMPT_RULES,
  recordTimedFailure,
  remainingTimedSeconds,
  revealTimedHint,
  tickTimedAttempt,
  type TimedAttemptState,
} from '@/domain/gameplay/timedAttempt';
import type { SubnetQuestion } from '@/domain/questions/types';
import { subnetFacts } from '@/domain/subnet';

export type TimedChallengeProps = Readonly<{
  question: SubnetQuestion;
  onCompleted?: (result: LocalTimedResult) => void;
  createResultId?: () => string;
  durationSeconds?: number;
  nowMilliseconds?: () => number;
}>;

function formatSeconds(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function monotonicNowMilliseconds(): number {
  return performance.now();
}

function createDefaultResultId(): string {
  return `local-timed-${Date.now()}`;
}

function normalizeOctet(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 3);
  if (digits.length === 0) {
    return '';
  }
  return String(Math.min(255, Number(digits)));
}

export function TimedChallenge({
  question,
  onCompleted,
  createResultId = createDefaultResultId,
  durationSeconds = DEFAULT_TIMED_ATTEMPT_RULES.durationSeconds,
  nowMilliseconds = monotonicNowMilliseconds,
}: TimedChallengeProps) {
  const rules = useMemo(
    () => ({ ...DEFAULT_TIMED_ATTEMPT_RULES, durationSeconds }),
    [durationSeconds],
  );
  const [attempt, setAttempt] = useState<TimedAttemptState>(() => createTimedAttempt(rules));
  const [answerOctets, setAnswerOctets] = useState<readonly string[]>(['', '', '', '']);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [continuedUntimed, setContinuedUntimed] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [practiceHintIds, setPracticeHintIds] = useState<readonly ('mask' | 'block-size')[]>([]);
  const completionReportedRef = useRef(false);
  const foregroundClockRef = useRef<{
    accumulatedMilliseconds: number;
    activeSinceMilliseconds: number | null;
  }>({
    accumulatedMilliseconds: 0,
    activeSinceMilliseconds: null,
  });
  const [timerIsForeground, setTimerIsForeground] = useState(
    () => AppState.currentState === 'active',
  );
  const syncAttemptToTimestamp = useCallback(
    (current: TimedAttemptState, timestampMilliseconds: number): TimedAttemptState => {
      const clock = foregroundClockRef.current;
      const activeMilliseconds =
        clock.activeSinceMilliseconds === null
          ? 0
          : Math.max(0, timestampMilliseconds - clock.activeSinceMilliseconds);
      const elapsedSeconds = Math.floor(
        (clock.accumulatedMilliseconds + activeMilliseconds) / 1000,
      );
      return tickTimedAttempt(current, Math.max(0, elapsedSeconds - current.elapsedSeconds));
    },
    [],
  );
  const facts = useMemo(() => subnetFacts(question.ip, question.prefix), [question.ip, question.prefix]);

  useEffect(() => {
    const clock = foregroundClockRef.current;
    if (timerIsForeground && clock.activeSinceMilliseconds === null) {
      clock.activeSinceMilliseconds = nowMilliseconds();
    }

    const subscription = AppState.addEventListener('change', (state) => {
      const timestampMilliseconds = nowMilliseconds();
      const nextIsForeground = state === 'active';
      const clock = foregroundClockRef.current;

      if (!nextIsForeground && clock.activeSinceMilliseconds !== null) {
        clock.accumulatedMilliseconds += Math.max(
          0,
          timestampMilliseconds - clock.activeSinceMilliseconds,
        );
        clock.activeSinceMilliseconds = null;
        setAttempt((current) => syncAttemptToTimestamp(current, timestampMilliseconds));
      } else if (nextIsForeground && clock.activeSinceMilliseconds === null) {
        clock.activeSinceMilliseconds = timestampMilliseconds;
      }
      setTimerIsForeground(nextIsForeground);
    });
    return () => subscription.remove();
  }, [nowMilliseconds, syncAttemptToTimestamp, timerIsForeground]);

  useEffect(() => {
    if (attempt.status !== 'active' || !timerIsForeground) {
      return;
    }
    const interval = setInterval(() => {
      setAttempt((current) => syncAttemptToTimestamp(current, nowMilliseconds()));
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt.status, nowMilliseconds, syncAttemptToTimestamp, timerIsForeground]);

  const remaining = remainingTimedSeconds(attempt);
  const availableScore = availableTimedScore(attempt);
  const answerComplete = answerOctets.every((octet) => octet.length > 0);
  const hintsUnlocked =
    continuedUntimed || attempt.failureCount >= attempt.rules.failuresBeforeHints;
  const maskRevealed =
    attempt.revealedHintIds.includes('mask') || practiceHintIds.includes('mask');
  const blockSizeRevealed =
    attempt.revealedHintIds.includes('block-size') || practiceHintIds.includes('block-size');
  const answerEditable = attempt.status === 'active' || (continuedUntimed && !practiceComplete);

  function updateOctet(index: number, value: string) {
    if (!answerEditable) {
      return;
    }
    const next = [...answerOctets];
    next[index] = normalizeOctet(value);
    setAnswerOctets(next);
    setFeedback(null);
  }

  function checkAnswer() {
    if (!answerEditable || !answerComplete) {
      return;
    }

    if (continuedUntimed) {
      if (answerOctets.join('.') !== question.answer) {
        setFeedback('Not yet. Try another subnet boundary or reveal a hint.');
        return;
      }
      setPracticeComplete(true);
      setFeedback('Untimed practice complete — no timed score recorded.');
      return;
    }

    const synchronizedAttempt = syncAttemptToTimestamp(attempt, nowMilliseconds());
    if (synchronizedAttempt.status !== 'active') {
      setAttempt(synchronizedAttempt);
      setFeedback(null);
      return;
    }

    if (answerOctets.join('.') !== question.answer) {
      const failed = recordTimedFailure(synchronizedAttempt);
      setAttempt(failed);
      setFeedback(
        failed.failureCount >= failed.rules.failuresBeforeHints
          ? 'Not yet. Hints are now available. Using one reduces the available score.'
          : `Not yet. ${failed.rules.failuresBeforeHints - failed.failureCount} more incorrect ${failed.rules.failuresBeforeHints - failed.failureCount === 1 ? 'attempt' : 'attempts'} before hints unlock.`,
      );
      return;
    }

    if (completionReportedRef.current) {
      return;
    }
    completionReportedRef.current = true;
    const completed = completeTimedAttempt(synchronizedAttempt);
    setAttempt(completed);
    setFeedback('Timed solve complete');
    onCompleted?.({
      resultId: createResultId(),
      score: completed.score ?? 0,
      elapsedSeconds: completed.elapsedSeconds,
      failureCount: completed.failureCount,
      hintsUsed: completed.revealedHintIds.length,
      timeLimitSeconds: completed.rules.durationSeconds,
    });
  }

  function showHint(id: 'mask' | 'block-size') {
    if (continuedUntimed) {
      setPracticeHintIds((current) => (current.includes(id) ? current : [...current, id]));
      return;
    }
    setAttempt((current) => revealTimedHint(current, id));
  }

  function continueWithoutTimer() {
    setContinuedUntimed(true);
    setFeedback('Continuing without a timer. This practice will not record a timed score.');
  }

  function retry() {
    completionReportedRef.current = false;
    const clock = foregroundClockRef.current;
    clock.accumulatedMilliseconds = 0;
    clock.activeSinceMilliseconds = timerIsForeground ? nowMilliseconds() : null;
    setAttempt(createTimedAttempt(rules));
    setAnswerOctets(['', '', '', '']);
    setFeedback(null);
    setContinuedUntimed(false);
    setPracticeComplete(false);
    setPracticeHintIds([]);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          Timed Challenge
        </Text>
        <Text style={styles.subtitle}>
          Optional {durationSeconds / 60}-minute local practice preset. Type the network address before time runs out.
        </Text>

        <View style={styles.scoreRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>TIME LEFT</Text>
            <Text style={styles.timer}>
              {formatSeconds(remaining)}
            </Text>
          </View>
          <View
            accessibilityLabel={`${availableScore} points available`}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: attempt.rules.basePoints, now: availableScore }}
            style={styles.metricCard}>
            <Text style={styles.metricLabel}>SCORE</Text>
            <Text style={styles.score}>{availableScore.toLocaleString('en-US')} points available</Text>
          </View>
        </View>

        <View style={styles.targetCard}>
          <Text style={styles.targetLabel}>TARGET IP</Text>
          <Text style={styles.target}>
            {question.ip} /{question.prefix}
          </Text>
          {maskRevealed && <Text style={styles.hintValue}>Subnet mask: {facts.mask}</Text>}
          {blockSizeRevealed && <Text style={styles.hintValue}>Block size: {facts.blockSize}</Text>}
        </View>

        <Text style={styles.prompt}>Enter the network address</Text>
        <View style={styles.answerRow}>
          {answerOctets.map((octet, index) => (
            <View key={index} style={styles.octetGroup}>
              <TextInput
                accessibilityLabel={`Timed answer octet ${index + 1}`}
                editable={answerEditable}
                inputMode="numeric"
                maxLength={3}
                onChangeText={(value) => updateOctet(index, value)}
                selectTextOnFocus
                style={styles.octetInput}
                value={octet}
              />
              {index < 3 && <Text style={styles.dot}>.</Text>}
            </View>
          ))}
        </View>

        {attempt.status === 'expired' && !continuedUntimed && (
          <Text accessibilityLiveRegion="assertive" style={styles.expiredText}>
            Time expired
          </Text>
        )}
        {feedback !== null && (
          <Text accessibilityLiveRegion="polite" style={styles.feedback}>
            {feedback}
          </Text>
        )}
        {attempt.status === 'correct' && (
          <Text style={styles.earnedText}>You earned {attempt.score?.toLocaleString('en-US')} points.</Text>
        )}

        {hintsUnlocked && (attempt.status === 'active' || continuedUntimed) && (
          <View style={styles.hintActions}>
            {!maskRevealed && (
              <Pressable
                accessibilityLabel={
                  continuedUntimed
                    ? 'Show subnet mask hint without a score deduction'
                    : `Reveal subnet mask hint for a ${attempt.rules.pointsPerHint} point deduction`
                }
                accessibilityRole="button"
                onPress={() => showHint('mask')}
                style={({ pressed }) => [styles.hintButton, pressed && styles.pressed]}>
                <Text style={styles.hintButtonText}>
                  {continuedUntimed
                    ? 'SHOW SUBNET MASK HINT (NO DEDUCTION)'
                    : `SHOW SUBNET MASK HINT (−${attempt.rules.pointsPerHint})`}
                </Text>
              </Pressable>
            )}
            {!blockSizeRevealed && (
              <Pressable
                accessibilityLabel={
                  continuedUntimed
                    ? 'Show block size hint without a score deduction'
                    : `Reveal block size hint for a ${attempt.rules.pointsPerHint} point deduction`
                }
                accessibilityRole="button"
                onPress={() => showHint('block-size')}
                style={({ pressed }) => [styles.hintButton, pressed && styles.pressed]}>
                <Text style={styles.hintButtonText}>
                  {continuedUntimed
                    ? 'SHOW BLOCK SIZE HINT (NO DEDUCTION)'
                    : `SHOW BLOCK SIZE HINT (−${attempt.rules.pointsPerHint})`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {attempt.status === 'expired' && !continuedUntimed ? (
          <View style={styles.hintActions}>
            <Pressable
              accessibilityLabel="Continue without timer"
              accessibilityRole="button"
              onPress={continueWithoutTimer}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonText}>CONTINUE WITHOUT TIMER</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Retry timed challenge"
              accessibilityRole="button"
              onPress={retry}
              style={({ pressed }) => [styles.hintButton, pressed && styles.pressed]}>
              <Text style={styles.hintButtonText}>RETRY TIMED CHALLENGE</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityLabel={continuedUntimed ? 'Check untimed answer' : 'Check timed answer'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !answerEditable || !answerComplete }}
            disabled={!answerEditable || !answerComplete}
            onPress={checkAnswer}
            style={({ pressed }) => [
              styles.primaryButton,
              (!answerEditable || !answerComplete) && styles.disabled,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.primaryButtonText}>
              {practiceComplete
                ? 'UNTIMED PRACTICE COMPLETE'
                : attempt.status === 'correct'
                  ? 'TIMED SOLVE COMPLETE'
                  : continuedUntimed
                    ? 'CHECK UNTIMED ANSWER'
                    : 'CHECK ANSWER'}
            </Text>
          </Pressable>
        )}
        <Text style={styles.localNotice}>
          Alpha scores, ranks, and badges are kept in this app session and are not server-verified competitive results.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#07111F', flex: 1 },
  content: { alignSelf: 'center', maxWidth: 760, padding: 22, width: '100%' },
  title: { color: '#F5F8FB', fontSize: 30, fontWeight: '900', lineHeight: 38 },
  subtitle: { color: '#AFC2D3', fontSize: 15, lineHeight: 23, marginTop: 8 },
  scoreRow: { flexDirection: 'row', gap: 12, marginTop: 22 },
  metricCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    minHeight: 92,
    padding: 14,
  },
  metricLabel: { color: '#7FA0BC', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  timer: { color: '#F6C857', fontSize: 26, fontWeight: '900', lineHeight: 34, marginTop: 5 },
  score: { color: '#69F0CB', fontSize: 16, fontWeight: '900', lineHeight: 23, marginTop: 5 },
  targetCard: {
    backgroundColor: '#102338',
    borderColor: '#31516F',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 18,
    padding: 20,
  },
  targetLabel: { color: '#7FA0BC', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  target: { color: '#F5F8FB', fontSize: 28, fontWeight: '900', lineHeight: 36, marginTop: 6 },
  hintValue: { color: '#69F0CB', fontSize: 15, fontWeight: '700', lineHeight: 23, marginTop: 8 },
  prompt: { color: '#F5F8FB', fontSize: 18, fontWeight: '800', marginTop: 22 },
  answerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 14 },
  octetGroup: { alignItems: 'center', flexDirection: 'row' },
  octetInput: {
    backgroundColor: '#F5F8FB',
    borderRadius: 10,
    color: '#101820',
    fontSize: 19,
    fontWeight: '800',
    height: 54,
    minWidth: 54,
    paddingHorizontal: 5,
    textAlign: 'center',
  },
  dot: { color: '#AFC2D3', fontSize: 24, fontWeight: '900', marginHorizontal: 3 },
  feedback: { color: '#F6C857', fontSize: 15, lineHeight: 23, marginTop: 16 },
  expiredText: { color: '#FF9B9B', fontSize: 20, fontWeight: '900', marginTop: 18 },
  earnedText: { color: '#69F0CB', fontSize: 18, fontWeight: '900', marginTop: 8 },
  hintActions: { gap: 10, marginTop: 16 },
  hintButton: {
    alignItems: 'center',
    borderColor: '#F6C857',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  hintButtonText: { color: '#F6C857', fontSize: 13, fontWeight: '900', textAlign: 'center' },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F6C857',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 20,
    minHeight: 54,
    paddingHorizontal: 18,
  },
  primaryButtonText: { color: '#101820', fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
  localNotice: { color: '#839AB0', fontSize: 13, lineHeight: 20, marginTop: 16, textAlign: 'center' },
});
