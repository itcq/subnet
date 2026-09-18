import { subnetFacts } from '@/domain/subnet';

import type { RandomSource } from './seededRandom';
import type { SubnetQuestion, TierConfig } from './types';

function generatePrivateIPv4(random: RandomSource): string {
  const pool = random.integer(0, 2);
  const third = random.integer(0, 255);
  const fourth = random.integer(0, 255);

  if (pool === 0) {
    return `10.${random.integer(0, 255)}.${third}.${fourth}`;
  }

  if (pool === 1) {
    return `172.${random.integer(16, 31)}.${third}.${fourth}`;
  }

  return `192.168.${third}.${fourth}`;
}

export function generateQuestion(
  ordinal: number,
  config: TierConfig,
  random: RandomSource,
): SubnetQuestion {
  if (!Number.isInteger(ordinal) || ordinal < config.start || ordinal > config.end) {
    throw new Error('Question ordinal is outside the supplied tier range');
  }

  if (config.prefixes.length === 0) {
    throw new Error('Tier must define at least one CIDR prefix');
  }

  const prefix = random.pick(config.prefixes);

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const ip = generatePrivateIPv4(random);
    const facts = subnetFacts(ip, prefix);
    const isHardBoundary =
      config.tier === 'hard' && (ip === facts.network || ip === facts.broadcast);

    if (isHardBoundary) {
      continue;
    }

    return Object.freeze({
      id: `${config.tier}-${String(ordinal).padStart(3, '0')}`,
      ordinal,
      catalogVersion: '17dd300a',
      tier: config.tier,
      type: 'network-address',
      ip,
      prefix,
      answer: facts.network,
      hints: Object.freeze({
        showMaskBeforeAnswer: config.showMaskBeforeAnswer,
        showBlockSizeBeforeAnswer: config.showBlockSizeBeforeAnswer,
      }),
    });
  }

  throw new Error('Unable to generate a non-boundary hard question');
}
