import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextStyle,
  View,
} from 'react-native';

import { subnetQuestionCatalog } from '@/domain/questions/catalog';
import { getJourneyPosition } from '@/domain/questions/journey';
import type { SubnetQuestion } from '@/domain/questions/types';
import { subnetFacts } from '@/domain/subnet';

import {
  advanceSession,
  createChallengeSession,
  submitCurrentAnswer,
  updateAnswerOctet,
} from './challengeSession';

export type NetworkChallengeProps = {
  readonly questions?: readonly SubnetQuestion[];
  readonly initialCompletedOrdinals?: readonly number[];
  readonly onQuestionCompleted?: (question: SubnetQuestion) => Promise<void> | void;
};

function advanceLabel(ordinal: number): { accessibility: string; visible: string } {
  switch (ordinal) {
    case 100:
      return { accessibility: 'ENTER BUILDER', visible: 'ENTER BUILDER' };
    case 299:
      return { accessibility: 'ENTER ADVANCED', visible: 'ENTER ADVANCED' };
    case 399:
      return { accessibility: 'ENTER MASTERY', visible: 'ENTER MASTERY' };
    default: {
      const journey = getJourneyPosition(ordinal);
      if (
        journey.lesson === journey.lessonsInUnit &&
        journey.challenge === journey.challengesInLesson
      ) {
        const label = `CONTINUE TO UNIT ${journey.unit + 1}`;
        return { accessibility: label, visible: label };
      }
      if (journey.challenge === journey.challengesInLesson) {
        const label = `CONTINUE TO LESSON ${journey.lesson + 1}`;
        return { accessibility: label, visible: label };
      }
      return { accessibility: 'NEXT CHALLENGE', visible: 'NEXT CHALLENGE' };
    }
  }
}

export function NetworkChallenge({
  questions = subnetQuestionCatalog,
  initialCompletedOrdinals = [],
  onQuestionCompleted,
}: NetworkChallengeProps) {
  const catalogIdentity = useMemo(() => JSON.stringify(questions), [questions]);

  return (
    <NetworkChallengeSession
      key={catalogIdentity}
      initialCompletedOrdinals={initialCompletedOrdinals}
      onQuestionCompleted={onQuestionCompleted}
      questions={questions}
    />
  );
}

type NetworkChallengeSessionProps = {
  readonly questions: readonly SubnetQuestion[];
  readonly initialCompletedOrdinals: readonly number[];
  readonly onQuestionCompleted?: (question: SubnetQuestion) => Promise<void> | void;
};

