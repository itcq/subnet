import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AppScreen } from '@/components/AppNavigation';

type InformationPage = 'terms' | 'site-map' | 'contact';

type Section = Readonly<{
  heading: string;
  paragraphs: readonly string[];
}>;

const TERMS_SECTIONS: readonly Section[] = Object.freeze([
  {
    heading: 'Service operator',
    paragraphs: [
      'Subnet Game is operated by Rooted in Media, INC.',
    ],
  },
  {
    heading: 'Educational purpose',
    paragraphs: [
      'Subnet Game provides practice and educational content. It is not a certification, credential, or guarantee of exam, school, or employment outcomes.',
      'You are responsible for checking your work and using appropriate professional judgment in real networks.',
    ],
  },
  {
    heading: 'Accounts and progress',
    paragraphs: [
      'An account is optional. Passwordless sign-in uses a one-time code sent to your email address.',
      'Anonymous progress stays in the current browser. Signed-in Journey completions can synchronize to your account. Anonymous progress is not silently uploaded or merged.',
    ],
  },
  {
    heading: 'Global scoreboard',
    paragraphs: [
      'Scoreboard participation is optional. If you opt in, the public name you choose and your synced Journey completion total may be visible to anyone.',
      'Email addresses are not displayed. Scoreboard activity represents self-reported practice progress and is not a proctored result or credential.',
    ],
  },
  {
    heading: 'Acceptable use',
    paragraphs: [
      'Do not disrupt the service, attempt to access another person’s account, automate abusive requests, publish harmful content, or use a public name that impersonates or harasses someone.',
    ],
  },
  {
    heading: 'Availability and changes',
    paragraphs: [
      'The service may change, experience interruptions, or remove features when necessary for security, reliability, or product improvement. Reasonable care is taken, but uninterrupted availability is not promised.',
    ],
  },
  {
    heading: 'Your choices',
    paragraphs: [
      'You can continue anonymously, leave the scoreboard, download your account data, or permanently delete your account using the available account controls.',
    ],
  },
]);

const SITE_MAP: readonly Readonly<{ label: string; screen: AppScreen; description: string }>[] = Object.freeze([
  { label: 'Home', screen: 'menu', description: 'Start or continue your subnetting journey.' },
  { label: 'Journey', screen: 'challenge', description: 'Complete guided subnetting challenges.' },
  { label: 'Learn Subnetting', screen: 'learn', description: 'Study IPv4 and subnetting concepts.' },
  { label: 'Timed Mode', screen: 'timed-setup', description: 'Run optional local timed practice.' },
  { label: 'Local Rank & Badges', screen: 'achievements', description: 'View local, unverified practice results.' },
  { label: 'Global Scoreboard', screen: 'scoreboard', description: 'View opt-in synced Journey rankings.' },
  { label: 'How to Play', screen: 'how-to-play', description: 'Read the app instructions.' },
  { label: 'Account', screen: 'account', description: 'Sign in, export data, or delete your account.' },
  { label: 'Terms of Service', screen: 'terms', description: 'Review the rules for using the service.' },
  { label: 'Contact Us', screen: 'contact', description: 'Find the public support contact.' },
]);

function SectionCard({ section }: Readonly<{ section: Section }>) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{section.heading}</Text>
      {section.paragraphs.map((paragraph) => (
        <Text key={paragraph} style={styles.body}>{paragraph}</Text>
      ))}
    </View>
  );
}

export function SiteInformationPage({
  onNavigate,
  page,
  supportEmail,
}: Readonly<{
  onNavigate(screen: AppScreen): void;
  page: InformationPage;
  supportEmail: string | null;
}>) {
  const title = page === 'terms' ? 'Terms of Service' : page === 'site-map' ? 'Site Map' : 'Contact Us';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} testID={`${page}-page`}>
      <View style={styles.container}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>

        {page === 'terms' ? (
          <>
            <Text style={styles.intro}>
              These terms explain the basic rules for using Subnet Game. By using the app, you agree to follow them.
            </Text>
            {TERMS_SECTIONS.map((section) => <SectionCard key={section.heading} section={section} />)}
          </>
        ) : null}

        {page === 'site-map' ? (
          <>
            <Text style={styles.intro}>Use these links to move directly to any public area of the application.</Text>
            <View style={styles.linkList}>
              {SITE_MAP.map((destination) => (
                <Pressable
                  accessibilityLabel={destination.label}
                  accessibilityRole="link"
                  key={destination.screen}
                  onPress={() => onNavigate(destination.screen)}
                  style={({ pressed }) => [styles.linkCard, pressed && styles.pressed]}>
                  <Text style={styles.linkTitle}>{destination.label}</Text>
                  <Text style={styles.body}>{destination.description}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {page === 'contact' ? (
          <>
            <Text style={styles.intro}>
              Contact the Subnet Game team for account help, accessibility issues, privacy requests, incorrect content, or technical problems.
            </Text>
            <View style={styles.card}>
              {supportEmail === null ? (
                <Text style={styles.body}>
                  The public support address is being finalized. This page will not publish a personal or unapproved email address.
                </Text>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Email support</Text>
                  <Pressable
                    accessibilityLabel={`Email ${supportEmail}`}
                    accessibilityRole="link"
                    onPress={() => { void Linking.openURL(`mailto:${supportEmail}`); }}
                    style={({ pressed }) => [styles.emailButton, pressed && styles.pressed]}>
                    <Text style={styles.emailText}>{supportEmail}</Text>
                  </Pressable>
                  <Text style={styles.note}>Do not send passwords or one-time verification codes.</Text>
                </>
              )}
            </View>
          </>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: {
    alignSelf: 'center',
    maxWidth: 780,
    paddingBottom: 40,
    paddingHorizontal: 20,
    paddingTop: 24,
    width: '100%',
  },
  title: { color: '#F5F8FB', fontSize: 32, fontWeight: '900', lineHeight: 40 },
  intro: { color: '#C8D4E0', fontSize: 16, lineHeight: 25, marginTop: 12 },
  card: {
    backgroundColor: '#0D1C2C',
    borderColor: '#27425E',
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 18,
    padding: 20,
  },
  sectionTitle: { color: '#F5F8FB', fontSize: 19, fontWeight: '900', lineHeight: 27 },
  body: { color: '#D5E0EA', fontSize: 15, lineHeight: 23 },
  note: { color: '#9FB2C5', fontSize: 13, lineHeight: 20 },
  linkList: { gap: 12, marginTop: 20 },
  linkCard: {
    backgroundColor: '#0D1C2C',
    borderColor: '#31516F',
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    minHeight: 68,
    padding: 16,
  },
  linkTitle: { color: '#69F0CB', fontSize: 17, fontWeight: '900' },
  emailButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderColor: '#F6C857',
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
  },
  emailText: { color: '#F6C857', fontSize: 15, fontWeight: '900' },
  pressed: { opacity: 0.72 },
});
