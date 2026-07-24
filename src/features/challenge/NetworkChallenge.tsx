import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { subnetFacts } from '@/domain/subnet';

import { networkChallenges } from './challenges';

export function NetworkChallenge() {
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [octets, setOctets] = useState(['', '', '', '']);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState(false);
  const challenge = networkChallenges[challengeIndex];
  const facts = useMemo(
    () => subnetFacts(challenge.ip, challenge.prefix),
    [challenge.ip, challenge.prefix],
  );
  const answer = octets.join('.');
  const isComplete = octets.every(Boolean);
  const isFinalChallenge = challengeIndex === networkChallenges.length - 1;
  const interestingOctetIndex = facts.interestingOctet - 1;
  const targetOctet = challenge.ip.split('.')[interestingOctetIndex];
  const networkOctet = facts.network.split('.')[interestingOctetIndex];
  const broadcastOctet = facts.broadcast.split('.')[interestingOctetIndex];
  const boundaryCount = 256 / facts.blockSize;
  const visibleBoundaryCount = Math.min(4, boundaryCount);
  const networkBoundaryIndex = Number(networkOctet) / facts.blockSize;
  const firstVisibleBoundary = Math.min(
    Math.max(0, networkBoundaryIndex - 2),
    boundaryCount - visibleBoundaryCount,
  );
  const boundaries = Array.from(
    { length: visibleBoundaryCount },
    (_, index) => (firstVisibleBoundary + index) * facts.blockSize,
  ).join(', ');
  const correctFeedback =
    `Correct — ${targetOctet} lands in the ${networkOctet}–${broadcastOctet} block.`;
  const successDetail =
    `A /${challenge.prefix} moves in blocks of ${facts.blockSize}: ${boundaries}. ` +
    `The target sits in the block beginning at ${networkOctet}.`;
  const retryFeedback =
    `Not quite — /${challenge.prefix} moves in blocks of ${facts.blockSize}. ` +
    `Find the boundary just below ${targetOctet}.`;

  function updateOctet(index: number, value: string) {
    const numeric = value.replace(/\D/g, '').slice(0, 3);
    const next = [...octets];
    next[index] = numeric === '' ? '' : String(Math.min(255, Number(numeric)));
    setOctets(next);
    setFeedback(null);
  }

  function checkAnswer() {
    const correct = answer === challenge.answer;
    setIsCorrect(correct);
    setFeedback(correct ? correctFeedback : retryFeedback);
  }

  function advanceChallenge() {
    setChallengeIndex((current) =>
      current === networkChallenges.length - 1 ? 0 : current + 1,
    );
    setOctets(['', '', '', '']);
    setFeedback(null);
    setIsCorrect(false);
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
          <Text style={styles.eyebrow}>MISSION 01 · NETWORK BOUNDARIES</Text>
          <Text style={styles.progress}>{challengeIndex + 1} / {networkChallenges.length}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${((challengeIndex + 1) / networkChallenges.length) * 100}%` },
            ]}
          />
        </View>

        <Text style={styles.title}>Find the network.</Text>
        <Text style={styles.prompt}>What is the network address?</Text>

        <View style={styles.targetCard}>
          <Text style={styles.targetLabel}>TARGET IP</Text>
          <Text style={styles.target}>{challenge.ip} /{challenge.prefix}</Text>
          <View style={styles.rule} />
          <View style={styles.factRow}>
            <View>
              <Text style={styles.factLabel}>MASK</Text>
              <Text style={styles.factValue}>{facts.mask}</Text>
            </View>
            <View style={styles.factRight}>
              <Text style={styles.factLabel}>BLOCK SIZE</Text>
              <Text style={styles.factValue}>{facts.blockSize}</Text>
            </View>
          </View>
        </View>

        <Text style={styles.answerLabel}>YOUR NETWORK ADDRESS</Text>
        <View style={styles.octetRow}>
          {octets.map((octet, index) => (
            <View key={index} style={styles.octetGroup}>
              <TextInput
                accessibilityLabel={`Answer octet ${index + 1}`}
                keyboardType="number-pad"
                maxLength={3}
                onChangeText={(value) => updateOctet(index, value)}
                placeholder="000"
                placeholderTextColor="#506579"
                selectTextOnFocus
                style={styles.octetInput}
                value={octet}
              />
              {index < 3 && <Text style={styles.dot}>.</Text>}
            </View>
          ))}
        </View>

        {feedback && (
          <View
            accessibilityLiveRegion="polite"
            style={[styles.feedbackCard, isCorrect ? styles.successCard : styles.retryCard]}>
            <Text style={isCorrect ? styles.successTitle : styles.retryTitle}>
              {isCorrect ? '✓ Network found' : 'Try that boundary again'}
            </Text>
            <Text style={isCorrect ? styles.successText : styles.retryText}>{feedback}</Text>
            {isCorrect && <Text style={styles.successDetail}>{successDetail}</Text>}
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
          accessibilityLabel={
            isCorrect
              ? isFinalChallenge
                ? 'Restart mission'
                : 'Next challenge'
              : 'Check answer'
          }
          disabled={!isCorrect && !isComplete}
          onPress={isCorrect ? advanceChallenge : checkAnswer}
          style={({ pressed }) => [
            styles.button,
            !isCorrect && !isComplete && styles.buttonDisabled,
            pressed && (isCorrect || isComplete) && styles.buttonPressed,
          ]}>
          <Text style={styles.buttonText}>
            {isCorrect
              ? isFinalChallenge
                ? 'RESTART MISSION'
                : 'NEXT CHALLENGE'
              : 'CHECK ANSWER'}
          </Text>
          <Text style={styles.buttonArrow}>→</Text>
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
  progressFill: { backgroundColor: '#47E5BC', borderRadius: 4, height: 4, width: '20%' },
  title: { color: '#F5F8FC', fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: 32 },
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
  factRight: { alignItems: 'flex-end' },
  factLabel: { color: '#6F8499', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  factValue: { color: '#C8D4E0', fontSize: 14, fontVariant: ['tabular-nums'], fontWeight: '700', marginTop: 5 },
  answerLabel: { color: '#7E91A6', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginTop: 26 },
  octetRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  octetGroup: { alignItems: 'center', flexDirection: 'row', flex: 1 },
  octetInput: {
    backgroundColor: '#0C1B2C',
    borderColor: '#29445F',
    borderRadius: 13,
    borderWidth: 1,
    color: '#F8FAFC',
    flex: 1,
    fontSize: 19,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minHeight: 56,
    paddingHorizontal: 4,
    textAlign: 'center',
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
  button: { alignItems: 'center', backgroundColor: '#F6C857', borderRadius: 16, flexDirection: 'row', justifyContent: 'center', marginTop: 24, minHeight: 58 },
  buttonDisabled: { opacity: 0.38 },
  buttonPressed: { transform: [{ scale: 0.985 }] },
  buttonText: { color: '#101820', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  buttonArrow: { color: '#101820', fontSize: 22, fontWeight: '700', marginLeft: 10, marginTop: -2 },
});
