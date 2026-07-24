import { subnetFacts } from '@/domain/subnet';

import { networkChallenges } from '../challenges';

describe('networkChallenges', () => {
  it('provides five valid network-address challenges with unique targets', () => {
    expect(networkChallenges).toHaveLength(5);
    expect(new Set(networkChallenges.map(({ ip, prefix }) => `${ip}/${prefix}`)).size).toBe(5);

    for (const challenge of networkChallenges) {
      expect(challenge.answer).toBe(subnetFacts(challenge.ip, challenge.prefix).network);
    }
  });
});
