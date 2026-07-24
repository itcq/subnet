import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CATALOG_VERSION, subnetQuestionCatalog } from '@/domain/questions/catalog';
import { NetworkChallenge } from '@/features/challenge/NetworkChallenge';
import { createProgressRepository } from '@/progress/createProgressRepository';
import { useLocalProgress } from '@/progress/useLocalProgress';

const progressRuntime = createProgressRepository();

export default function HomeScreen() {
  const progress = useLocalProgress(progressRuntime.repository, CATALOG_VERSION);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      {progress.loading ? (
        <View accessibilityRole="progressbar" style={styles.statusContainer}>
          <Text style={styles.statusText}>Loading saved progress…</Text>
        </View>
      ) : progress.failure?.kind === 'load' ? (
        <View accessibilityLiveRegion="polite" style={styles.statusContainer}>
          <Text style={styles.statusText}>We could not load your saved progress.</Text>
          <Pressable
            accessibilityLabel="Retry loading saved progress"
            accessibilityRole="button"
            onPress={progress.retry}
            style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.challengeContainer}>
          {!progressRuntime.durable && progressRuntime.persistenceNotice !== null && (
            <Text accessibilityLiveRegion="polite" style={styles.persistenceNotice}>
              {progressRuntime.persistenceNotice}
            </Text>
          )}
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
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#07111F' },
  challengeContainer: { flex: 1 },
  persistenceNotice: {
    backgroundColor: '#102338',
    color: '#C8D4E0',
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  statusContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  statusText: {
    color: '#C8D4E0',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F6C857',
    borderRadius: 12,
    marginTop: 18,
    minWidth: 120,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#101820',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
});
