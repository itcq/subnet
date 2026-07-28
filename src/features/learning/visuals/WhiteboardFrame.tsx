import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type WhiteboardFrameProps = {
  title: string;
  summary: string;
  children: ReactNode;
};

export function WhiteboardFrame({ title, summary, children }: WhiteboardFrameProps) {
  return (
    <View accessibilityLabel={`Whiteboard: ${title}`} style={styles.frame}>
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={styles.markerAccent}
        testID="whiteboard-marker-accent"
      />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      <Text style={styles.summary}>{summary}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'stretch',
    backgroundColor: '#fffaf0',
    borderColor: '#243447',
    borderRadius: 14,
    borderWidth: 2,
    maxWidth: '100%',
    marginTop: 18,
    overflow: 'hidden',
    padding: 16,
    position: 'relative',
  },
  markerAccent: {
    backgroundColor: '#7c3aed',
    height: 4,
    opacity: 0.7,
    position: 'absolute',
    right: 12,
    top: 10,
    transform: [{ rotate: '-2deg' }],
    width: 48,
  },
  title: {
    color: '#17202a',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    paddingRight: 52,
  },
  summary: {
    color: '#34495e',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 6,
  },
  content: {
    marginTop: 14,
    maxWidth: '100%',
  },
});
