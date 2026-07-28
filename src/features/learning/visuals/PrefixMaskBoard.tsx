import { StyleSheet, Text, View } from 'react-native';

export type PrefixMaskBoardProps = {
  prefix: number;
  totalBits: number;
  networkBits: number;
  hostBits: number;
  octetPatterns: readonly string[];
  maskBinary: string;
  mask: string;
};

export function PrefixMaskBoard({
  prefix,
  totalBits,
  networkBits,
  hostBits,
  octetPatterns,
  maskBinary,
  mask,
}: PrefixMaskBoardProps) {
  const finalPattern = octetPatterns[octetPatterns.length - 1] ?? '';
  const summary = `/${prefix} boundary: ${networkBits} network bits and ${hostBits} host bits; mask ${mask}`;

  return (
    <View style={styles.board}>
      <Text accessibilityLabel={summary} style={styles.summary}>
        {summary}
      </Text>
      <Text style={styles.equation}>
        /{prefix} = {networkBits} network bits + {hostBits} host bits
      </Text>

      <View accessibilityLabel={`${totalBits}-bit prefix overview`} style={styles.overview}>
        {octetPatterns.map((pattern, index) => (
          <View key={`${index}-${pattern}`} style={styles.overviewOctet}>
            <Text style={styles.overviewLabel}>Octet {index + 1}</Text>
            <Text style={styles.overviewPattern}>{pattern}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.finalLabel}>Fourth octet: {finalPattern}</Text>
      <View accessibilityLabel="Enlarged fourth octet" style={styles.finalOctet}>
        {Array.from(finalPattern).map((kind, index) => {
          const isNetwork = kind === 'N';
          return (
            <View
              key={`${index}-${kind}`}
              style={[styles.bit, isNetwork ? styles.networkBit : styles.hostBit]}>
              <Text style={[styles.bitText, isNetwork ? styles.networkText : styles.hostText]}>
                {kind} — {isNetwork ? 'Network' : 'Host'}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        <Text style={styles.networkText}>N — Network: shared subnet prefix</Text>
        <Text style={styles.hostText}>H — Host: address position inside the subnet</Text>
      </View>
      <Text style={styles.output}>Mask binary: {maskBinary}</Text>
      <Text style={styles.output}>Subnet mask: {mask}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  summary: {
    color: '#34495e',
    fontSize: 14,
    lineHeight: 20,
  },
  equation: {
    color: '#17202a',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginTop: 8,
  },
  overview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
    maxWidth: '100%',
  },
  overviewOctet: {
    backgroundColor: '#f8fafc',
    borderColor: '#64748b',
    borderRadius: 7,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 118,
    padding: 8,
  },
  overviewLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  overviewPattern: {
    color: '#17202a',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 3,
  },
  finalLabel: {
    color: '#17202a',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 14,
  },
  finalOctet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 7,
    maxWidth: '100%',
  },
  bit: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 2,
    flexGrow: 1,
    minWidth: 78,
    paddingHorizontal: 7,
    paddingVertical: 9,
  },
  networkBit: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  hostBit: {
    backgroundColor: '#ffedd5',
    borderColor: '#ea580c',
  },
  bitText: {
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  networkText: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  hostText: {
    color: '#c2410c',
    fontWeight: '700',
  },
  legend: {
    gap: 4,
    marginTop: 10,
  },
  output: {
    color: '#17202a',
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginTop: 8,
  },
});
