import { assert, integer, property, tuple } from 'fast-check';

import { subnetFacts } from '../subnet';

function ipv4ToNumber(address: string): number {
  return address
    .split('.')
    .map(Number)
    .reduce((value, octet) => value * 256 + octet, 0);
}

describe('subnetFacts', () => {
  it('finds the network address for an IP inside a /27 subnet', () => {
    expect(subnetFacts('192.168.10.70', 27).network).toBe('192.168.10.64');
  });

  it('explains the complete /27 subnet boundary', () => {
    expect(subnetFacts('192.168.10.70', 27)).toEqual({
      network: '192.168.10.64',
      broadcast: '192.168.10.95',
      firstHost: '192.168.10.65',
      lastHost: '192.168.10.94',
      mask: '255.255.255.224',
      blockSize: 32,
      interestingOctet: 4,
      totalAddresses: 32,
      usableHosts: 30,
    });
  });

  it('rejects an IPv4 address with an octet outside 0 through 255', () => {
    expect(() => subnetFacts('192.168.10.300', 27)).toThrow('Invalid IPv4 address');
  });

  it('rejects a prefix outside 0 through 32', () => {
    expect(() => subnetFacts('192.168.10.70', 33)).toThrow('Invalid CIDR prefix');
  });

  it('treats both addresses in a /31 point-to-point subnet as usable', () => {
    expect(subnetFacts('192.168.10.10', 31)).toMatchObject({
      network: '192.168.10.10',
      broadcast: '192.168.10.11',
      firstHost: '192.168.10.10',
      lastHost: '192.168.10.11',
      totalAddresses: 2,
      usableHosts: 2,
    });
  });

  it('treats a /32 as one usable host route', () => {
    expect(subnetFacts('192.168.10.10', 32)).toMatchObject({
      network: '192.168.10.10',
      broadcast: '192.168.10.10',
      firstHost: '192.168.10.10',
      lastHost: '192.168.10.10',
      totalAddresses: 1,
      usableHosts: 1,
    });
  });

  it('keeps every valid IPv4 address inside its calculated subnet', () => {
    assert(
      property(
        tuple(
          integer({ min: 0, max: 255 }),
          integer({ min: 0, max: 255 }),
          integer({ min: 0, max: 255 }),
          integer({ min: 0, max: 255 }),
        ),
        integer({ min: 0, max: 32 }),
        (octets, prefix) => {
          const address = octets.join('.');
          const facts = subnetFacts(address, prefix);
          const addressNumber = ipv4ToNumber(address);
          const networkNumber = ipv4ToNumber(facts.network);
          const broadcastNumber = ipv4ToNumber(facts.broadcast);

          expect(networkNumber).toBeLessThanOrEqual(addressNumber);
          expect(addressNumber).toBeLessThanOrEqual(broadcastNumber);
          expect(broadcastNumber - networkNumber + 1).toBe(facts.totalAddresses);
        },
      ),
    );
  });
});
