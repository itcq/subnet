import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export type AppScreen =
  | 'menu'
  | 'account'
  | 'challenge'
  | 'learning-practice'
  | 'timed-setup'
  | 'timed'
  | 'achievements'
  | 'scoreboard'
  | 'learn'
  | 'how-to-play'
  | 'journey'
  | 'completion'
  | 'terms'
  | 'site-map'
  | 'contact';

type Destination = Readonly<{
  label: string;
  screen: AppScreen;
}>;

const PRIMARY_DESTINATIONS: readonly Destination[] = Object.freeze([
  { label: 'Home', screen: 'menu' },
  { label: 'Journey', screen: 'challenge' },
  { label: 'Learn Subnetting', screen: 'learn' },
  { label: 'Timed Mode', screen: 'timed-setup' },
  { label: 'Local Rank & Badges', screen: 'achievements' },
  { label: 'Global Scoreboard', screen: 'scoreboard' },
  { label: 'How to Play', screen: 'how-to-play' },
]);

const INFORMATION_DESTINATIONS: readonly Destination[] = Object.freeze([
  { label: 'Terms of Service', screen: 'terms' },
  { label: 'Site Map', screen: 'site-map' },
  { label: 'Contact Us', screen: 'contact' },
]);

function MenuItem({
  currentScreen,
  destination,
  onPress,
}: Readonly<{
  currentScreen: AppScreen;
  destination: Destination;
  onPress(): void;
}>) {
  const current = destination.screen === currentScreen;
  return (
    <Pressable
      accessibilityLabel={`${destination.label}${current ? ', current page' : ''}`}
      accessibilityRole="menuitem"
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        current && styles.menuItemCurrent,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.menuItemText, current && styles.menuItemTextCurrent]}>
        {destination.label}
      </Text>
      {current ? <Text style={styles.currentLabel}>CURRENT</Text> : null}
    </Pressable>
  );
}

export function AppNavigation({
  currentScreen,
  onNavigate,
  signedIn,
}: Readonly<{
  currentScreen: AppScreen;
  onNavigate(screen: AppScreen): void;
  signedIn: boolean;
}>) {
  const [open, setOpen] = useState(false);
  const navigate = (screen: AppScreen) => {
    setOpen(false);
    onNavigate(screen);
  };
  const accountDestination: Destination = {
    label: signedIn ? 'My Account' : 'Sign In or Create Account',
    screen: 'account',
  };

  return (
    <>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Open navigation menu"
          accessibilityRole="button"
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
          <Text aria-hidden style={styles.menuGlyph}>☰</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Go to home"
          accessibilityRole="button"
          onPress={() => navigate('menu')}
          style={({ pressed }) => [styles.brandButton, pressed && styles.pressed]}>
          <Text style={styles.brand}>Subnet Game</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        transparent
        visible={open}>
        <View style={styles.modalRoot}>
          <Pressable
            accessibilityLabel="Dismiss navigation menu"
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={styles.scrim}
          />
          <View accessibilityRole="menu" style={styles.drawer} testID="navigation-drawer">
            <View style={styles.drawerHeader}>
              <Text accessibilityRole="header" style={styles.drawerTitle}>Navigate</Text>
              <Pressable
                accessibilityLabel="Close navigation menu"
                accessibilityRole="button"
                onPress={() => setOpen(false)}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
                <Text aria-hidden style={styles.closeGlyph}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.drawerScroll}>
              {PRIMARY_DESTINATIONS.map((destination) => (
                <MenuItem
                  currentScreen={currentScreen}
                  destination={destination}
                  key={destination.screen}
                  onPress={() => navigate(destination.screen)}
                />
              ))}
              <View style={styles.divider} />
              <MenuItem
                currentScreen={currentScreen}
                destination={accountDestination}
                onPress={() => navigate('account')}
              />
              {INFORMATION_DESTINATIONS.map((destination) => (
                <MenuItem
                  currentScreen={currentScreen}
                  destination={destination}
                  key={destination.screen}
                  onPress={() => navigate(destination.screen)}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    backgroundColor: '#0A1725',
    borderBottomColor: '#213B53',
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: 12,
  },
  menuButton: {
    alignItems: 'center',
    borderColor: '#31516F',
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  menuGlyph: { color: '#F5F8FB', fontSize: 25, lineHeight: 28 },
  brandButton: { justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 },
  brand: { color: '#F5F8FB', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  modalRoot: { flex: 1, flexDirection: 'row' },
  scrim: { backgroundColor: 'rgba(0, 0, 0, 0.68)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  drawer: {
    backgroundColor: '#07111F',
    borderRightColor: '#31516F',
    borderRightWidth: 1,
    elevation: 12,
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { height: 0, width: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    width: '88%',
  },
  drawerHeader: {
    alignItems: 'center',
    borderBottomColor: '#213B53',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 18,
  },
  drawerTitle: { color: '#F5F8FB', fontSize: 24, fontWeight: '900' },
  closeButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  closeGlyph: { color: '#D7E4EF', fontSize: 32, lineHeight: 34 },
  drawerScroll: { gap: 6, padding: 14, paddingBottom: 34 },
  menuItem: {
    alignItems: 'center',
    borderColor: 'transparent',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuItemCurrent: { backgroundColor: '#173A43', borderColor: '#47E5BC' },
  menuItemText: { color: '#D7E4EF', flex: 1, fontSize: 15, fontWeight: '700' },
  menuItemTextCurrent: { color: '#E5FFF8' },
  currentLabel: { color: '#69F0CB', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  divider: { backgroundColor: '#213B53', height: 1, marginVertical: 8 },
  pressed: { opacity: 0.7 },
});
