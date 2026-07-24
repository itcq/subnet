import { SafeAreaView } from 'react-native-safe-area-context';

import { NetworkChallenge } from '@/features/challenge/NetworkChallenge';

export default function HomeScreen() {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: '#07111F' }}>
      <NetworkChallenge />
    </SafeAreaView>
  );
}
