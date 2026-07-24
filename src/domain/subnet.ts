export type SubnetFacts = {
  network: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  mask: string;
  blockSize: number;
  interestingOctet: number;
  totalAddresses: number;
  usableHosts: number;
};

function parseIPv4(address: string): number {
  const octets = address.split('.');
  const isValid =
    octets.length === 4 &&
    octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);

  if (!isValid) {
    throw new Error('Invalid IPv4 address');
  }

  return octets
    .map(Number)
    .reduce((value, octet) => value * 256 + octet, 0) >>> 0;
}

function formatIPv4(address: number): string {
  return [24, 16, 8, 0]
    .map((shift) => (address >>> shift) & 255)
    .join('.');
}

export function subnetFacts(address: string, prefix: number): SubnetFacts {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    throw new Error('Invalid CIDR prefix');
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (parseIPv4(address) & mask) >>> 0;
  const totalAddresses = 2 ** (32 - prefix);
  const broadcast = network + totalAddresses - 1;
  const interestingOctet = Math.min(4, Math.floor(prefix / 8) + 1);
  const maskOctet = (mask >>> ((4 - interestingOctet) * 8)) & 255;
  const usesAllAddressesForHosts = prefix >= 31;

  return {
    network: formatIPv4(network),
    broadcast: formatIPv4(broadcast),
    firstHost: formatIPv4(usesAllAddressesForHosts ? network : network + 1),
    lastHost: formatIPv4(usesAllAddressesForHosts ? broadcast : broadcast - 1),
    mask: formatIPv4(mask),
    blockSize: 256 - maskOctet,
    interestingOctet,
    totalAddresses,
    usableHosts: usesAllAddressesForHosts ? totalAddresses : totalAddresses - 2,
  };
}
