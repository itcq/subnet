import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EXTERNAL_RESOURCE_DISCLAIMER, LEARNING_CATALOG } from '@/domain/learning/content';

export function LearnSubnetting({
  onBack,
  onStartPractice,
}: {
  onBack(): void;
  onStartPractice(): void;
}) {
  const module = LEARNING_CATALOG.modules[0];
  const [resourceError, setResourceError] = useState<string | null>(null);

  async function openResource(url: string) {
    setResourceError(null);
    try {
      await Linking.openURL(url);
    } catch {
      setResourceError('That external resource could not be opened. Please try again later.');
    }
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
          This section is optional. Learn at your pace, or return to the main menu and start the Journey whenever you are ready.
        </Text>

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>START HERE</Text>
          <Text style={styles.moduleTitle}>{module.title}</Text>
          <Text style={styles.objective}>{module.objective}</Text>
          {module.introduction.map((paragraph) => (
            <Text key={paragraph} style={styles.bodyText}>
              {paragraph}
            </Text>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Compare two methods</Text>
        {module.methods.map((method) => (
          <View key={method.id} style={styles.card}>
            <Text style={styles.cardTitle}>{method.name}</Text>
            <Text style={styles.bodyText}>{method.summary}</Text>
            {method.steps.map((step, index) => (
              <Text key={step} style={styles.stepText}>
                Step {index + 1}: {step}
              </Text>
            ))}
          </View>
        ))}

        <Text style={styles.sectionTitle}>Worked examples</Text>
        {module.workedExamples.map((example) => (
          <View key={example.id} style={styles.card}>
            <Text style={styles.cardTitle}>{example.title}</Text>
            <Text style={styles.problemText}>
              {example.ip} /{example.prefix}
            </Text>
            {example.steps.map((step) => (
              <Text key={step} style={styles.bodyText}>
                • {step}
              </Text>
            ))}
            <Text style={styles.answerText}>Network address: {example.answer}</Text>
          </View>
        ))}

        <View style={styles.practiceCard}>
          <Text style={styles.cardTitle}>{module.practice.title}</Text>
          <Text style={styles.bodyText}>{module.practice.description}</Text>
          <Pressable
            accessibilityLabel="Practice this concept"
            accessibilityRole="button"
            onPress={onStartPractice}
            style={({ pressed }) => [styles.practiceButton, pressed && styles.pressed]}>
            <Text style={styles.practiceButtonText}>PRACTICE THIS CONCEPT</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>External learning resources</Text>
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
  problemText: { color: '#F6C857', fontSize: 20, fontWeight: '900', lineHeight: 28 },
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
