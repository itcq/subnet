import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXTERNAL_RESOURCE_DISCLAIMER, LEARNING_CATALOG } from '@/domain/learning/content';
import { GuidedOctetLesson } from '@/features/learning/GuidedOctetLesson';

export function LearnSubnetting({
  onBack,
  guidedLessonOpen: controlledGuidedLessonOpen,
  onGuidedLessonOpenChange,
  onStartPractice,
}: {
  onBack(): void;
  guidedLessonOpen?: boolean;
  onGuidedLessonOpenChange?(open: boolean): void;
  onStartPractice(): void;
}) {
  const module = LEARNING_CATALOG.modules[0];
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [expandedMethods, setExpandedMethods] = useState<Readonly<Record<string, boolean>>>({});
  const [expandedExamples, setExpandedExamples] = useState<Readonly<Record<string, boolean>>>({});
  const [localGuidedLessonOpen, setLocalGuidedLessonOpen] = useState(false);
  const guidedLessonOpen = controlledGuidedLessonOpen ?? localGuidedLessonOpen;

  function setGuidedLessonOpen(open: boolean) {
    if (controlledGuidedLessonOpen === undefined) {
      setLocalGuidedLessonOpen(open);
    }
    onGuidedLessonOpenChange?.(open);
  }

  async function openResource(url: string) {
    setResourceError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setResourceError('That external resource could not be opened. Please try again later.');
    }
  }

  if (guidedLessonOpen) {
    return <GuidedOctetLesson onBack={() => setGuidedLessonOpen(false)} />;
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} testID="learn-subnetting-scroll">
      <View style={styles.container}>
        <Pressable
          accessibilityLabel="Back to main menu"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹ Back to main menu</Text>
        </Pressable>

        <Text accessibilityRole="header" style={styles.title}>
          Learn Subnetting
        </Text>
        <Text style={styles.optionalNotice}>
          Optional and unscored. Learn at your pace, leave whenever you like, and return without losing anything.
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>START HERE</Text>
          <Text accessibilityRole="header" style={styles.moduleTitle}>Why subnetting exists</Text>
          <Text style={styles.objective}>{module.purpose}</Text>
          <Text style={styles.bodyText}>
            An IP identifies one interface. The prefix tells you which network group it belongs to.
          </Text>
          <Text style={styles.bodyText}>{module.objective}</Text>
        </View>

        <View style={styles.pathCard}>
          <Text accessibilityRole="header" style={styles.sectionTitleCompact}>Your learning path</Text>
          {module.path.map((step, index) => (
            <View key={step.id} style={styles.pathStep}>
              <Text style={styles.pathTitle}>
                {index + 1} · {step.title}
              </Text>
              <Text style={styles.pathSummary}>{step.summary}</Text>
            </View>
          ))}
        </View>

        <View style={styles.guidedCard}>
          <Text style={styles.eyebrow}>NEW INTERACTIVE LESSON</Text>
          <Text accessibilityRole="header" style={styles.moduleTitle}>Bits, Bytes & Octets</Text>
          <Text style={styles.bodyText}>
            Build 192.168.1.130/26 step by step using the four octet columns, binary place values, network and host bits, the subnet mask, block size, and full address range.
          </Text>
          <Text style={styles.guidedMeta}>6 guided steps · Optional · No score or progress impact</Text>
          <Pressable
            accessibilityLabel="Start guided Bits, Bytes and Octets lesson"
            accessibilityRole="button"
            onPress={() => setGuidedLessonOpen(true)}
            style={({ pressed }) => [styles.practiceButton, pressed && styles.pressed]}>
            <Text style={styles.practiceButtonText}>START GUIDED LESSON →</Text>
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>Two reliable solving methods</Text>
        <Text style={styles.sectionIntro}>
          Binary explains why the boundary works. Block size is the faster decimal shortcut for that same boundary.
        </Text>
        {module.methods.map((method) => (
          <View key={method.id} style={styles.card}>
            <Text style={styles.cardTitle}>{method.name}</Text>
            <Text style={styles.bodyText}>{method.summary}</Text>
            <Text style={styles.connectionText}>{method.connection}</Text>
            <Pressable
              accessibilityLabel={`${expandedMethods[method.id] ? 'Hide' : 'Show'} steps for ${method.name}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: Boolean(expandedMethods[method.id]) }}
              onPress={() =>
                setExpandedMethods((current) => ({ ...current, [method.id]: !current[method.id] }))
              }
              style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}>
              <Text style={styles.revealButtonText}>
                {expandedMethods[method.id] ? 'HIDE STEPS' : 'SHOW STEPS'}
              </Text>
            </Pressable>
            {expandedMethods[method.id]
              ? method.steps.map((step, index) => (
                  <Text key={step} style={styles.stepText}>
                    Step {index + 1}: {step}
                  </Text>
                ))
              : null}
          </View>
        ))}

        <Text accessibilityRole="header" style={styles.sectionTitle}>Worked examples</Text>
        {module.workedExamples.map((example) => (
          <View key={example.id} style={styles.card}>
            <Text style={styles.cardTitle}>{example.title}</Text>
            <Text style={styles.problemText}>
              {example.ip} /{example.prefix}
            </Text>
            <Text style={styles.bodyText}>{example.context}</Text>
            <Text style={styles.changeText}>What changes: {example.whatChanges}</Text>
            <Text style={styles.sameText}>What stays the same: {example.whatStaysSame}</Text>
            <Pressable
              accessibilityLabel={`${expandedExamples[example.id] ? 'Hide' : 'Show'} calculation for ${example.title}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: Boolean(expandedExamples[example.id]) }}
              onPress={() =>
                setExpandedExamples((current) => ({ ...current, [example.id]: !current[example.id] }))
              }
              style={({ pressed }) => [styles.revealButton, pressed && styles.pressed]}>
              <Text style={styles.revealButtonText}>
                {expandedExamples[example.id] ? 'HIDE CALCULATION' : 'SHOW CALCULATION'}
              </Text>
            </Pressable>
            {expandedExamples[example.id] ? (
              <View accessibilityLabel={`Calculation for ${example.title}`} style={styles.calculationPanel}>
                {example.steps.map((step) => (
                  <Text key={step} style={styles.bodyText}>
                    • {step}
                  </Text>
                ))}
                <Text style={styles.answerText}>Network address: {example.answer}</Text>
              </View>
            ) : null}
          </View>
        ))}

        <View style={styles.practiceCard}>
          <Text accessibilityRole="header" style={styles.cardTitle}>{module.practice.title}</Text>
          <Text style={styles.practicePromise}>No timer. No score. Unlimited retries.</Text>
          <Text style={styles.bodyText}>{module.practice.description}</Text>
          <Text style={styles.practiceTransfer}>
            Four examples gradually remove the hints so you can prove the method transfers.
          </Text>
          <Text style={styles.practiceIsolation}>
            Practice here is optional and never changes Journey, Timed, rank, badge, or achievement progress.
          </Text>
          <Pressable
            accessibilityLabel="Start guided practice"
            accessibilityRole="button"
            onPress={onStartPractice}
            style={({ pressed }) => [styles.practiceButton, pressed && styles.pressed]}>
            <Text style={styles.practiceButtonText}>START GUIDED PRACTICE →</Text>
          </Pressable>
        </View>

        <Text accessibilityRole="header" style={styles.sectionTitle}>External learning resources</Text>
        <Text style={styles.resourceIntro}>
          Different educators use different explanations. Open any resource that matches how you like to learn.
        </Text>
        {resourceError ? (
          <Text accessibilityLiveRegion="polite" style={styles.resourceError}>
            {resourceError}
          </Text>
        ) : null}
        {module.resources.map((resource) => (
          <Pressable
            key={resource.id}
            accessibilityLabel={`${resource.creator}: ${resource.title}`}
            accessibilityRole="link"
            onPress={() => void openResource(resource.url)}
            style={({ pressed }) => [styles.resourceCard, pressed && styles.pressed]}>
            <Text style={styles.resourceCreator}>{resource.creator}</Text>
            <Text style={styles.resourceTitle}>{resource.title}</Text>
            <Text style={styles.bodyText}>{resource.focus}</Text>
            <Text style={styles.resourceWhy}>{resource.whyUseful}</Text>
            <Text style={styles.openLabel}>OPEN EXTERNAL RESOURCE ↗</Text>
          </Pressable>
        ))}
        <Text style={styles.disclaimer}>{EXTERNAL_RESOURCE_DISCLAIMER}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: {
    alignSelf: 'center',
    maxWidth: 760,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: '100%',
  },
  backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingHorizontal: 10 },
  backText: { color: '#D7E4EF', fontSize: 15, fontWeight: '700' },
  pressed: { opacity: 0.72 },
  title: { color: '#F5F8FB', fontSize: 30, fontWeight: '900', lineHeight: 38, marginTop: 28 },
  optionalNotice: {
    backgroundColor: '#173A43',
    borderColor: '#47E5BC',
    borderRadius: 12,
    borderWidth: 1,
    color: '#D9FFF5',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 14,
    padding: 16,
  },
  guidedCard: {
    backgroundColor: '#102338',
    borderColor: '#F6C857',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 22,
    padding: 20,
  },
  guidedMeta: { color: '#9FB2C5', fontSize: 13, fontWeight: '700', lineHeight: 20 },
  heroCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 22,
    padding: 20,
  },
  eyebrow: { color: '#F6C857', fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  moduleTitle: { color: '#F5F8FB', fontSize: 24, fontWeight: '900', lineHeight: 31 },
  objective: { color: '#69F0CB', fontSize: 16, fontWeight: '700', lineHeight: 24 },
  sectionTitle: { color: '#F5F8FB', fontSize: 22, fontWeight: '900', lineHeight: 30, marginTop: 30 },
  sectionIntro: { color: '#AFC2D3', fontSize: 15, lineHeight: 23, marginTop: 8 },
  connectionText: {
    backgroundColor: '#172C45',
    borderLeftColor: '#8F7CFF',
    borderLeftWidth: 3,
    color: '#E4DFFF',
    fontSize: 14,
    lineHeight: 22,
    padding: 12,
  },
  sectionTitleCompact: { color: '#F5F8FB', fontSize: 20, fontWeight: '900', lineHeight: 28 },
  pathCard: {
    backgroundColor: '#102338',
    borderColor: '#31516F',
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    marginTop: 18,
    padding: 20,
  },
  pathStep: { borderLeftColor: '#F6C857', borderLeftWidth: 3, gap: 3, paddingLeft: 12 },
  pathTitle: { color: '#F5F8FB', fontSize: 16, fontWeight: '800', lineHeight: 23 },
  pathSummary: { color: '#AFC2D3', fontSize: 14, lineHeight: 21 },
  card: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 14,
    padding: 20,
  },
  cardTitle: { color: '#F5F8FB', fontSize: 18, fontWeight: '800', lineHeight: 25 },
  bodyText: { color: '#D5E0EA', fontSize: 16, lineHeight: 24 },
  stepText: { color: '#C8D4E0', fontSize: 15, lineHeight: 23 },
  revealButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#7291AE',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  revealButtonText: { color: '#D7E4EF', fontSize: 13, fontWeight: '900', letterSpacing: 0.4 },
  problemText: { color: '#F6C857', fontSize: 20, fontWeight: '900', lineHeight: 28 },
  changeText: { color: '#F8DFA0', fontSize: 14, fontWeight: '700', lineHeight: 22 },
  sameText: { color: '#BFEFE2', fontSize: 14, fontWeight: '700', lineHeight: 22 },
  calculationPanel: { gap: 8 },
  answerText: {
    backgroundColor: '#173A43',
    borderRadius: 10,
    color: '#69F0CB',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 24,
    overflow: 'hidden',
    padding: 12,
  },
  practiceCard: {
    backgroundColor: '#102338',
    borderColor: '#F6C857',
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 28,
    padding: 20,
  },
  practicePromise: { color: '#D9FFF5', fontSize: 17, fontWeight: '900', lineHeight: 24 },
  practiceTransfer: { color: '#DCE8F2', fontSize: 15, fontWeight: '700', lineHeight: 22 },
  practiceIsolation: { color: '#9FB2C5', fontSize: 13, lineHeight: 20 },
  practiceButton: {
    alignItems: 'center',
    backgroundColor: '#F6C857',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  practiceButtonText: { color: '#101820', fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
  resourceIntro: { color: '#AFC2D3', fontSize: 15, lineHeight: 23, marginTop: 8 },
  resourceError: {
    backgroundColor: '#3A2025',
    borderColor: '#F07B8A',
    borderRadius: 10,
    borderWidth: 1,
    color: '#FFDCE1',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 12,
    padding: 12,
  },
  resourceCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#31516F',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    marginTop: 14,
    padding: 20,
  },
  resourceCreator: { color: '#69F0CB', fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  resourceTitle: { color: '#F5F8FB', fontSize: 17, fontWeight: '800', lineHeight: 24 },
  resourceWhy: { color: '#AFC2D3', fontSize: 14, fontStyle: 'italic', lineHeight: 21 },
  openLabel: { color: '#F6C857', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginTop: 4 },
  disclaimer: { color: '#839AB0', fontSize: 13, lineHeight: 20, marginTop: 18 },
});
