import { subnetFacts } from '@/domain/subnet';

import { generateQuestion } from '../generator';
import { createSeededRandom } from '../seededRandom';
import type { RandomSource } from '../seededRandom';
import { tierConfigs } from '../tierConfig';
import type { TierConfig } from '../types';

function expectPrivateIPv4(address: string) {
  const [first, second] = address.split('.').map(Number);
  const isPrivate =
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168);

  expect(isPrivate).toBe(true);
}

describe('generateQuestion', () => {
  it.each(tierConfigs)('generates a valid $tier question', (config) => {
    const question = generateQuestion(config.start, config, createSeededRandom(config.tier));

    expect(question).toMatchObject({
      id: `${config.tier}-${String(config.start).padStart(3, '0')}`,
      ordinal: config.start,
      catalogVersion: 'ipv4-network-v1',
      tier: config.tier,
      type: 'network-address',
      hints: {
        showMaskBeforeAnswer: config.showMaskBeforeAnswer,
        showBlockSizeBeforeAnswer: config.showBlockSizeBeforeAnswer,
      },
    });
    expect(config.prefixes).toContain(question.prefix);
    expectPrivateIPv4(question.ip);
    expect(question.answer).toBe(subnetFacts(question.ip, question.prefix).network);
  });

  it.each([31, 32])('supports hardest-tier /%s questions', (prefix) => {
    const config: TierConfig = {
      ...tierConfigs[3],
      prefixes: [prefix],
    };
    const question = generateQuestion(400 + prefix, config, createSeededRandom(`prefix-${prefix}`));

    expect(question.prefix).toBe(prefix);
    expect(question.answer).toBe(subnetFacts(question.ip, prefix).network);
  });

  it('returns a question with frozen nested hints', () => {
    const question = generateQuestion(1, tierConfigs[0], createSeededRandom('frozen-question'));

    expect(Object.isFrozen(question)).toBe(true);
    expect(Object.isFrozen(question.hints)).toBe(true);
  });

  it('rejects an ordinal outside the supplied tier', () => {
    expect(() => generateQuestion(300, tierConfigs[0], createSeededRandom('invalid'))).toThrow(
      'Question ordinal is outside the supplied tier range',
    );
  });

  it('regenerates a hard question that lands exactly on a subnet boundary', () => {
    const values = [0, 0, 0, 0, 0, 1, 1, 1];
    const random: RandomSource = {
      next: () => 0,
      integer: () => values.shift() ?? 1,
      pick: <T,>(choices: readonly T[]) => choices[0],
    };
    const config: TierConfig = { ...tierConfigs[2], prefixes: [8] };

    const question = generateQuestion(300, config, random);

    expect(question.ip).toBe('10.1.1.1');
    expect(question.ip).not.toBe(subnetFacts(question.ip, question.prefix).network);
    expect(question.ip).not.toBe(subnetFacts(question.ip, question.prefix).broadcast);
  });

  it('rejects a tier without prefixes', () => {
    const config: TierConfig = { ...tierConfigs[0], prefixes: [] };

    expect(() => generateQuestion(1, config, createSeededRandom('invalid'))).toThrow(
      'Tier must define at least one CIDR prefix',
    );
  });
});
