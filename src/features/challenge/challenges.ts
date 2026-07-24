import { subnetFacts } from '@/domain/subnet';

export type NetworkChallengeDefinition = {
  id: string;
  ip: string;
  prefix: number;
  answer: string;
};

const challengeTargets = [
  { id: 'fourth-octet-27', ip: '192.168.10.70', prefix: 27 },
  { id: 'fourth-octet-26', ip: '10.20.30.200', prefix: 26 },
  { id: 'fourth-octet-28', ip: '192.168.4.22', prefix: 28 },
  { id: 'third-octet-20', ip: '172.16.45.130', prefix: 20 },
  { id: 'fourth-octet-30', ip: '192.168.50.14', prefix: 30 },
] as const;

export const networkChallenges: NetworkChallengeDefinition[] = challengeTargets.map(
  (challenge) => ({
    ...challenge,
    answer: subnetFacts(challenge.ip, challenge.prefix).network,
  }),
);
