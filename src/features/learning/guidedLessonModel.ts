import { subnetFacts, type SubnetFacts } from '@/domain/subnet';

export const BINARY_PLACES = [128, 64, 32, 16, 8, 4, 2, 1] as const;

type AddressBlock = Readonly<{
  start: number;
  end: number;
}>;

export type GuidedLessonModel = Readonly<{
  address: string;
  prefix: number;
  facts: Readonly<SubnetFacts>;
  targetOctets: readonly string[];
  targetOctet: number;
  targetBinary: string;
  targetPlaces: readonly number[];
  networkBits: number;
  hostBits: number;
  networkBitsInFinalOctet: number;
  hostBitsInFinalOctet: number;
  prefixSplit: string;
  networkBitChoices: readonly number[];
  maskOctet: number;
  maskPlaces: readonly number[];
  maskOctetChoices: readonly number[];
  maskBinary: string;
  totalPatternsProof: string;
  blockSize: number;
  blockStart: number;
  blockEnd: number;
  boundaries: readonly number[];
  addressBlocks: readonly AddressBlock[];
  blockBinaryPattern: string;
  blockRangeText: string;
  networkOctetBinary: string;
  broadcastOctetBinary: string;
  networkHostProof: string;
  broadcastHostProof: string;
  textEquivalent: string;
}>;

function toBinaryOctet(value: number): string {
  return value.toString(2).padStart(8, '0');
}

export function createGuidedLessonModel(address: string, prefix: number): GuidedLessonModel {
  if (!Number.isInteger(prefix) || prefix < 24 || prefix > 30) {
    throw new RangeError('Guided octet lessons support prefixes from /24 through /30');
  }

  const facts = Object.freeze(subnetFacts(address, prefix));
  const targetOctets = Object.freeze(address.split('.').map(Number));
  const maskOctets = Object.freeze(facts.mask.split('.').map(Number));
  const targetOctet = targetOctets[3];
  const targetBinary = toBinaryOctet(targetOctet);
  const networkBits = prefix;
  const hostBits = 32 - prefix;
  const networkBitsInFinalOctet = Math.max(0, Math.min(8, prefix - 24));
  const hostBitsInFinalOctet = 8 - networkBitsInFinalOctet;
  const prefixSplit = `${'N'.repeat(networkBitsInFinalOctet)}${'H'.repeat(hostBitsInFinalOctet)}`;
  const networkBitChoices = Object.freeze(
    [...new Set([
      Math.max(0, networkBitsInFinalOctet - 1),
      networkBitsInFinalOctet,
      hostBitsInFinalOctet,
    ])].sort((left, right) => left - right),
  );
  const maskOctet = maskOctets[3];
  const maskOctetChoices = Object.freeze(
    [...new Set(
      [-1, 0, 1].map((offset) =>
        BINARY_PLACES.slice(
          0,
          Math.max(0, Math.min(8, networkBitsInFinalOctet + offset)),
        ).reduce((total, place) => total + place, 0),
      ),
    )].sort((left, right) => left - right),
  );
  const blockStart = Number(facts.network.split('.')[3]);
  const blockEnd = Number(facts.broadcast.split('.')[3]);
  const networkOctetBinary = toBinaryOctet(blockStart);
  const broadcastOctetBinary = toBinaryOctet(blockEnd);
  const blockBinaryPattern = `${targetBinary.slice(0, networkBitsInFinalOctet)}${'x'.repeat(hostBitsInFinalOctet)}`;
  const boundaries = Object.freeze(
    Array.from({ length: 256 / facts.blockSize }, (_, index) => index * facts.blockSize),
  );
  const addressBlocks = Object.freeze(
    boundaries.map((start) => Object.freeze({ start, end: start + facts.blockSize - 1 })),
  );
  const targetPlaces = Object.freeze(
    BINARY_PLACES.filter((place) => (targetOctet & place) !== 0),
  );
  const maskPlaces = Object.freeze(
    BINARY_PLACES.filter((place) => (maskOctet & place) !== 0),
  );
  const totalPatternsProof = `2^${hostBits} = ${facts.totalAddresses}`;
  const blockRangeText = `${blockStart}–${blockEnd}`;
  const networkHostProof = `${networkOctetBinary}: ${'0'.repeat(hostBitsInFinalOctet)} host bits are all zero, so ${facts.network} names the network.`;
  const broadcastHostProof = `${broadcastOctetBinary}: ${'1'.repeat(hostBitsInFinalOctet)} host bits are all one, so ${facts.broadcast} is broadcast.`;
  const textEquivalent = `${address}/${prefix}: ${networkBits} network bits and ${hostBits} host bits; mask ${facts.mask}; fourth-octet pattern ${blockBinaryPattern} gives block ${blockRangeText}; network ${facts.network}; broadcast ${facts.broadcast}.`;

  return Object.freeze({
    address,
    prefix,
    facts,
    targetOctets: Object.freeze(targetOctets.map(String)),
    targetOctet,
    targetBinary,
    targetPlaces,
    networkBits,
    hostBits,
    networkBitsInFinalOctet,
    hostBitsInFinalOctet,
    prefixSplit,
    networkBitChoices,
    maskOctet,
    maskPlaces,
    maskOctetChoices,
    maskBinary: maskOctets.map(toBinaryOctet).join('.'),
    totalPatternsProof,
    blockSize: facts.blockSize,
    blockStart,
    blockEnd,
    boundaries,
    addressBlocks,
    blockBinaryPattern,
    blockRangeText,
    networkOctetBinary,
    broadcastOctetBinary,
    networkHostProof,
    broadcastHostProof,
    textEquivalent,
  });
}
