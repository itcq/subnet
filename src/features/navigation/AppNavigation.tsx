import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { PageScreen } from '@/navigation/pageNavigation';

type AppNavigationProps = Readonly<{
  activeScreen: PageScreen;
  children?: ReactNode;
  onContinue(): void;
  onNavigate(screen: PageScreen): void;
}>;

type NavigationItem = Readonly<{
  label: string;
  screen?: PageScreen;
  selectedScreens: readonly PageScreen[];
}>;

const primaryItems: readonly NavigationItem[] = [
  {
    label: 'Continue',
    selectedScreens: ['menu', 'challenge', 'completion'],
  },
  {
    label: 'Learn',
    screen: 'learn',
    selectedScreens: ['learn', 'learning-practice'],
  },
  {
    label: 'Play',
    screen: 'timed-setup',
    selectedScreens: ['timed-setup', 'timed', 'ranked'],
  },
  {
    label: 'Stats',
    screen: 'achievements',
    selectedScreens: ['achievements'],
  },
];

const secondaryItems: readonly NavigationItem[] = [
  {
    label: 'How to Play',
    screen: 'how-to-play',
    selectedScreens: ['how-to-play'],
  },
  {
    label: 'Journey',
    screen: 'journey',
    selectedScreens: ['journey'],
  },
  {
    label: 'Account',
    screen: 'account',
    selectedScreens: ['account'],
  },
];

function NavigationGroup({
  activeScreen,
  items,
  label,
  onContinue,
  onNavigate,
  testID,
}: Readonly<{
  activeScreen: PageScreen;
  items: readonly NavigationItem[];
  label: string;
  onContinue(): void;
  onNavigate(screen: PageScreen): void;
  testID: string;
}>) {
  return (
    <View accessibilityLabel={label} style={styles.navigationGroup} testID={testID}>
      {items.map((item) => {
        const selected = item.selectedScreens.includes(activeScreen);
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={item.label}
            onPress={item.screen === undefined ? onContinue : () => onNavigate(item.screen!)}
            style={({ pressed }) => [
              styles.navigationButton,
              selected && styles.navigationButtonSelected,
              pressed && styles.navigationButtonPressed,
            ]}>
            <Text
              numberOfLines={1}
              style={[styles.navigationText, selected && styles.navigationTextSelected]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function AppNavigation({
  activeScreen,
  children,
  onContinue,
  onNavigate,
}: AppNavigationProps) {
  return (
    <View style={styles.shell}>
      <NavigationGroup
        activeScreen={activeScreen}
        items={primaryItems}
        label="Primary navigation"
        onContinue={onContinue}
        onNavigate={onNavigate}
        testID="primary-navigation"
      />
      <View style={styles.content}>{children}</View>
      <NavigationGroup
        activeScreen={activeScreen}
        items={secondaryItems}
        label="Secondary navigation"
        onContinue={onContinue}
        onNavigate={onNavigate}
        testID="secondary-navigation"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#07111F', flex: 1 },
  content: { flex: 1, minHeight: 0 },
  navigationGroup: {
    alignItems: 'stretch',
    backgroundColor: '#0A1725',
    borderColor: '#27425E',
    borderWidth: 0,
    flexDirection: 'row',
    width: '100%',
  },
  navigationButton: {
    alignItems: 'center',
    borderBottomColor: 'transparent',
    borderBottomWidth: 3,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 0,
    paddingHorizontal: 4,
  },
  navigationButtonSelected: {
    backgroundColor: '#102338',
    borderBottomColor: '#F6C857',
  },
  navigationButtonPressed: { opacity: 0.72 },
  navigationText: {
    color: '#B8C8D8',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  navigationTextSelected: { color: '#F6C857' },
});