function NetworkChallengeSession({
  questions,
  initialCompletedOrdinals,
  onQuestionCompleted,
}: NetworkChallengeSessionProps) {
  const [session, setSession] = useState(() =>
    createChallengeSession(questions, initialCompletedOrdinals),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const completionInFlightRef = useRef(false);

  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const activeIndex = questions.findIndex(({ ordinal }) => ordinal === session.currentOrdinal);
  const question = questions[activeIndex];
  const facts = useMemo(
    () => subnetFacts(question.ip, question.prefix),
    [question.ip, question.prefix],
  );
  const journey = getJourneyPosition(question.ordinal);
  const isAnswerComplete = session.answerOctets.every(Boolean);
  const revealFacts = session.feedback !== null;
  const showMask = revealFacts || question.hints.showMaskBeforeAnswer;
  const showBlockSize = revealFacts || question.hints.showBlockSizeBeforeAnswer;
  const interestingIndex = facts.interestingOctet - 1;
  const targetOctet = question.ip.split('.')[interestingIndex];
  const networkOctet = facts.network.split('.')[interestingIndex];
  const broadcastOctet = facts.broadcast.split('.')[interestingIndex];
  const instruction =
    `Mask ${facts.mask} gives a block size of ${facts.blockSize}. ` +
    `Network ${facts.network}; broadcast ${facts.broadcast}. ` +
    `${targetOctet} falls in the ${networkOctet}–${broadcastOctet} block of the interesting octet.`;
  const nextLabel = advanceLabel(question.ordinal);
  const actionLabel = session.curriculumComplete
    ? { accessibility: 'JOURNEY COMPLETE', visible: 'JOURNEY COMPLETE' }
    : session.feedback === 'correct'
      ? nextLabel
      : isSaving
        ? { accessibility: 'Saving completion', visible: 'SAVING COMPLETION' }
        : { accessibility: 'Check answer', visible: 'CHECK ANSWER' };
  const actionDisabled =
    session.curriculumComplete || isSaving || (session.feedback !== 'correct' && !isAnswerComplete);

  function updateOctet(index: number, value: string) {
    if (isSaving || session.curriculumComplete) {
      return;
    }
    setSession((current) => updateAnswerOctet(current, index, value));
    setSaveError(null);
  }

  async function checkAnswer() {
    if (completionInFlightRef.current) {
      return;
    }

    const submitted = submitCurrentAnswer(session, questions);
    if (submitted.feedback === 'incorrect') {
      setSession(submitted);
      setSaveError(null);
      return;
    }

    completionInFlightRef.current = true;
    setIsSaving(true);
    setSaveError(null);
    try {
      await onQuestionCompleted?.(question);
      if (mountedRef.current) {
        setSession(submitted);
      }
    } catch {
      if (mountedRef.current) {
        setSaveError('We could not save your progress. Your answer is still here—try again.');
      }
    } finally {
      completionInFlightRef.current = false;
      if (mountedRef.current) {
        setIsSaving(false);
      }
    }
  }

  function advance() {
    setSession((current) => advanceSession(current, questions));
    setSaveError(null);
  }

  function pressAction() {
    if (session.feedback === 'correct') {
      advance();
      return;
    }
    void checkAnswer();
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.progressRow}>
          <Text style={styles.eyebrow}>
            {journey.stage.toUpperCase()} · UNIT {journey.unit}
          </Text>
          <Text style={styles.progress}>
            Lesson {journey.lesson} · Challenge {journey.challenge} of {journey.challengesInLesson}
          </Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            accessibilityLabel={`Lesson progress ${journey.challenge} of ${journey.challengesInLesson}`}
            style={[
              styles.progressFill,
              { width: `${(journey.challenge / journey.challengesInLesson) * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.title}>Find the network.</Text>
        <Text style={styles.prompt}>What is the network address?</Text>

        <View style={styles.targetCard}>
          <Text style={styles.targetLabel}>TARGET IP</Text>
          <Text style={styles.target}>{question.ip} /{question.prefix}</Text>
          {(showMask || showBlockSize) && <View style={styles.rule} />}
          {(showMask || showBlockSize) && (
            <View style={styles.factRow}>
              {showMask && (
                <View>
                  <Text style={styles.factLabel}>MASK</Text>
                  <Text style={styles.factValue}>{facts.mask}</Text>
                </View>
              )}
              {showBlockSize && (
                <View style={styles.factRight}>
                  <Text style={styles.factLabel}>BLOCK SIZE</Text>
                  <Text style={styles.factValue}>{facts.blockSize}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        <Text style={styles.answerLabel}>YOUR NETWORK ADDRESS</Text>
        <View style={styles.octetRow}>
          {session.answerOctets.map((octet, index) => (
            <View key={index} style={styles.octetGroup}>
              <TextInput
                accessibilityLabel={`Answer octet ${index + 1}`}
                editable={
                  !isSaving &&
                  !session.curriculumComplete &&
                  session.feedback !== 'correct'
                }
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(value) => updateOctet(index, value)}
                placeholder="000"
                placeholderTextColor="#506579"
                style={styles.octetInput}
                value={octet}
              />
              {index < 3 && <Text style={styles.dot}>.</Text>}
            </View>
          ))}
        </View>

        {session.feedback && (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.feedbackCard,
              session.feedback === 'correct' ? styles.successCard : styles.retryCard,
            ]}>
            <Text
              style={session.feedback === 'correct' ? styles.successTitle : styles.retryTitle}>
              {session.feedback === 'correct' ? '✓ Network found' : 'Try that boundary again'}
            </Text>
            <Text
              style={session.feedback === 'correct' ? styles.successText : styles.retryText}>
              {session.feedback === 'correct'
                ? `Correct — ${question.answer} is the network address.`
                : `Not quite — ${session.answerOctets.join('.')} is not this network address.`}
            </Text>
            <Text style={styles.successDetail}>{instruction}</Text>
          </View>
        )}

        {saveError && (
          <Text accessibilityLiveRegion="polite" style={styles.saveError}>{saveError}</Text>
        )}

        {session.curriculumComplete && (
          <View accessibilityLiveRegion="polite" style={styles.completionCard}>
            <Text style={styles.completionTitle}>Journey complete</Text>
            <Text style={styles.completionText}>
              You completed every stage in this subnetting journey.
            </Text>
          </View>
        )}

        <View style={styles.tipCard}>
          <Text style={styles.tipBadge}>TIP</Text>
          <Text style={styles.tipText}>
            Divide the interesting octet by the block size, then round down to the nearest boundary.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel.accessibility}
          disabled={actionDisabled}
          onPress={pressAction}
          style={({ pressed }) => [
            styles.button,
            actionDisabled && styles.buttonDisabled,
            pressed && !actionDisabled && styles.buttonPressed,
          ]}>
          <Text style={styles.buttonText}>{actionLabel.visible}</Text>
          {!session.curriculumComplete && <Text style={styles.buttonArrow}>→</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07111F' },
  content: { flexGrow: 1, paddingHorizontal: 22, paddingBottom: 32, paddingTop: 18 },
  progressRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  eyebrow: { color: '#47E5BC', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  progress: { color: '#7F91A5', fontSize: 12, fontWeight: '800' },
  progressTrack: { backgroundColor: '#162639', borderRadius: 4, height: 4, marginTop: 12 },
  progressFill: { backgroundColor: '#47E5BC', borderRadius: 4, height: 4 },
  title: { color: '#F5F8FC', fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: 24 },
  prompt: { color: '#9BACBE', fontSize: 17, marginTop: 7 },
  targetCard: {
    backgroundColor: '#102338',
    borderColor: '#1D3B55',
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 24,
    padding: 22,
  },
  targetLabel: { color: '#6F8499', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  target: {
    color: '#FFFFFF',
    fontSize: 27,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    marginTop: 9,
  },
  rule: { backgroundColor: '#1D3B55', height: 1, marginVertical: 18 },
  factRow: { flexDirection: 'row', justifyContent: 'space-between' },
  factRight: { alignItems: 'flex-end', marginLeft: 'auto' },
  factLabel: { color: '#6F8499', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  factValue: { color: '#C8D4E0', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '700', marginTop: 5 },
  answerLabel: { color: '#7E91A6', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 26 },
  octetRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  octetGroup: { alignItems: 'center', flexDirection: 'row', flex: 1, minWidth: 0 },
  octetInput: {
    backgroundColor: '#0C1B2C',
    borderColor: '#29445F',
    borderRadius: 13,
    borderWidth: 1,
    color: '#F8FAFC',
    flex: 1,
    flexBasis: 0,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minHeight: 56,
    minWidth: 0,
    paddingHorizontal: 4,
    textAlign: 'center',
    ...({
      WebkitTextFillColor: '#F8FAFC',
      caretColor: '#F6C857',
    } as unknown as TextStyle),
  },
  dot: { color: '#61778B', fontSize: 24, fontWeight: '900', marginHorizontal: 4 },
  tipCard: { alignItems: 'flex-start', flexDirection: 'row', gap: 11, marginTop: 20 },
  tipBadge: { backgroundColor: '#243448', borderRadius: 6, color: '#F7C95C', fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 4 },
  tipText: { color: '#8497AA', flex: 1, fontSize: 13, lineHeight: 19 },
  feedbackCard: { borderRadius: 16, borderWidth: 1, marginTop: 18, padding: 16 },
  successCard: { backgroundColor: '#0E302F', borderColor: '#1D5A50' },
  retryCard: { backgroundColor: '#302817', borderColor: '#6B5726' },
  successTitle: { color: '#64E9C2', fontSize: 15, fontWeight: '900' },
  retryTitle: { color: '#F6C857', fontSize: 15, fontWeight: '900' },
  successText: { color: '#E8FFF8', fontSize: 14, fontWeight: '700', marginTop: 6 },
  retryText: { color: '#FFF5D6', fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: 6 },
  successDetail: { color: '#9CC8BB', fontSize: 13, lineHeight: 19, marginTop: 8 },
  saveError: { color: '#FFD98A', fontSize: 13, lineHeight: 19, marginTop: 14 },
  completionCard: { backgroundColor: '#102F45', borderColor: '#285A78', borderRadius: 16, borderWidth: 1, marginTop: 18, padding: 16 },
  completionTitle: { color: '#64E9C2', fontSize: 17, fontWeight: '900' },
  completionText: { color: '#C8D4E0', fontSize: 13, lineHeight: 19, marginTop: 6 },
  button: { alignItems: 'center', backgroundColor: '#F6C857', borderRadius: 16, flexDirection: 'row', justifyContent: 'center', marginTop: 24, minHeight: 58 },
  buttonDisabled: { opacity: 0.38 },
  buttonPressed: { transform: [{ scale: 0.985 }] },
  buttonText: { color: '#101820', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  buttonArrow: { color: '#101820', fontSize: 22, fontWeight: '700', marginLeft: 10, marginTop: -2 },
});
