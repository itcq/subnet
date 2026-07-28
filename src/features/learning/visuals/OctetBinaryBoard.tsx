import { StyleSheet, Text, View } from 'react-native';

export type OctetBinaryBoardProps = {
  octets: readonly string[];
  activeOctetIndex: number;
  placeValues: readonly number[];
  activePlaces: readonly number[];
  binary: string;
  decimalValue: number;
};

export function OctetBinaryBoard({
  octets,
  activeOctetIndex,
  placeValues,
  activePlaces,
  binary,
  decimalValue,
}: OctetBinaryBoardProps) {
  const activeOctet = octets[activeOctetIndex] ?? '';
  const summary = `Octet board summary: ${octets.join('.')}; octet ${activeOctetIndex + 1} is ${activeOctet}; binary ${binary}`;

  return (
    <View style={styles.board}>
      <Text accessibilityLabel={summary} style={styles.summary}>
        {summary}
      </Text>

      <View accessibilityLabel="IPv4 octets" style={styles.octetRow}>
        {octets.map((octet, index) => {
          const isActive = index === activeOctetIndex;
          return (
            <View key={`${index}-${octet}`} style={[styles.octet, isActive && styles.activeOctet]}>
              <Text style={[styles.octetText, isActive && styles.activeOctetText]}>
                Octet {index + 1}: {octet}{isActive ? ' — Current focus' : ''}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>BINARY PLACE VALUES</Text>
      <View accessibilityLabel="Eight binary place values" style={styles.bitRow}>
        {placeValues.map((place, index) => {
          const isActive = activePlaces.includes(place);
          const digit = binary[index] ?? '0';
          return (
            <View key={`${index}-${place}`} style={[styles.bit, isActive && styles.activeBit]}>
              <Text style={[styles.place, isActive && styles.activeBitText]}>{place}</Text>
              <Text style={[styles.digit, isActive && styles.activeBitText]}>{digit}</Text>
              <Text style={[styles.state, isActive && styles.activeBitText]}>
                {isActive ? 'On' : 'Off'}
              </Text>
            </View>
          );
        })}
      </View>

      <Text style={styles.output}>Binary output: {binary}</Text>
      <Text style={styles.output}>Decimal value: {decimalValue}</Text>
      <Text style={styles.equation}>
        Active places: {activePlaces.length > 0 ? activePlaces.join(' + ') : 'none'}
      </Text>
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
    marginBottom: 12,
  },
  octetRow: {
    alignItems: 'stretch',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxWidth: '100%',
  },
  octet: {
    backgroundColor: '#f8fafc',
    borderColor: '#64748b',
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 112,
    padding: 9,
  },
  activeOctet: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
    borderWidth: 2,
  },
  octetText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 19,
  },
  activeOctetText: {
    color: '#5b21b6',
  },
  sectionLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 7,
    marginTop: 14,
  },
  bitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '100%',
  },
  bit: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderColor: '#94a3b8',
    borderRadius: 7,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 56,
    paddingHorizontal: 6,
    paddingVertical: 7,
  },
  activeBit: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
    borderWidth: 2,
  },
  place: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
  digit: {
    color: '#1e293b',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24,
  },
  state: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  activeBitText: {
    color: '#1d4ed8',
  },
  output: {
    color: '#17202a',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 22,
    marginTop: 10,
  },
  equation: {
    color: '#34495e',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 4,
  },
});
