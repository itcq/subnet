import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Head>
        <title>Subnet Game</title>
        <meta
          name="description"
          content="Practice IPv4 subnetting through guided lessons, typed-answer challenges, and optional timed drills."
        />
        <meta name="theme-color" content="#07111F" />
        <link rel="canonical" href="https://itcq.github.io/subnet/" />
        <meta property="og:title" content="Subnet Game" />
        <meta
          property="og:description"
          content="Practice IPv4 subnetting through guided lessons, typed-answer challenges, and optional timed drills."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://itcq.github.io/subnet/" />
      </Head>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
