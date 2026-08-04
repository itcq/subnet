import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type TimedModeSetupProps = Readonly<{
  onBack: () => void;
  onStartTimed: (durationSeconds: 120 | 240) => void;
  onStartUntimed: () => void;
}>;

export function TimedModeSetup({ onBack, onStartTimed, onStartUntimed }: TimedModeSetupProps) {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={styles.title}>
        Choose Your Play Style
      </Text>
      <Text style={styles.intro}>
        Timed practice is always optional. The Journey stays untimed and uses the same typed-answer practice without local scoring pressure.
      </Text>

      <View style={styles.rulesCard}>
        <Text style={styles.cardTitle}>LOCAL PRACTICE SCORING</Text>
        <Text style={styles.rule}>Start with 1,000 points.</Text>
        <Text style={styles.rule}>The available score drops by 5 points per elapsed second.</Text>
        <Text style={styles.rule}>Hints unlock after three incorrect attempts.</Text>
        <Text style={styles.rule}>Each revealed hint deducts 150 points.</Text>
        <Text style={styles.rule}>A correct timed solve is always worth at least 100 points.</Text>
        <Text style={styles.rule}>The local practice timer pauses while the app is in the background.</Text>
      </View>

      <View style={styles.noticeCard}>
        <Text style={styles.noticeTitle}>Local practice result — unverified</Text>
        <Text style={styles.noticeText}>
          These personal score bands and badges are not a leaderboard or verified credential. Both presets contribute to the same session-local totals under the same elapsed-time scoring rules; the selected preset is retained with each result for context.
        </Text>
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>Untimed Journey</Text>
        <Text style={styles.optionText}>No countdown. Learn, retry, and save Journey progress at your own pace.</Text>
        <Action label="UNTIMED JOURNEY" onPress={onStartUntimed} />
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>2-minute local practice</Text>
        <Text style={styles.optionText}>The standard preset for a focused typed-answer challenge.</Text>
        <Action label="START 2-MINUTE MODE" onPress={() => onStartTimed(120)} primary />
      </View>

      <View style={styles.optionCard}>
        <Text style={styles.optionTitle}>4-minute local practice</Text>
        <Text style={styles.optionText}>More time with the same rules. Choosing more time is not labeled as assisted or lower skill.</Text>
        <Action label="START 4-MINUTE MODE" onPress={() => onStartTimed(240)} />
      </View>

      <Action label="BACK" onDark onPress={onBack} />
    </ScrollView>
  );
}

function Action({
  label,
  onDark = false,
  onPress,
  primary = false,
}: Readonly<{
  label: string;
  onDark?: boolean;
  onPress: () => void;
  primary?: boolean;
}>) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        primary && styles.primaryButton,
        onDark && styles.onDarkButton,
        pressed && styles.pressed,
      ]}>
      <Text style={[
        styles.buttonText,
        primary && styles.primaryButtonText,
        onDark && styles.onDarkButtonText,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: '#07111F',
    flexGrow: 1,
    gap: 16,
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: '#F5F8FB',
    fontSize: 30,
    fontWeight: '900',
  },
  intro: {
    color: '#C8D4E0',
    fontSize: 16,
    lineHeight: 24,
  },
  rulesCard: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rule: {
    color: '#334155',
    fontSize: 15,
    lineHeight: 22,
  },
  noticeCard: {
    backgroundColor: '#fff7ed',
    borderColor: '#fdba74',
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  noticeTitle: {
    color: '#9a3412',
    fontSize: 16,
    fontWeight: '900',
  },
  noticeText: {
    color: '#7c2d12',
    fontSize: 14,
    lineHeight: 21,
  },
  optionCard: {
    backgroundColor: '#ffffff',
    borderColor: '#cbd5e1',
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  optionTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  optionText: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 21,
  },
  button: {
    alignItems: 'center',
    borderColor: '#0f172a',
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  primaryButton: {
    backgroundColor: '#0f172a',
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  onDarkButton: {
    borderColor: '#F6C857',
  },
  onDarkButtonText: {
    color: '#F6C857',
  },
  pressed: {
    opacity: 0.7,
  },
});
