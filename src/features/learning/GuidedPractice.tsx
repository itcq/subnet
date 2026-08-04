import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  classifyPracticeAnswer,
  GUIDED_PRACTICE_SCENARIOS,
  type PracticeFeedback,
} from './guidedPracticeModel';

type GuidedPracticeProps = {
  readonly onBack: () => void;
  readonly scrollToTop?: (options: { animated: boolean; y: number }) => void;
};

function sanitizeOctet(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 3);
  if (digits === '') {
    return '';
  }

  return String(Math.min(255, Number(digits)));
}

export function GuidedPractice({ onBack, scrollToTop }: GuidedPracticeProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [answerOctets, setAnswerOctets] = useState(['', '', '', '']);
  const [feedback, setFeedback] = useState<PracticeFeedback | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [hintExpanded, setHintExpanded] = useState(false);
  const scenario = GUIDED_PRACTICE_SCENARIOS[scenarioIndex];
  const answerComplete = answerOctets.every((octet) => octet.length > 0);
  const solved = feedback?.correct === true;
  const transferComplete = solved && scenarioIndex === GUIDED_PRACTICE_SCENARIOS.length - 1;

  useEffect(() => {
    if (Platform.OS !== 'ios' || feedback === null) {
      return;
    }

    if (!feedback.correct) {
      AccessibilityInfo.announceForAccessibility(`Try that boundary again. ${feedback.message}`);
      return;
    }

    const prefix = transferComplete ? 'Transfer complete.' : 'Boundary found.';
    AccessibilityInfo.announceForAccessibility(
      `${prefix} ${feedback.message} Network address: ${scenario.facts.network}.`,
    );
  }, [feedback, scenario.facts.network, transferComplete]);

  function updateOctet(index: number, value: string) {
    setAnswerOctets((current) => current.map((octet, currentIndex) => (
      currentIndex === index ? sanitizeOctet(value) : octet
    )));
    setFeedback(null);
  }

  function submit() {
    if (!answerComplete) {
      return;
    }
    const nextFeedback = classifyPracticeAnswer(scenario, answerOctets.join('.'));
    setFeedback(nextFeedback);
    if (!nextFeedback.correct) {
      setAttempts((current) => current + 1);
    }
  }

  function resetScroll() {
    const options = { animated: false, y: 0 };
    if (scrollToTop !== undefined) {
      scrollToTop(options);
      return;
    }
    scrollRef.current?.scrollTo(options);
  }

  function advance() {
    setScenarioIndex((current) => Math.min(current + 1, GUIDED_PRACTICE_SCENARIOS.length - 1));
    setAnswerOctets(['', '', '', '']);
    setFeedback(null);
    setAttempts(0);
    setHintExpanded(false);
    resetScroll();
  }

  function replay() {
    setScenarioIndex(0);
    setAnswerOctets(['', '', '', '']);
    setFeedback(null);
    setAttempts(0);
    setHintExpanded(false);
    resetScroll();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        testID="guided-practice-scroll">
        <View style={styles.container}>
          <Pressable
            accessibilityLabel="Back to Learn Subnetting"
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backText}>‹ Back to Learn Subnetting</Text>
          </Pressable>

          <Text accessibilityRole="header" style={styles.title}>Guided Practice</Text>
          <Text style={styles.notice}>No timer. No score. Unlimited retries.</Text>
          <Text style={styles.isolation}>
            This optional practice never changes Journey, Timed, rank, badge, or achievement progress.
          </Text>

          <View style={styles.progressRow}>
            <Text style={styles.eyebrow}>Practice {scenarioIndex + 1} of {GUIDED_PRACTICE_SCENARIOS.length}</Text>
            <Text style={styles.stageTitle}>{scenario.title}</Text>
          </View>

          <Text accessibilityRole="header" style={styles.questionTitle}>Find the containing network</Text>
          <Text style={styles.instruction}>
            Use the prefix to find the first address in the subnet containing this interface address.
          </Text>

          <View style={styles.targetCard}>
            <Text style={styles.cardLabel}>INTERFACE ADDRESS</Text>
            <Text style={styles.target}>{scenario.address} /{scenario.prefix}</Text>
            {scenario.scaffold === 'full' || scenario.scaffold === 'mask' ? (
              <View style={styles.scaffoldPanel}>
                <Text style={styles.scaffoldText}>Subnet mask: {scenario.facts.mask}</Text>
                {scenario.scaffold === 'full' ? (
                  <>
                    <Text style={styles.scaffoldText}>Block size: {scenario.facts.blockSize}</Text>
                    <Text style={styles.scaffoldText}>Boundaries: {scenario.boundaries.join(', ')}</Text>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>

          <Text style={styles.answerLabel}>YOUR NETWORK ADDRESS</Text>
          <View style={styles.octetRow} testID="practice-octet-row">
            {answerOctets.map((octet, index) => (
              <View
                key={index}
                style={styles.octetGroup}
                testID={`practice-octet-group-${index + 1}`}>
                <TextInput
                  accessibilityLabel={`Practice answer octet ${index + 1}`}
                  editable={!solved}
                  inputMode="numeric"
                  keyboardType="number-pad"
                  maxLength={3}
                  onChangeText={(value) => updateOctet(index, value)}
                  placeholder="000"
                  placeholderTextColor="#506579"
                  style={styles.octetInput}
                  value={octet}
                />
                {index < 3 ? <Text style={styles.dot}>.</Text> : null}
              </View>
            ))}
          </View>

          {feedback !== null ? (
            <View
              accessibilityLiveRegion="polite"
              style={[styles.feedbackCard, solved ? styles.successCard : styles.retryCard]}>
              <Text style={solved ? styles.successTitle : styles.retryTitle}>
                {solved ? '✓ Boundary found' : 'Try that boundary again'}
              </Text>
              <Text style={styles.feedbackText}>{feedback.message}</Text>
              {solved ? (
                <View style={styles.proofPanel}>
                  <Text style={styles.proofText}>Network address: {scenario.facts.network}</Text>
                  <Text style={styles.proofText}>Broadcast address: {scenario.facts.broadcast}</Text>
                  <Text style={styles.proofText}>
                    Usable range: {scenario.facts.firstHost}–{scenario.facts.lastHost}
                  </Text>
                  <Text style={styles.proofDetail}>
                    Mask {scenario.facts.mask} gives blocks of {scenario.facts.blockSize}. The target octet {scenario.targetOctet} belongs to the block beginning at {scenario.facts.network.split('.')[3]}.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {!solved
          && (scenario.scaffold === 'process' || scenario.scaffold === 'independent')
          && attempts >= scenario.hintAfterAttempts ? (
            <View style={styles.hintCard}>
              <Pressable
                accessibilityLabel={hintExpanded ? 'Hide the process hint' : 'Show a process hint'}
                accessibilityRole="button"
                accessibilityState={{ expanded: hintExpanded }}
                onPress={() => setHintExpanded((current) => !current)}
                style={({ pressed }) => [styles.hintButton, pressed && styles.pressed]}>
                <Text style={styles.hintButtonText}>
                  {hintExpanded ? 'HIDE PROCESS HINT' : 'SHOW A PROCESS HINT'}
                </Text>
              </Pressable>
              {hintExpanded ? <Text style={styles.hintText}>{scenario.processHint}</Text> : null}
            </View>
          ) : null}

          {transferComplete ? (
            <View accessibilityLiveRegion="polite" style={styles.completionCard}>
              <Text accessibilityRole="header" style={styles.completionTitle}>Transfer complete</Text>
              <Text style={styles.completionText}>
                You applied the same boundary method with less help each time. That is the skill—not memorizing one answer.
              </Text>
              <Pressable
                accessibilityLabel="Replay guided practice"
                accessibilityRole="button"
                onPress={replay}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>REPLAY GUIDED PRACTICE</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityLabel={solved ? `Continue to practice ${scenarioIndex + 2}` : 'Check practice answer'}
              accessibilityRole="button"
              accessibilityState={{ disabled: !solved && !answerComplete }}
              disabled={!solved && !answerComplete}
              onPress={solved ? advance : submit}
              style={({ pressed }) => [
                styles.primaryButton,
                !solved && !answerComplete && styles.disabledButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.primaryButtonText}>
                {solved ? `CONTINUE TO PRACTICE ${scenarioIndex + 2} →` : 'CHECK ANSWER'}
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#07111D', flex: 1 },
  scrollContent: { flexGrow: 1 },
  container: {
    alignSelf: 'center',
    maxWidth: 760,
    paddingBottom: 48,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: '100%',
  },
  backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingHorizontal: 10 },
  backText: { color: '#D7E4EF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  title: { color: '#F5F8FB', fontSize: 30, fontWeight: '900', lineHeight: 38, marginTop: 20 },
  notice: { color: '#69F0CB', fontSize: 16, fontWeight: '900', marginTop: 12 },
  isolation: { color: '#AFC2D3', fontSize: 14, lineHeight: 21, marginTop: 6 },
  progressRow: {
    backgroundColor: '#102338',
    borderColor: '#27425E',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 24,
    padding: 16,
  },
  eyebrow: { color: '#F6C857', fontSize: 13, fontWeight: '900', letterSpacing: 0.8 },
  stageTitle: { color: '#F5F8FB', fontSize: 18, fontWeight: '800', marginTop: 6 },
  questionTitle: { color: '#F5F8FB', fontSize: 24, fontWeight: '900', marginTop: 26 },
  instruction: { color: '#C8D4E0', fontSize: 16, lineHeight: 24, marginTop: 8 },
  targetCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#365572',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
  cardLabel: { color: '#8EA6BA', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  target: { color: '#F8FAFC', fontSize: 27, fontWeight: '900', marginTop: 8 },
  scaffoldPanel: {
    backgroundColor: '#102A3C',
    borderRadius: 12,
    gap: 6,
    marginTop: 16,
    padding: 14,
  },
  scaffoldText: { color: '#DCE8F2', fontSize: 15, fontWeight: '700', lineHeight: 22 },
  answerLabel: { color: '#8EA6BA', fontSize: 12, fontWeight: '900', letterSpacing: 1, marginTop: 24 },
  octetRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 4, marginTop: 10, width: '100%' },
  octetGroup: { alignItems: 'center', flexBasis: 0, flexDirection: 'row', flexGrow: 1, minWidth: 0 },
  octetInput: {
    backgroundColor: '#0A1826',
    borderColor: '#3B5B77',
    borderRadius: 10,
    borderWidth: 2,
    caretColor: '#F6C857',
    color: '#F8FAFC',
    flex: 1,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    minHeight: 52,
    minWidth: 0,
    paddingHorizontal: 4,
    textAlign: 'center',
    WebkitTextFillColor: '#F8FAFC',
  } as never,
  dot: { color: '#9FB2C5', flexShrink: 0, fontSize: 20, fontWeight: '900', marginLeft: 2 },
  feedbackCard: { borderRadius: 14, borderWidth: 1, marginTop: 20, padding: 16 },
  successCard: { backgroundColor: '#12352F', borderColor: '#47E5BC' },
  retryCard: { backgroundColor: '#3A211B', borderColor: '#FF8D73' },
  successTitle: { color: '#69F0CB', fontSize: 19, fontWeight: '900' },
  retryTitle: { color: '#FFAB91', fontSize: 19, fontWeight: '900' },
  feedbackText: { color: '#F5F8FB', fontSize: 15, lineHeight: 23, marginTop: 8 },
  proofPanel: { gap: 6, marginTop: 14 },
  proofText: { color: '#F5F8FB', fontSize: 16, fontWeight: '800', lineHeight: 23 },
  proofDetail: { color: '#C8D4E0', fontSize: 14, lineHeight: 21, marginTop: 6 },
  hintCard: {
    backgroundColor: '#102338',
    borderColor: '#365572',
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 18,
    padding: 14,
  },
  hintButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  hintButtonText: { color: '#F6C857', fontSize: 14, fontWeight: '900' },
  hintText: { color: '#DCE8F2', fontSize: 15, lineHeight: 23, marginTop: 10 },
  completionCard: {
    backgroundColor: '#12352F',
    borderColor: '#47E5BC',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
  },
  completionTitle: { color: '#69F0CB', fontSize: 24, fontWeight: '900' },
  completionText: { color: '#F5F8FB', fontSize: 16, lineHeight: 24, marginTop: 8 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#F6C857',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 22,
    minHeight: 54,
    paddingHorizontal: 18,
  },
  disabledButton: { opacity: 0.42 },
  primaryButtonText: { color: '#17202A', fontSize: 15, fontWeight: '900' },
});
