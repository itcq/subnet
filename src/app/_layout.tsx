import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PRODUCT_COPY } from '@/content/productCopy';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Head>
        <title>Subnet Game | CCNA &amp; Network+ Practice</title>
        <meta
          name="description"
          content={PRODUCT_COPY.siteDescription}
        />
        <meta name="theme-color" content="#07111F" />
        <link rel="canonical" href="https://itcq.github.io/subnet/" />
        <meta property="og:title" content="Subnet Game: CCNA & Network+ Practice" />
        <meta
          property="og:description"
          content={PRODUCT_COPY.siteDescription}
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://itcq.github.io/subnet/" />
      </Head>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
