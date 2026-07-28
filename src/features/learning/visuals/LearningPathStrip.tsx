import { StyleSheet, Text, View } from 'react-native';

export type LearningPathStripProps = {
  steps: readonly string[];
  currentStep: number;
};

export function LearningPathStrip({ steps, currentStep }: LearningPathStripProps) {
  const currentLabel = steps[currentStep - 1] ?? '';

  return (
    <View accessibilityLabel="Learning path" style={styles.strip}>
      <Text
        accessibilityLabel={`Learning path, step ${currentStep} of ${steps.length}: ${currentLabel}`}
        style={styles.summary}>
        Step {currentStep} of {steps.length}
      </Text>
      {steps.map((step, index) => {
        const isCurrent = index + 1 === currentStep;
        return (
          <View key={`${index}-${step}`} style={[styles.step, isCurrent && styles.currentStep]}>
            <Text style={[styles.stepText, isCurrent && styles.currentText]}>
              {step}{isCurrent ? ' — Current' : ''}
            </Text>
            {index < steps.length - 1 ? (
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={styles.arrow}>
                →
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '100%',
    paddingVertical: 8,
  },
  summary: {
    color: '#34495e',
    flexBasis: '100%',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  step: {
    alignItems: 'center',
    flexDirection: 'row',
    maxWidth: '100%',
  },
  currentStep: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  stepText: {
    color: '#34495e',
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  currentText: {
    color: '#5b21b6',
  },
  arrow: {
    color: '#64748b',
    fontSize: 15,
    marginLeft: 6,
  },
});
