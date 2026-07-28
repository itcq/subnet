import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

export type AddressRoleBoardProps = {
  network: string;
  firstUsable: string;
  givenAddress: string;
  lastUsable: string;
  broadcast: string;
  totalAddresses: number;
  usableHosts: number;
};

type RoleRowProps = {
  children: ReactNode;
  style: ViewStyle;
};

function RoleRow({ children, style }: RoleRowProps) {
  return <View style={[styles.role, style]}>{children}</View>;
}

export function AddressRoleBoard({
  network,
  firstUsable,
  givenAddress,
  lastUsable,
  broadcast,
  totalAddresses,
  usableHosts,
}: AddressRoleBoardProps) {
  const summary = `Address roles from ${network} network through ${broadcast} broadcast; given IP ${givenAddress}`;

  return (
    <View style={styles.board}>
      <Text accessibilityLabel={summary} style={styles.summary}>
        {summary}
      </Text>
      <View accessibilityLabel="Vertical address role ladder" style={styles.ladder}>
        <RoleRow style={styles.networkRole}>
          <Text style={styles.networkText}>Network (N · reserved): {network}</Text>
          <Text style={styles.networkProof}>Proof: all host bits are 0</Text>
        </RoleRow>
        <RoleRow style={styles.usableRole}>
          <Text style={styles.usableText}>First traditionally usable (✓): {firstUsable}</Text>
        </RoleRow>
        <RoleRow style={styles.currentRole}>
          <Text style={styles.currentText}>Given IP (current focus): {givenAddress}</Text>
        </RoleRow>
        <RoleRow style={styles.usableRole}>
          <Text style={styles.usableText}>Last traditionally usable (✓): {lastUsable}</Text>
        </RoleRow>
        <RoleRow style={styles.broadcastRole}>
          <Text style={styles.broadcastText}>Broadcast (end · reserved): {broadcast}</Text>
          <Text style={styles.broadcastProof}>Proof: all host bits are 1</Text>
        </RoleRow>
      </View>
      <Text style={styles.total}>
        {totalAddresses} total addresses · {usableHosts} traditionally usable hosts
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
    marginBottom: 10,
  },
  ladder: {
    flexDirection: 'column',
    gap: 7,
    maxWidth: '100%',
    width: '100%',
  },
  role: {
    borderRadius: 8,
    borderWidth: 2,
    maxWidth: '100%',
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  networkRole: {
    backgroundColor: '#dbeafe',
    borderColor: '#2563eb',
  },
  usableRole: {
    backgroundColor: '#dcfce7',
    borderColor: '#16a34a',
  },
  currentRole: {
    backgroundColor: '#ede9fe',
    borderColor: '#7c3aed',
  },
  broadcastRole: {
    backgroundColor: '#fee2e2',
    borderColor: '#dc2626',
  },
  networkText: {
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  networkProof: {
    color: '#1e40af',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  usableText: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  currentText: {
    color: '#5b21b6',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  broadcastText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  broadcastProof: {
    color: '#991b1b',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 3,
  },
  total: {
    color: '#17202a',
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 21,
    marginTop: 10,
  },
});
