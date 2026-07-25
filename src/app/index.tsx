import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATALOG_VERSION, subnetQuestionCatalog } from '@/domain/questions/catalog';
import { getJourneyPosition, JOURNEY_STAGES, type JourneyPosition } from '@/domain/questions/journey';
import { NetworkChallenge } from '@/features/challenge/NetworkChallenge';
import { createProgressRepository } from '@/progress/createProgressRepository';
import { useLocalProgress } from '@/progress/useLocalProgress';

const progressRuntime = createProgressRepository();
const TAGLINE = 'Learn subnetting one short lesson at a time.';

type Screen = 'menu' | 'challenge' | 'how-to-play' | 'journey' | 'completion';

function LaunchIdentity() {
  return (
    <View style={styles.identity}>
      <Text accessibilityRole="header" style={styles.title}>
        Subnet Game
      </Text>
      <Text style={styles.tagline}>{TAGLINE}</Text>
    </View>
  );
}

function PersistenceNotice() {
  if (progressRuntime.durable || progressRuntime.persistenceNotice === null) {
    return null;
  }

  return (
    <Text accessibilityLiveRegion="polite" style={styles.persistenceNotice}>
      {progressRuntime.persistenceNotice}
    </Text>
  );
}

function MenuButton({
  label,
  onPress,
  primary = false,
}: {
  label: string;
  onPress(): void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuButton,
        primary ? styles.primaryButton : styles.secondaryButton,
        pressed && styles.buttonPressed,
      ]}>
      <Text style={primary ? styles.primaryButtonText : styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function BackButton({ onPress }: { onPress(): void }) {
  return (
    <Pressable
      accessibilityLabel="Back to main menu"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
      <Text style={styles.backButtonText}>‹ Back to main menu</Text>
    </Pressable>
  );
}

type StageState = 'complete' | 'current' | 'locked';

function getStageState(
  stage: (typeof JOURNEY_STAGES)[number],
  nextOrdinal: number | undefined,
): StageState {
  if (nextOrdinal === undefined || nextOrdinal > stage.end) {
    return 'complete';
  }
  if (nextOrdinal >= stage.start) {
    return 'current';
  }
  return 'locked';
}

function StagePath({ nextOrdinal }: { nextOrdinal: number | undefined }) {
  return (
    <View accessibilityLabel="Journey stages" style={styles.stagePath}>
      {JOURNEY_STAGES.map((stage) => {
        const state = getStageState(stage, nextOrdinal);
        const marker = state === 'complete' ? '✓' : state === 'current' ? '●' : '🔒';
        const status = state === 'complete' ? 'Complete' : state === 'current' ? 'Current' : 'Locked';
        return (
          <Text key={stage.tier} style={[styles.stageStatus, state === 'current' && styles.stageStatusCurrent]}>
            {marker} {stage.stage} · {status}
          </Text>
        );
      })}
    </View>
  );
}

function LessonPath({ position }: { position: JourneyPosition }) {
  return (
    <View accessibilityLabel={`Lessons in ${position.stage} unit ${position.unit}`} style={styles.lessonPath}>
      {Array.from({ length: position.lessonsInUnit }, (_, index) => {
        const lesson = index + 1;
        const marker = lesson < position.lesson ? '✓' : lesson === position.lesson ? '●' : '○';
        const suffix = lesson === position.lesson ? ' · Current' : lesson > position.lesson ? ' · Locked' : '';
        return (
          <Text key={lesson} style={[styles.lessonNode, lesson === position.lesson && styles.lessonNodeCurrent]}>
            {marker} Lesson {lesson}{suffix}
          </Text>
        );
      })}
    </View>
  );
}

export default function HomeScreen() {
  const progress = useLocalProgress(progressRuntime.repository, CATALOG_VERSION);
  const [screen, setScreen] = useState<Screen>('menu');
  const localScreenScrollRef = useRef<ScrollView>(null);

  const resetLocalScroll = useCallback(() => {
    localScreenScrollRef.current?.scrollTo({ animated: false, y: 0 });
  }, []);

  const navigateTo = (nextScreen: Screen) => {
    resetLocalScroll();
    setScreen(nextScreen);
  };

  useEffect(() => {
    resetLocalScroll();
    const frame = requestAnimationFrame(resetLocalScroll);
    return () => cancelAnimationFrame(frame);
  }, [resetLocalScroll, screen]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'menu') {
        return false;
      }

      resetLocalScroll();
      setScreen('menu');
      return true;
    });

    return () => subscription.remove();
  }, [resetLocalScroll, screen]);

  if (progress.loading) {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.statusContainer}>
          <LaunchIdentity />
          <ActivityIndicator
            accessible
            accessibilityLabel="Preparing your journey"
            accessibilityRole="progressbar"
            color="#F6C857"
            size="large"
            style={styles.loadingIndicator}
          />
          <Text accessibilityLiveRegion="polite" style={styles.statusText}>
            Loading saved progress…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (progress.failure?.kind === 'load') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View accessibilityLiveRegion="polite" style={styles.statusContainer}>
          <LaunchIdentity />
          <Text style={styles.statusText}>We could not load your saved progress.</Text>
          <Pressable
            accessibilityLabel="Retry loading saved progress"
            accessibilityRole="button"
            onPress={progress.retry}
            style={({ pressed }) => [styles.retryButton, pressed && styles.buttonPressed]}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const completedSet = new Set(progress.completedOrdinals);
  const nextQuestion = subnetQuestionCatalog.find((question) => !completedSet.has(question.ordinal));
  const nextPosition = nextQuestion === undefined ? undefined : getJourneyPosition(nextQuestion.ordinal);
  const primaryLabel =
    progress.completedOrdinals.length === 0
      ? 'START JOURNEY'
      : nextQuestion === undefined
        ? 'VIEW COMPLETED JOURNEY'
        : 'CONTINUE JOURNEY';

  if (screen === 'challenge') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.challengeHeader}>
          <BackButton onPress={() => navigateTo('menu')} />
        </View>
        <PersistenceNotice />
        <View style={styles.challengeContainer}>
          <NetworkChallenge
            initialCompletedOrdinals={progress.completedOrdinals}
            onQuestionCompleted={async (question) => {
              await progress.recordCompletion({
                catalogVersion: question.catalogVersion,
                questionId: question.id,
                ordinal: question.ordinal,
                completedAt: new Date().toISOString(),
                attemptCount: 1,
                pendingSync: true,
              });
            }}
            questions={subnetQuestionCatalog}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'completion') {
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView
          ref={localScreenScrollRef}
          key="completion"
          contentContainerStyle={styles.infoScrollContent}
          onContentSizeChange={resetLocalScroll}
          testID="info-scroll">
          <PersistenceNotice />
          <View style={styles.infoContainer}>
            <BackButton onPress={() => navigateTo('menu')} />
            <Text accessibilityRole="header" style={styles.infoTitle}>
              Journey Complete
            </Text>
            <View style={styles.infoCard}>
              <Text style={styles.completionSummary}>Subnet Mastery achieved</Text>
              <Text style={styles.infoText}>You completed every stage of the subnet journey.</Text>
              <Text style={styles.infoText}>Your completed path remains saved for future practice features.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'how-to-play' || screen === 'journey') {
    const isHowToPlay = screen === 'how-to-play';
    return (
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <ScrollView
          ref={localScreenScrollRef}
          key={screen}
          contentContainerStyle={styles.infoScrollContent}
          onContentSizeChange={resetLocalScroll}
          testID="info-scroll">
          <PersistenceNotice />
          <View style={styles.infoContainer}>
            <BackButton onPress={() => navigateTo('menu')} />
            <Text accessibilityRole="header" style={styles.infoTitle}>
              {isHowToPlay ? 'How to Play' : 'Your Journey'}
            </Text>
            {isHowToPlay ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>1. Read the network and prefix-length prompt.</Text>
                <Text style={styles.infoText}>
                  2. Enter your answer as four decimal octets (for example, 192.168.1.0).
                </Text>
                <Text style={styles.infoText}>
                  3. Submit your answer. Retries are expected and useful.
                </Text>
                <Text style={styles.infoText}>
                  Completed challenges are saved according to the progress notice shown in this app.
                </Text>
                <Text style={styles.infoText}>
                  Only completed challenges are saved; unfinished answers are discarded when you leave.
                </Text>
              </View>
            ) : (
              <>
                <StagePath nextOrdinal={nextQuestion?.ordinal} />
                {JOURNEY_STAGES.map((stage) => (
                  <View key={stage.tier} style={styles.infoCard}>
                    <Text style={styles.tierText}>{stage.stage}</Text>
                    <Text style={styles.infoText}>{stage.description}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <ScrollView
        ref={localScreenScrollRef}
        key="menu"
        contentContainerStyle={styles.menuScrollContent}
        onContentSizeChange={resetLocalScroll}
        testID="main-menu-scroll">
        <PersistenceNotice />
        <View style={styles.menuContainer}>
          <LaunchIdentity />
          <Text style={styles.description}>
            Build real subnetting skill through short lessons and stage checkpoints.
          </Text>
          <View style={styles.progressCard}>
            <Text style={styles.progressLabel}>YOUR SUBNET JOURNEY</Text>
            {nextPosition === undefined ? (
              <>
                <Text style={styles.progressSummary}>Subnet Mastery achieved</Text>
                <Text style={styles.currentPosition}>Every stage is complete.</Text>
              </>
            ) : (
              <>
                <Text style={styles.progressSummary}>{nextPosition.stage}</Text>
                <Text style={styles.currentPosition}>
                  Unit {nextPosition.unit} · Lesson {nextPosition.lesson}
                </Text>
                <Text style={styles.currentChallenge}>Challenge {nextPosition.challenge} is ready</Text>
                <LessonPath position={nextPosition} />
              </>
            )}
          </View>
          <View style={styles.menuActions}>
            <MenuButton
              label={primaryLabel}
              onPress={() => navigateTo(nextQuestion === undefined ? 'completion' : 'challenge')}
              primary
            />
            <MenuButton label="HOW TO PLAY" onPress={() => navigateTo('how-to-play')} />
            <MenuButton label="VIEW JOURNEY" onPress={() => navigateTo('journey')} />
          </View>
          <StagePath nextOrdinal={nextQuestion?.ordinal} />
          <Text style={styles.trustText}>Learn at your pace. No lives, timers, or streak penalties.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07111F' },
  identity: { alignItems: 'center' },
  title: {
    color: '#F5F8FB',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0.4,
    lineHeight: 46,
    textAlign: 'center',
  },
  tagline: {
    color: '#9FB2C5',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 8,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingIndicator: { marginBottom: 16, marginTop: 42 },
  statusText: { color: '#C8D4E0', fontSize: 16, lineHeight: 24, textAlign: 'center' },
  retryButton: {
    alignItems: 'center',
    backgroundColor: '#F6C857',
    borderRadius: 12,
    justifyContent: 'center',
    marginTop: 24,
    minHeight: 48,
    minWidth: 128,
    paddingHorizontal: 20,
  },
  retryButtonText: { color: '#101820', fontSize: 15, fontWeight: '900' },
  persistenceNotice: {
    backgroundColor: '#102338',
    color: '#C8D4E0',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  menuScrollContent: { flexGrow: 1 },
  menuContainer: {
    alignSelf: 'center',
    flex: 1,
    justifyContent: 'center',
    maxWidth: 760,
    paddingHorizontal: 24,
    paddingVertical: 28,
    width: '100%',
  },
  description: {
    alignSelf: 'center',
    color: '#C8D4E0',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 24,
    maxWidth: 480,
    textAlign: 'center',
  },
  progressCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 30,
    padding: 18,
  },
  progressLabel: { color: '#7FA0BC', fontSize: 12, fontWeight: '800', letterSpacing: 1.2 },
  progressSummary: { color: '#F5F8FB', fontSize: 22, fontWeight: '800', lineHeight: 30, marginTop: 5 },
  currentPosition: { color: '#47E5BC', fontSize: 16, fontWeight: '800', lineHeight: 24, marginTop: 4 },
  currentChallenge: { color: '#C8D4E0', fontSize: 15, lineHeight: 22, marginTop: 2 },
  lessonPath: { gap: 8, marginTop: 18 },
  lessonNode: {
    backgroundColor: '#102338',
    borderRadius: 10,
    color: '#839AB0',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  lessonNodeCurrent: { backgroundColor: '#173A43', color: '#69F0CB' },
  stagePath: { gap: 8, marginTop: 18 },
  stageStatus: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 10,
    borderWidth: 1,
    color: '#9FB2C5',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  stageStatusCurrent: { borderColor: '#47E5BC', color: '#69F0CB' },
  trustText: { color: '#839AB0', fontSize: 13, lineHeight: 20, marginTop: 16, textAlign: 'center' },
  menuActions: { gap: 12, marginTop: 24 },
  menuButton: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 18,
  },
  primaryButton: { backgroundColor: '#F6C857' },
  secondaryButton: { backgroundColor: '#102338', borderColor: '#31516F', borderWidth: 1 },
  primaryButtonText: { color: '#101820', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  secondaryButtonText: { color: '#E6EEF5', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
  buttonPressed: { opacity: 0.72 },
  challengeHeader: { backgroundColor: '#0A1725', paddingHorizontal: 12, paddingVertical: 4 },
  challengeContainer: { flex: 1 },
  backButton: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 10,
  },
  backButtonText: { color: '#D7E4EF', fontSize: 15, fontWeight: '700' },
  infoScrollContent: { flexGrow: 1 },
  infoContainer: {
    alignSelf: 'center',
    flex: 1,
    maxWidth: 760,
    paddingBottom: 28,
    paddingHorizontal: 20,
    paddingTop: 8,
    width: '100%',
  },
  infoTitle: { color: '#F5F8FB', fontSize: 30, fontWeight: '900', lineHeight: 38, marginTop: 28 },
  infoCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
    marginTop: 22,
    padding: 20,
  },
  infoText: { color: '#D5E0EA', fontSize: 16, lineHeight: 24 },
  completionSummary: { color: '#F5F8FB', fontSize: 20, fontWeight: '800', lineHeight: 28 },
  tierText: { color: '#F5F8FB', fontSize: 18, fontWeight: '700', lineHeight: 25 },
  infoNote: { color: '#AFC2D3', fontSize: 15, lineHeight: 23, marginTop: 6 },
});
